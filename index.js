const express = require("express");
const axios = require("axios");
const cors = require("cors");
const WebSocket = require("ws");
const app = express();
const PORT = 3000;
app.use(cors());
const SYMBOL = "EURUSDT";
const INTERVAL = "1m";
let lastTimestamp = null;
let lastSignal = null;

// Configurare WebSocket
const wss = new WebSocket.Server({noServer: true});

// Handle connection WebSocket
wss.on("connection", (ws) => {
    console.log("Client conectat");

    // Trimite semnal dacă există
    if (lastSignal) {
        ws.send(lastSignal);
    }

    // Închide conexiunea când clientul se deconectează
    ws.on("close", () => {
        console.log("Client deconectat");
    });
});

// Funcție de analiză a lumânărilor
function analyzeCandle(open, close, high, low) {
    const body = Math.abs(close - open);
    const totalRange = high - low;
    const direction = close > open ? "BUY 🟩" : close < open ? "SELL 🟥" : "FLAT ⚪️";
    const bodyPercent = (body / totalRange) * 100;
    return {direction, bodyPercent, body};
}

// Obține ultima lumânare
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

        const {direction, bodyPercent, body} = analyzeCandle(open, close, high, low);

        if (lastTimestamp !== null) {
            const duration = (timestamp - lastTimestamp) / 1000;

            // Schimbăm pragul de la 95% la 80%
            if (duration > 2.5 && bodyPercent > 80) { // Pragul 95% devine 80%
                const emojis = "✅".repeat(20);
                const signal = `
                    ${emojis}
                    ⏱️ ${duration}s între lumânări — TIMP ÎNTÂRZIAT
                    📊 ${SYMBOL} - ${time}
                    🕯️ Open: ${open} | Close: ${close}
                    📦 Corp: ${body.toFixed(5)} (${bodyPercent.toFixed(2)}%)
                    💥 Direcție: ${direction}
                    🚀 SEMNAL DE IMPULS CLAR ȘI PUTERNIC (80%)
                    ${emojis}
                `.trim();

                lastSignal = signal;
                console.log(signal);

                // Trimite semnalul prin WebSocket
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(lastSignal);
                    }
                });
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

// Configurăm WebSocket pentru serverul HTTP
app.server = app.listen(PORT, () => {
    console.log(`🚀 Server API pornit pe http://localhost:${PORT}`);
});

app.server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
