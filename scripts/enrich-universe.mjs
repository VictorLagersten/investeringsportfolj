const fs=await import("node:fs/promises");
const u=JSON.parse(await fs.readFile("data/universe.json","utf8"));
const rows=u.rows||[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url){const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0"}});if(!r.ok)throw new Error(r.status);return r.json();}
function pick(arr,names){for(const x of arr||[]){if(names.includes(x.meta?.symbol)||names.includes(x.symbol))return x;}return null}
async function enrich(row){
  try{
    const s=await getJson("https://query1.finance.yahoo.com/v7/finance/quote?symbols="+encodeURIComponent(row.ticker));
    const q=s?.quoteResponse?.result?.[0]||{};
    const out={...row,marketCap:q.marketCap??row.marketCap,currentPrice:q.regularMarketPrice??row.currentPrice,dayPct:q.regularMarketChangePercent??row.dayPct,pe:q.trailingPE??q.forwardPE??null,evEbit:null,roic:null,operatingMargin:null,fcfMargin:null,revenueGrowth3y:null,epsGrowth3y:null,netDebtEbitda:null,insiderOwnership:null,analystCoverage:null,liquidity:null,source:"Yahoo Finance quote",asOf:new Date().toISOString()};
    return out;
  }catch{return row}
}
const enriched=[];
for(let i=0;i<rows.length;i++){enriched.push(await enrich(rows[i]));if((i+1)%25===0)console.log("enriched",i+1,"/",rows.length);await sleep(75)}
await fs.writeFile("data/universe.json",JSON.stringify({...u,version:3,generatedAt:new Date().toISOString(),rows:enriched},null,2));
console.log("Enriched:",enriched.length);
