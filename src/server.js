// src/server.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// simple CORS for dev
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// --- cache + inflight support to avoid hammering Dexscreener ---
const CACHE_TTL_MS = 15_000; // 15 seconds
let cache = { pairs: null, ts: 0 };
let inflightFetchPromise = null;

async function fetchPairsFromDex() {
  const url = "https://api.dexscreener.com/latest/dex/search?q=solana";
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await resp.text().catch(() => null);

  if (!resp.ok) {
    // return full text preview for logs & error messages
    const preview = text ? text.slice(0, 1000) : "";
    const err = new Error(`Dexscreener ${resp.status} - ${preview}`);
    err.status = resp.status;
    throw err;
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error("Dexscreener returned non-JSON");
  }

  // normalize: expect json.pairs array
  return Array.isArray(json.pairs) ? json.pairs : [];
}

async function fetchPairs() {
  const now = Date.now();
  if (cache.pairs && now - cache.ts < CACHE_TTL_MS) return cache.pairs;

  // if a fetch is already in progress, wait for it
  if (inflightFetchPromise) {
    try { return await inflightFetchPromise; }
    finally { /* return to caller */ }
  }

  inflightFetchPromise = (async () => {
    try {
      const pairs = await fetchPairsFromDex();
      cache = { pairs, ts: Date.now() };
      return pairs;
    } catch (err) {
      // if DexScreener rate-limited (429) or otherwise failed and we have cached data, return cache
      if (cache.pairs && cache.pairs.length > 0) {
        console.warn("fetchPairs: upstream failed, returning cached pairs:", err.message);
        return cache.pairs;
      }
      // no cache — rethrow so callers can return proper 503/429
      throw err;
    } finally {
      inflightFetchPromise = null;
    }
  })();

  return await inflightFetchPromise;
}

// --- helpers to build each view ---
function filterNewPairs(pairs) {
  return pairs.filter(p => p.dexId === "pumpfun");
}
function filterFinalStretch(pairs) {
  return pairs.filter(p => {
    if (p.dexId !== "pumpfun") return false;
    const fdv = Number(p.fdv ?? p.fdvUsd ?? p.marketCap ?? 0);
    return fdv >= 15000;
  });
}
function filterMigrated(pairs) {
  return pairs.filter(p => p.dexId === "raydium");
}

// --- routes ---
app.get("/", (req, res) => res.json({ ok: true, message: "Backend is running!" }));

app.get("/api/new-pairs", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = filterNewPairs(pairs);
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    console.error("ERR /api/new-pairs:", err.message || err);
    const status = err.status === 429 ? 429 : 503;
    res.status(status).json({ ok: false, error: err.message });
  }
});

app.get("/api/final-stretch", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = filterFinalStretch(pairs);
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    console.error("ERR /api/final-stretch:", err.message || err);
    const status = err.status === 429 ? 429 : 503;
    res.status(status).json({ ok: false, error: err.message });
  }
});

app.get("/api/migrated", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = filterMigrated(pairs);
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    console.error("ERR /api/migrated:", err.message || err);
    const status = err.status === 429 ? 429 : 503;
    res.status(status).json({ ok: false, error: err.message });
  }
});

// convenience aggregated endpoint the frontend can use (optional)
app.get("/api/pulse", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      newPairs: filterNewPairs(pairs),
      finalStretch: filterFinalStretch(pairs),
      migrated: filterMigrated(pairs),
    });
  } catch (err) {
    console.error("ERR /api/pulse:", err.message || err);
    const status = err.status === 429 ? 429 : 503;
    res.status(status).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
