// api/quotes.js
// Fonction serverless Vercel — aucune clé API, aucune inscription requise.
// Le navigateur du visiteur appelle cette fonction (même origine, donc pas de souci CORS),
// et c'est le serveur Vercel qui va chercher les données publiques de cours de bourse.
//
// Déploiement : place ce fichier dans un dossier /api à la racine du projet Vercel.
// Vercel le reconnaît automatiquement comme une fonction serverless Node.js — aucune config nécessaire.

const SYMBOLS = [
  { symbol: "^GSPC",     label: "S&P 500" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50" },
  { symbol: "^BFX",      label: "BEL 20" },
  { symbol: "IWDA.AS",   label: "iShares Core MSCI World (IWDA)" },
  { symbol: "VWCE.DE",   label: "Vanguard FTSE All-World (VWCE)" },
  { symbol: "EURUSD=X",  label: "EUR / USD" },
];

async function fetchQuote({ symbol, label }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EducateurFinancierBot/1.0)" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") {
      throw new Error("no_data");
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
    return { symbol, label, error: true };
  }
}

export default async function handler(req, res) {
  try {
    const quotes = await Promise.all(SYMBOLS.map(fetchQuote));
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=180");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      updated: new Date().toISOString(),
      quotes,
    });
  } catch (e) {
    res.status(500).json({ error: "fetch_failed", message: String(e) });
  }
}
