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
  ],
  transactions: [
    { type: "buy", name: "Sandvik", ticker: "SAND", quantity: 40, price: 374.1, date: null },
    { type: "buy", name: "NIBE Industrier B", ticker: "NIBE B", quantity: 328, price: 45.7, date: null },
    { type: "buy", name: "BONESUPPORT", ticker: "BONEX", quantity: 44, price: 227.2, date: null }
  ],
  plans: []
};
const money = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });
const precise = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let data = readData();
let selectedCalendarDate = [...data.history].sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.date ?? today();
let calendarMonth = new Date(selectedCalendarDate + "T12:00:00");
const positions = document.querySelector("#positions");
const priceDialog = document.querySelector("#priceDialog");
const snapshotDialog = document.querySelector("#snapshotDialog");

function readData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    return saved?.holdings && saved?.history ? { ...structuredClone(INITIAL), ...saved, transactions: saved.transactions ?? structuredClone(INITIAL.transactions), plans: saved.plans ?? [] } : structuredClone(INITIAL);
  } catch {
    return structuredClone(INITIAL);
  }
}
function persist() { localStorage.setItem(STORE, JSON.stringify(data)); }

let marketDataState = { fetchedAt: null, source: null, ok: false };

async function loadMarketData() {
  try {
    const response = await fetch("./data/market.json?ts=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("market data HTTP " + response.status);
    const payload = await response.json();
    const quotes = payload.quotes || {};
    let updated = false;
    data.holdings.forEach(h => {
      const q = quotes[h.ticker];
      const price = Number(q?.price);
      if (!Number.isFinite(price) || price <= 0) return;
      h.previousPrice = h.price;
      h.price = price;
      if (Number.isFinite(Number(q.dayPct))) h.dayPct = Number(q.dayPct);
      updated = true;
    });
    if (updated) {
      marketDataState = { fetchedAt: payload.fetchedAt || null, source: payload.source || null, ok: true };
      data.asOf = payload.fetchedAt || data.asOf;
      persist();
      render();
    } else {
      marketDataState = { fetchedAt: payload.fetchedAt || null, source: payload.source || null, ok: false };
    }
    updateMarketStatus();
  } catch (error) {
    marketDataState = { fetchedAt: null, source: null, ok: false, error: String(error) };
    updateMarketStatus();
  }
}

function updateMarketStatus() {
  const el = document.querySelector("#asof");
  if (!el) return;
  if (marketDataState.ok && marketDataState.fetchedAt) {
    const d = new Date(marketDataState.fetchedAt);
    el.textContent = "Marknadsdata " + d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) + " · automatisk";
    el.title = "Senaste hämtning: " + d.toLocaleString("sv-SE") + ". " + (marketDataState.source || "");
  } else {
    el.textContent = "Marknadsdata väntar på uppdatering · manuell fallback";
  }
}

loadMarketData();
setInterval(loadMarketData, 60 * 1000);
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

