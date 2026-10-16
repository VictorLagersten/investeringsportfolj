const SCANNER_STORE="investern-scanner-v1";
const SCANNER_FIELDS=["ticker","name","currentPrice","dayPct","marketCap","revenueGrowth3y","epsGrowth3y","roic","operatingMargin","fcfMargin","netDebtEbitda","pe","evEbit","priceMomentum12m","priceMomentum6m","insiderOwnership","analystCoverage","liquidity","sector","catalyst","catalystDate","riskNote","source","asOf","market","currency","marketDataAsOf","fundamentalDataAsOf","ownershipDataAsOf","catalystDataAsOf"];
let scannerRows=readScanner();

function readScanner(){try{const x=JSON.parse(localStorage.getItem(SCANNER_STORE));return Array.isArray(x)?x:[]}catch{return[]}}
function saveScanner(){localStorage.setItem(SCANNER_STORE,JSON.stringify(scannerRows))}
function n(v){if(v===""||v==null||Number.isNaN(Number(v)))return null;return Number(v)}
function clamp(v){return Math.max(0,Math.min(100,v))}
function scale(v,lo,hi){return v==null?null:clamp((v-lo)/(hi-lo)*100)}
function invScale(v,bad,good){return v==null?null:clamp((bad-v)/(bad-good)*100)}
function avg(parts){const p=parts.filter(v=>v!=null);return p.length?p.reduce((a,b)=>a+b,0)/p.length:null}
function tradable(r){
  if(r.listed===false)return false;
  const ex=String(r.exchange||"");
  return ["STO","CPH","HEL","OSL","ICE","NMS","NYQ","NYS","ASE","NCM","NAS","FRA","GER","STU","PAR","AMS","BRU"].includes(ex);
}
function dataFreshEnough(r,maxDays=120){
  if(!r.asOf)return false;
  const t=Date.parse(r.asOf); if(!Number.isFinite(t))return false;
  return (Date.now()-t)<=maxDays*86400000;
}
function opportunityScore(r){
  const b=businessScore(r), i=investmentScore(r); if(i==null)return null;
  const small=smallCap(r)?5:0;
  const catalyst=r.catalyst?5:0;
  return Math.min(100,i*.8+(b??i)*.15+small+catalyst);
}
function coverage(r){const keys=["currentPrice","dayPct","marketCap","revenueGrowth3y","epsGrowth3y","roic","operatingMargin","fcfMargin","netDebtEbitda","pe","evEbit","priceMomentum12m","priceMomentum6m","insiderOwnership","liquidity"];return Math.round(keys.filter(k=>n(r[k])!=null).length/keys.length*100)}
const ANALYSIS_FIELDS=["revenueGrowth3y","epsGrowth3y","roic","operatingMargin","fcfMargin","netDebtEbitda","pe","evEbit","priceMomentum12m","priceMomentum6m","insiderOwnership","liquidity"];
function analysisFieldCount(r){return ANALYSIS_FIELDS.filter(k=>n(r[k])!=null).length}
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
  if(analysisFieldCount(r)<4)return null;
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
  if(coverage(r)<55||analysisFieldCount(r)<4)flags.push("Datagap");
  if(r.riskNote)flags.push("Notering");
  return flags.length?flags.join(" · "):"Ingen flagga";
}
function status(r){
  if(!tradable(r))return "Ej Handelsbanken-universum";
  const s=investmentScore(r), c=coverage(r);
  if(c<55||analysisFieldCount(r)<4||s==null)return "Ej redo";
  if(!tradable(r))return "Ej Handelsbanken-universum";
  if(!dataFreshEnough(r))return "Data för gammal";
  if(s>=78&&c>=75)return "Kandidat";
  if(s>=65)return "Bevaka";
  return "Avvakta";
}
function smallCap(r){
  const m=n(r.marketCap);
  return m!=null&&m<=15000&&n(r.insiderOwnership)!=null&&n(r.insiderOwnership)>=10;
}
function parseCSV(text){
  const input=text.charCodeAt(0)===65279?text.slice(1):text,records=[];let row=[],field="",quoted=false;
  const quote=String.fromCharCode(34),lf=String.fromCharCode(10),cr=String.fromCharCode(13);
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(ch===quote){
      if(quoted&&input[i+1]===quote){field+=quote;i++}else quoted=!quoted;
    }else if(ch===","&&!quoted){row.push(field);field=""}
    else if((ch===lf||ch===cr)&&!quoted){
      if(ch===cr&&input[i+1]===lf)i++;
      row.push(field);field="";if(row.some(x=>x.trim()))records.push(row);row=[];
    }else field+=ch;
  }
  row.push(field);if(row.some(x=>x.trim()))records.push(row);
  if(records.length<2)return[];
  const header=records[0].map(x=>x.trim()),index=Object.fromEntries(header.map((h,i)=>[h,i]));
  return records.slice(1).map(cells=>Object.fromEntries(SCANNER_FIELDS.map(k=>[k,(cells[index[k]]??"").trim()])))
    .filter(r=>r.ticker||r.name);
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
  const sorted=[...scannerRows].sort((a,b)=>(opportunityScore(b)??-1)-(opportunityScore(a)??-1));
  const filtered=sorted.filter(r=>{if(!tradable(r))return false;const s=investmentScore(r),eligible=coverage(r)>=55&&analysisFieldCount(r)>=4&&s!=null;if(filter?.value==="scoreable")return eligible;if(filter?.value==="ready")return eligible;if(filter?.value==="small")return eligible&&smallCap(r);if(filter?.value==="watch")return eligible&&s>=65&&s<78;return true});
  rowsEl.innerHTML=filtered.length?filtered.map(r=>{
    const eligible=coverage(r)>=55&&analysisFieldCount(r)>=4,b=eligible?businessScore(r):null,s=eligible?investmentScore(r):null,c=coverage(r);
    return "<tr><td><strong>"+esc(r.name||r.ticker)+"</strong><small>"+esc(r.ticker)+" · "+esc(r.sector||"")+"</small></td><td>"+(b==null?"–":b.toFixed(0))+"</td><td><b class='model-score "+(s>=78?"good":s>=65?"mid":"")+"'>"+(s==null?"–":s.toFixed(0))+"</b></td><td>"+c+"%</td><td>"+esc(riskFlag(r))+"</td><td>"+status(r)+(smallCap(r)?" · småbolag":"")+"</td></tr>";
  }).join(""):"<tr><td colspan='6' class='model-empty'>"+(filter?.value==="all"?"Inga aktier i universumet matchar filtret.":"Inga scorebara kandidater ännu. Universumet innehåller upptäcktsaktier, men minst fyra analysfält och 55% datatäckning krävs innan en preliminär scannerpoäng visas. Välj ‘Alla upptäckta’ för att bläddra i universumet.")+"</td></tr>";
  document.querySelector("#scannerCount").textContent=scannerRows.length+" bolag";
  const ready=scannerRows.filter(r=>coverage(r)>=55&&analysisFieldCount(r)>=4&&investmentScore(r)!=null).length;
  document.querySelector("#scannerCoverage").textContent=ready+" av "+scannerRows.length+" har minst fyra analysfält och 55% datatäckning; det är ett preliminärt datafilter, inte verifierad analys.";
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
  const note=document.querySelector("#scannerUniverseNote");
  try{
    const r=await fetch("./data/universe.json?ts="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw new Error("Universumet kunde inte hämtas");
    const j=await r.json(), rows=Array.isArray(j.rows)?j.rows:[];
    if(!rows.length){if(note)note.textContent="Universumfilen laddades men innehåller inga upptäcktsrader.";return;}
    const existing=new Map(scannerRows.map(x=>[x.ticker,x]));
    rows.forEach(x=>{
      if(!x.ticker)return;
      const prior=existing.get(x.ticker);
      const merged={...(prior||{}),ticker:x.ticker,name:x.name||prior?.name||x.ticker,currentPrice:x.currentPrice??prior?.currentPrice??null,dayPct:x.dayPct??prior?.dayPct??null,marketCap:x.marketCap??prior?.marketCap??null,pe:x.pe??prior?.pe??null,sector:x.sector||prior?.sector||"",source:(prior?.source&&prior.source!=="Broad universe discovery")?prior.source:(x.source||"Broad universe discovery"),exchange:x.exchange||prior?.exchange||"",market:x.market||prior?.market||"",currency:x.currency||prior?.currency||"",listed:x.listed??prior?.listed,asOf:x.asOf||j.generatedAt||prior?.asOf||""};
      existing.set(x.ticker,merged);
    });
    scannerRows=[...existing.values()];
    saveScanner(); renderScanner();
    if(note){const localOnly=Math.max(0,scannerRows.length-rows.length);note.textContent="Automatiskt universum: "+rows.length.toLocaleString("sv-SE")+" bolag, data från "+(j.generatedAt?new Date(j.generatedAt).toLocaleString("sv-SE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"okänt datum")+". Tabellen innehåller "+scannerRows.length.toLocaleString("sv-SE")+" unika bolag totalt"+(localOnly?" ("+localOnly.toLocaleString("sv-SE")+" lokala/importerade tillägg)":"")+"; upptäckt är inte verifierat investeringscase.";}
  }catch(error){if(note)note.textContent="Kunde inte hämta det automatiska universumet. Visar "+scannerRows.length.toLocaleString("sv-SE")+" tidigare sparade rader; de är inte verifierade köpideer.";}
}

function initScanner(){
  document.querySelector("#scannerFilter")?.addEventListener("change",renderScanner);
  document.querySelector("#scannerTemplate")?.addEventListener("click",downloadTemplate);
  document.querySelector("#scannerFile")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;const imported=parseCSV(await f.text());scannerRows=imported.map(r=>({...r,...Object.fromEntries(["currentPrice","dayPct","marketCap","revenueGrowth3y","epsGrowth3y","roic","operatingMargin","fcfMargin","netDebtEbitda","pe","evEbit","priceMomentum12m","priceMomentum6m","insiderOwnership","analystCoverage","liquidity"].map(k=>[k,n(r[k])]))}));saveScanner();renderScanner();e.target.value=""});
  renderScanner();
  loadBroadUniverse();
}
window.InvesternScanner={render:renderScanner,refreshPortfolio:renderPortfolioRisk,rows:()=>scannerRows};
document.addEventListener("DOMContentLoaded",initScanner);
