import puppeteer from "puppeteer-core";
const EXE = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await puppeteer.launch({ executablePath: EXE, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = [];
p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
await p.setViewport({ width: 1500, height: 1000 });
await p.goto("http://localhost:5174/device.html?x=1", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));
// turn on the reference pane
await p.select("#ref", "unit02");
await new Promise(r => setTimeout(r, 2500));
const info = await p.evaluate(() => {
  const f = document.querySelector("iframe");
  const img = document.querySelector(".stage img");
  return {
    devices: document.querySelectorAll(".device").length,
    iframe: f ? { w: f.width, h: f.height, src: f.getAttribute("src") } : null,
    innerViewport: f && f.contentWindow ? f.contentWindow.innerWidth + "x" + f.contentWindow.innerHeight : "cross-origin?",
    innerNodes: (() => { try { return f.contentDocument.querySelectorAll(".path-node").length; } catch { return "n/a"; } })(),
    refLoaded: img ? (img.naturalWidth > 0 ? "loaded " + img.naturalWidth + "x" + img.naturalHeight : "FAILED") : "no img",
  };
});
console.log(JSON.stringify(info, null, 1));
console.log("ERRORS:", errs.length ? errs.slice(0,4).join("\n") : "none");
await p.screenshot({ path: "measurements/_shots/device-harness.png" });
await b.close();
