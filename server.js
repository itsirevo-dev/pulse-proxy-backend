const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("tiny"));

// ------------------- MIGRATED ROUTE -------------------
// Usage: /api/migrated?mint=<solanaMintAddress>
app.get("/api/migrated", async (req, res) => {
  try {
    const mint = req.query.mint;
    if (!mint) {
      return res.status(400).json({ ok: false, error: "Missing ?mint= parameter" });
    }

    const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    const text = await r.text();

    try {
      const data = JSON.parse(text);
      return res.json({ ok: true, data });
    } catch (e) {
      return res.status(502).json({
        ok: false,
        error: "Invalid JSON, got HTML instead",
        raw: text.slice(0, 500)
      });
    }
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err.message
    });
  }
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Proxy running on http://localhost:${PORT}`)
);
