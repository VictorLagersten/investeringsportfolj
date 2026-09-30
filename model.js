const MODEL_STORE = "investern-model-v1";

const DEFAULT_MODEL = {
  regime: "neutral",
  riskFreeRate: 2.0,
  maxPositionPct: 25,
  minCashPct: 10,
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
function positionPct(c){
  const s=factorScore(c); if(s==null)return 0;
  const risk=Math.max(0,Math.min(100,num(c.risk)==null?50:num(c.risk)));
  const base=Math.max(0,Math.min(1,(s-50)/50));
  const riskAdj=.45+.55*(risk/100);
  const regimeAdj=model.regime==="risk_on"?1.05:model.regime==="risk_off"?.65:1;
  return Math.min(model.maxPositionPct,Math.max(0,base*riskAdj*regimeAdj*model.maxPositionPct));
}
function renderModel(){
  const total = typeof valueNow==="function"?valueNow():0;
  const candidates=[...model.candidates].sort((a,b)=>(factorScore(b)??-1)-(factorScore(a)??-1));
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