function renderTransactions() {
  const filter=document.querySelector("#tradeFilter").value;
  const rows=[...data.transactions].filter(t=>filter==="all"||t.type===filter).sort((a,b)=>(a.date||"9999-99-99").localeCompare(b.date||"9999-99-99"));
  document.querySelector("#tradeRows").innerHTML=rows.map(t=>{
    const type=t.type==="sell"?"Försäljning":"Köp";
    return "<tr><td>"+(t.date?dateLabel(t.date,{day:"numeric",month:"short",year:"numeric"}):"Datum saknas")+"</td><td><span class=\"trade-type "+t.type+"\">"+type+"</span></td><td><strong>"+t.name+"</strong> <small>"+(t.ticker||"")+"</small></td><td>"+Number(t.quantity).toLocaleString("sv-SE")+"</td><td>"+precise.format(t.price)+"</td><td>"+money.format(t.quantity*t.price)+"</td></tr>";
  }).join("");
  document.querySelector("#tradeEmpty").hidden=rows.length>0;
  document.querySelector("#historySummary").textContent=data.transactions.length+" registrerade affärer";
  document.querySelector("#tradeCount").textContent=String(data.transactions.length);
}
function renderPlans() {
  const plans=[...data.plans].sort((a,b)=>a.date.localeCompare(b.date));
  document.querySelector("#planRows").innerHTML=plans.map(p=>{
    const action=p.action==="buy"?"Köp":p.action==="sell"?"Sälj":"Avvakta";
    return "<tr><td>"+dateLabel(p.date,{day:"numeric",month:"short",year:"numeric"})+"</td><td class=\"plan-action "+(p.action==="sell"?"sell":"")+"\">"+action+"</td><td>"+p.name+"</td><td>"+(p.quantity?Number(p.quantity).toLocaleString("sv-SE"):"–")+"</td><td>"+p.reason+"</td><td class=\"plan-status\">Planerad</td></tr>";
  }).join("");
  document.querySelector("#planEmpty").hidden=plans.length>0;
}
function renderCalendar() {
  const grid=document.querySelector("#calendarGrid"), detail=document.querySelector("#calendarDayDetail");
  const year=calendarMonth.getFullYear(), month=calendarMonth.getMonth();
  document.querySelector("#calendarMonth").textContent=new Intl.DateTimeFormat("sv-SE",{month:"long",year:"numeric"}).format(calendarMonth);
  const weekdays=["Mån","Tis","Ons","Tor","Fre","Lör","Sön"];
  const offset=(new Date(year,month,1).getDay()+6)%7, count=new Date(year,month+1,0).getDate();
  const recorded=new Map(data.history.map(p=>[p.date,p]));
  grid.innerHTML=weekdays.map(d=>"<div class=\"calendar-weekday\" role=\"columnheader\">"+d+"</div>").join("");
  for(let i=0;i<offset;i++)grid.insertAdjacentHTML("beforeend","<div class=\"calendar-day empty\" aria-hidden=\"true\"></div>");
  for(let n=1;n<=count;n++){
    const date=year+"-"+String(month+1).padStart(2,"0")+"-"+String(n).padStart(2,"0"), point=recorded.get(date);
    const valueText=point?money.format(point.value):"";
    grid.insertAdjacentHTML("beforeend","<button class=\"calendar-day "+(point?"has-value ":"")+(date===selectedCalendarDate?"selected":"")+"\" role=\"gridcell\" data-date=\""+date+"\" "+(point?"":"disabled")+"><span class=\"day-num\">"+n+"</span>"+(point?"<span class=\"day-value\">"+valueText+"</span>":"")+"</button>");
  }
  grid.querySelectorAll(".calendar-day.has-value").forEach(b=>b.addEventListener("click",()=>{selectedCalendarDate=b.dataset.date;renderCalendar();}));
  const selected=recorded.get(selectedCalendarDate);
  if(!selected){detail.innerHTML="<span>Välj en markerad dag i kalendern.</span>";return;}
  const sorted=[...data.history].sort((a,b)=>a.date.localeCompare(b.date)),idx=sorted.findIndex(p=>p.date===selectedCalendarDate),prior=idx>0?sorted[idx-1]:null;
  const positions=selected.snapshot?.holdings||selected.holdings;
  const holdings=positions?("<div class=\"detail-holdings\">"+positions.map(h=>"<span>"+h.name+": "+Number(h.quantity).toLocaleString("sv-SE")+" st"+(h.price!=null?" · "+precise.format(h.price):"")+"</span>").join("")+"</div>"):"<small>Innehav per aktie saknas för den här äldre värderingen.</small>";
  detail.innerHTML="<span>"+dateLabel(selected.date,{day:"numeric",month:"long",year:"numeric"})+"</span><strong>"+precise.format(selected.value)+"</strong><small>"+(prior?"Förändring sedan "+dateLabel(prior.date)+": "+signedMoney(selected.value-prior.value):"Ingen tidigare registrerad dag att jämföra med")+(selected.snapshot?.cash!=null?" · Kassa "+money.format(selected.snapshot.cash):"")+"</small>"+holdings;
}
function renderConclusion() {
  const total=valueNow(), ret=total-data.startCapital, retPct=ret/data.startCapital*100;
  const equity=data.holdings.reduce((sum,h)=>sum+h.quantity*h.price,0), share=total?equity/total*100:0;
  const sells=data.transactions.filter(t=>t.type==="sell").length, buys=data.transactions.filter(t=>t.type==="buy").length;
  document.querySelector("#conclusionLead").textContent="Portföljen är värd "+precise.format(total)+" och ligger "+signedMoney(ret)+" ("+(retPct>=0?"+":"")+pct.format(retPct)+" %) mot startkapitalet "+money.format(data.startCapital)+".";
  document.querySelector("#conclusionAsOf").textContent="Senast uppdaterad "+dateLabel(data.asOf,{day:"numeric",month:"long",year:"numeric"})+".";
  document.querySelector("#conclusionPerformance").textContent="Registrerat resultat är "+signedMoney(ret)+". Det finns "+data.history.length+" sparade dagsvärderingar; kalendern visar vilka datum som har uppgifter.";
  document.querySelector("#conclusionAllocation").textContent=pct.format(share)+" % i aktier och "+money.format(data.cash)+" i kassa. Portföljen har "+data.holdings.length+" innehav, så enskilda bolag påverkar utfallet tydligt.";
  document.querySelector("#conclusionActivity").textContent="Historiken innehåller "+buys+" köp och "+sells+" försäljningar. Affärsdatum saknas för de tre ursprungliga köpen.";
  document.querySelector("#conclusionNext").textContent=data.plans.length?data.plans.length+" planerade ändringar finns noterade. Gå igenom dem på tisdag kl. 10 och jämför med verifierade kurser.":"Nästa veckogenomgång är tisdag kl. 10. Lägg in planer för beslut du vill följa upp; inget genomförs automatiskt.";
}
function setView(name) {
  const views={dashboard:"#dashboardView",history:"#historyView",plan:"#planView",calendar:"#calendarView",conclusion:"#conclusionView",model:"#modelView",scanner:"#scannerView"};
  Object.entries(views).forEach(([key,selector])=>document.querySelector(selector).hidden=key!==name);
  document.querySelectorAll(".view-tab").forEach(tab=>{const active=tab.dataset.view===name;tab.classList.toggle("active",active);if(active)tab.setAttribute("aria-current","page");else tab.removeAttribute("aria-current");});
  if(name==="calendar")renderCalendar(); if(name==="model" && window.InvesternModel)window.InvesternModel.render(); if(name==="scanner" && window.InvesternScanner)window.InvesternScanner.render();
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
  renderTransactions();
  renderPlans();
  renderCalendar();
  renderConclusion();
}
function addHistory(date,value,snapshot=null) {
  const item={date,value:Number(value),...(snapshot?{snapshot}:{})};
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
  addHistory(date,valueNow(),{cash:data.cash,holdings:data.holdings.map(h=>({name:h.name,ticker:h.ticker,quantity:h.quantity,price:h.price}))});persist();render();priceDialog.close();
});
document.querySelector("#saveDay").addEventListener("click",()=>{
  const form=document.querySelector("#snapshotForm");
  form.elements.value.value=valueNow().toFixed(2);form.elements.date.value=today();snapshotDialog.showModal();
});
document.querySelector("#cancelSnapshot").addEventListener("click",()=>snapshotDialog.close());
document.querySelector("#snapshotForm").addEventListener("submit",event=>{
  event.preventDefault();const fd=new FormData(event.currentTarget),date=String(fd.get("date"));
  addHistory(date,Number(fd.get("value")),{cash:data.cash,holdings:data.holdings.map(h=>({name:h.name,ticker:h.ticker,quantity:h.quantity,price:h.price}))});data.asOf=date;persist();render();snapshotDialog.close();
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

document.querySelectorAll(".view-tab").forEach(tab=>tab.addEventListener("click",()=>setView(tab.dataset.view)));
document.querySelector("#tradeFilter").addEventListener("change",renderTransactions);
document.querySelector("#addTrade").addEventListener("click",()=>document.querySelector("#tradeDialog").showModal());
document.querySelector("#cancelTrade").addEventListener("click",()=>document.querySelector("#tradeDialog").close());
document.querySelector("#tradeForm").addEventListener("submit",event=>{
  event.preventDefault();const fd=new FormData(event.currentTarget);
  data.transactions.push({type:String(fd.get("type")),name:String(fd.get("name")).trim(),ticker:String(fd.get("ticker")).trim(),quantity:Number(fd.get("quantity")),price:Number(fd.get("price")),date:String(fd.get("date"))||null});
  persist();render();event.currentTarget.reset();document.querySelector("#tradeDialog").close();
});
document.querySelector("#addPlan").addEventListener("click",()=>{const form=document.querySelector("#planForm");form.elements.date.value=today();document.querySelector("#planDialog").showModal();});
document.querySelector("#cancelPlan").addEventListener("click",()=>document.querySelector("#planDialog").close());
document.querySelector("#planForm").addEventListener("submit",event=>{
  event.preventDefault();const fd=new FormData(event.currentTarget);
  data.plans.push({action:String(fd.get("action")),name:String(fd.get("name")).trim(),quantity:fd.get("quantity")?Number(fd.get("quantity")):null,date:String(fd.get("date")),reason:String(fd.get("reason")).trim()});
  persist();render();event.currentTarget.reset();document.querySelector("#planDialog").close();
});
document.querySelector("#calendarPrev").addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar();});
document.querySelector("#calendarNext").addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar();});
render();
