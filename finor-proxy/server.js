const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto'); // NEW: Required to encrypt the Zerodha token
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ 
  origin: true,
  credentials: true 
}));
app.use(express.json());

// This memory variable completely replaces Google Apps Script!
let CURRENT_ACCESS_TOKEN = null;
let REDIRECT_FRONTEND_URL = 'https://finor-v5.vercel.app';

// ==========================================
// NEW: ZERODHA NATIVE AUTHENTICATION FLOW
// ==========================================

// 1. Frontend clicks login -> We redirect to Kite
app.get('/api/auth/login', (req, res) => {
    const referer = req.headers.referer;
    if (referer) {
        try {
            const parsed = new URL(referer);
            REDIRECT_FRONTEND_URL = parsed.origin;
        } catch (e) {
            console.error("Failed to parse referer:", e);
        }
    }
    const apiKey = process.env.ZERODHA_API_KEY;
    if (!apiKey) {
        return res.status(200).send(`
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Configuration Error</h2>
                <p><strong>ZERODHA_API_KEY</strong> is missing from Render's environment variables.</p>
                <p>Please configure ZERODHA_API_KEY in the Environment section of your Render Web Service dashboard.</p>
            </div>
        `);
    }
    // Navigate to the Kite Connect login page with the api_key
    res.redirect(`https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`);
});

// 2. Kite redirects back here after successful login
app.get('/api/callback', async (req, res) => {
    const requestToken = req.query.request_token;
    if (!requestToken) return res.status(400).send("No request token provided.");

    try {
        const apiKey = process.env.ZERODHA_API_KEY;
        const apiSecret = process.env.ZERODHA_API_SECRET;

        if (!apiKey || !apiSecret) {
            return res.status(200).send(`
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Configuration Error</h2>
                    <p><strong>ZERODHA_API_KEY</strong> or <strong>ZERODHA_API_SECRET</strong> is missing from Render's environment variables.</p>
                    <p>Please set them in Render and try again.</p>
                </div>
            `);
        }

        // POST the request_token and checksum (SHA-256 of api_key + request_token + api_secret) to /session/token
        const checksum = crypto.createHash('sha256').update(apiKey + requestToken + apiSecret).digest('hex');

        // Obtain the access_token and use that with all subsequent requests
        const response = await axios.post('https://api.kite.trade/session/token', new URLSearchParams({
            api_key: apiKey,
            request_token: requestToken,
            checksum: checksum
        }).toString(), { headers: { 'X-Kite-Version': '3' } });

        // Save it in the server's memory
        CURRENT_ACCESS_TOKEN = response.data.data.access_token;
        
        // Send user back to the Vercel dashboard seamlessly
        res.redirect(`${REDIRECT_FRONTEND_URL}/admin?login=success`);
    } catch (error) {
        console.error("Token Error:", error.response?.data || error.message);
        res.status(500).send("Authentication failed. Check Render logs.");
    }
});

// ==========================================
// HELPER: Get active keys for trading
// ==========================================
async function getKeys() {
    const ZERODHA_API_KEY = process.env.ZERODHA_API_KEY;
    // Look in memory first!
    const ZERODHA_ACCESS_TOKEN = CURRENT_ACCESS_TOKEN || process.env.ZERODHA_ACCESS_TOKEN;
    
    if (!ZERODHA_ACCESS_TOKEN) throw new Error("Backend does not have a token. Please click Generate Token in the app.");
    return { key: ZERODHA_API_KEY, token: ZERODHA_ACCESS_TOKEN };
}

// ... Keep all your existing /api/gtt routes below here ...

// 1. ROUTE: Fetch Active GTT Orders
app.get('/api/gtt', async (req, res) => {
    try {
        const { key, token } = await getKeys();
        const response = await axios.get('https://api.kite.trade/gtt/triggers', {
            headers: { 'X-Kite-Version': '3', 'Authorization': `token ${key}:${token}` }
        });
        res.json({ status: 'success', data: response.data.data });
    } catch (error) {
        if (error.message && error.message.includes("does not have a token")) {
            return res.json({ status: 'error', code: 'AUTH_REQUIRED', message: error.message });
        }
        res.json({ status: 'error', message: "Failed to fetch orders." });
    }
});

// 2. ROUTE: Cancel a GTT Order
app.delete('/api/gtt/:id', async (req, res) => {
    try {
        const { key, token } = await getKeys();
        await axios.delete(`https://api.kite.trade/gtt/triggers/${req.params.id}`, {
            headers: { 'X-Kite-Version': '3', 'Authorization': `token ${key}:${token}` }
        });
        res.json({ status: 'success', message: `Order ${req.params.id} cancelled.` });
    } catch (error) {
        if (error.message && error.message.includes("does not have a token")) {
            return res.json({ status: 'error', code: 'AUTH_REQUIRED', message: error.message });
        }
        res.json({ status: 'error', message: "Failed to cancel order." });
    }
});

