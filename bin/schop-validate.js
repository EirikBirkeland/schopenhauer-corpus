const fs=require("fs"),cp=require("child_process");
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
const dirs=["texts","texts/secondary"];
let n=0,bad=0;
for(const d of dirs) for(const f of fs.readdirSync(d).filter(f=>f.endsWith(".txt"))){
  const p=d+"/"+f; n++;
  const buf=fs.readFileSync(p); const t=buf.toString("utf8");
  const head=t.split("\n").slice(0,10).join("\n");
  const need=["# TIER","# title:","# year:","# edition:","# copyright:","# source:","# fetched:"];
  const miss=need.filter(k=>!head.includes(k));
  const utf8ok=cp.execSync(`iconv -f utf-8 -t utf-8 ${JSON.stringify(p)} > /dev/null 2>&1 && echo ok || echo FAIL`).toString().trim()==="ok";
  const words=t.split(/\s+/).length;
  if(miss.length||!utf8ok||words<200){bad++;console.log("BAD",p,"missing:",miss.join(","),"utf8:",utf8ok,"words:",words);}
}
console.log("checked:",n,"problems:",bad);
