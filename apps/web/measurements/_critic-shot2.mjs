import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import path from "node:path";
const CHROME = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((c)=>c!==undefined&&existsSync(c));
const OUT="C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-downloads-Projects-blueberry-game/8d213512-4692-46a4-8b7a-fae58bd99369/scratchpad/shots";
const b = await puppeteer.launch({ executablePath: CHROME, headless:"new", args:["--force-device-scale-factor=1","--hide-scrollbars"] });
for (const [name,url,theme,full] of [["h-reward","http://localhost:5173/critic.html?s=reward","light",false],["h-reward-dark","http://localhost:5173/critic.html?s=reward","dark",false],["h-feed","http://localhost:5173/critic.html?s=feed","light",true],["h-feed-dark","http://localhost:5173/critic.html?s=feed","dark",true]]) {
  const p = await b.newPage();
  await p.setViewport({ width:390, height:844, deviceScaleFactor:2 });
  await p.evaluateOnNewDocument((t)=>{localStorage.clear();localStorage.setItem("theme",t);},theme);
  p.on("console",(m)=>{if(m.type()==="error")console.log(name,"ERR",m.text().slice(0,300));});
  p.on("pageerror",(e)=>console.log(name,"PAGEERR",String(e).slice(0,300)));
  await p.goto(url,{waitUntil:"networkidle0"});
  await new Promise(r=>setTimeout(r,1500));
  await p.screenshot({ path: path.join(OUT, name+".png"), fullPage: full });
  console.log(name, "ok", await p.evaluate(()=>document.body.innerText.slice(0,120).replace(/\n/g," / ")));
  await p.close();
}
await b.close();
