import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Healthcheck
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend is running!" });
});

// New Pairs (Pumpfun only)
app.get("/api/new-pairs", async (req, res) => {
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana");
    const data = await r.json();
    const coins = (data.pairs || []).filter(p => p.dexId === "pumpfun");
    res.json({ ok: true, coins });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Final Stretch (Pumpfun >= $15k MC)
app.get("/api/final-stretch", async (req, res) => {
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana");
    const data = await r.json();
    const coins = (data.pairs || []).filter(
      p => p.dexId === "pumpfun" && p.fdv >= 15000
    );
    res.json({ ok: true, coins });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Migrated (Raydium, previously Pumpfun tokens)
app.get("/api/migrated", async (req, res) => {
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana");
    const data = await r.json();
    const coins = (data.pairs || []).filter(p => p.dexId === "raydium");
    res.json({ ok: true, coins });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
