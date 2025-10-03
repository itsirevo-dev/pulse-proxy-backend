import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

const TTL = 60_000;
let cache = { data: null, ts: 0 };

// Format numbers (K/M/B)
function formatNumber(val) {
  if (!val || isNaN(val)) return "N/A";
  const num = Number(val);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

// Time ago
function timeAgo(ts) {
  if (!ts) return "Unknown";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Transform GeckoTerminal pool -> token info
function transformPool(p) {
  const attrs = p.attributes || {};
  return {
    symbol: attrs.token_symbol || "N/A",
    name: attrs.token_name || "Unknown Token",
    logo: attrs.token_logo_url || null,
    priceUsd: attrs.price_in_usd ? `$${parseFloat(attrs.price_in_usd).toFixed(6)}` : "N/A",
    marketCap: formatNumber(attrs.market_cap_usd),
    url: `https://www.geckoterminal.com/solana/pools/${p.id}`,
    age: attrs.created_at ? timeAgo(Date.parse(attrs.created_at)) : "Unknown",
  };
}

// Fetch solana tokens
async function fetchSolanaTokens() {
  const now = Date.now();
  if (cache.data && now - cache.ts < TTL) return cache.data;

  const url = "https://api.geckoterminal.com/api/v2/networks/solana/pools";
  try {
    const resp = await fetch(url); // native fetch in Node 18+
    if (!resp.ok) throw new Error("GeckoTerminal " + resp.status);
    const json = await resp.json();

    const pools = json.data || [];
    const tokens = pools.map(transformPool);

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
      newPairs: tokens.slice(0, 15),
      finalStretch: tokens.slice(15, 30),
      migrated: tokens.slice(30, 45),
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
