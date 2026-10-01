# Investerning dashboard sync

For every task that analyzes the paper portfolio, makes or records a paper-trade decision, or materially changes the strategy, update `data/portfolio-journal.json` on `main` with the verified result before finishing. The dashboard reads this shared file; do not rely on browser-local storage as the shared record.

Record analysis separately from executed paper trades. Each analysis should include date, concise rationale, source links, data timestamp, and limitations. Only add candidates/scores supported by adequate verified data. Keep unknown dates, prices, fees, and results unknown rather than guessing. Never execute real trades or include credentials/private account data; the GitHub Pages dashboard is public.

GitHub Pages cannot access arbitrary ChatGPT conversation history. Only publish content available in the current task, and say clearly when another chat was not available. After a journal update, verify the Pages deployment.
