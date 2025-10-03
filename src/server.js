// src/server.js
import express from "express";


const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Fetch Solana trending pools from GeckoTerminal
async function fetchSolanaTokens() {
  try {
    const url = "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools";
    const resp = await fetch(url, { headers: { Accept: "application/json" } });

    if (!resp.ok) throw new Error(`GeckoTerminal ${resp.status}`);
    const json = await resp.json();

    if (!json.data) return [];
    return json.data.map((pool) => ({
      id: pool.id,
      address: pool.attributes?.address,
      baseToken: pool.attributes?.base_token?.name,
      symbol: pool.attributes?.base_token?.symbol,
      priceUsd: pool.attributes?.price_usd,
      fdv: pool.attributes?.fdv_usd,
      marketCap: pool.attributes?.market_cap_usd,
      createdAt: pool.attributes?.pool_created_at,
    }));
  } catch (err) {
    console.error("fetchSolanaTokens failed:", err.message);
    return [];
  }
}

// Pick random
function pickRandom(arr, n) {
  if (!arr.length) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

// Ensure always 15
function ensure15(arr, allTokens) {
  const selected = pickRandom(arr, 15);
  while (selected.length < 15 && allTokens.length > 0) {
    const candidate = pickRandom(allTokens, 1)[0];
    if (!selected.find((t) => t.id === candidate.id)) {
      selected.push(candidate);
    }
  }
  return selected;
}

// Routes
app.get("/", (req, res) => res.json({ ok: true, message: "Backend is running!" }));

app.get("/api/pulse", async (req, res) => {
  try {
    const tokens = await fetchSolanaTokens();
    if (!tokens.length) {
      return res.json({ ok: true, ts: new Date().toISOString(), newPairs: [], finalStretch: [], migrated: [] });
    }

    const newPairs = ensure15(tokens, tokens);
    const finalStretch = ensure15(tokens, tokens);
    const migrated = ensure15(tokens, tokens);

    res.json({
      ok: true,
      ts: new Date().toISOString(),
      newPairs,
      finalStretch,
      migrated,
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
