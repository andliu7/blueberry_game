import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import path from "node:path";
import { P2_SEEDS, LOCAL_TZ } from "./economy-moments.mjs";
const CHROME=[process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(c=>c!==undefined&&existsSync(c));
const OUT="C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-downloads-Projects-blueberry-game/8d213512-4692-46a4-8b7a-fae58bd99369/scratchpad/shots";
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--force-device-scale-factor=1","--hide-scrollbars"]});
// a journal with today's activity so the quests are part-filled
const now=new Date();
const j=[...P2_SEEDS.streak,
 {kind:"node_cleared",at:new Date(now.getTime()-30*60000).toISOString(),tz:LOCAL_TZ,nodeId:"seed:today",nodeKind:"concept",flawless:false,stepsInOneSitting:1,spine:false,difficulty:2},
 {kind:"answer",at:new Date(now.getTime()-25*60000).toISOString(),tz:LOCAL_TZ,correct:true,nodeId:"seed:today"},
 {kind:"answer",at:new Date(now.getTime()-24*60000).toISOString(),tz:LOCAL_TZ,correct:true,nodeId:"seed:today"},
];
const p=await b.newPage();
await p.setViewport({width:390,height:844,deviceScaleFactor:2});
await p.evaluateOnNewDocument((seed)=>{localStorage.clear();localStorage.setItem("theme","light");localStorage.setItem("blueberry.progress.v2",JSON.stringify({course:"orgo_2",startTopics:[],lessons:{},attemptedProblems:[],onboardingDone:true,displayName:null,journal:seed}));},j);
await p.goto("http://localhost:5173/critic.html?s=feed",{waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,1200));
await p.screenshot({path:path.join(OUT,"h-feed-seeded.png"),fullPage:true});
console.log(await p.evaluate(()=>document.body.innerText.slice(0,200).replace(/\n/g," / ")));
// colour samples
const s=await p.evaluate(()=>{
  const g=(sel,prop)=>{const e=document.querySelector(sel);return e?getComputedStyle(e)[prop]:"NONE";};
  return {
    page:g(".feed-page","backgroundColor"),
    questBg:g(".feed-quest","backgroundColor"), questBorder:g(".feed-quest","border"),
    track:g(".feed-quest-track","backgroundColor")+" | "+g(".feed-quest-track","border"),
    fill:g(".feed-quest-fill","backgroundColor"),
    reading:g(".feed-quest-reading","color"),
    radius:g(".feed-quest","borderRadius"),
  };
});
console.log(JSON.stringify(s,null,1));
await p.close();
const p2=await b.newPage();
await p2.setViewport({width:390,height:844,deviceScaleFactor:2});
await p2.evaluateOnNewDocument(()=>{localStorage.clear();localStorage.setItem("theme","light");});
await p2.goto("http://localhost:5173/critic.html?s=reward",{waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,1500));
const r=await p2.evaluate(()=>{
  const g=(sel,...props)=>{const e=document.querySelector(sel);if(!e)return sel+": NONE";const cs=getComputedStyle(e);return sel+": "+props.map(p=>p+"="+cs[p]).join(", ");};
  const out=[];
  out.push(g("[data-reward]","backgroundColor"));
  out.push(g(".reward-hero-number, .reward-number, [aria-label='XP earned']","color","fontSize","fontFamily","fontWeight"));
  const claim=[...document.querySelectorAll("button")].find(b=>/claim/i.test(b.textContent||""));
  if(claim){const cs=getComputedStyle(claim);out.push("CLAIM: color="+cs.color+" bg="+cs.backgroundColor+" border="+cs.border+" radius="+cs.borderRadius+" h="+claim.getBoundingClientRect().height+" boxShadow="+cs.boxShadow);}
  const chips=[...document.querySelectorAll("[class*='reward-card'],[class*='reward-chip']")].slice(0,4);
  chips.forEach((c,i)=>{const cs=getComputedStyle(c);out.push("chip"+i+" ["+c.className+"]: bg="+cs.backgroundColor+" border="+cs.border+" shadow="+cs.boxShadow+" h="+Math.round(c.getBoundingClientRect().height));});
  return out.join("\n");
});
console.log(r);
await p2.close();
await b.close();
