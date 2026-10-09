# Dashboard sync

## Canonical data

- `portfolio.json` is the canonical current paper account: starting capital, holdings, cash, reference prices and cumulative fee total.
- `ledger.json` is the canonical transaction list.
- `data/portfolio-journal.json` contains analyses, research, decision notes and source links.

When recording a confirmed **paper** trade, update the ledger and current portfolio together, reconcile cash and fees, and append a dated journal note. Preserve historical transactions. Correct a mistaken summary with a clearly identified correction note; do not replace a recorded trade with an invented one. Keep unknown dates, fees, fills and returns null/unknown. Reference prices must not be represented as exact fills.

Initial transactions may have unknown transaction-level fees even when an aggregate cash reconciliation is available. State the method and uncertainty; do not allocate an aggregate across individual trades without evidence.

## Dashboard refresh

The dashboard fetches `portfolio.json` and `ledger.json` from the same Pages origin with cache-busting on page load and every five minutes. The model journal is checked every five minutes. Portfolio valuations may use `data/market.json` only when the delayed hourly feed is fresh (at most 90 minutes) and has a quote for each holding. Otherwise use the reference prices and make that fallback visible. The feed runs hourly at minute 17 (GitHub may delay scheduled runs).

GitHub Pages deploys repository commits from `main` and the root directory. Verify the completed Pages deployment and the live dashboard after publishing.

## Chat and paper trading boundaries

GitHub Pages cannot read ChatGPT history directly. Only information explicitly reviewed and published to these shared files appears in the dashboard; ordinary chat messages do not sync automatically.

The portfolio is paper trading only. Never place real trades. The scheduled analysis windows are Tuesday/Friday 10:00–10:30 Europe/Stockholm; the daily report is at 18:00. Each window must publish a journal record with tradeWindowDate and tradeWindowStatus=TRADE or NO_TRADE. A GitHub Actions watchdog records MISSLYCKAD HANDELSCYKEL if no decision is published by the end of the window. The watchdog validates data and records missed windows; it does not make investment decisions. If an automation starts after a locked window or verified inputs are missing, never simulate a trade retroactively.
