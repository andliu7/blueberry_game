import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
const CHROME=[process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(c=>c!==undefined&&existsSync(c));
const OUT="C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-downloads-Projects-blueberry-game/8d213512-4692-46a4-8b7a-fae58bd99369/scratchpad/shots";
mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--force-device-scale-factor=1","--hide-scrollbars"]});
const p=await b.newPage();
await p.setViewport({width:390,height:844,deviceScaleFactor:2});
await p.evaluateOnNewDocument(()=>{localStorage.clear();localStorage.setItem("theme","light");});
await p.goto("http://localhost:5199/critic.html?s=reward",{waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,1400));
await p.screenshot({path:path.join(OUT,"reward.png")});
console.log(await p.evaluate(()=>{
  const R=(s)=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),b:Math.round(b.bottom),r:Math.round(b.right)};};
  const num=R(".reward-xp"), hn=R(".reward-hero-number"), cf=R(".reward-confetti");
  const fl=[...document.querySelectorAll(".reward-flake")].map(f=>f.getBoundingClientRect());
  const bb={x:Math.round(Math.min(...fl.map(f=>f.x))),y:Math.round(Math.min(...fl.map(f=>f.y))),r:Math.round(Math.max(...fl.map(f=>f.right))),b:Math.round(Math.max(...fl.map(f=>f.bottom)))};
  const pct=(v,ref,size)=>Math.round((v-ref)/size*100);
  const out={num,heroNumber:hn,confettiBox:cf,flakeBBox:bb,
    relToNumber:{left:pct(bb.x,num.x,num.w),right:pct(bb.r,num.x,num.w),top:pct(bb.y,num.y,num.h),bottom:pct(bb.b,num.y,num.h)},
    stageBg:getComputedStyle(document.querySelector(".reward-stage")).backgroundColor,
    claim:(()=>{const c=[...document.querySelectorAll("button")].find(x=>/claim/i.test(x.textContent||""));const r=c.getBoundingClientRect();return {y:Math.round(r.y),h:Math.round(r.height),topPct:Math.round(r.y/844*100)};})(),
    lastContentBottom:Math.round((document.querySelector(".reward-aside")??document.querySelector(".reward-chips")).getBoundingClientRect().bottom),
  };
  return JSON.stringify(out,null,1);
}));
await p.close();await b.close();
