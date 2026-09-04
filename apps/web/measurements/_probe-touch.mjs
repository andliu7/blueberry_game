import puppeteer from "puppeteer-core";
const EXE = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await puppeteer.launch({ executablePath: EXE, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = [];
p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
await p.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
await p.goto("http://localhost:5174/", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));
const t0 = await p.evaluate(() => location.hash);
// real touch tap on the primary CTA
const target = await p.evaluateHandle(() => [...document.querySelectorAll("button")].find(b => /get started/i.test(b.textContent||"")));
const box = await target.asElement()?.boundingBox();
console.log("CTA box:", JSON.stringify(box));
if (box) {
  await p.touchscreen.tap(box.x + box.width/2, box.y + box.height/2);
}
await new Promise(r => setTimeout(r, 1500));
const t1 = await p.evaluate(() => location.hash);
console.log("hash before:", t0, " after TOUCH tap:", t1, t0===t1 ? "  <-- NO NAVIGATION" : "  <-- worked");

// now try a pathway node by touch
await p.goto("http://localhost:5174/#/pathway", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 2500));
const nodeInfo = await p.evaluate(() => {
  const n = document.querySelector(".path-node");
  if (!n) return { found: false, count: document.querySelectorAll(".path-node").length };
  const r = n.getBoundingClientRect();
  const cs = getComputedStyle(n);
  const el = document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
  return { found: true, tag: n.tagName, w: Math.round(r.width), h: Math.round(r.height),
    pe: cs.pointerEvents, touchAction: cs.touchAction,
    hitIsSelf: el === n || n.contains(el), hit: el ? el.tagName + "." + (el.className.baseVal ?? el.className ?? "").toString().slice(0,40) : null };
});
console.log("NODE:", JSON.stringify(nodeInfo));
if (nodeInfo.found) {
  const nb = await (await p.$(".path-node")).boundingBox();
  const h0 = await p.evaluate(() => location.hash);
  await p.touchscreen.tap(nb.x + nb.width/2, nb.y + nb.height/2);
  await new Promise(r => setTimeout(r, 1500));
  const h1 = await p.evaluate(() => location.hash);
  const sheet = await p.evaluate(() => document.querySelectorAll("dialog[open], .ns-sheet, [data-sheet]").length);
  console.log("node tap:", h0, "->", h1, "| open sheets:", sheet, (h0===h1 && sheet===0) ? " <-- NODE TAP DID NOTHING" : " <-- worked");
}
console.log("ERRORS:", errs.length ? errs.slice(0,5).join("\n") : "none");
await b.close();
