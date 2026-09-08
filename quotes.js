// api/quotes.js
// Fonction serverless Vercel — aucune clé API, aucune inscription requise.
// Le navigateur du visiteur appelle cette fonction (même origine, donc pas de souci CORS),
// et c'est le serveur Vercel qui va chercher les données publiques de cours de bourse.
//
// Déploiement : place ce fichier dans un dossier /api à la racine du projet Vercel.
// Vercel le reconnaît automatiquement comme une fonction serverless Node.js — aucune config nécessaire.
//
// Diagnostic : visite /api/quotes?debug=1 pour voir le détail des erreurs par symbole.

const SYMBOLS = [
  { symbol: "^GSPC",     label: "S&P 500" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50" },
  { symbol: "^BFX",      label: "BEL 20" },
  { symbol: "IWDA.AS",   label: "iShares Core MSCI World (IWDA)" },
  { symbol: "VWCE.DE",   label: "Vanguard FTSE All-World (VWCE)" },
];

async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchQuote({ symbol, label }, debug) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  try {
    const r = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
      },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") {
      throw new Error("no_data_in_response");
    }
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      label,
      price,
      change,
      changePct,
      currency: meta.currency || "",
      time: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
      error: false,
    };
  } catch (e) {
    return { symbol, label, error: true, debugMessage: debug ? String(e && e.message || e) : undefined };
  }
}

async function fetchEurUsd(debug) {
  // Source dédiée et fiable pour le taux de change (indépendante de Yahoo Finance).
  try {
    const r = await fetchWithTimeout("https://api.frankfurter.app/latest?from=EUR&to=USD", {}, 6000);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const rate = data?.rates?.USD;
    if (typeof rate !== "number") throw new Error("no_rate");
    return { symbol: "EURUSD", label: "EUR / USD", price: rate, change: 0, changePct: 0, currency: "USD", time: null, error: false };
  } catch (e) {
    return { symbol: "EURUSD", label: "EUR / USD", error: true, debugMessage: debug ? String(e && e.message || e) : undefined };
  }
}

export default async function handler(req, res) {
  const debug = req.query && (req.query.debug === "1" || req.query.debug === "true");
  try {
    const [stockQuotes, eurUsd] = await Promise.all([
      Promise.all(SYMBOLS.map((s) => fetchQuote(s, debug))),
      fetchEurUsd(debug),
    ]);
    const quotes = [...stockQuotes, eurUsd];
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=180");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      updated: new Date().toISOString(),
      quotes,
    });
  } catch (e) {
    res.status(500).json({ error: "fetch_failed", message: String(e && e.message || e) });
  }
}
