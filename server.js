import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Healthcheck
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend is running!" });
});

// 🟢 Migrated (Raydium tokens)
app.get("/api/migrated", async (req, res) => {
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana");
    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: `Dexscreener error ${r.status}` });
    }
    const data = await r.json();
    const coins = (data.pairs || []).filter(p => p.dexId === "raydium");
    res.json({ ok: true, count: coins.length, coins });
  } catch (e) {
    console.error("Error in /api/migrated:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 🟡 New Pairs (Pumpfun bonding tokens)
app.get("/api/new-pairs", async (req, res) => {
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana");
    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: `Dexscreener error ${r.status}` });
    }
    const data = await r.json();
    const coins = (data.pairs || []).filter(p => p.dexId === "pumpfun");
    res.json({ ok: true, count: coins.length, coins });
  } catch (e) {
    console.error("Error in /api/new-pairs:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 🔴 Final Stretch (Pumpfun with FDV >= 15k)
app.get("/api/final-stretch", async (req, res) => {
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana");
    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: `Dexscreener error ${r.status}` });
    }
    const data = await r.json();
    const coins = (data.pairs || []).filter(
      p => p.dexId === "pumpfun" && p.fdv >= 15000
    );
    res.json({ ok: true, count: coins.length, coins });
  } catch (e) {
    console.error("Error in /api/final-stretch:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
