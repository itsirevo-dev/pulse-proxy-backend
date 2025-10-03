// src/server.js
import express from "express";


const app = express();
const PORT = process.env.PORT || 3000;

// Allow CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Cache
const TTL = 60_000;
let cache = { data: null, ts: 0 };

// Format market cap
function formatNumber(num) {
  if (!num) return "N/A";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

// Format relative time
function timeAgo(ts) {
  if (!ts) return "Unknown";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Transform token data
function transformToken(p) {
  return {
    symbol: p.baseToken?.symbol || "N/A",
    name: p.baseToken?.name || "Unknown Token",
    logo: p.info?.imageUrl || null,
    priceUsd: p.priceUsd ? `$${Number(p.priceUsd).toFixed(6)}` : "N/A",
    marketCap: formatNumber(p.marketCap),
    url: p.url,
    age: timeAgo(p.pairCreatedAt)
  };
}

// Fetch Solana tokens
async function fetchSolanaTokens() {
  const now = Date.now();
  if (cache.data && now - cache.ts < TTL) return cache.data;

  const url = "https://api.geckoterminal.com/api/v2/networks/solana/pools";
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("GeckoTerminal " + resp.status);
    const json = await resp.json();
    const pools = json.data || [];

    const tokens = pools.map(p => ({
      baseToken: {
        symbol: p.attributes?.token_symbol,
        name: p.attributes?.token_name
      },
      info: { imageUrl: p.attributes?.token_logo_url },
      priceUsd: p.attributes?.price_in_usd,
      marketCap: p.attributes?.market_cap_usd,
      url: `https://www.geckoterminal.com/solana/pools/${p.id}`,
      pairCreatedAt: Date.parse(p.attributes?.created_at)
    }));

    cache = { data: tokens, ts: Date.now() };
    return tokens;
  } catch (err) {
    console.error("fetchSolanaTokens failed:", err.message);
    return [];
  }
}

// Routes
app.get("/", (req, res) => res.json({ ok: true, message: "Backend is running!" }));

app.get("/api/pulse", async (req, res) => {
  try {
    const tokens = await fetchSolanaTokens();
    res.json({
      ok: true,
      ts: new Date().toISOString(),
      newPairs: tokens.slice(0, 15).map(transformToken),
      finalStretch: tokens.slice(15, 30).map(transformToken),
      migrated: tokens.slice(30, 45).map(transformToken),
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// Start
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
