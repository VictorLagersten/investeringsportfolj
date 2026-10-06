const STORE = "investern-ing-dashboard-v2";
const LOCAL_STORE = "investern-ing-dashboard-local-v1";
const INITIAL = {
  startCapital: 50000, cash: 2.12, totalFees: 80, benchmarkDayPct: null, asOf: "2026-10-06",
  holdings: [
    {ticker:"ASSA ABLOY B",name:"ASSA ABLOY B",quantity:41,price:352.40,previousPrice:null,cost:352.717073,dayPct:null,quoteStatus:"reference"},
    {ticker:"NIBE B",name:"NIBE B",quantity:332,price:45.32,previousPrice:null,cost:45.722530,dayPct:null,quoteStatus:"reference"},
    {ticker:"BONEX",name:"BONESUPPORT",quantity:87,price:230.60,previousPrice:null,cost:227.995402,dayPct:null,quoteStatus:"reference"}
  ],
  history:[
    {date:"2026-09-28",value:50000,verified:false,origin:"legacy-dashboard"},
    {date:"2026-09-29",value:50197.08,verified:false,origin:"legacy-dashboard"},
    {date:"2026-09-30",value:50589.64,verified:false,origin:"legacy-dashboard"}
  ],
  transactions:[
    {type:"buy",name:"Sandvik",ticker:"SAND",quantity:40,price:374.10,commission:null,date:null},
    {type:"buy",name:"NIBE B",ticker:"NIBE B",quantity:328,price:45.70,commission:null,date:null},
    {type:"buy",name:"BONESUPPORT",ticker:"BONEX",quantity:44,price:227.20,commission:null,date:null},
    {type:"buy",name:"BONESUPPORT",ticker:"BONEX",quantity:43,price:228.60,commission:9,date:"2026-10-01"},
    {type:"sell",name:"Sandvik",ticker:"SAND",quantity:40,price:362.30,commission:13.04,date:"2026-10-06"},
    {type:"buy",name:"ASSA ABLOY B",ticker:"ASSA ABLOY B",quantity:41,price:352.40,commission:13,date:"2026-10-06"},
    {type:"buy",name:"NIBE B",ticker:"NIBE B",quantity:4,price:45.32,commission:9,date:"2026-10-06"}
  ],
  plans:[]
};
const money = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });
const precise = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });let data=structuredClone(INITIAL);
let localState={};
try{localState=JSON.parse(localStorage.getItem(LOCAL_STORE)||"{}")||{}}catch{localState={}}
data.plans=Array.isArray(localState.plans)?localState.plans:[];
if(Array.isArray(localState.history)){
  const localByDate=new Map(localState.history.filter(p=>p&&p.date&&p.verified===true).map(p=>[p.date,p]));
  data.history=[...data.history.filter(p=>!localByDate.has(p.date)),...localByDate.values()];
}
let selectedCalendarDate=verifiedHistory().at(-1)?.date??today();
let calendarMonth=new Date((selectedCalendarDate||today())+"T12:00:00");
const positions=document.querySelector("#positions");
const priceDialog=document.querySelector("#priceDialog");
const snapshotDialog=document.querySelector("#snapshotDialog");

function verifiedHistory(){return data.history.filter(p=>p.verified===true).sort((a,b)=>a.date.localeCompare(b.date))}
function persist(){
  localStorage.setItem(LOCAL_STORE,JSON.stringify({plans:data.plans,history:data.history.filter(p=>p.verified===true&&p.origin==="local")}));
  localStorage.removeItem(STORE);
}

