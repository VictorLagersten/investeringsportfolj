const MODEL_STORE = "investern-model-v2";

const DEFAULT_MODEL = {
  version:"2.1.0",
  regime:"neutral",
  riskFreeRate:2.0,
  maxPositionPct:25,
  minCashPct:10,
  startingCapital:50000,
  trading:{courtagePct:0.09,minCourtageSEK:9,fxPct:0.25,minTradeSEK:750},
  horizons:{shortMaxDays:56,mediumMaxMonths:12,longMinMonths:12},
  weights:{quality:18,growth:18,valuation:14,momentum:12,insider:8,catalyst:8,balance:10,risk:12},
  candidates:[],journal:[],backtests:[],factorLearning:{},modelVersions:[]
};

const FACTORS=[
 ["quality","Kvalitet"],["growth","Tillväxt"],["valuation","Värdering"],["momentum","Momentum"],
 ["insider","Insider/ägande"],["catalyst","Katalysator"],["balance","Balansräkning"],["risk","Risk"]
];

function readModel(){
 try{
  const saved=JSON.parse(localStorage.getItem(MODEL_STORE));
  if(!saved)return structuredClone(DEFAULT_MODEL);
  return {...structuredClone(DEFAULT_MODEL),...saved,weights:{...DEFAULT_MODEL.weights,...(saved.weights||{})},
    trading:{...DEFAULT_MODEL.trading,...(saved.trading||{})},horizons:{...DEFAULT_MODEL.horizons,...(saved.horizons||{})},
    candidates:saved.candidates||[],journal:saved.journal||[],backtests:saved.backtests||[],factorLearning:saved.factorLearning||{}};
 }catch{return structuredClone(DEFAULT_MODEL)}
}
let model=readModel();
let sharedResearch=[];
let sharedCandidates=[];
function allCandidates(){
 const local=[...(model.candidates||[])], tickers=new Set(local.map(x=>x.ticker).filter(Boolean));
 return [...local,...sharedCandidates.filter(x=>!tickers.has(x.ticker)&&!local.some(y=>y.id===x.id))];
}
async function syncSharedJournal(){
 try{
  const r=await fetch("./data/portfolio-journal.json?ts="+Date.now(),{cache:"no-store"});
  if(!r.ok)return;
  const j=await r.json();sharedResearch=Array.isArray(j.research)?j.research:[];sharedCandidates=Array.isArray(j.candidates)?j.candidates:[];
  renderModel();renderJournal();renderLearning();
 }catch(error){console.warn("Gemensam analysjournal kunde inte hämtas",error)}
}
function saveModel(){localStorage.setItem(MODEL_STORE,JSON.stringify(model))}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function num(v){return v===""||v==null||Number.isNaN(Number(v))?null:Number(v)}
function clamp(v){return Math.max(0,Math.min(100,v))}
function weighted(parts){
 const valid=parts.filter(x=>x.v!=null&&Number.isFinite(x.v));
 const weight=valid.reduce((s,x)=>s+(x.w||0),0);
 return weight?valid.reduce((s,x)=>s+clamp(x.v)*(x.w||0),0)/weight:null;
}
function factorScore(c){
 const w=model.weights||DEFAULT_MODEL.weights;
 return weighted(FACTORS.map(([k])=>({v:num(c[k]),w:Number(w[k]??0)})));
}
function confidence(c){
 const filled=FACTORS.filter(([k])=>num(c[k])!=null).length;
 const sourceQuality=c.dataQuality==null?0.5:clamp(Number(c.dataQuality))/100;
 return Math.round((filled/FACTORS.length*.75+sourceQuality*.25)*100);
}
function label(s){if(s==null)return"Ej bedömd";if(s>=82)return"Stark kandidat";if(s>=72)return"Intressant";if(s>=62)return"Bevaka";return"Avvakta"}
function horizonScore(c,h){
 const key=h==="short"?"shortExpectedReturn":h==="medium"?"mediumExpectedReturn":"longExpectedReturn";
 const v=num(c[key]);
 return v==null?null:clamp(50+v*1.25);
}
function expectedReturn(c){
 const vals=["shortExpectedReturn","mediumExpectedReturn","longExpectedReturn"].map(k=>num(c[k])).filter(v=>v!=null);
 if(!vals.length)return null;
 const weights=[.45,.35,.20];
 return vals.reduce((s,v,i)=>s+v*weights[i],0)/weights.slice(0,vals.length).reduce((a,b)=>a+b,0);
}
function timeToCatalyst(c){const d=c.catalystDate?Date.parse(c.catalystDate):NaN;return Number.isFinite(d)?Math.max(0,Math.round((d-Date.now())/86400000)):null}
function thesisStrength(c){
 let s=50;
 if(c.thesis)s+=12;
 if(c.invalidation)s+=10;
 if(c.catalyst)s+=10;
 if(timeToCatalyst(c)!=null&&timeToCatalyst(c)<=180)s+=8;
 if(c.dataQuality!=null)s+=(clamp(c.dataQuality)-50)*.2;
 return clamp(s);
}
function downside(c){
 const v=num(c.downsidePct);
 return v==null?null:Math.abs(v);
}
function conviction(c){
 const s=factorScore(c), er=expectedReturn(c), th=thesisStrength(c), conf=confidence(c);
 if(s==null)return null;
 const edge=er==null?50:clamp(50+er*1.4);
 const down=downside(c); const asym=down==null?50:clamp(100-down*1.6);
 return clamp(s*.38+edge*.22+th*.15+conf*.15+asym*.10);
}
function opportunityScore(c){
 const cv=conviction(c); if(cv==null)return null;
 const small=c.smallCap?8:0, catalyst=timeToCatalyst(c)!=null&&timeToCatalyst(c)<=180?5:0;
 return clamp(cv+small+catalyst);
}
function portfolioContext(){
 const total=typeof valueNow==="function"?valueNow():0;
 const holdings=typeof data!=="undefined"?data.holdings:[];
 return {total,holdings,weights:holdings.map(h=>({...h,weight:total?(h.quantity*h.price)/total:0}))};
}
function marketMeta(c){
 const market=String(c.market||c.exchange||"");
 const currency=String(c.currency||"SEK").toUpperCase();
 const foreign=currency&&currency!=="SEK";
 const france=/FRA|PAR/i.test(market);
 const us=/NMS|NYQ|NYS|ASE|NCM|NAS/i.test(market);
 return {foreign,france,us};
}
function tradingCostSEK(c,value,side="buy"){
 const t=model.trading||DEFAULT_MODEL.trading, v=Math.max(0,Number(value)||0), m=marketMeta(c);
 if(!v)return 0;
 let fee=Math.max(t.minCourtageSEK,v*t.courtagePct/100);
 if(m.foreign)fee+=v*t.fxPct/100;
 if(m.france&&side==="buy")fee+=v*.004;
 if(m.us&&side==="sell")fee+=v*.0000278;
 return fee;
}
function tradeEfficient(c,targetPct,currentPct=0,side="buy"){
 const total=portfolioContext().total||model.startingCapital||50000;
 const value=total*Math.abs(targetPct-currentPct)/100;
 const cost=tradingCostSEK(c,value,side), min=(model.trading||DEFAULT_MODEL.trading).minTradeSEK;
 return {ok:value>=min&&(value?cost/value:1)<.02,cost,value,edgeAfterFriction:value?cost/value:0};
}
function positionPct(c){
 const cv=conviction(c); if(cv==null)return 0;
 const er=expectedReturn(c), risk=num(c.risk), downsidePct=downside(c);
 let base=clamp((cv-50)/50)*model.maxPositionPct;
 if(er!=null&&er>25)base*=1.12;
 if(downsidePct!=null&&downsidePct>25)base*=.75;
 if(risk!=null&&risk<40)base*=.65;
 if(model.regime==="risk_on")base*=1.05;
 if(model.regime==="risk_off")base*=.65;
 return Math.min(model.maxPositionPct,Math.max(0,base));
}
function portfolioRiskBudget(){
 const p=portfolioContext(), weights=p.weights||[],hhi=weights.reduce((s,h)=>s+h.weight*h.weight,0);
 const sectors={}; weights.forEach(h=>{const c=allCandidates().find(x=>x.ticker===h.ticker);const sec=c?.sector||"Okänd";sectors[sec]=(sectors[sec]||0)+h.weight});
 const maxSector=Math.max(0,...Object.values(sectors));
 return {hhi,maxSector,topWeight:Math.max(0,...weights.map(h=>h.weight))};
}
function portfolioFit(c,targetPct){
 const p=portfolioRiskBudget();
 const sec=c.sector||"Okänd";
 const existing=p.hhi>0&&typeof data!=="undefined"?data.holdings.find(h=>h.ticker===c.ticker):null;
 let penalty=0,notes=[];
 if(p.topWeight>0.30){penalty+=8;notes.push("Hög toppkoncentration")}
 if(existing&&p.topWeight>0.35){penalty+=5;notes.push("Befintligt koncentrationsrisk")}
 if(sec!=="Okänd"&&p.maxSector>0.45){penalty+=5;notes.push("Sektorkoncentration")}
 return {score:clamp(100-penalty),notes};
}
function buyDecision(c){
 const s=factorScore(c),conf=confidence(c),p=portfolioContext(),existing=p.weights.find(h=>h.ticker===c.ticker);
 const current=existing?.weight??0,target=positionPct(c),gap=target-current,fit=portfolioFit(c,target);
 const blockers=[],reasons=[];
 if(s==null)blockers.push("Saknar tillräcklig faktordata");
 if(conf<75)blockers.push("Dataconfidence under 75%");
 if(s!=null&&s<68)blockers.push("Grundscore under 68");
 if(model.regime==="risk_off"&&s!=null&&s<80)blockers.push("Risk-off kräver score ≥80");
 if(expectedReturn(c)==null)blockers.push("Förväntad avkastning saknas");
 if(!c.thesis||!c.invalidation)blockers.push("Tes eller invalidationspunkt saknas");
 const friction=tradeEfficient(c,target,current,gap>=0?"buy":"sell");
 if(gap>3&& !friction.ok)blockers.push("Affären för liten/dyr efter friktion");
 if(fit.score<90&&gap>3)blockers.push("Portföljkoncentration");
 if(existing){
  if(gap>3)reasons.push("Målvikten överstiger aktuell vikt");
  else if(gap<-3)reasons.push("Aktuell vikt överstiger målvikten");
  else reasons.push("Aktuell vikt nära mål");
 }else reasons.push("Ny möjlighet jämförs mot hela portföljen");
 let status="AVVAKTA";
 if(!blockers.length){
  if(gap>5&&opportunityScore(c)>=80)status=existing?"ÖKA":"KÖPKANDIDAT";
  else if(gap>3)status=existing?"ÖKA":"BEVAKA";
  else if(gap<-3)status="MINSKA";
  else status="BEHÅLL";
 }
 return {status,score:s,confidence:conf,currentWeight:current,targetPct:target,gap,reasons,blockers,
   estimatedTradeCost:friction.cost,expectedReturn:expectedReturn(c),conviction:conviction(c),horizonShort:horizonScore(c,"short"),horizonMedium:horizonScore(c,"medium"),horizonLong:horizonScore(c,"long"),fit:fit.score};
}
function sellDecision(h){
 const c=allCandidates().find(x=>x.ticker===h.ticker),p=portfolioContext(),current=p.weights.find(x=>x.ticker===h.ticker)?.weight??0;
 if(!c)return{status:"OMPRÖVA",ticker:h.ticker,name:h.name,weight:current,score:null,targetPct:null,reasons:["Ingen verifierad profil"],blockers:["Fundamental data saknas"]};
 const s=factorScore(c),conf=confidence(c),target=positionPct(c),reasons=[];
 if(s<58)reasons.push("Score under 58");
 if(conf<70)reasons.push("Dataconfidence under 70%");
 if(num(c.risk)!=null&&num(c.risk)<35)reasons.push("Förhöjd risk");
 if(num(c.valuation)!=null&&num(c.valuation)<30)reasons.push("Svag värderingsbild");
 if(num(c.balance)!=null&&num(c.balance)<30)reasons.push("Svag balansräkning");
 if(num(c.growth)!=null&&num(c.growth)<30)reasons.push("Försämrad tillväxt");
 if(c.thesisBroken===true)reasons.push("Investeringshypotes bruten");
 if(c.catalystExpired===true)reasons.push("Katalysator förbrukad utan värderealisering");
 if(current-target/100>.05)reasons.push("Aktuell vikt >5 pp över mål");
 let status="BEHÅLL"; if(reasons.length>=3)status="SÄLJ/ROTERA"; else if(reasons.length)status="OMPRÖVA";
 return{status,ticker:h.ticker,name:h.name,weight:current,score:s,targetPct:target,reasons,confidence:conf,conviction:conviction(c)};
}
function renderDecisionEngine(){
 const buyEl=document.querySelector("#buyEngineRows"),sellEl=document.querySelector("#sellEngineRows");if(!buyEl||!sellEl)return;
 const candidates=allCandidates().sort((a,b)=>(opportunityScore(b)??-1)-(opportunityScore(a)??-1));
 buyEl.innerHTML=candidates.length?candidates.map(c=>{const d=buyDecision(c),cls=["KÖPKANDIDAT","ÖKA"].includes(d.status)?"good":["BEVAKA","BEHÅLL","MINSKA","OMPRÖVA"].includes(d.status)?"mid":"";
 return "<tr><td><strong>"+esc(c.name)+"</strong><small>"+esc(c.ticker||"")+"</small></td><td>"+(d.score==null?"–":d.score.toFixed(0))+"</td><td>"+d.confidence+"%</td><td>"+d.targetPct.toFixed(1)+"%</td><td>"+(d.expectedReturn==null?"–":(d.expectedReturn>=0?"+":"")+d.expectedReturn.toFixed(1)+"%")+"</td><td><b class='decision "+cls+"'>"+d.status+"</b></td><td>"+esc((d.blockers.length?d.blockers:d.reasons).join(" · "))+"</td></tr>" }).join(""):"<tr><td colspan='7' class='model-empty'>Inga verifierade kandidater ännu.</td></tr>";
 const holdings=portfolioContext().holdings;
 sellEl.innerHTML=holdings.length?holdings.map(h=>{const d=sellDecision(h),cls=d.status==="SÄLJ/ROTERA"?"bad":d.status==="BEHÅLL"?"good":"mid";
 return "<tr><td><strong>"+esc(h.name)+"</strong><small>"+esc(h.ticker)+"</small></td><td>"+(d.score==null?"–":d.score.toFixed(0))+"</td><td>"+(d.weight*100).toFixed(1)+"%</td><td>"+(d.targetPct==null?"–":d.targetPct.toFixed(1)+"%")+"</td><td><b class='decision "+cls+"'>"+d.status+"</b></td><td>"+esc(d.reasons.join(" · ")||"Ingen tydlig säljsignal")+"</td></tr>" }).join(""):"<tr><td colspan='6'>Inga innehav.</td></tr>";
}
function renderLearning(){
 const el=document.querySelector("#modelLearning");if(!el)return;
 const j=model.journal||[], scored=j.filter(x=>x.actualReturn!=null&&x.expectedReturn!=null);
 const hit=scored.length?scored.filter(x=>Math.sign(Number(x.actualReturn))===Math.sign(Number(x.expectedReturn))).length/scored.length*100:null;
 el.innerHTML="<strong>"+j.length+" utvärderbara beslut · "+sharedResearch.length+" publicerade chattanalyser</strong><span>"+(scored.length?scored.length+" med utfall · träffbild "+hit.toFixed(0)+"%":"Ingen träffbild ännu; utfall saknas och ska inte hittas på.")+"</span>";
}
function renderModel(){
 const total=typeof valueNow==="function"?valueNow():0,candidates=allCandidates().sort((a,b)=>(opportunityScore(b)??-1)-(opportunityScore(a)??-1));
 renderDecisionEngine();renderLearning();
 const rows=document.querySelector("#modelRows");if(!rows)return;
 rows.innerHTML=candidates.length?candidates.map(c=>{const s=factorScore(c),conf=confidence(c),pos=positionPct(c),cv=conviction(c),er=expectedReturn(c);
 return "<tr><td><strong>"+esc(c.name)+"</strong><small>"+esc(c.ticker||"")+" · "+esc(c.horizon||"adaptiv")+"</small></td><td><b class='model-score "+(s>=72?"good":s>=62?"mid":"")+"'>"+(s==null?"–":s.toFixed(0))+"</b></td><td>"+conf+"%</td><td>"+(cv==null?"–":cv.toFixed(0))+"</td><td>"+(er==null?"–":(er>=0?"+":"")+er.toFixed(1)+"%")+"</td><td>"+(pos==null?"–":pos.toFixed(1)+"%")+"</td><td><button class='text-button model-edit' data-id='"+esc(c.id)+"'>Redigera</button></td></tr>" }).join(""):"<tr><td colspan='7' class='model-empty'>Lägg till eller importera verifierade kandidater.</td></tr>";
 document.querySelector("#modelRegime").value=model.regime;
 document.querySelector("#modelRegimeText").textContent=model.regime==="risk_on"?"Risk-on · större utrymme för growth/momentum":"Risk-off"===model.regime?"Risk-off · högre beviskrav och mindre positioner":"Neutral · adaptiv viktning över tre tidshorisonter";
 const scored=candidates.filter(c=>factorScore(c)!=null);
 document.querySelector("#modelTop").textContent=scored.length?scored[0].name+" · conviction "+conviction(scored[0]).toFixed(0):"Ingen kandidat är tillräckligt datastödd";
 document.querySelector("#modelCoverage").textContent=scored.length+" av "+candidates.length+" kandidater har preliminär faktorprofil.";
 const alerts=[];const risk=portfolioRiskBudget();
 if(risk.topWeight>.30)alerts.push("Toppvikt över 30%: koncentrationsrisk.");
 if(risk.maxSector>.45)alerts.push("En sektor över 45% av portföljen.");
 if(total){const cash=(typeof data!=="undefined"?data.cash:0)/total*100;if(cash<model.minCashPct)alerts.push("Kassa under "+model.minCashPct+"%.")}
 document.querySelector("#modelAlerts").innerHTML=alerts.length?alerts.map(x=>"<div>⚠ "+esc(x)+"</div>").join(""):"<div>✓ Inga generella modellvarningar.</div>";
}
function openCandidate(existing){
 const c=existing||{id:crypto.randomUUID(),name:"",ticker:"",type:"Noterat",horizon:"adaptiv"};
 const d=document.querySelector("#modelDialog"),f=document.querySelector("#modelForm");if(!d||!f)return;
 f.dataset.id=c.id;
 ["name","ticker","type"].forEach(k=>{if(f.elements[k])f.elements[k].value=c[k]??""});
 FACTORS.forEach(([k,label])=>{if(f.elements[k]){f.elements[k].value=c[k]??"";f.querySelector("[name='"+k+"']").previousElementSibling.textContent=label+" (0–100)"}});
 ["shortExpectedReturn","mediumExpectedReturn","longExpectedReturn","downsidePct","dataQuality"].forEach(k=>{if(f.elements[k])f.elements[k].value=c[k]??""});
 if(f.elements.thesis)f.elements.thesis.value=c.thesis||"";
 if(f.elements.invalidation)f.elements.invalidation.value=c.invalidation||"";
 if(f.elements.catalystDate)f.elements.catalystDate.value=c.catalystDate||"";
 d.showModal();
}
function addModelListeners(){
 document.querySelector("#modelRegime")?.addEventListener("change",e=>{model.regime=e.target.value;saveModel();renderModel()});
 document.querySelector("#addCandidate")?.addEventListener("click",()=>openCandidate());
 document.querySelector("#cancelModel")?.addEventListener("click",()=>document.querySelector("#modelDialog").close());
 document.querySelector("#cancelModel2")?.addEventListener("click",()=>document.querySelector("#modelDialog").close());
 document.querySelector("#modelForm")?.addEventListener("submit",e=>{
  e.preventDefault();const f=e.currentTarget,fd=new FormData(f),id=f.dataset.id;
  const c={id,name:String(fd.get("name")||""),ticker:String(fd.get("ticker")||""),type:String(fd.get("type")||"Noterat"),horizon:String(fd.get("horizon")||"adaptiv"),
    thesis:String(fd.get("thesis")||""),invalidation:String(fd.get("invalidation")||""),catalyst:String(fd.get("catalyst")||""),
    catalystDate:String(fd.get("catalystDate")||"")};
  FACTORS.forEach(([k])=>c[k]=num(fd.get(k)));
  ["shortExpectedReturn","mediumExpectedReturn","longExpectedReturn","downsidePct","dataQuality"].forEach(k=>c[k]=num(fd.get(k)));
  const i=model.candidates.findIndex(x=>x.id===id);if(i>=0)model.candidates[i]=c;else model.candidates.push(c);
  saveModel();renderModel();document.querySelector("#modelDialog").close();
 });
 document.querySelector("#modelRows")?.addEventListener("click",e=>{const b=e.target.closest(".model-edit");if(b)openCandidate(model.candidates.find(c=>c.id===b.dataset.id))});
}
function renderJournal(){
 const el=document.querySelector("#journalRows");if(!el)return;
 const shared=sharedResearch.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(j=>"<div><strong>"+esc(j.date||"")+" · "+esc(j.title||"Analys")+"</strong><span>"+esc(j.summary||"")+"</span><small>Gemensam dashboardjournal · publicerad från chatten</small></div>");
 const local=model.journal.slice(-8).reverse().map(j=>"<div><strong>"+esc(j.ticker)+" · "+esc(j.date||"")+"</strong><span>"+esc(j.hypothesis)+"</span><small>Förväntat "+esc(j.expectedReturn)+"% · Utfall "+esc(j.actualReturn??"ej klart")+"%</small><small>Invalidation: "+esc(j.invalidation)+"</small></div>");
 el.innerHTML=[...shared,...local].join("")||"<small>Inga analyser eller beslut loggade ännu.</small>";
}
function initResearchTools(){
 document.querySelector("#runBacktest")?.addEventListener("click",()=>{
  const s=Number(document.querySelector("#btStart").value),e=Number(document.querySelector("#btEnd").value),y=Number(document.querySelector("#btYears").value),dd=Number(document.querySelector("#btDd").value);
  const c=s>0&&e>0&&y>0?(Math.pow(e/s,1/y)-1)*100:null;
  document.querySelector("#btCagr").textContent=c==null?"–":c.toFixed(2)+"%";
  document.querySelector("#btMaxDd").textContent=dd.toFixed(1)+"%";
  document.querySelector("#btStatus").textContent=c==null?"Ogiltiga data":"Resultat registrerat lokalt";
  model.backtests.push({date:new Date().toISOString().slice(0,10),start:s,end:e,years:y,cagr:c,maxDrawdown:dd,version:model.version});
  saveModel();
 });
 document.querySelector("#saveJournal")?.addEventListener("click",()=>{
  const ticker=document.querySelector("#jTicker").value.trim(),hypothesis=document.querySelector("#jHypothesis").value.trim(),invalidation=document.querySelector("#jInvalidation").value.trim();
  if(!ticker||!hypothesis||!invalidation)return;
  model.journal.push({date:new Date().toISOString().slice(0,10),ticker,hypothesis,invalidation,expectedReturn:num(document.querySelector("#jExpected")?.value),actualReturn:null,version:model.version});
  saveModel();document.querySelector("#jTicker").value="";document.querySelector("#jHypothesis").value="";document.querySelector("#jInvalidation").value="";if(document.querySelector("#jExpected"))document.querySelector("#jExpected").value="";renderJournal();renderLearning();
 });
 renderJournal();
}
document.addEventListener("DOMContentLoaded",()=>{addModelListeners();renderModel();initResearchTools();syncSharedJournal()});
window.InvesternModel={render:renderModel,read:()=>model,save:saveModel,buyDecision,sellDecision,opportunityScore,conviction,expectedReturn};