// 3. ROUTE: Place BUY GTT (Single Leg)
app.post('/api/gtt/buy', async (req, res) => {
    const { ticker, qty, triggerPrice, limitPrice, ltp } = req.body;
    try {
        const { key, token } = await getKeys();
        const conditionObj = {
            exchange: "NSE", tradingsymbol: ticker,
            trigger_values: [parseFloat(Number(triggerPrice).toFixed(2))], 
            last_price: parseFloat(Number(ltp).toFixed(2))
        };
        const ordersArr = [{
            exchange: "NSE", tradingsymbol: ticker, transaction_type: "BUY",
            quantity: parseInt(qty), order_type: "LIMIT", product: "CNC",
            price: parseFloat(Number(limitPrice).toFixed(2))
        }];

        const params = new URLSearchParams();
        params.append('type', 'single'); // Buy is single leg
        params.append('condition', JSON.stringify(conditionObj));
        params.append('orders', JSON.stringify(ordersArr));

        const response = await axios.post('https://api.kite.trade/gtt/triggers', params.toString(), {
            headers: { 'X-Kite-Version': '3', 'Authorization': `token ${key}:${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        res.json({ status: 'success', trigger_id: response.data.data.trigger_id });
    } catch (error) {
        if (error.message && error.message.includes("does not have a token")) {
            return res.json({ status: 'error', code: 'AUTH_REQUIRED', message: error.message });
        }
        res.json({ status: 'error', message: error.response?.data?.message || error.message });
    }
});

// 4. ROUTE: Place SELL OCO GTT (Two Leg)
app.post('/api/gtt/place', async (req, res) => {
    const { ticker, qty, targetPrice, stopLossPrice, ltp } = req.body;
    try {
        const { key, token } = await getKeys();
        const conditionObj = {
            exchange: "NSE", tradingsymbol: ticker,
            trigger_values: [parseFloat(Number(stopLossPrice).toFixed(2)), parseFloat(Number(targetPrice).toFixed(2))], 
            last_price: parseFloat(Number(ltp).toFixed(2))
        };
        const ordersArr = [
            { exchange: "NSE", tradingsymbol: ticker, transaction_type: "SELL", quantity: parseInt(qty), order_type: "LIMIT", product: "CNC", price: parseFloat(Number(stopLossPrice).toFixed(2)) },
            { exchange: "NSE", tradingsymbol: ticker, transaction_type: "SELL", quantity: parseInt(qty), order_type: "LIMIT", product: "CNC", price: parseFloat(Number(targetPrice).toFixed(2)) }
        ];

        const params = new URLSearchParams();
        params.append('type', 'two-leg');
        params.append('condition', JSON.stringify(conditionObj));
        params.append('orders', JSON.stringify(ordersArr));

        const response = await axios.post('https://api.kite.trade/gtt/triggers', params.toString(), {
            headers: { 'X-Kite-Version': '3', 'Authorization': `token ${key}:${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        res.json({ status: 'success', trigger_id: response.data.data.trigger_id });
    } catch (error) {
        if (error.message && error.message.includes("does not have a token")) {
            return res.json({ status: 'error', code: 'AUTH_REQUIRED', message: error.message });
        }
        res.json({ status: 'error', message: error.response?.data?.message || error.message });
    }
});

// Stores the last verified working model to avoid retrying known-good models from scratch
let CACHED_ACTIVE_MODEL = null;

// Free-tier Gemini models in priority order (all valid on v1beta as of June 2026)
// gemini-2.5-flash      → 10 RPM, best quality for finance Q&A
// gemini-2.5-flash-lite → 15 RPM, faster fallback for simple queries
// gemini-2.5-flash-001  → stable versioned fallback
const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash-001'
];

// 5. ROUTE: Proxy Gemini AI request securely
app.post('/api/chat', async (req, res) => {
    const { contents, systemInstruction } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.json({ status: 'error', message: "Gemini API key is not configured on the backend server. Please set the GEMINI_API_KEY environment variable on Render." });
    }

    const buildRequestBody = (contentsArr, systemText) => {
        const localContents = JSON.parse(JSON.stringify(contentsArr));
        const body = {
            contents: localContents,
            generationConfig: { temperature: 0.2 }
        };
        if (systemText) {
            body.systemInstruction = { parts: [{ text: systemText }] };
        }
        return body;
    };

    // Build model list: try cached model first, then the rest
    const modelsToTry = CACHED_ACTIVE_MODEL
        ? [CACHED_ACTIVE_MODEL, ...GEMINI_MODELS.filter(m => m !== CACHED_ACTIVE_MODEL)]
        : GEMINI_MODELS;

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            console.log(`Trying Gemini model: ${model}`);
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                buildRequestBody(contents, systemInstruction),
                { headers: { 'Content-Type': 'application/json' } }
            );
            // Success — cache this model for next request
            CACHED_ACTIVE_MODEL = model;
            console.log(`✅ Active model: ${model}`);
            return res.json({ status: 'success', data: response.data, activeModel: model });
        } catch (error) {
            const status = error.response?.status;
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.error(`Model ${model} failed (${status}): ${errorMsg}`);

            // 429 = rate limit on this model → try next model instead of giving up
            if (status === 429) {
                console.warn(`⚠️ Rate limit hit on ${model}, trying next model...`);
                if (CACHED_ACTIVE_MODEL === model) CACHED_ACTIVE_MODEL = null;
                lastError = `Rate limit on ${model}`;
                continue; // try next model
            }

            // 404 = invalid model name → try next
            if (status === 404 || errorMsg.includes('not found')) {
                lastError = `Model not found: ${model}`;
                continue;
            }

            // Any other error (500, auth, etc.) — fail fast
            return res.json({ status: 'error', message: errorMsg });
        }
    }

    // All models exhausted
    res.json({
        status: 'error',
        message: `All Gemini models are rate-limited. Please wait a minute and try again. (${lastError})`
    });
});

app.listen(PORT, () => console.log(`🚀 Advanced Trading Node running on http://localhost:${PORT}`));