async function loadMasterData(){
  try{
    const stamp=Date.now();
    const [portfolioResponse,ledgerResponse]=await Promise.all([
      fetch(new URL("portfolio.json?ts="+stamp,location.href),{cache:"no-store"}),
      fetch(new URL("ledger.json?ts="+stamp,location.href),{cache:"no-store"})
    ]);
    if(!portfolioResponse.ok||!ledgerResponse.ok)throw new Error("Masterdata kunde inte hämtas ("+portfolioResponse.status+"/"+ledgerResponse.status+")");
    const portfolio=await portfolioResponse.json(), ledger=await ledgerResponse.json();
    if(!Array.isArray(ledger)||!Array.isArray(portfolio.holdings)||!Number.isFinite(Number(portfolio.cash)))throw new Error("Masterdata har fel format");
    const names={"ASSA-B":"ASSA ABLOY B","NIBE-B":"NIBE B","BONEX":"BONESUPPORT","SANDVIK":"Sandvik"};
    const tickers={"ASSA-B":"ASSA ABLOY B","NIBE-B":"NIBE B","BONEX":"BONEX","SANDVIK":"SAND"};
    data.transactions=ledger.map((item,index)=>{
      const symbol=String(item.symbol||""),isSell=String(item.action).toUpperCase()==="SELL";
      return {id:"ledger-"+item.date+"-"+symbol+"-"+item.action+"-"+index,type:isSell?"sell":"buy",name:names[symbol]||symbol,ticker:tickers[symbol]||symbol,quantity:Number(item.shares),price:Number(item.price),commission:item.fee==null?null:Number(item.fee),date:item.date||null,time:item.time||null,note:item.note||null};
    });
    const buysBySymbol={};
    ledger.forEach(item=>{
      if(String(item.action).toUpperCase()!=="BUY")return;
      const key=String(item.symbol||""),position=buysBySymbol[key]||(buysBySymbol[key]={shares:0,cost:0});
      const shares=Number(item.shares),price=Number(item.price);
      position.shares+=shares;
      position.cost+=shares*price+(item.fee==null?0:Number(item.fee));
    });
    masterDataState={ok:true,error:null};
    data.cash=Number(portfolio.cash);
    data.asOf=portfolio.asOf;
    data.totalFees=Number(portfolio.totalFees||0);
    data.holdings=portfolio.holdings.map(item=>{
      const symbol=item.symbol,average=buysBySymbol[symbol],price=Number(item.price),quantity=Number(item.shares);
      const cost=average?.shares?average.cost/average.shares:price;
      return {ticker:tickers[symbol]||symbol,name:item.name||names[symbol]||symbol,quantity,price,previousPrice:null,cost,dayPct:null,quoteStatus:"reference",quoteFetchedAt:null};
    });
    data.benchmarkDayPct=null;
    // Master reference marks are not added to the recorded daily history.
    persist();
    render();
  }catch(error){masterDataState={ok:false,error:String(error?.message||error)};console.warn("Masterdata kunde inte hämtas",error);updateMarketStatus()}
}

let marketDataState={fetchedAt:null,source:null,ok:false,complete:false,updatedNames:[],missingNames:[],error:null};
let masterDataState={ok:false,error:null};
let refreshInFlight=false;

async function loadMarketData(){
  try{
    const response=await fetch("./data/market.json?ts="+Date.now(),{cache:"no-store"});
    if(!response.ok)throw new Error("market data HTTP "+response.status);
    const payload=await response.json(),quotes=payload.quotes||{};
    const feedAt=Date.parse(payload.fetchedAt||""),age=Date.now()-feedAt;
    if(!Number.isFinite(feedAt)||age<0||age>90*60*1000)throw new Error("Kursfilen är äldre än 90 minuter eller saknar tidsstämpel");
    const keys={"ASSA ABLOY B":"ASSA-B","ASSA-B":"ASSA-B","NIBE B":"NIBE B","NIBE-B":"NIBE B","BONEX":"BONEX"};
    const updatedNames=[],missingNames=[],movementMissingNames=[];
    data.holdings.forEach(holding=>{
      holding.previousPrice=null;holding.dayPct=null;holding.quoteStatus="reference";holding.quoteFetchedAt=null;
      const quote=quotes[keys[holding.ticker]||holding.ticker],quoteAt=Date.parse(quote?.fetchedAt||payload.fetchedAt||"");
      const quoteAge=Date.now()-quoteAt,price=Number(quote?.price),priorClose=Number(quote?.previousClose);
      const valid=Number.isFinite(price)&&price>0&&Number.isFinite(quoteAt)&&quoteAge>=0&&quoteAge<=90*60*1000&&String(quote?.currency||"SEK")==="SEK";
      if(!valid){missingNames.push(holding.name);return;}
      holding.price=price;holding.quoteStatus="market";holding.quoteFetchedAt=quote.fetchedAt||payload.fetchedAt;
      if(Number.isFinite(priorClose)&&priorClose>0){
        holding.previousPrice=priorClose;
        const movement=quote.dayPct==null?NaN:Number(quote.dayPct);
        holding.dayPct=Number.isFinite(movement)?movement:(price/priorClose-1)*100;
        if(!Number.isFinite(holding.dayPct))movementMissingNames.push(holding.name);
      }else movementMissingNames.push(holding.name);
      updatedNames.push(holding.name);
    });
    const benchmark=quotes.OMXS30,bp=Number(benchmark?.price),bc=Number(benchmark?.previousClose),bt=Date.parse(benchmark?.fetchedAt||payload.fetchedAt||"");
    data.benchmarkDayPct=Number.isFinite(bp)&&bp>0&&Number.isFinite(bc)&&bc>0&&Number.isFinite(bt)&&Date.now()-bt>=0&&Date.now()-bt<=90*60*1000?(bp/bc-1)*100:null;
    const complete=missingNames.length===0&&movementMissingNames.length===0&&data.holdings.every(h=>h.dayPct!=null);
    marketDataState={fetchedAt:payload.fetchedAt,source:payload.source||null,ok:updatedNames.length>0,complete,updatedNames,missingNames,movementMissingNames,error:null};
    render();
  }catch(error){
    data.holdings.forEach(h=>{h.previousPrice=null;h.dayPct=null;h.quoteStatus="reference";h.quoteFetchedAt=null;});
    data.benchmarkDayPct=null;
    marketDataState={...marketDataState,ok:false,complete:false,error:String(error?.message||error)};
    render();
  }
}

