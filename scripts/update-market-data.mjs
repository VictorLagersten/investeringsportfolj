import { mkdir, writeFile } from "node:fs/promises";

const symbols = {
  "ASSA-B": { yahoo: "ASSA-B.ST", name: "ASSA ABLOY B" },
  "NIBE B": { yahoo: "NIBE-B.ST", name: "NIBE Industrier B" },
  "BONEX": { yahoo: "BONEX.ST", name: "BONESUPPORT" },
  "OMXS30": { yahoo: "^OMX", name: "OMXS30" }
};

const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 2;

async function fetchQuote(symbol) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
    encodeURIComponent(symbol) +
    "?range=1d&interval=5m&includePrePost=false&events=div%2Csplits";

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal
      });
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
        dayPct: Number.isFinite(previousClose) && previousClose
          ? (price / previousClose - 1) * 100
          : null,
        currency: meta.currency ?? "SEK",
        exchange: meta.exchangeName ?? null,
        marketState: meta.marketState ?? null,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? new Error(`Yahoo request timed out after ${REQUEST_TIMEOUT_MS / 1000}s for ${symbol}`)
        : error;
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

const quotes = {};
for (const [key, config] of Object.entries(symbols)) {
  try {
    quotes[key] = await fetchQuote(config.yahoo);
    console.log(`Updated ${key}: ${quotes[key].price}`);
  } catch (error) {
    console.warn(`Failed ${key}: ${error.message}`);
    quotes[key] = {
      symbol: config.yahoo,
      name: config.name,
      error: String(error.message ?? error),
      fetchedAt: new Date().toISOString()
    };
  }
}

await mkdir("data", { recursive: true });
await writeFile("data/market.json", JSON.stringify({
  version: 2,
  source: "Yahoo Finance chart endpoint",
  disclaimer: "Market data may be delayed. This file is for dashboard analysis and is not an execution feed.",
  fetchedAt: new Date().toISOString(),
  quotes
}, null, 2) + "\n");
