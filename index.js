const express = require('express');
const axios = require('axios');
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());

let lastSignal = null; // Variabila pentru a stoca ultimul semnal detectat
const SYMBOL = "EURUSDT";
const INTERVAL = "1m";
let lastTimestamp = null;

// Funcția pentru a obține semnalul
async function getSignal() {
const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=2`;


  try {
    const response = await axios.get(url);
    const candles = response.data;

    if (candles.length < 2) {
      return { message: "Prea puține date." };
    }

    const last = candles[candles.length - 2];
    const [timestamp, openStr, highStr, lowStr, closeStr] = last;
    const open = parseFloat(openStr);
    const close = parseFloat(closeStr);
    const high = parseFloat(highStr);
    const low = parseFloat(lowStr);
    const time = new Date(timestamp).toUTCString();

    const body = Math.abs(close - open);
    const totalRange = high - low;
    const direction = close > open ? "BUY 🟩" : close < open ? "SELL 🟥" : "FLAT ⚪️";
    const bodyPercent = (body / totalRange) * 100;
    const duration = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : null;

    lastTimestamp = timestamp;

    if (duration && duration > 2.5 && bodyPercent > 80) {
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
      console.log("🚀 Semnal nou:", signal);
    }

    return lastSignal ? { signal: lastSignal } : { message: "Nu s-a detectat niciun semnal." };

  } catch (err) {
    console.error("❌ Eroare API:", err.message);
    return { error: "Eroare Binance API" };
  }
}

// Definirea rutei /signal
app.get('/signal', async (req, res) => {
  const result = await getSignal();
  
  if (result.error) {
    return res.status(500).json(result);
  }

  return res.status(200).json(result);
});

// Pornirea serverului
app.listen(port, () => {
  console.log(`Serverul rulează pe portul ${port}`);
});
