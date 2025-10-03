// src/server.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// permissive CORS for dev
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Healthcheck
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend is running!" });
});

/**
 * fetchPairs()
 * - Uses DexScreener search endpoint (works for multi-pair results)
 * - Tries a few search queries (solana, pumpfun solana) and returns first usable pairs array
 * - Returns [] if nothing usable
 */
async function fetchPairs() {
  const base = "https://api.dexscreener.com";
  const tryUrls = [
    `${base}/latest/dex/search?q=solana`,
    `${base}/latest/dex/search?q=pumpfun+solana`,
    `${base}/latest/dex/search?q=solana+pumpfun`
  ];

  let lastErr = null;
  for (const url of tryUrls) {
    try {
      const resp = await fetch(url, { headers: { Accept: "*/*" } });
      const text = await resp.text().catch(() => null);

      if (!resp.ok) {
        console.warn(`Dexscreener responded ${resp.status} for ${url} — preview: ${text?.slice(0,200)}`);
        lastErr = new Error(`Dexscreener ${resp.status} - ${text?.slice(0,200)}`);
        continue; // try next url
      }

      // try parse JSON (some responses may return HTML when blocked)
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        // upstream returned non-JSON even though status was 200
        console.warn(`Dexscreener returned non-JSON at ${url} — preview: ${text?.slice(0,200)}`);
        lastErr = new Error("Dexscreener returned non-JSON");
        continue;
      }

      // success: ensure .pairs exists
      if (json && Array.isArray(json.pairs)) {
        return json.pairs;
      }

      // sometimes the search endpoint returns objects with pairs nested; return empty array if not present
      if (json && json.pairs) {
        return Array.isArray(json.pairs) ? json.pairs : [];
      }

      // nothing usable here — continue
      lastErr = new Error("Dexscreener returned no pairs");
    } catch (err) {
      console.warn(`fetchPairs error for ${url}:`, err?.message || err);
      lastErr = err;
    }
  }

  // if we get here, nothing worked
  throw lastErr || new Error("No usable Dexscreener endpoint responded");
}

// Migrated (Raydium)
app.get("/api/migrated", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = (pairs || []).filter(p => p.dexId === "raydium");
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    console.error("ERR /api/migrated:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// New Pairs (pumpfun)
app.get("/api/new-pairs", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = (pairs || []).filter(p => p.dexId === "pumpfun");
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    console.error("ERR /api/new-pairs:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Final Stretch (pumpfun with FDV/marketCap >= 15000)
app.get("/api/final-stretch", async (req, res) => {
  try {
    const pairs = await fetchPairs();
    const coins = (pairs || []).filter(p => {
      const fdv = Number(p.fdv ?? p.fdvUsd ?? p.marketCap ?? 0);
      return p.dexId === "pumpfun" && fdv >= 15000;
    });
    res.json({ ok: true, count: coins.length, coins });
  } catch (err) {
    console.error("ERR /api/final-stretch:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
