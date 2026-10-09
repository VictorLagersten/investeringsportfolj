import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "portfolio-integrity.mjs");
const testNow = "2026-10-13T08:35:00.000Z"; // 10:35 in Stockholm on Tuesday
const makeFixture = (withDecision) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-integrity-test-"));
  fs.copyFileSync(path.join(root, "portfolio.json"), path.join(dir, "portfolio.json"));
  fs.copyFileSync(path.join(root, "ledger.json"), path.join(dir, "ledger.json"));
  fs.cpSync(path.join(root, "data"), path.join(dir, "data"), { recursive: true });
  const marketPath = path.join(dir, "data", "market.json");
  const market = JSON.parse(fs.readFileSync(marketPath, "utf8"));
  market.fetchedAt = testNow;
  fs.writeFileSync(marketPath, JSON.stringify(market, null, 2) + "\n");
  const journalPath = path.join(dir, "data", "portfolio-journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  journal.research = (journal.research || []).filter(x => x.tradeWindowDate !== "2026-10-13");
  if (withDecision) journal.research.unshift({
    id: "test-no-trade-2026-10-13",
    date: "2026-10-13",
    tradeWindowDate: "2026-10-13",
    tradeWindowStatus: "NO_TRADE",
    title: "Test: valid NO_TRADE"
  });
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n");
  return dir;
};
const run = (dir) => spawnSync(process.execPath, [script], {
  cwd: dir,
  encoding: "utf8",
  env: { ...process.env, GITHUB_EVENT_NAME: "schedule", PORTFOLIO_TEST_NOW: testNow }
});

let missingDir;
let validDir;
try {
  missingDir = makeFixture(false);
  const missing = run(missingDir);
  assert.equal(missing.status, 1, "missing trade decision must exit non-zero");
  const failedReport = JSON.parse(fs.readFileSync(path.join(missingDir, "data", "portfolio-integrity.json"), "utf8"));
  const failedJournal = JSON.parse(fs.readFileSync(path.join(missingDir, "data", "portfolio-journal.json"), "utf8"));
  assert.equal(failedReport.status, "FAIL", "missed window must be reported as FAIL");
  assert.equal(failedJournal.research[0].tradeWindowStatus, "FAILED", "missing decision must create FAILED record");

  validDir = makeFixture(true);
  const valid = run(validDir);
  assert.equal(valid.status, 0, "valid NO_TRADE decision should not fail the audit");
  const validReport = JSON.parse(fs.readFileSync(path.join(validDir, "data", "portfolio-integrity.json"), "utf8"));
  const validJournal = JSON.parse(fs.readFileSync(path.join(validDir, "data", "portfolio-journal.json"), "utf8"));
  assert.equal(validReport.status, "PASS", "valid decision and reconciled files should pass");
  assert.equal(validReport.tradeWindow.auditAdded, false, "valid decision must not create a failure record");
  assert.equal(validJournal.research[0].tradeWindowStatus, "NO_TRADE", "valid decision must remain unchanged");
  console.log("PASS: missing decision -> published FAILED + FAIL exit; valid NO_TRADE -> PASS with no mutation.");
} finally {
  if (missingDir) fs.rmSync(missingDir, { recursive: true, force: true });
  if (validDir) fs.rmSync(validDir, { recursive: true, force: true });
}
