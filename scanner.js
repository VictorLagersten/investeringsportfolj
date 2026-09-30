const SCANNER_STORE="investern-scanner-v1";
const SCANNER_FIELDS=["ticker","name","currentPrice","dayPct","marketCap","revenueGrowth3y","epsGrowth3y","roic","operatingMargin","fcfMargin","netDebtEbitda","pe","evEbit","priceMomentum12m","priceMomentum6m","insiderOwnership","analystCoverage","liquidity","sector","catalyst","riskNote","source","asOf"];
let scannerRows=readScanner();

function readScanner(){try{const x=JSON.parse(localStorage.getItem(SCANNER_STORE));return Array.isArray(x)?x:[]}catch{return[]}}
function saveScanner(){localStorage.setItem(SCANNER_STORE,JSON.stringify(scannerRows))}
function n(v){if(v===""||v==null||Number.isNaN(Number(v)))return null;return Number(v)}
function clamp(v){return Math.max(0,Math.min(100,v))}
function scale(v,lo,hi){return v==null?null:clamp((v-lo)/(hi-lo)*100)}
function invScale(v,bad,good){return v==null?null:clamp((bad-v)/(bad-good)*100)}
function avg(parts){const p=parts.filter(v=>v!=null);return p.length?p.reduce((a,b)=>a+b,0)/p.length:null}
function tradable(r){return r.listed!==false&&["STO","CPH","HEL","OSL","ICE","NMS","NYQ","NYS","ASE","NCM","NAS","FRA","GER","STU","PAR","AMS","BRU"].includes(String(r.exchange||""))}
function coverage(r){const keys=["currentPrice","dayPct","marketCap","revenueGrowth3y","epsGrowth3y","roic","operatingMargin","fcfMargin","netDebtEbitda","pe","evEbit","priceMomentum12m","priceMomentum6m","insiderOwnership","liquidity"];return Math.round(keys.filter(k=>n(r[k])!=null).length/keys.length*100)}
function weighted(parts){
  const valid=parts.filter(x=>x.v!=null);
  const weight=valid.reduce((s,x)=>s+x.w,0);
  return weight?valid.reduce((s,x)=>s+x.v*x.w,0)/weight:null;
}
function businessScore(r){
  const quality=avg([scale(n(r.roic),5,30),scale(n(r.operatingMargin),5,30),scale(n(r.fcfMargin),0,25)]);
  const growth=avg([scale(n(r.revenueGrowth3y),0,25),scale(n(r.epsGrowth3y),0,30)]);
  const balance=invScale(n(r.netDebtEbitda),4,0);
  const insider=scale(n(r.insiderOwnership),0,40);
  return weighted([{v:quality,w:.35},{v:growth,w:.30},{v:balance,w:.20},{v:insider,w:.15}]);
}
function investmentScore(r){
  const b=businessScore(r);
  const valuation=avg([invScale(n(r.pe),45,12),invScale(n(r.evEbit),30,10)]);
  const momentum=avg([scale(n(r.priceMomentum12m),-30,30),scale(n(r.priceMomentum6m),-20,25)]);
  const risk=invScale(n(r.netDebtEbitda),5,0);
  const parts=[b==null?null:b*.50,valuation==null?null:valuation*.20,momentum==null?null:momentum*.10,risk==null?null:risk*.20];
  return weighted([{v:b,w:.50},{v:valuation,w:.20},{v:momentum,w:.10},{v:risk,w:.20}]);
}
function riskFlag(r){
  const flags=[];
  const lev=n(r.netDebtEbitda), liq=n(r.liquidity);
  if(lev!=null&&lev>3)flags.push("Skuld");
  if(liq!=null&&liq<1)flags.push("Likviditet");
  if(n(r.fcfMargin)!=null&&n(r.fcfMargin)<0)flags.push("Neg. FCF");
  if(coverage(r)<55)flags.push("Datagap");
  if(r.riskNote)flags.push("Notering");
  return flags.length?flags.join(" · "):"Ingen flagga";
}
function status(r){
  if(!tradable(r))return "Ej Handelsbanken-universum";
  const s=investmentScore(r), c=coverage(r);
  if(c<55||s==null)return "Ej redo";
  if(s>=78&&c>=75)return "Kandidat";
  if(s>=65)return "Bevaka";
  return "Avvakta";
}
function smallCap(r){
  const m=n(r.marketCap);
  return m!=null&&m<=15000&&n(r.insiderOwnership)!=null&&n(r.insiderOwnership)>=10;
}
function parseCSV(text){
  const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());
  if(!lines.length)return[];
  const rows=[];let cur="",cells=[],quote=false;
  const push=()=>{cells.push(cur);cur=""};
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    for(let j=0;j<line.length;j++){const ch=line[j];if(ch==="\"" ){if(quote&&line[j+1]==="\""){cur+="\"";j++}else quote=!quote}else if(ch===","&&!quote)push();else cur+=ch}
    push();
    if(cells.length>=SCANNER_FIELDS.length){rows.push(cells);cells=[]}
    else if(i<lines.length-1){cur=cells.join(",")+"\n";cells=[]}
  }
  const header=rows[0]||[];
  const index=Object.fromEntries(header.map((h,i)=>[h.trim(),i]));
  return rows.slice(1).map(a=>Object.fromEntries(SCANNER_FIELDS.map(k=>[k,(a[index[k]]??"").trim()]))).filter(r=>r.ticker||r.name);
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
async function syncMarketPrices(){
  try{
    const response=await fetch("./data/market.json?ts="+Date.now(),{cache:"no-store"});
    if(!response.ok)return;
    const payload=await response.json(),quotes=payload.quotes||{};
    scannerRows=scannerRows.map(r=>{const q=quotes[r.ticker];if(!q)return r;return {...r,currentPrice:Number(q.price)||r.currentPrice,dayPct:Number.isFinite(Number(q.dayPct))?Number(q.dayPct):r.dayPct,asOf:payload.fetchedAt||r.asOf,source:r.source||payload.source};});
    saveScanner();
  }catch{}
}
function renderScanner(){
  const filter=document.querySelector("#scannerFilter"),rowsEl=document.querySelector("#scannerRows");if(!rowsEl)return;
  const sorted=[...scannerRows].sort((a,b)=>(investmentScore(b)??-1)-(investmentScore(a)??-1));
  const filtered=sorted.filter(r=>{if(!tradable(r))return false;const s=investmentScore(r);if(filter?.value==="ready")return coverage(r)>=55;if(filter?.value==="small")return smallCap(r);if(filter?.value==="watch")return s!=null&&s>=65&&s<78;return true});
  rowsEl.innerHTML=filtered.length?filtered.map(r=>{
    const b=businessScore(r),s=investmentScore(r),c=coverage(r);
    return "<tr><td><strong>"+esc(r.name||r.ticker)+"</strong><small>"+esc(r.ticker)+" · "+esc(r.sector||"")+"</small></td><td>"+(b==null?"–":b.toFixed(0))+"</td><td><b class='model-score "+(s>=78?"good":s>=65?"mid":"")+"'>"+(s==null?"–":s.toFixed(0))+"</b></td><td>"+c+"%</td><td>"+esc(riskFlag(r))+"</td><td>"+status(r)+(smallCap(r)?" · småbolag":"")+"</td></tr>";
  }).join(""):"<tr><td colspan='6' class='model-empty'>Ingen importerad kandidat matchar filtret.</td></tr>";
  document.querySelector("#scannerCount").textContent=scannerRows.length+" bolag";
  const ready=scannerRows.filter(r=>coverage(r)>=55).length;
  document.querySelector("#scannerCoverage").textContent=ready+" av "+scannerRows.length+" har minst 55% datatäckning.";
  renderPortfolioRisk();
}
function renderPortfolioRisk(){
  const total=typeof valueNow==="function"?valueNow():0;
  if(!total){return}
  const weights=(typeof data!=="undefined"?data.holdings:[]).map(h=>h.quantity*h.price/total);
  const top=Math.max(0,...weights),hhi=weights.reduce((s,w)=>s+w*w,0);
  document.querySelector("#scannerRisk").textContent=(top*100).toFixed(1)+"% toppvikt";
  document.querySelector("#scannerRiskText").textContent="Koncentrationsindex HHI "+(hhi*10000).toFixed(0)+". Lägre är mer diversifierat; detta är ett riskmått, inte en köp-/säljsignal.";
}
function csvEscape(v){const s=String(v??"");return /[",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s}
function downloadTemplate(){
  const sample=SCANNER_FIELDS.join(",")+"\n"+SCANNER_FIELDS.map(k=>k==="source"?"egen verifierad källa":k==="asOf"?"YYYY-MM-DD":"").join(",");
  const blob=new Blob([sample],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="investerning-scanner-template.csv";a.click();URL.revokeObjectURL(a.href);
}

// Broad universe discovery: automatically seed the scanner from data/universe.json.
// Discovery rows are intentionally marked as discovery-only until sufficient verified
// fundamental fields are available; discovery alone can never create a buy signal.
async function loadBroadUniverse(){
  try{
    const r=await fetch("./data/universe.json?ts="+Date.now(),{cache:"no-store"});
    if(!r.ok)return;
    const j=await r.json(), rows=Array.isArray(j.rows)?j.rows:[];
    if(!rows.length)return;
    const existing=new Map(scannerRows.map(x=>[x.ticker,x]));
    rows.forEach(x=>{
      if(!x.ticker)return;
      const prior=existing.get(x.ticker);
      const merged={...(prior||{}),ticker:x.ticker,name:x.name||prior?.name||x.ticker,currentPrice:x.currentPrice??prior?.currentPrice??null,dayPct:x.dayPct??prior?.dayPct??null,marketCap:x.marketCap??prior?.marketCap??null,pe:x.pe??prior?.pe??null,sector:x.sector||prior?.sector||"",source:x.source||"Broad universe discovery",asOf:x.asOf||j.generatedAt||prior?.asOf||""};
      existing.set(x.ticker,merged);
    });
    scannerRows=[...existing.values()];
    saveScanner(); renderScanner();
    const note=document.querySelector("#scannerUniverseNote");
    if(note)note.textContent="Automatiskt universum: "+rows.length.toLocaleString("sv-SE")+" upptäckta bolag. Upptäckt är inte samma sak som verifierat investeringscase.";
  }catch{}
}

function initScanner(){
  document.querySelector("#scannerFilter")?.addEventListener("change",renderScanner);
  document.querySelector("#scannerTemplate")?.addEventListener("click",downloadTemplate);
  document.querySelector("#scannerFile")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;const imported=parseCSV(await f.text());scannerRows=imported.map(r=>({...r,...Object.fromEntries(["currentPrice","dayPct","marketCap","revenueGrowth3y","epsGrowth3y","roic","operatingMargin","fcfMargin","netDebtEbitda","pe","evEbit","priceMomentum12m","priceMomentum6m","insiderOwnership","analystCoverage","liquidity"].map(k=>[k,n(r[k])]))}));saveScanner();renderScanner();e.target.value=""});
  renderScanner();
  loadBroadUniverse();
}
window.InvesternScanner={render:renderScanner,rows:()=>scannerRows};
document.addEventListener("DOMContentLoaded",initScanner);
