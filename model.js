const MODEL_STORE = "investern-model-v1";

const DEFAULT_MODEL = {
  regime: "neutral",
  riskFreeRate: 2.0,
  maxPositionPct: 25,
  minCashPct: 10,
  startingCapital: 50000,
  trading: { courtagePct: 0.09, minCourtageSEK: 9, fxPct: 0.25, minTradeSEK: 750 },
  candidates: [],
  journal: [], backtests: []
};

const FACTORS = [
  ["quality","Kvalitet",20],["growth","Tillväxt",20],["valuation","Värdering",15],
  ["momentum","Momentum",10],["insider","Insider/ägande",10],["catalyst","Katalysator",5],
  ["balance","Balansräkning",10],["risk","Risk",10]
];
// Methodology: quality/growth/value form the core; risk is explicitly weighted to avoid treating upside without downside context as a complete signal.
const METHOD_SOURCES = ["Fundsmith quality/ROCE/cash conversion/reinvestment","Oaktree second-level risk thinking","Spargurun external idea generation","Small-cap entrepreneurial filter","Quantitative ranking and backtesting"];


function readModel() {
  try {
    const saved = JSON.parse(localStorage.getItem(MODEL_STORE));
    return saved ? {...structuredClone(DEFAULT_MODEL), ...saved, candidates:saved.candidates||[], journal:saved.journal||[], backtests:saved.backtests||[]} : structuredClone(DEFAULT_MODEL);
  } catch { return structuredClone(DEFAULT_MODEL); }
}
let model = readModel();
function saveModel(){localStorage.setItem(MODEL_STORE,JSON.stringify(model));}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function num(v){return v===""||v==null?null:Number(v);}
function factorScore(c){
  let earned=0,max=0,missing=0;
  FACTORS.forEach(([key,,weight])=>{const v=num(c[key]);if(v==null){missing++;}else{earned+=Math.max(0,Math.min(100,v))*weight/100;max+=weight;}});
  return max?earned/max*100:null;
}
function confidence(c){
  const filled=FACTORS.filter(([k])=>num(c[k])!=null).length;
  return Math.round(filled/FACTORS.length*100);
}
function label(score){if(score==null)return "Ej bedömd";if(score>=80)return "Stark kandidat";if(score>=70)return "Intressant";if(score>=60)return "Bevaka";return "Svag/avvakta";}
function tradingCostSEK(c,tradeValueSEK){
  const t=model.trading||DEFAULT_MODEL.trading;
  const value=Math.max(0,Number(tradeValueSEK)||0);
  const fx=/\.ST$|\.CO$|\.HE$|\.OL$|\.IS$/.test(String(c.ticker||""))?0:t.fxPct/100;
  const brokerage=Math.max(t.minCourtageSEK,value*t.courtagePct/100);
  return value>0?brokerage+value*fx:0;
}
function tradeEfficient(c,targetPct){
  const total=portfolioContext().total||model.startingCapital||50000;
  const value=total*Math.max(0,targetPct)/100;
  if(value<=0)return {ok:false,cost:0,value};
  const cost=tradingCostSEK(c,value);
  const minTrade=(model.trading||DEFAULT_MODEL.trading).minTradeSEK;
  return {ok:value>=minTrade&&cost/value<0.02,cost,value};
}
function positionPct(c){
  const s=factorScore(c); if(s==null)return 0;
  const risk=Math.max(0,Math.min(100,num(c.risk)==null?50:num(c.risk)));
  const base=Math.max(0,Math.min(1,(s-50)/50));
  const riskAdj=.45+.55*(risk/100);
  const regimeAdj=model.regime==="risk_on"?1.05:model.regime==="risk_off"?.65:1;
  return Math.min(model.maxPositionPct,Math.max(0,base*riskAdj*regimeAdj*model.maxPositionPct));
}
function portfolioContext(){
  const total=typeof valueNow==="function"?valueNow():0;
  const holdings=typeof data!=="undefined"?data.holdings:[];
  return {total,holdings,weights:holdings.map(h=>({...h,weight:total?(h.quantity*h.price)/total:0}))};
}
function buyDecision(c){
  const s=factorScore(c), conf=confidence(c), p=portfolioContext();
  const reasons=[], blockers=[];
  const existing=p.weights.find(h=>h.ticker&&c.ticker&&h.ticker===c.ticker);
  const currentWeight=existing?.weight??0;
  const targetPct=s==null?0:positionPct(c);
  const targetWeight=targetPct/100;
  const friction=tradeEfficient(c,targetPct);
  const gap=targetWeight-currentWeight;

  if(s==null) blockers.push("Saknar tillräcklig faktordata");
  if(conf<75) blockers.push("Datatäckning under 75%");
  if(s!=null&&s<70) blockers.push("Score under 70");
  if(model.regime==="risk_off"&&s!=null&&s<80) blockers.push("Risk-off kräver score ≥80");
  if(targetPct<=0&&s!=null) blockers.push("Ingen meningsfull målposition");
  if(!friction.ok&&gap>0.03) blockers.push("Affären för liten/dyr efter courtage och valuta");

  if(existing){
    if(s>=80 && gap>0.03) reasons.push("Starkt case och målvikten ligger över aktuell vikt");
    else if(s>=70 && gap>0.03) reasons.push("Målvikten ligger över aktuell vikt");
    else if(Math.abs(gap)<=0.03) reasons.push("Aktuell vikt ligger nära modellens mål");
    else if(gap<0) reasons.push("Aktuell vikt överstiger modellens mål");
  } else if(s>=80) reasons.push("Stark kombination av kvalitet, tillväxt, värdering och risk");
  else if(s>=70) reasons.push("Intressant modellprofil");

  let status="AVVAKTA";
  if(!blockers.length){
    if(existing && s>=80 && gap>0.03) status="ÖKA";
    else if(existing && s>=70 && Math.abs(gap)<=0.03) status="BEHÅLL";
    else if(existing && gap< -0.03) status="MINSKA";
    else if(!existing && s>=80) status="KÖPKANDIDAT";
    else if(!existing && s>=70) status="BEVAKA";
  }
  return {status,score:s,confidence:conf,currentWeight,targetPct,gap,reasons,blockers,estimatedTradeCost:friction.cost};
}

