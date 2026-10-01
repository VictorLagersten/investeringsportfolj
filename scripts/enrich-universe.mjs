const fs=await import("node:fs/promises");
const u=JSON.parse(await fs.readFile("data/universe.json","utf8"));
const rows=u.rows||[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url){const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0"}});if(!r.ok)throw new Error(r.status);return r.json();}
async function fetchBatch(batchRows){
  try{
    const symbols=batchRows.map(x=>x.ticker).join(",");
    const j=await getJson("https://query1.finance.yahoo.com/v7/finance/quote?symbols="+encodeURIComponent(symbols));
    return j?.quoteResponse?.result||[];
  }catch(e){console.warn("batch",e.message);return[]}
}
const out=[];
for(let i=0;i<rows.length;i+=100){
  const chunk=rows.slice(i,i+100), quotes=await fetchBatch(chunk), by=new Map(quotes.map(q=>[q.symbol,q]));
  for(const row of chunk){
    const q=by.get(row.ticker);
    out.push(q?{...row,marketCap:q.marketCap??row.marketCap,currentPrice:q.regularMarketPrice??row.currentPrice,dayPct:q.regularMarketChangePercent??row.dayPct,pe:q.trailingPE??q.forwardPE??null,source:"Yahoo Finance quote",asOf:new Date().toISOString()}:row);
  }
  console.log("enriched",Math.min(i+100,rows.length),"/",rows.length);
  await sleep(100);
}
await fs.writeFile("data/universe.json",JSON.stringify({...u,version:4,generatedAt:new Date().toISOString(),rows:out},null,2));
console.log("Enriched:",out.length);
