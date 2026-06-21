const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto'); // NEW: Required to encrypt the Zerodha token
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors({ 
  origin: ['http://localhost:5173', 'https://project-dv51c.vercel.app'],
  credentials: true 
}));
app.use(express.json());

// This memory variable completely replaces Google Apps Script!
let CURRENT_ACCESS_TOKEN = null;

// ==========================================
// NEW: ZERODHA NATIVE AUTHENTICATION FLOW
// ==========================================

// 1. Frontend clicks login -> We redirect to Kite
app.get('/api/auth/login', (req, res) => {
    const apiKey = process.env.ZERODHA_API_KEY;
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
        res.redirect('https://project-dv51c.vercel.app/admin?login=success');
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
        res.status(500).json({ status: 'error', message: "Failed to fetch orders." });
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
        res.status(500).json({ status: 'error', message: "Failed to cancel order." });
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
        res.status(500).json({ status: 'error', message: error.response?.data?.message || error.message });
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
        res.status(500).json({ status: 'error', message: error.response?.data?.message || error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Advanced Trading Node running on http://localhost:${PORT}`));