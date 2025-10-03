// src/server.js
import express from "express";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Allow all CORS (for testing)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

const TTL = 60_000; // 60s cache
let cache = { pairs: null, ts: 0 };

async function fetchPairs() {
  const now = Date.now();
  if (cache.pairs && now - cache.ts < TTL) return cache.pairs;

  try {
    const url = "https://api.dexscreener.com/latest/dex/search?q=solana";
    const resp = await fetch(url, { headers: { Accept: "application/json" } });

    if (!resp.ok) throw new Error("Dexscreener " + resp.status);
    const json = await resp.json();

    cache = { pairs: json.pairs || [], ts: Date.now() };
    return cache.pairs;
  } catch (err) {
    console.warn("Dexscreener failed, serving fallback:", err.message);
    try {
      const raw = fs.readFileSync("./fallback.json", "utf8");
      const parsed = JSON.parse(raw);
      return parsed.pairs || [];
    } catch (e) {
      console.error("No fallback.json found or invalid:", e.message);
      return [];
    }
  }
}

function pickRandom(arr, n = 10) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

// Filters
function filterNewPairs(pairs) {
  return pairs.filter(p => p.dexId === "pumpfun" && Number(p.fdv ?? 0) < 10000);
}
function filterFinalStretch(pairs) {
  return pairs.filter(p => p.dexId === "pumpfun" && Number(p.fdv ?? 0) < 80000);
}
function filterMigrated(pairs) {
  return pairs.filter(p => p.dexId === "raydium" && Number(p.fdv ?? 0) < 80000);
}

// Routes
app.get("/", (req, res) => res.json({ ok: true, message: "Backend is running!" }));

app.get("/api/new-pairs", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = pickRandom(filterNewPairs(pairs), 10);
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.get("/api/final-stretch", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = pickRandom(filterFinalStretch(pairs), 10);
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.get("/api/migrated", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = pickRandom(filterMigrated(pairs), 10);
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// Aggregate route
app.get("/api/pulse", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    res.json({
      ok: true,
      ts: new Date().toISOString(),
      newPairs: pickRandom(filterNewPairs(pairs), 10),
      finalStretch: pickRandom(filterFinalStretch(pairs), 10),
      migrated: pickRandom(filterMigrated(pairs), 10),
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
