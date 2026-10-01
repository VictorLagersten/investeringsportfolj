# Dashboard chat sync

## Source of truth

Use `data/portfolio-journal.json` as the shared record for portfolio quantities, average cost, cash, paper trades, research notes, and verified candidates. The dashboard loads this file automatically when it opens. Market prices remain in the separate market data feed.

When a conversation in the Investerning project contains a completed portfolio analysis or paper trade, update the shared journal in that same task and commit the change to `main`. Include date, rationale, evidence/source and uncertainty. Add trades only when the paper transaction is confirmed; keep unknown dates and fees null. Never invent scores, returns, prices, or transaction details.

## Scope and limitations

The dashboard is public on GitHub Pages. Do not put credentials, private account details, or non-public personal data in the shared journal. It is paper trading only; do not place real orders.

GitHub Pages cannot read ChatGPT conversations. A conversation must be available to the assistant in the current task, and the assistant must explicitly publish its verified result to the shared journal. This file is not an automatic transcript feed for unrelated chats. ChatGPT project context and the dashboard are separate systems.

## Dashboard behavior

- On page load, merge the shared holdings, trades and research from `data/portfolio-journal.json`.
- Do not let browser-local storage become the canonical shared ledger.
- Keep candidate tables empty until adequate verified data is available.
- Preserve historical records; append or update by stable IDs to avoid duplicates.
- Check the GitHub Pages deployment after publishing changes.