function sellDecision(h){
  const c=model.candidates.find(x=>x.ticker&&h.ticker&&x.ticker===h.ticker);
  const p=portfolioContext(), current=p.weights.find(x=>x.ticker===h.ticker)?.weight??0;
  if(!c){
    return {status:"OMPRÖVA",ticker:h.ticker,name:h.name,weight:current,score:null,targetPct:null,
      reasons:["Ingen aktuell verifierad modellprofil för innehavet"],blockers:["Fundamental data saknas"]};
  }
  const s=factorScore(c), conf=confidence(c), targetPct=positionPct(c), targetWeight=targetPct/100;
  const reasons=[], blockers=[];
  const risk=num(c.risk), valuation=num(c.valuation), growth=num(c.growth), quality=num(c.quality), balance=num(c.balance);
  if(s<60) reasons.push("Modellscore under 60");
  if(conf<75) reasons.push("Datatäckning under 75%");
  if(risk!=null&&risk<40) reasons.push("Förhöjd modellrisk");
  if(valuation!=null&&valuation<35) reasons.push("Svag värderingsbild");
  if(balance!=null&&balance<35) reasons.push("Svag balansräkning");
  if(growth!=null&&growth<35) reasons.push("Tillväxtprofilen har försämrats");
  if(quality!=null&&quality<35) reasons.push("Kvalitetsprofilen är för svag");
  if(current>model.maxPositionPct/100) reasons.push("Positionen överstiger modellens maxvikt");
  if(targetPct>0 && current-targetWeight>0.05) reasons.push("Aktuell vikt ligger >5 procentenheter över målvikten");

  let status="BEHÅLL";
  if(reasons.length>=3) status="SÄLJ/ROTERA";
  else if(reasons.length>=1) status="OMPRÖVA";
  if(s>=80 && conf>=75 && reasons.length===0 && current>targetWeight+0.03) status="MINSKA";
  return {status,ticker:h.ticker,name:h.name,weight:current,score:s,targetPct,reasons,blockers};
}
function portfolioRiskBudget(){
  const p=portfolioContext();
  const weights=p.weights||[];
  const hhi=weights.reduce((s,h)=>s+h.weight*h.weight,0);
  const sectors={};
  weights.forEach(h=>{const c=model.candidates.find(x=>x.ticker===h.ticker);const sec=c?.sector||"Okänd";sectors[sec]=(sectors[sec]||0)+h.weight;});
  const maxSector=Math.max(0,...Object.values(sectors));
  return {hhi,maxSector};
}
function renderDecisionEngine(){
  const buyEl=document.querySelector("#buyEngineRows"), sellEl=document.querySelector("#sellEngineRows");
  if(!buyEl||!sellEl)return;
  const candidates=[...model.candidates].sort((a,b)=>(factorScore(b)??-1)-(factorScore(a)??-1));
  buyEl.innerHTML=candidates.length?candidates.map(c=>{
    const d=buyDecision(c);
    const cls=["KÖPKANDIDAT","ÖKA"].includes(d.status)?"good":["BEVAKA","BEHÅLL","MINSKA","OMPRÖVA"].includes(d.status)?"mid":"";
    const sizing=d.targetPct==null?"–":d.targetPct.toFixed(1)+"%";
    return "<tr><td><strong>"+esc(c.name)+"</strong><small>"+esc(c.ticker||"")+"</small></td><td>"+(d.score==null?"–":d.score.toFixed(0))+"</td><td>"+d.confidence+"%</td><td>"+sizing+"</td><td><b class='decision "+cls+"'>"+d.status+"</b></td><td>"+esc((d.blockers.length?d.blockers:d.reasons).join(" · "))+"</td></tr>"
  }).join(""):"<tr><td colspan='6' class='model-empty'>Inga kandidater med verifierade datapunkter ännu.</td></tr>";
  const holdings=portfolioContext().holdings;
  sellEl.innerHTML=holdings.length?holdings.map(h=>{
    const d=sellDecision(h);
    const cls=d.status==="SÄLJ/ROTERA"?"bad":d.status==="BEHÅLL"?"good":"mid";
    return "<tr><td><strong>"+esc(h.name)+"</strong><small>"+esc(h.ticker)+"</small></td><td>"+(d.score==null?"–":d.score.toFixed(0))+"</td><td>"+(d.weight*100).toFixed(1)+"%</td><td>"+(d.targetPct==null?"–":d.targetPct.toFixed(1)+"%")+"</td><td><b class='decision "+cls+"'>"+d.status+"</b></td><td>"+esc(d.reasons.join(" · ")||"Ingen tydlig säljsignal i modellen")+"</td></tr>"
  }).join(""):"<tr><td colspan='6'>Inga innehav.</td></tr>";
}
function renderModel(){
  const total = typeof valueNow==="function"?valueNow():0;
  const candidates=[...model.candidates].sort((a,b)=>(factorScore(b)??-1)-(factorScore(a)??-1));
  renderDecisionEngine();
  const rows=document.querySelector("#modelRows");
  if(!rows)return;
  rows.innerHTML=candidates.length?candidates.map(c=>{
    const s=factorScore(c), conf=confidence(c), pos=positionPct(c);
    return "<tr><td><strong>"+esc(c.name)+"</strong><small>"+esc(c.ticker||"")+" · "+esc(c.type||"Noterat")+"</small></td><td><b class='model-score "+(s>=70?"good":s>=60?"mid":"")+"' >"+(s==null?"–":s.toFixed(0))+"</b></td><td>"+conf+"%</td><td>"+label(s)+"</td><td>"+(s==null?"–":pos.toFixed(1)+"%")+"</td><td><button class='text-button model-edit' data-id='"+esc(c.id)+"'>Redigera</button></td></tr>";
  }).join(""):"<tr><td colspan='6' class='model-empty'>Lägg till ett bolag och mata in verifierade datapunkter för att få en modellpoäng.</td></tr>";
  document.querySelector("#modelRegime").value=model.regime;
  document.querySelector("#modelRegimeText").textContent=model.regime==="risk_on"?"Risk-on · modellen tillåter högre tillväxt-/småbolagsexponering":model.regime==="risk_off"?"Risk-off · modellen kräver högre marginal för nya köp":"Neutral · balanserad kravbild";
  const scored=candidates.filter(c=>factorScore(c)!=null);
  document.querySelector("#modelTop").textContent=scored.length?scored[0].name+" · "+factorScore(scored[0]).toFixed(0)+"/100":"Ingen kandidat är tillräckligt datastödd ännu";
  document.querySelector("#modelCoverage").textContent=scored.length+" av "+candidates.length+" kandidater har tillräckligt med datapunkter för en preliminär score.";
  const alerts=[];
  if(model.regime==="risk_off")alerts.push("Risk-off: höj beviskraven och håll mer kassa.");
  if(total && total>0) {
    const cash=(typeof data!=="undefined"?data.cash:0)/total*100;
    if(cash<model.minCashPct)alerts.push("Kassan ligger under modellens miniminivå på "+model.minCashPct+"%.");
  }
  document.querySelector("#modelAlerts").innerHTML=alerts.length?alerts.map(x=>"<div>⚠ "+esc(x)+"</div>").join(""):"<div>✓ Inga generella modellvarningar.</div>";
}
function openCandidate(existing){
  const c=existing||{id:crypto.randomUUID(),name:"",ticker:"",type:"Noterat"};
  const d=document.querySelector("#modelDialog"), f=document.querySelector("#modelForm");
  f.dataset.id=c.id;
  ["name","ticker","type"].forEach(k=>f.elements[k].value=c[k]??"");
  FACTORS.forEach(([k,label])=>{f.elements[k].value=c[k]??"";f.querySelector("[name='"+k+"']").previousElementSibling.textContent=label+" (0–100)";});
  d.showModal();
}
function addModelListeners(){
  document.querySelector("#modelRegime").addEventListener("change",e=>{model.regime=e.target.value;saveModel();renderModel();});
  document.querySelector("#addCandidate").addEventListener("click",()=>openCandidate());
  document.querySelector("#cancelModel").addEventListener("click",()=>document.querySelector("#modelDialog").close()); document.querySelector("#cancelModel2").addEventListener("click",()=>document.querySelector("#modelDialog").close());
  document.querySelector("#modelForm").addEventListener("submit",e=>{
    e.preventDefault();const f=e.currentTarget,fd=new FormData(f),id=f.dataset.id;
    const c={id,name:String(fd.get("name")),ticker:String(fd.get("ticker")),type:String(fd.get("type"))};
    FACTORS.forEach(([k])=>c[k]=num(fd.get(k)));
    const i=model.candidates.findIndex(x=>x.id===id);if(i>=0)model.candidates[i]=c;else model.candidates.push(c);
    saveModel();renderModel();document.querySelector("#modelDialog").close();
  });
  document.querySelector("#modelRows").addEventListener("click",e=>{const b=e.target.closest(".model-edit");if(b)openCandidate(model.candidates.find(c=>c.id===b.dataset.id));});
}
document.addEventListener("DOMContentLoaded",()=>{addModelListeners();renderModel();});
window.InvesternModel={render:renderModel};

