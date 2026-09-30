const STORAGE_KEY = "vardagskapital-holdings-v1";
const seed = [
  { name: "Investor B", ticker: "INVE B", type: "Aktie", quantity: 42, price: 286.4, cost: 242.8 },
  { name: "Avanza Zero", ticker: "AZ", type: "Fond", quantity: 118.5, price: 168.2, cost: 149.7 },
  { name: "Volvo B", ticker: "VOLV B", type: "Aktie", quantity: 31, price: 279.8, cost: 251.1 },
  { name: "Länsförsäkringar Global Index", ticker: "LF Global", type: "Fond", quantity: 64, price: 312.6, cost: 285.3 }
];
const money = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 });
let holdings = loadHoldings();
const body = document.querySelector("#holdings");
const dialog = document.querySelector("#holdingDialog");
const form = document.querySelector("#holdingForm");

function loadHoldings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}
function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function render() {
  const total = holdings.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const invested = holdings.reduce((sum, item) => sum + item.quantity * item.cost, 0);
  const gain = total - invested;
  const stockValue = holdings.filter(item => item.type === "Aktie").reduce((sum, item) => sum + item.quantity * item.price, 0);
  const fundValue = total - stockValue;
  document.querySelector("#totalValue").textContent = money.format(total);
  document.querySelector("#invested").textContent = money.format(invested);
  document.querySelector("#gain").textContent = (gain >= 0 ? "+" : "") + money.format(gain);
  document.querySelector("#gain").classList.toggle("positive", gain >= 0);
  document.querySelector("#gain").classList.toggle("negative", gain < 0);
  document.querySelector("#gainPercent").textContent = invested ? ((gain / invested) * 100).toLocaleString("sv-SE", { maximumFractionDigits: 1 }) + "%" : "0%";
  document.querySelector("#totalChange").textContent = invested ? ((gain / invested) * 100).toLocaleString("sv-SE", { maximumFractionDigits: 1 }) + "%" : "0%";
  document.querySelector("#holdingCount").textContent = number.format(holdings.length);
  document.querySelector("#stocksShare").textContent = total ? Math.round(stockValue / total * 100) + "%" : "0%";
  document.querySelector("#fundsShare").textContent = total ? Math.round(fundValue / total * 100) + "%" : "0%";
  const stocksPercent = total ? stockValue / total * 100 : 0;
  document.querySelector(".donut").style.background = total ? `conic-gradient(#63876d 0 ${stocksPercent}%, #c9d8ca ${stocksPercent}% 100%)` : "#e8eee8";
  body.innerHTML = holdings.length ? holdings.map((item, index) => {
    const value = item.quantity * item.price;
    const itemGain = item.quantity * (item.price - item.cost);
    const percent = item.cost ? ((item.price - item.cost) / item.cost) * 100 : 0;
    const ticker = item.ticker || item.name.slice(0, 5).toUpperCase();
    return `<tr><td><div class="asset"><span class="ticker">${esc(ticker)}</span>${esc(item.name)}</div></td><td><span class="pill">${esc(item.type)}</span></td><td>${number.format(item.quantity)}</td><td>${money.format(item.price)}</td><td>${money.format(value)}</td><td class="row-gain" style="color:${itemGain < 0 ? "#b65c52" : ""}">${itemGain >= 0 ? "+" : ""}${money.format(itemGain)} · ${percent.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}%</td><td><button class="remove" data-remove="${index}" aria-label="Ta bort ${esc(item.name)}">×</button></td></tr>`;
  }).join("") : '<tr><td colspan="7">Inga innehav ännu. Lägg till ditt första innehav.</td></tr>';
}
document.querySelector("#addHolding").addEventListener("click", () => dialog.showModal());
form.addEventListener("submit", event => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const name = String(data.get("name")).trim();
  const quantity = Number(data.get("quantity"));
  const price = Number(data.get("price"));
  const cost = Number(data.get("cost"));
  if (!name || ![quantity, price, cost].every(Number.isFinite)) return;
  holdings.push({ name, ticker: name.slice(0, 7).toUpperCase(), type: String(data.get("type")), quantity, price, cost });
  save();
  render();
  form.reset();
  dialog.close();
});
body.addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  holdings.splice(Number(button.dataset.remove), 1);
  save();
  render();
});
document.querySelector("#resetData").addEventListener("click", () => {
  if (!confirm("Återställa innehaven till exempeldata? Detta ersätter dina sparade innehav i den här webbläsaren.")) return;
  holdings = structuredClone(seed);
  save();
  render();
});
document.querySelector("#period").addEventListener("change", event => {
  const descriptions = { "1m": "1 månad", "3m": "3 månader", "6m": "6 månader", "1y": "1 år", "all": "sedan start" };
  document.querySelector(".chart-panel .eyebrow").textContent = "UTVECKLING · " + descriptions[event.target.value].toUpperCase();
});
render();
