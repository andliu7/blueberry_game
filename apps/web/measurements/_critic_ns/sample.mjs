import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const b = await puppeteer.launch({executablePath:chrome, headless:"new", args:["--no-sandbox"]});
const p = await b.newPage();
const ref = "C:/Users/zeusa/Downloads/Projects/blueberry_game/docs/reference/design-goals/blueberry_r5-node-sheet-v2_1788286114.png";
const gb  = "C:/Users/zeusa/Downloads/Projects/blueberry_game/docs/reference/design-goals/blueberry_r5-guidebook_1788286119.png";
const d = async (f)=> "data:image/png;base64," + (await readFile(f)).toString("base64");
await p.setContent(`<img id=a src="${await d(ref)}"><img id=b src="${await d(gb)}">`);
await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
const out = await p.evaluate(()=>{
  const grab=(img)=>{const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext("2d");x.drawImage(img,0,0);return {x,w:c.width,h:c.height};};
  const A=grab(document.getElementById("a")), B=grab(document.getElementById("b"));
  const px=(g,X,Y)=>{const d=g.x.getImageData(X,Y,1,1).data;return `#${[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("")}`;};
  return {
    sizeA:[A.w,A.h], sizeB:[B.w,B.h],
    sheetFill: px(A,384,700), sheetFill2: px(A,200,760),
    cardFill: px(A,300,880), cardFill2: px(A,600,790),
    groundAbove: px(A,384,300),
    startPillMid: px(A,470,850), startPillTop: px(A,513,832), startLip: px(A,513,872),
    startText: px(A,470,851),
    pipFilled1: px(A,466,796), pipFilled2: px(A,497,796), pipEmptyRing: px(A,533,789), pipEmptyIn: px(A,533,796),
    headingInk: px(A,175,802),
    challengeFill: px(A,250,960), challengeHeadInk: px(A,180,950),
    grabber: px(A,384,668),
    tabbarBg: px(A,384,1150),
    // guidebook
    gbGround: px(B,640,420), gbTerrace: px(B,560,560), gbFigCard: px(B,200,500),
    gbWorked: px(B,400,900), gbCallout: px(B,600,660), gbCalloutText: px(B,420,610),
  };
});
console.log(JSON.stringify(out,null,1));
// crops
for (const [name, img, sx, sy, sw, sh] of [["ref-sheet","a",114,640,549,470],["ref-head","a",130,660,540,120],["ref-practice","a",130,750,520,160],["ref-berry","a",280,1000,220,120],["gb-full","b",114,110,549,1130]]) {
  const buf = await p.evaluate((n,sx,sy,sw,sh)=>{const img=document.getElementById(n);const c=document.createElement("canvas");c.width=sw;c.height=sh;c.getContext("2d").drawImage(img,sx,sy,sw,sh,0,0,sw,sh);return c.toDataURL("image/png");}, img,sx,sy,sw,sh);
  await writeFile(`C:/Users/zeusa/Downloads/Projects/blueberry_game/apps/web/measurements/_critic_ns/${name}.png`, Buffer.from(buf.split(",")[1],"base64"));
}
await b.close();
