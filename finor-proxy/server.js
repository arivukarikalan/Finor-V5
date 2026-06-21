const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3001;

// finor-proxy/server.js

// Replace the placeholder string with your actual Vercel URL
app.use(cors({ 
  origin: [
    'http://localhost:5173', 
    'https://project-dv51c.vercel.app' // <-- PASTE YOUR VERCEL URL HERE
  ],
  credentials: true
}));

app.use(express.json());

// 🔴 PASTE YOUR GOOGLE WEB APP URL HERE
const GOOGLE_API_URL = process.env.GOOGLE_WEB_APP_URL;

// HELPER: Get active keys
async function getKeys() {
    const googleResponse = await axios.get(GOOGLE_API_URL + "?action=get_token");
    const ZERODHA_API_KEY = process.env.ZERODHA_API_KEY || "YOUR_API_KEY";
    const ZERODHA_ACCESS_TOKEN = googleResponse.data.accessToken || process.env.ZERODHA_ACCESS_TOKEN;
    if (!ZERODHA_ACCESS_TOKEN) throw new Error("Could not retrieve active token.");
    return { key: ZERODHA_API_KEY, token: ZERODHA_ACCESS_TOKEN };
}

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