const STORE = "investern-ing-dashboard-v2";
const INITIAL = {
  startCapital: 50000,
  cash: 10013.64,
  benchmarkDayPct: 0.35,
  asOf: "2026-09-30",
  holdings: [
    { ticker: "SAND", name: "Sandvik", quantity: 40, price: 380, previousPrice: 378.5, cost: 374.1, dayPct: 0.40 },
    { ticker: "NIBE B", name: "NIBE Industrier B", quantity: 328, price: 45.6, previousPrice: 45.16, cost: 45.7, dayPct: 0.97 },
    { ticker: "BONEX", name: "BONESUPPORT", quantity: 44, price: 236.8, previousPrice: 232.2, cost: 227.2, dayPct: 1.98 }
  ],
  history: [
    { date: "2026-09-28", value: 50000 },
    { date: "2026-09-29", value: 50197.08 },
    { date: "2026-09-30", value: 50589.64 }
  ]
};
const money = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });
const precise = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let data = readData();
const positions = document.querySelector("#positions");
const priceDialog = document.querySelector("#priceDialog");
const snapshotDialog = document.querySelector("#snapshotDialog");

function readData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    return saved?.holdings && saved?.history ? saved : structuredClone(INITIAL);
  } catch {
    return structuredClone(INITIAL);
  }
}
function persist() { localStorage.setItem(STORE, JSON.stringify(data)); }
function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function signedMoney(value) { return (value > 0 ? "+" : value < 0 ? "−" : "") + money.format(Math.abs(value)); }
function valueNow() { return data.cash + data.holdings.reduce((sum, h) => sum + h.quantity * h.price, 0); }
function dateLabel(date, options = { day: "numeric", month: "short" }) {
  return new Date(date + "T12:00:00").toLocaleDateString("sv-SE", options);
}
function renderPositions() {
  positions.innerHTML = data.holdings.map(h => {
    const market = h.quantity * h.price;
    const totalGain = h.quantity * (h.price - h.cost);
    const dayMove = h.dayPct ?? (h.previousPrice ? (h.price / h.previousPrice - 1) * 100 : 0);
    const totalPct = h.cost ? (h.price / h.cost - 1) * 100 : 0;
    return `<tr><td><div class="name-cell"><span class="ticker">${h.ticker}</span><span class="company">${h.name}<small>${h.name === "NIBE Industrier B" ? "Industri" : h.name === "BONESUPPORT" ? "Medicinteknik" : "Industri"}</small></span></div></td><td>${h.quantity}</td><td>${precise.format(h.price)}</td><td>${money.format(market)}</td><td class="${dayMove >= 0 ? "up" : "down"}">${dayMove >= 0 ? "+" : ""}${pct.format(dayMove)}%</td><td class="${totalGain >= 0 ? "up" : "down"}">${signedMoney(totalGain)} <small>(${totalPct >= 0 ? "+" : ""}${pct.format(totalPct)}%)</small></td></tr>`;
  }).join("");
}
function selectedHistory() {
  const period = document.querySelector("#period").value;
  const points = [...data.history].sort((a,b) => a.date.localeCompare(b.date));
  if (period === "all" || points.length < 2) return points;
  const last = new Date(points.at(-1).date + "T12:00:00");
  const months = period === "1m" ? 1 : period === "3m" ? 3 : 12;
  const cutoff = new Date(last);
  cutoff.setMonth(cutoff.getMonth() - months);
  const filtered = points.filter(p => new Date(p.date + "T12:00:00") >= cutoff);
  return filtered.length > 1 ? filtered : points;
}
function renderChart() {
  const points = selectedHistory();
  const chart = document.querySelector("#historyChart");
  const empty = document.querySelector("#chartEmpty");
  const valueOut = document.querySelector("#chartValue");
  const changeOut = document.querySelector("#chartChange");
  const labels = document.querySelector("#chartDates");
  const axes = document.querySelector("#axisLabels");
  if (!points.length) {
    chart.innerHTML = "";
    empty.hidden = false;
    valueOut.textContent = "–";
    changeOut.textContent = "Ingen historik ännu";
    labels.innerHTML = "";
    axes.innerHTML = "";
    return;
  }
  empty.hidden = points.length > 1;
  const vals = points.map(p => Number(p.value));
  const latest = vals.at(-1);
  const first = vals[0];
  const change = latest - first;
  const changePct = first ? change / first * 100 : 0;
  valueOut.textContent = money.format(latest);
  changeOut.textContent = points.length > 1 ? `${signedMoney(change)} · ${changePct >= 0 ? "+" : ""}${pct.format(changePct)} %` : "Första registrerade värdet";
  changeOut.className = change >= 0 ? "up" : "down";
  if (points.length < 2) {
    chart.innerHTML = "";
    labels.innerHTML = `<span>${dateLabel(points[0].date)}</span>`;
    axes.innerHTML = "";
    return;
  }
  const low = Math.min(...vals);
  const high = Math.max(...vals);
  const pad = Math.max((high - low) * .22, high * .003);
  const min = low - pad, max = high + pad;
  const coords = vals.map((v, i) => [i / (vals.length - 1) * 790 + 5, 238 - ((v - min) / (max - min)) * 220]);
  const line = coords.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L 795 250 L 5 250 Z`;
  const ticks = [max, (max + min) / 2, min];
  chart.innerHTML = `<defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#66896b" stop-opacity=".22"/><stop offset="100%" stop-color="#66896b" stop-opacity="0"/></linearGradient></defs>${ticks.map((v,i)=>`<line class="grid" x1="45" y1="${10+i*110}" x2="800" y2="${10+i*110}"/>`).join("")}<path class="area" d="${area}"/><path class="line" d="${line}"/>${coords.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#52795b" stroke="white" stroke-width="2"/>`).join("")}`;
  axes.innerHTML = ticks.map(v => `<span>${money.format(v).replace(" ","")}</span>`).join("");
  labels.innerHTML = points.map((p,i)=>i===0 || i===points.length-1 || (points.length>5 && i===Math.floor(points.length/2)) ? `<span>${dateLabel(p.date)}</span>` : "<span></span>").join("");
}
function render() {
  const total = valueNow();
  const equity = data.holdings.reduce((sum,h) => sum + h.quantity * h.price, 0);
  const overall = total - data.startCapital;
  const overallPct = overall / data.startCapital * 100;
  const sorted = [...data.history].sort((a,b)=>a.date.localeCompare(b.date));
  const prior = sorted.length > 1 ? sorted.at(-2).value : total;
  const day = total - prior;
  const dayPct = prior ? day / prior * 100 : 0;
  document.querySelector("#portfolioValue").textContent = precise.format(total);
  document.querySelector("#totalReturn").textContent = `${signedMoney(overall)} · ${overallPct >= 0 ? "+" : ""}${pct.format(overallPct)}%`;
  document.querySelector("#dayValue").textContent = signedMoney(day);
  document.querySelector("#dayPercent").textContent = `${dayPct >= 0 ? "+" : ""}${pct.format(dayPct)} % sedan föregående värdering`;
  document.querySelector("#dayValue").className = day >= 0 ? "up" : "down";
  document.querySelector("#cashValue").textContent = money.format(data.cash);
  document.querySelector("#stockExposure").textContent = `${(equity / total * 100).toLocaleString("sv-SE",{maximumFractionDigits:1})}% i aktier`;
  document.querySelector("#equityValue").textContent = money.format(equity);
  document.querySelector("#legendCash").textContent = money.format(data.cash);
  const equityPct = total ? equity / total * 100 : 0;
  document.querySelector("#equityShare").textContent = `${equityPct.toLocaleString("sv-SE",{maximumFractionDigits:1})}%`;
  document.querySelector("#donut").style.background = `conic-gradient(#52795b 0 ${equityPct}%,#d6e0d7 ${equityPct}% 100%)`;
  document.querySelector("#benchmark").textContent = `${dayPct-data.benchmarkDayPct >= 0 ? "+" : ""}${pct.format(dayPct-data.benchmarkDayPct)} pp`;
  document.querySelector("#benchmark").className = dayPct >= data.benchmarkDayPct ? "up" : "down";
  document.querySelector("#asof").textContent = `${dateLabel(data.asOf,{day:"numeric",month:"short",year:"numeric"})} · stängning`;
  const values = sorted.slice(-7).map(p=>p.value);
  if (values.length > 1) {
    const lo=Math.min(...values), hi=Math.max(...values), span=hi-lo || 1;
    const d=values.map((v,i)=>`${i?"L":"M"} ${i/(values.length-1)*300} ${64-((v-lo)/span)*55}`).join(" ");
    document.querySelector("#sparkline").innerHTML=`<path d="${d}"/>`;
  }
  renderPositions();
  renderChart();
}
function addHistory(date,value) {
  const item={date,value:Number(value)};
  const i=data.history.findIndex(p=>p.date===date);
  if(i>=0)data.history[i]=item;else data.history.push(item);
  data.history.sort((a,b)=>a.date.localeCompare(b.date));
}
function openPrices() {
  const fields=document.querySelector("#priceFields");
  fields.innerHTML=data.holdings.map((h,i)=>`<label class="price-row"><span>${h.name} · antal ${h.quantity}</span><input aria-label="${h.name} stängningskurs" name="price-${i}" type="number" min="0" step="0.01" value="${h.price}" required></label>`).join("");
  const form=document.querySelector("#priceForm");
  form.elements.cash.value=data.cash;
  form.elements.date.value=today();
  priceDialog.showModal();
}
document.querySelector("#updatePrices").addEventListener("click",openPrices);
document.querySelector("#cancelPrices").addEventListener("click",()=>priceDialog.close());
document.querySelector("#priceForm").addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget, fd=new FormData(form), date=String(fd.get("date"));
  data.holdings.forEach((h,i)=>{h.previousPrice=h.price;h.price=Number(fd.get(`price-${i}`));h.dayPct=h.previousPrice?(h.price/h.previousPrice-1)*100:0;});
  data.cash=Number(fd.get("cash"));data.asOf=date;
  addHistory(date,valueNow());persist();render();priceDialog.close();
});
document.querySelector("#saveDay").addEventListener("click",()=>{
  const form=document.querySelector("#snapshotForm");
  form.elements.value.value=valueNow().toFixed(2);form.elements.date.value=today();snapshotDialog.showModal();
});
document.querySelector("#cancelSnapshot").addEventListener("click",()=>snapshotDialog.close());
document.querySelector("#snapshotForm").addEventListener("submit",event=>{
  event.preventDefault();const fd=new FormData(event.currentTarget),date=String(fd.get("date"));
  addHistory(date,Number(fd.get("value")));data.asOf=date;persist();render();snapshotDialog.close();
});
document.querySelector("#period").addEventListener("change",renderChart);
document.querySelector("#backup").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="investern-ing-portfolj-backup.json";link.click();URL.revokeObjectURL(link.href);
});
document.querySelector("#reset").addEventListener("click",()=>{
  if(!confirm("Återställ dashboarden till senast kända portföljdata från projektet? Dina lokala uppdateringar ersätts."))return;
  data=structuredClone(INITIAL);persist();render();
});
render();
