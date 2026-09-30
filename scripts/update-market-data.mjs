import { mkdir, writeFile } from "node:fs/promises";

const symbols = {
  "SAND": { yahoo: "SAND.ST", name: "Sandvik" },
  "NIBE B": { yahoo: "NIBE-B.ST", name: "NIBE Industrier B" },
  "BONEX": { yahoo: "BONEX.ST", name: "BONESUPPORT" },
  "OMXS30": { yahoo: "^OMX", name: "OMXS30" }
};

async function fetchQuote(symbol) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
    encodeURIComponent(symbol) +
    "?range=1d&interval=5m&includePrePost=false&events=div%2Csplits";
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Yahoo HTTP ${response.status} for ${symbol}`);
  const json = await response.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No chart result for ${symbol}`);
  const meta = result.meta ?? {};
  const price = Number(meta.regularMarketPrice ?? meta.previousClose);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose);
  if (!Number.isFinite(price)) throw new Error(`No price for ${symbol}`);
  return {
    symbol,
    price,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    dayPct: Number.isFinite(previousClose) && previousClose ? (price / previousClose - 1) * 100 : null,
    currency: meta.currency ?? "SEK",
    exchange: meta.exchangeName ?? null,
    marketState: meta.marketState ?? null,
    fetchedAt: new Date().toISOString()
  };
}

const quotes = {};
for (const [key, config] of Object.entries(symbols)) {
  try {
    quotes[key] = await fetchQuote(config.yahoo);
  } catch (error) {
    quotes[key] = { symbol: config.yahoo, error: String(error), fetchedAt: new Date().toISOString() };
  }
}

await mkdir("data", { recursive: true });
await writeFile("data/market.json", JSON.stringify({
  version: 1,
  source: "Yahoo Finance chart endpoint",
  disclaimer: "Market data may be delayed. This file is for dashboard analysis and is not an execution feed.",
  fetchedAt: new Date().toISOString(),
  quotes
}, null, 2) + "\n");
