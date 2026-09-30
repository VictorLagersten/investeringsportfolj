const YAHOO="https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved";
const PREDEFINED=["most_actives","day_gainers","day_losers","growth_technology_stocks","undervalued_growth_stocks","undervalued_large_caps","growth_large_cap","aggressive_small_caps","small_cap_gainers"];
const EXCHANGES=["NMS","NYQ","NYS","ASE","NCM","NAS","STO","CPH","HEL","OSL","ICE","FRA","GER","STU","PAR","AMS","BRU"]; // Yahoo proxies; eligibility is separately documented
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url,opts={}){const r=await fetch(url,{...opts,headers:{"User-Agent":"Mozilla/5.0",...(opts.headers||{})}});if(!r.ok)throw new Error(r.status+" "+url);return r.json();}
function normalize(q){return {ticker:q.symbol,name:q.longName||q.shortName||q.symbol,exchange:q.exchange||"",marketCap:q.marketCap??null,currentPrice:q.regularMarketPrice??null,dayPct:q.regularMarketChangePercent??null,sector:q.sector||"",currency:q.currency||"",source:"Yahoo Finance discovery",asOf:new Date().toISOString()};}
async function predefined(id){
  try{const j=await getJson(YAHOO+"?scrIds="+encodeURIComponent(id)+"&count=250&formatted=false");return (j?.finance?.result?.[0]?.quotes||[]).map(normalize)}catch(e){console.warn("screen",id,e.message);return[]}
}
async function exchange(ex){
  try{
    const body={offset:0,size:2500,sortField:"marketcap",sortType:"DESC",quoteType:"EQUITY",query:{operator:"AND",operands:[{operator:"EQ",operands:["exchange",ex]}]}};
    const j=await getJson("https://query2.finance.yahoo.com/v1/finance/screener?formatted=false",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    return (j?.finance?.result?.[0]?.quotes||[]).map(normalize);
  }catch(e){console.warn("exchange",ex,e.message);return[]}
}
const all=[];
for(const id of PREDEFINED){all.push(...await predefined(id));await sleep(150)}
for(const ex of EXCHANGES){all.push(...await exchange(ex));await sleep(100)}
const map=new Map();
for(const q of all)if(q.ticker&&!q.ticker.includes("^"))map.set(q.ticker,{...(map.get(q.ticker)||{}),...q});
const rows=[...map.values()].sort((a,b)=>(b.marketCap||0)-(a.marketCap||0));
await import("node:fs/promises").then(fs=>fs.writeFile("data/universe.json",JSON.stringify({version:2,generatedAt:new Date().toISOString(),source:"Yahoo Finance discovery",count:rows.length,coverage:"Handelsbanken-ISK practical universe: Nordics + USA + France + Netherlands + Germany; not guaranteed exhaustive",rows},null,2)));
console.log("Universe:",rows.length);
