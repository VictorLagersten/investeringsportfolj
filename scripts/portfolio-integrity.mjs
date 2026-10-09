import fs from "node:fs";
const read = p => JSON.parse(fs.readFileSync(p, "utf8"));
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const close = (a,b) => Math.abs(Number(a)-Number(b)) < 0.011;
const now = process.env.PORTFOLIO_TEST_NOW ? new Date(process.env.PORTFOLIO_TEST_NOW) : new Date();
const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Stockholm",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",weekday:"short",hourCycle:"h23"}).formatToParts(now);
const part = k => parts.find(p=>p.type===k)?.value;
const today = part("year")+"-"+part("month")+"-"+part("day");
const hour = Number(part("hour")), minute = Number(part("minute")), weekday = part("weekday");
const portfolio=read("portfolio.json"), ledger=read("ledger.json"), journal=read("data/portfolio-journal.json"), market=read("data/market.json");
const errors=[], warnings=[];
const aliases={"ASSA-B":"ASSA-B","ASSA ABLOY B":"ASSA-B","NIBE-B":"NIBE-B","NIBE B":"NIBE-B","BONEX":"BONEX","SANDVIK":"SANDVIK","SAND":"SANDVIK"};
const canon=x=>aliases[String(x||"").toUpperCase()]||String(x||"").toUpperCase();
const ledgerShares={};
for(const [i,t] of ledger.entries()){
 const s=canon(t.symbol||t.ticker), a=String(t.action||t.type||"").toUpperCase(), q=Number(t.shares??t.quantity), p=Number(t.price);
 if(!["BUY","SELL"].includes(a)) errors.push("ledger["+i+"] invalid action");
 if(!Number.isFinite(q)||q<=0||!Number.isFinite(p)||p<0) errors.push("ledger["+i+"] invalid quantity/price");
 if(!Number.isFinite(Number(t.amount))||!close(t.amount,q*p)) errors.push("ledger["+i+"] amount != shares × price");
 ledgerShares[s]=(ledgerShares[s]||0)+(a==="SELL"?-q:q);
}
const portfolioShares={};
for(const h of portfolio.holdings||[]) portfolioShares[canon(h.symbol)]=Number(h.shares);
for(const s of new Set([...Object.keys(ledgerShares),...Object.keys(portfolioShares)])){
 if(!close(ledgerShares[s]||0,portfolioShares[s]||0)) errors.push("Shares mismatch "+s+": ledger "+(ledgerShares[s]||0)+", portfolio "+(portfolioShares[s]||0));
}
const inferred=Number(portfolio.feeReconciliation?.initialAggregateInferred);
if(!Number.isFinite(inferred)||inferred<0) errors.push("Missing/invalid inferred initial fees");
let cash=Number(portfolio.startCapital), laterFees=0;
for(const t of ledger){
 const a=String(t.action||"").toUpperCase(), gross=Number(t.amount), fee=t.fee==null?0:Number(t.fee);
 if(t.fee!=null&&(!Number.isFinite(fee)||fee<0)) errors.push("Invalid fee");
 if(a==="BUY") cash-=gross+fee; else if(a==="SELL") cash+=gross-fee;
 if(t.date!=null&&t.fee!=null) laterFees+=fee;
}
cash=round2(cash-inferred);
const fees=round2(inferred+laterFees);
if(!close(cash,portfolio.cash)) errors.push("Cash mismatch: calculated "+cash+", recorded "+portfolio.cash);
if(!close(fees,portfolio.totalFees)) errors.push("Fee mismatch: calculated "+fees+", recorded "+portfolio.totalFees);
const jp=journal.portfolio||{};
if(!close(jp.startCapital,portfolio.startCapital)) errors.push("Journal start capital mismatch");
if(!close(jp.cash,portfolio.cash)) errors.push("Journal cash mismatch");
if(!close(jp.cumulativeCommission,portfolio.totalFees)) errors.push("Journal commission mismatch");
const js={}; for(const h of jp.holdings||[]) js[canon(h.ticker)]=Number(h.quantity);
for(const s of new Set([...Object.keys(portfolioShares),...Object.keys(js)])) if(!close(portfolioShares[s]||0,js[s]||0)) errors.push("Journal holdings mismatch "+s);
if((journal.transactions||[]).length!==ledger.length) errors.push("Transaction count mismatch: journal "+(journal.transactions||[]).length+", ledger "+ledger.length);
const marketTime=Date.parse(market.fetchedAt||"");
const age=Number.isFinite(marketTime)?Math.round((now.getTime()-marketTime)/60000):null;
if(age==null||age<0||age>90) warnings.push("Market feed stale/invalid: "+(age==null?"unknown":age)+" minutes");
for(const k of ["ASSA-B","NIBE B","BONEX"]) if(!market.quotes?.[k]||!Number.isFinite(Number(market.quotes[k].price))) warnings.push("Missing market quote "+k);
if(Number(portfolio.cash)<0) errors.push("Negative cash");
const tradeDay=weekday==="Tue"||weekday==="Fri", auditSlot=tradeDay&&(hour>10||(hour===10&&minute>=30));
if(process.env.GITHUB_EVENT_NAME==="schedule"&&!auditSlot){console.log("No-op outside local audit slot: "+today+" "+part("hour")+":"+part("minute")+" Europe/Stockholm");process.exit(0);}
let auditAdded=false;
if(auditSlot&&(process.env.GITHUB_EVENT_NAME==="schedule"||process.env.FORCE_TRADE_WINDOW_AUDIT==="1")){
 const done=(journal.research||[]).some(r=>r.tradeWindowDate===today&&["TRADE","NO_TRADE","FAILED"].includes(r.tradeWindowStatus));
 if(!done){
  journal.research.unshift({id:"trade-window-failure-"+today,date:today,title:"MISSLYCKAD HANDELSCYKEL — "+today,tradeWindowDate:today,tradeWindowStatus:"FAILED",createdAt:now.toISOString(),summary:"Automatisk kontroll "+now.toISOString()+". Inget giltigt handelsbeslut publicerades till den gemensamma journalen senast vid kontroll efter handelsfönstret 10:00–10:30 Europe/Stockholm. Ingen affär skapad; ingen retroaktiv handel. Detta är en processvarning, inte ett köp-/säljbeslut. "+(errors.length?"Datakontrollfel: "+errors.join("; "):"Masterdata-avstämningen gav inga fel.")+" "+(warnings.length?"Varningar: "+warnings.join("; "):""),sources:["https://github.com/VictorLagersten/investeringsportfolj/blob/main/portfolio.json","https://github.com/VictorLagersten/investeringsportfolj/blob/main/ledger.json","https://github.com/VictorLagersten/investeringsportfolj/blob/main/data/portfolio-journal.json"]});
  journal.updatedAt=today; auditAdded=true;
 }
}
const report={schema:1,checkedAt:now.toISOString(),localDate:today,localTime:part("hour")+":"+part("minute"),status:errors.length||auditAdded?"FAIL":warnings.length?"WARN":"PASS",errors,warnings,reconciled:{ledgerTransactions:ledger.length,journalTransactions:(journal.transactions||[]).length,holdings:portfolio.holdings.map(h=>({symbol:h.symbol,shares:h.shares})),expectedCash:cash,recordedCash:portfolio.cash,expectedTotalFees:fees,recordedTotalFees:portfolio.totalFees,marketFetchedAt:market.fetchedAt||null,marketAgeMinutes:age},tradeWindow:{weekday,localHour:hour,localMinute:minute,auditAdded}};
fs.writeFileSync("data/portfolio-integrity.json",JSON.stringify(report,null,2)+"\n");
if(auditAdded) fs.writeFileSync("data/portfolio-journal.json",JSON.stringify(journal,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(errors.length) process.exitCode=1;
// A missed trade decision is an operational failure even when the portfolio files reconcile.
// Exit non-zero only after the FAILED audit has been written, so GitHub Actions visibly fails.
if(auditAdded) { console.error("TRADE WINDOW FAILED: missing TRADE/NO_TRADE decision; failure record published."); process.exitCode=1; }
