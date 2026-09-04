import puppeteer from "puppeteer-core";
const EXE = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await puppeteer.launch({ executablePath: EXE, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 1 });
await p.goto("http://localhost:5174/#/pathway", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));
const rows = await p.evaluate(() => {
  const out = [];
  for (const sec of document.querySelectorAll("[data-unit-id]")) {
    const nodes = [...sec.querySelectorAll(".path-node")].filter(n => !(n.className.baseVal ?? n.className ?? "").toString().includes("swatch"));
    const live = nodes.filter(n => n.tagName === "A" && n.getAttribute("href")).length;
    const queued = nodes.filter(n => (n.className.baseVal ?? n.className ?? "").toString().includes("--queued")).length;
    const title = (sec.querySelector("h2,h3,[class*=banner]")?.textContent || sec.getAttribute("data-unit-id") || "").trim().slice(0, 46);
    out.push({ unit: sec.getAttribute("data-unit-id"), title, total: nodes.length, live, queued });
  }
  return out;
});
let tl = 0, tt = 0;
for (const r of rows) {
  tl += r.live; tt += r.total;
  const pct = r.total ? Math.round(100 * r.live / r.total) : 0;
  const bar = "#".repeat(Math.round(pct / 8)).padEnd(13);
  console.log(`${(r.unit||"").padEnd(4)} ${String(r.live).padStart(3)}/${String(r.total).padStart(3)} ${bar} ${r.title}`);
}
console.log(`\nTOTAL ${tl}/${tt} playable = ${Math.round(100*tl/tt)}%`);
await b.close();
