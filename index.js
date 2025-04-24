// pages/api/check.js

import axios from "axios";
import { setSignal } from "@/lib/signal";

const SYMBOL = "EURUSDT";
const INTERVAL = "1m";
let lastTimestamp = null;

export default async function handler(req, res) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=2`;

  try {
    const response = await axios.get(url);
    const candles = response.data;

    if (candles.length < 2) return res.status(200).json({ message: "Prea puține date." });

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

      setSignal(signal);
      console.log("🚀 Semnal nou:", signal);
    }

    res.status(200).json({ status: "Verificat." });

  } catch (err) {
    console.error("❌ Eroare API:", err.message);
    res.status(500).json({ error: "Eroare Binance API" });
  }
}