function renderJournal(){
 const el=document.querySelector("#journalRows"); if(!el)return;
 el.innerHTML=model.journal.slice(-8).reverse().map(j=>"<div><strong>"+esc(j.ticker)+"</strong><span>"+esc(j.hypothesis)+"</span><small>Invalidation: "+esc(j.invalidation)+"</small></div>").join("")||"<small>Inga journalnoteringar ännu.</small>";
}
function initResearchTools(){
 document.querySelector("#runBacktest")?.addEventListener("click",()=>{
   const s=Number(document.querySelector("#btStart").value),e=Number(document.querySelector("#btEnd").value),y=Number(document.querySelector("#btYears").value),dd=Number(document.querySelector("#btDd").value);
   const c=s>0&&e>0&&y>0?(Math.pow(e/s,1/y)-1)*100:null;
   document.querySelector("#btCagr").textContent=c==null?"–":c.toFixed(2)+"%";
   document.querySelector("#btMaxDd").textContent=dd.toFixed(1)+"%";
   document.querySelector("#btStatus").textContent=c==null?"Ogiltiga data":"Resultat registrerat lokalt";
   model.backtests.push({date:new Date().toISOString().slice(0,10),start:s,end:e,years:y,cagr:c,maxDrawdown:dd});
   saveModel();
 });
 document.querySelector("#saveJournal")?.addEventListener("click",()=>{
   const ticker=document.querySelector("#jTicker").value.trim(),hypothesis=document.querySelector("#jHypothesis").value.trim(),invalidation=document.querySelector("#jInvalidation").value.trim();
   if(!ticker||!hypothesis||!invalidation)return;
   model.journal.push({date:new Date().toISOString().slice(0,10),ticker,hypothesis,invalidation});
   saveModel(); document.querySelector("#jTicker").value="";document.querySelector("#jHypothesis").value="";document.querySelector("#jInvalidation").value="";renderJournal();
 });
 renderJournal();
}
document.addEventListener("DOMContentLoaded",initResearchTools);
