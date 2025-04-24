const express = require("express");
const axios = require("axios");
const cors = require("cors"); // Adăugăm pachetul CORS
const app = express();
const PORT = 3000;

app.use(cors()); // Activăm CORS pentru toate originile

const SYMBOL = "EURUSDT";
const INTERVAL = "1m";
let lastTimestamp = null;
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

        if (lastTimestamp !== null) {
            const duration = (timestamp - lastTimestamp) / 1000;

            if (duration > 2.5 && bodyPercent > 95) {
                const emojis = "✅".repeat(20);
                const signal = `
${emojis}
⏱️ ${duration}s între lumânări — TIMP ÎNTÂRZIAT
📊 ${SYMBOL} - ${time}
🕯️ Open: ${open} | Close: ${close}
📦 Corp: ${body.toFixed(5)} (${bodyPercent.toFixed(2)}%)
💥 Direcție: ${direction}
🚀 SEMNAL DE IMPULS CLAR ȘI PUTERNIC (95%)
${emojis}
                `.trim();

                lastSignal = signal;
                console.log(signal);
            }
        }

        lastTimestamp = timestamp;

    } catch (err) {
        console.error("❌ Eroare API Binance:", err.message);
    }
}

// Pornim verificarea la fiecare secundă
setInterval(getLastCandle, 1000);
getLastCandle();

// Endpoint API
app.get("/signal", (req, res) => {
    if (lastSignal) {
        res.send(`<pre>${lastSignal}</pre>`);
    } else {
        res.send("Niciun semnal detectat încă.");
    }
});

// Pornim serverul
app.listen(PORT, () => {
    console.log(`🚀 Server API pornit pe http://localhost:${PORT}`);
});
