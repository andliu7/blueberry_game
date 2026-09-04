import puppeteer from "puppeteer-core";
const EXE = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await puppeteer.launch({ executablePath: EXE, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });
await p.goto("http://localhost:5174/#/pathway", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));
const out = await p.evaluate(() => {
  const nodes = [...document.querySelectorAll(".path-node")];
  const cls = n => (n.className.baseVal ?? n.className ?? "").toString();
  const tally = {};
  const byTag = {};
  for (const n of nodes) {
    byTag[n.tagName] = (byTag[n.tagName] || 0) + 1;
    const c = cls(n);
    for (const m of c.match(/path-node--[a-z]+/g) || ["(none)"]) tally[m] = (tally[m] || 0) + 1;
  }
  const pressable = nodes.filter(n => n.tagName === "A" && n.getAttribute("href"));
  const queued = nodes.filter(n => cls(n).includes("--queued"));
  return {
    total: nodes.length, byTag, states: tally,
    pressableLinks: pressable.length,
    queued: queued.length,
    sampleQueuedLabel: queued[0] ? (queued[0].getAttribute("aria-label") || "").slice(0, 90) : null,
    samplePressHref: pressable[0] ? pressable[0].getAttribute("href") : null,
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