async function refreshDashboardData(){
  if(refreshInFlight)return;
  refreshInFlight=true;
  try{await loadMasterData();await loadMarketData();}
  finally{refreshInFlight=false;}
}

function updateMarketStatus(){
  const el=document.querySelector("#asof"),label=document.querySelector("#positionPriceStatus");
  if(!el)return;
  const master=masterDataState.ok?"Portfölj "+dateLabel(data.asOf,{day:"numeric",month:"short"})+" · GitHub":"GitHub-masterdata saknas · reservvärden";
  const time=value=>new Date(value).toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"});
  if(marketDataState.ok&&marketDataState.complete&&marketDataState.fetchedAt){
    el.textContent=master+" · kurser "+time(marketDataState.fetchedAt)+" · fördröjda";
  }else if(marketDataState.ok&&marketDataState.fetchedAt){
    el.textContent=master+" · delvis kursdata "+time(marketDataState.fetchedAt)+" · kurser: "+marketDataState.updatedNames.join(", ")+" · saknar kurs: "+(marketDataState.missingNames.join(", ")||"ingen")+" · saknar dagsrörelse: "+(marketDataState.movementMissingNames?.join(", ")||"ingen");
  }else{
    el.textContent=master+" · referenskurser"+(marketDataState.fetchedAt?" · kursfil "+time(marketDataState.fetchedAt):"");
  }
  el.title="Portfölj och affärer hämtas från portfolio.json och ledger.json. Kursfilen uppdateras ungefär varje timme och varje aktiekurs har egen tidsstämpel. Saknade kurser visas inte som nollrörelse. "+(marketDataState.error||"");
  if(label){
    label.textContent=marketDataState.complete?"Rörelser från fördröjd kursfeed":marketDataState.updatedNames.length?"Ofullständig feed · per aktie":"Referenskurser · rörelser saknas";
    label.classList.toggle("market-label-warning",!marketDataState.complete);
  }
}

