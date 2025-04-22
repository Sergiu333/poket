const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const SYMBOL = "EURUSDT";
const INTERVAL = "1m";

let lastTimestamp = null;
let tradeOpen = false;
let tradeInfo = null;
let lastSignal = null;

function analyzeCandle(open, close, high, low) {
    const body = Math.abs(close - open);
    const totalRange = high - low;
    const direction = close > open ? "BUY 🟩" : close < open ? "SELL 🟥" : "FLAT ⚪️";
    const bodyPercent = (body / totalRange) * 100;
    return { direction, bodyPercent, body };
}

async function getLastCandle() {
    const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=2`;

    try {
        const response = await axios.get(url);
        const candles = response.data;
        if (candles.length < 2) return;

        const last = candles[candles.length - 2];
        const [timestamp, openStr, highStr, lowStr, closeStr] = last;
        const open = parseFloat(openStr);
        const close = parseFloat(closeStr);
        const high = parseFloat(highStr);
        const low = parseFloat(lowStr);
        const time = new Date(timestamp).toUTCString();

        const { direction, bodyPercent, body } = analyzeCandle(open, close, high, low);
        const duration = lastTimestamp !== null ? (timestamp - lastTimestamp) / 1000 : null;

        if (!tradeOpen && duration !== null && duration > 2.5 && bodyPercent > 95) {
            tradeOpen = true;
            tradeInfo = {
                entryTime: time,
                entryPrice: close,
                direction: direction.includes("BUY") ? "BUY" : "SELL",
            };

            lastSignal = {
                type: "OPEN",
                time,
                price: close,
                direction: tradeInfo.direction,
                bodyPercent,
                duration
            };

            console.log(`🟢 Tranzacție DESCHISĂ: ${tradeInfo.direction} la ${tradeInfo.entryPrice} (${tradeInfo.entryTime})`);
        } else if (tradeOpen) {
            tradeOpen = false;

            const exitTime = time;
            const exitPrice = close;
            const result = tradeInfo.direction === "BUY"
                ? (exitPrice - tradeInfo.entryPrice)
                : (tradeInfo.entryPrice - exitPrice);

            lastSignal = {
                type: "CLOSE",
                time: exitTime,
                price: exitPrice,
                result,
                direction: tradeInfo.direction
            };

            console.log(`🔚 Tranzacție ÎNCHISĂ la ${exitPrice} (${exitTime})`);
            console.log(`📌 Direcție: ${tradeInfo.direction}`);
            console.log(`📊 Rezultat: ${result.toFixed(5)}\n`);

            tradeInfo = null;
        }

        lastTimestamp = timestamp;

    } catch (err) {
        console.error("❌ Eroare API Binance:", err.message);
    }
}

// Rulează analiza la fiecare secundă
setInterval(getLastCandle, 1000);
getLastCandle();

// API Endpoint
app.get("/", (req, res) => {
    res.send("✅ API Binance Signal Bot Running");
});

app.get("/signal", (req, res) => {
    if (lastSignal) {
        res.json(lastSignal);
    } else {
        res.json({ message: "Niciun semnal generat încă." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serverul rulează pe http://localhost:${PORT}`);
});
