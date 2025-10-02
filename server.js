const express = require("express");
const fetch = require("node-fetch");
const app = express();

const PORT = process.env.PORT || 3000;

// Test route to confirm server works
app.get("/", (req, res) => {
  res.send({ ok: true, message: "Backend is running!" });
});

// ✅ Migrated endpoint
app.get("/api/migrated", async (req, res) => {
  const { mint } = req.query;

  if (!mint) {
    return res.status(400).json({ ok: false, error: "Missing ?mint= parameter" });
  }

  try {
    const url = `https://api.dexscreener.com/latest/dex/pairs/solana/${mint}`;
    const response = await fetch(url);
    const data = await response.json();

    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
});