function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function signedMoney(value) { return (value > 0 ? "+" : value < 0 ? "−" : "") + money.format(Math.abs(value)); }
function valueNow() { return data.cash + data.holdings.reduce((sum, h) => sum + h.quantity * h.price, 0); }
function dateLabel(date, options = { day: "numeric", month: "short" }) {
  const raw = String(date);
  const d = raw.includes("T") ? new Date(raw) : new Date(raw + "T12:00:00");
  return d.toLocaleDateString("sv-SE", options);
}
function renderPositions(){
  positions.innerHTML=data.holdings.map(h=>{
    const market=h.quantity*h.price,totalGain=h.quantity*(h.price-h.cost),totalPct=h.cost?(h.price/h.cost-1)*100:null;
    const movement=h.dayPct,hasMovement=Number.isFinite(movement);
    const quoteLabel=h.quoteStatus==="market"?"Fördröjd marknadskurs · "+new Date(h.quoteFetchedAt).toLocaleString("sv-SE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Referenskurs från portfolio.json · ingen färsk kursfeed";
    const movementText=hasMovement?(movement>=0?"+":"")+pct.format(movement)+"%":"–";
    const movementTitle=hasMovement?"Dagens rörelse från senaste tillgängliga stängning":"Dagens rörelse saknas: färsk kurs eller jämförbar stängningskurs saknas";
    return `<tr><td><div class="name-cell"><span class="ticker">${h.ticker==="ASSA ABLOY B"?"ASSA":h.ticker}</span><span class="company">${h.name}<small>${h.name==="NIBE Industrier B"?"Industri":h.name==="BONESUPPORT"?"Medicinteknik":"Industri"}</small></span></div></td><td>${h.quantity}</td><td title="${quoteLabel}">${precise.format(h.price)}</td><td>${money.format(market)}</td><td class="${hasMovement?(movement>=0?"up":"down"):"stat-note"}" title="${movementTitle}">${movementText}</td><td class="${totalGain>=0?"up":"down"}">${signedMoney(totalGain)} <small>(${totalPct>=0?"+":""}${pct.format(totalPct)}%)</small></td></tr>`;
  }).join("");
}
function selectedHistory() {
  const period = document.querySelector("#period").value;
  const points = verifiedHistory();
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
  changeOut.textContent = points.length > 1 ? `${signedMoney(change)} · ${changePct >= 0 ? "+" : ""}${pct.format(changePct)} %` : "Ingen avstämd historik ännu";
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
  const rows=[...data.transactions].filter(t=>filter==="all"||t.type===filter).sort((a,b)=>(a.date||"0000-00-00").localeCompare(b.date||"0000-00-00"));
  const safe=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  document.querySelector("#tradeRows").innerHTML=rows.map(t=>{
    const type=t.type==="sell"?"Försäljning":"Köp";
    const fee=t.commission!=null?"<small>Courtage "+precise.format(t.commission)+"</small>":"<small>Courtage ej angivet</small>";
    const note=t.note?" title=\""+safe(t.note)+"\"":"";
    return "<tr"+note+"><td>"+(t.date?dateLabel(t.date,{day:"numeric",month:"short",year:"numeric"}):"Datum saknas")+"</td><td><span class=\"trade-type "+t.type+"\">"+type+"</span></td><td><strong>"+safe(t.name)+"</strong> <small>"+safe(t.ticker||"")+"</small></td><td>"+Number(t.quantity).toLocaleString("sv-SE")+"</td><td>"+precise.format(t.price)+(t.note?"<small>"+safe(t.note)+"</small>":"")+"</td><td>"+money.format(t.quantity*t.price)+fee+"</td></tr>";
  }).join("");
  document.querySelector("#tradeEmpty").hidden=rows.length>0;
  document.querySelector("#historySummary").textContent=data.transactions.length+" registrerade affärer · totalt courtage "+precise.format(data.totalFees||0);
  document.querySelector("#tradeCount").textContent=String(data.transactions.length);
  const recentEl=document.querySelector(".activity-card .activity-list");
  const countEl=document.querySelector(".activity-card .count-pill");
  if(countEl)countEl.textContent=data.transactions.length+" affärer";
  const recent=[...data.transactions].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).slice(-3).reverse();
  if(recentEl)recentEl.innerHTML=recent.map(t=>"<div><span class=\"activity-icon\">↗</span><div><strong>"+safe(t.name)+"</strong><small>"+Number(t.quantity).toLocaleString("sv-SE")+" aktier · "+(t.type==="sell"?"sälj":"köp")+" "+precise.format(t.price)+(t.commission!=null?" · courtage "+precise.format(t.commission):"")+(t.date?" · "+dateLabel(t.date):" · datum saknas")+"</small></div><span class=\"activity-date\">"+(t.type==="sell"?"Sälj":"Köp")+"</span></div>").join("");
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
  const recorded=new Map(verifiedHistory().map(p=>[p.date,p]));
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
  const sorted=verifiedHistory(),idx=sorted.findIndex(p=>p.date===selectedCalendarDate),prior=idx>0?sorted[idx-1]:null;
  const positions=selected.snapshot?.holdings||selected.holdings;
  const holdings=positions?("<div class=\"detail-holdings\">"+positions.map(h=>"<span>"+h.name+": "+Number(h.quantity).toLocaleString("sv-SE")+" st"+(h.price!=null?" · "+precise.format(h.price):"")+"</span>").join("")+"</div>"):"<small>Innehav per aktie saknas för den här äldre värderingen.</small>";
  detail.innerHTML="<span>"+dateLabel(selected.date,{day:"numeric",month:"long",year:"numeric"})+"</span><strong>"+precise.format(selected.value)+"</strong><small>"+(prior?"Förändring sedan "+dateLabel(prior.date)+": "+signedMoney(selected.value-prior.value):"Ingen tidigare registrerad dag att jämföra med")+(selected.snapshot?.cash!=null?" · Kassa "+money.format(selected.snapshot.cash):"")+"</small>"+holdings;
}
function renderConclusion(){
  const total=valueNow(),ret=total-data.startCapital,retPct=ret/data.startCapital*100;
  const equity=data.holdings.reduce((sum,h)=>sum+h.quantity*h.price,0),share=total?equity/total*100:0;
  const sells=data.transactions.filter(t=>t.type==="sell").length,buys=data.transactions.filter(t=>t.type==="buy").length;
  const validCount=verifiedHistory().length;
  document.querySelector("#conclusionLead").textContent="Referensvärderingen är "+precise.format(total)+" ("+signedMoney(ret)+", "+(retPct>=0?"+":"")+pct.format(retPct)+" %) mot startkapitalet "+money.format(data.startCapital)+".";
  document.querySelector("#conclusionAsOf").textContent="Portföljdata från "+dateLabel(data.asOf,{day:"numeric",month:"long",year:"numeric"})+"; marknadskursernas status visas på översikten.";
  document.querySelector("#conclusionPerformance").textContent="Indikativt resultat på tillgängliga referenskurser är "+signedMoney(ret)+". "+validCount+" avstämda dagsvärderingar finns i historiken; äldre värden utan verifierad källa visas inte som historik.";
  document.querySelector("#conclusionAllocation").textContent=pct.format(share)+" % i aktier och "+precise.format(data.cash)+" i kassa. Portföljen har "+data.holdings.length+" innehav.";
  document.querySelector("#conclusionActivity").textContent="Ledger innehåller "+buys+" köp och "+sells+" försäljningar. Datum och avgift saknas för de tre ursprungliga köpen; 6 oktober-affärernas referenspriser är inte verifierade avslut.";
  document.querySelector("#conclusionNext").textContent=data.plans.length?data.plans.length+" lokala planeringsnoteringar finns sparade i den här webbläsaren. Nästa ordinarie paperhandelsgenomgång är tisdag/fredag kl. 10.00.":"Nästa ordinarie paperhandelsgenomgång är tisdag/fredag kl. 10.00. Sen ankomst eller saknat prisunderlag betyder ingen retroaktiv affär. Endast pappershandel; inga riktiga order.";
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
  const sorted = verifiedHistory();
  const todayIso=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Stockholm",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const tradesToday=data.transactions.some(t=>t.date===todayIso);
  const hasDailyComparison=!tradesToday&&marketDataState.complete&&data.holdings.length>0&&data.holdings.every(h=>Number.isFinite(h.previousPrice)&&Number.isFinite(h.dayPct));
  const day=hasDailyComparison?data.holdings.reduce((sum,h)=>sum+h.quantity*(h.price-h.previousPrice),0):null;
  const priorValue=hasDailyComparison?data.cash+data.holdings.reduce((sum,h)=>sum+h.quantity*h.previousPrice,0):null;
  const dayPct=hasDailyComparison&&priorValue>0?day/priorValue*100:null;
  const hasBenchmarkComparison=hasDailyComparison&&Number.isFinite(data.benchmarkDayPct)&&dayPct!=null;
  document.querySelector("#portfolioValue").textContent = precise.format(total);
  document.querySelector("#totalReturn").textContent = `${signedMoney(overall)} · ${overallPct >= 0 ? "+" : ""}${pct.format(overallPct)}%`;
  document.querySelector("#dayValue").textContent = hasDailyComparison ? signedMoney(day) : "–";
  document.querySelector("#dayPercent").textContent = hasDailyComparison ? `${dayPct >= 0 ? "+" : ""}${pct.format(dayPct)} % från jämförbara dagskurser` : marketDataState.updatedNames.length ? "Delvis kursdata · saknar rörelse för: "+[...marketDataState.missingNames,...(marketDataState.movementMissingNames||[])].join(", ") : "Kompletta jämförbara dagskurser saknas";
  document.querySelector("#dayValue").className = hasDailyComparison ? (day >= 0 ? "up" : "down") : "stat-note";
  document.querySelector("#cashValue").textContent = money.format(data.cash);
  document.querySelector("#stockExposure").textContent = `${(equity / total * 100).toLocaleString("sv-SE",{maximumFractionDigits:1})}% i aktier`;
  document.querySelector("#equityValue").textContent = money.format(equity);
  document.querySelector("#legendCash").textContent = money.format(data.cash);
  const equityPct = total ? equity / total * 100 : 0;
  document.querySelector("#equityShare").textContent = `${equityPct.toLocaleString("sv-SE",{maximumFractionDigits:1})}%`;
  document.querySelector("#donut").style.background = `conic-gradient(#52795b 0 ${equityPct}%,#d6e0d7 ${equityPct}% 100%)`;
  document.querySelector("#benchmark").textContent = hasBenchmarkComparison ? `${dayPct-data.benchmarkDayPct >= 0 ? "+" : ""}${pct.format(dayPct-data.benchmarkDayPct)} pp` : "–";
  document.querySelector("#benchmark").className = hasBenchmarkComparison ? (dayPct >= data.benchmarkDayPct ? "up" : "down") : "stat-note";
  document.querySelector("#asof").textContent = `${dateLabel(data.asOf,{day:"numeric",month:"short",year:"numeric"})} · referensvärdering`;
  const hour=new Date().getHours();
  document.querySelector(".welcome h1").textContent=(hour<10?"God morgon":hour<18?"God dag":"God kväll")+", Victor";
  document.querySelector(".note-date").textContent=dateLabel(today(),{day:"numeric",month:"short"}).toUpperCase();
  const riskLabel=document.querySelector(".risk-note small");
  if(riskLabel)riskLabel.textContent="Koncentrerad · "+data.holdings.length+" innehav · värden enligt kursstatus ovan";
  const dailyStatus=document.querySelector("#dailyDataSummary");
  if(dailyStatus)dailyStatus.textContent=tradesToday?"Dagens portföljavkastning och jämförelse mot OMXS30 visas inte: journalen innehåller affärer idag och exakta avslutskurser/tider saknas.":hasDailyComparison?"Portföljens dagsrörelse "+signedMoney(day)+" ("+(dayPct>=0?"+":"")+pct.format(dayPct)+"%). Jämförelsen mot OMXS30 "+(hasBenchmarkComparison?"är "+(dayPct-data.benchmarkDayPct>=0?"+":"")+pct.format(dayPct-data.benchmarkDayPct)+" procentenheter.":"saknar komplett benchmarkkurs."):"Dagsrörelsen för hela portföljen visas när alla innehav har färska kurser och jämförbar stängningskurs. Delkurser och saknade innehav visas i tabellen ovan.";
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
  updateMarketStatus();
  if(window.InvesternModel?.refreshPortfolio)window.InvesternModel.refreshPortfolio();
  if(window.InvesternScanner?.refreshPortfolio)window.InvesternScanner.refreshPortfolio();
}
function addHistory(date,value,snapshot=null) {
  const item={date,value:Number(value),verified:true,origin:"local",source:"Manuellt sparad verifierad värdering",...(snapshot?{snapshot}:{})};
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
document.querySelector("#updatePrices").addEventListener("click",refreshDashboardData);
document.querySelector("#cancelPrices").addEventListener("click",()=>priceDialog.close());
document.querySelector("#priceForm").addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget, fd=new FormData(form), date=String(fd.get("date"));
  data.holdings.forEach((h,i)=>{h.previousPrice=h.price;h.price=Number(fd.get(`price-${i}`));h.dayPct=h.previousPrice?(h.price/h.previousPrice-1)*100:0;});
  data.cash=Number(fd.get("cash"));data.asOf=date;
  addHistory(date,valueNow(),{cash:data.cash,holdings:data.holdings.map(h=>({name:h.name,ticker:h.ticker,quantity:h.quantity,price:h.price}))});persist();render();priceDialog.close();
});
document.querySelector("#saveDay").addEventListener("click",()=>{
  if(!marketDataState.complete){alert("Kan inte spara en avstämd dagsvärdering: en eller flera aktiekurser saknas eller är för gamla.");return;}
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
  if(!confirm("Radera lokala planeringsnoteringar och dagsvärderingar från den här webbläsaren? GitHub-portföljdata påverkas inte."))return;
  localStorage.removeItem(LOCAL_STORE);localStorage.removeItem(STORE);data=structuredClone(INITIAL);refreshDashboardData();
});

document.querySelectorAll(".view-tab").forEach(tab=>tab.addEventListener("click",()=>setView(tab.dataset.view)));
document.querySelector("#tradeFilter").addEventListener("change",renderTransactions);
document.querySelector("#addTrade")?.addEventListener("click",()=>document.querySelector("#tradeDialog").showModal());
document.querySelector("#cancelTrade").addEventListener("click",()=>document.querySelector("#tradeDialog").close());
document.querySelector("#tradeForm")?.addEventListener("submit",event=>{
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
refreshDashboardData();
window.setInterval(refreshDashboardData, 5 * 60 * 1000);
