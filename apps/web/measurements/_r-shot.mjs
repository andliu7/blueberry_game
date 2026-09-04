import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((c) => c !== undefined && existsSync(c));
const OUT = "C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-downloads-Projects-blueberry-game/8d213512-4692-46a4-8b7a-fae58bd99369/scratchpad/shots";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5199";
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
});

const now = Date.now();
const ev = (min, extra) => ({ at: new Date(now - min * 60000).toISOString(), tz: TZ, ...extra });
const journal = [
  ev(60 * 26, { kind: "node_cleared", nodeId: "y1", nodeKind: "concept", flawless: true, stepsInOneSitting: 1, spine: true, difficulty: 2 }),
  ev(45, { kind: "node_cleared", nodeId: "t1", nodeKind: "concept", flawless: true, stepsInOneSitting: 1, spine: true, difficulty: 2 }),
  ev(30, { kind: "attempt", nodeId: "t1", problemId: "p1", correct: true }),
  ev(29, { kind: "attempt", nodeId: "t1", problemId: "p2", correct: true }),
  ev(28, { kind: "attempt", nodeId: "t1", problemId: "p3", correct: false }),
];

// ---- FEED ----
for (const [name, seed] of [["feed-empty", []], ["feed-seeded", journal]]) {
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument((s) => {
    localStorage.clear();
    localStorage.setItem("theme", "light");
    localStorage.setItem(
      "blueberry.progress.v2",
      JSON.stringify({ course: "orgo_2", startTopics: [], lessons: {}, attemptedProblems: [], onboardingDone: true, displayName: null, journal: s }),
    );
  }, seed);
  await p.goto(`${BASE}/critic.html?s=feed`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 900));
  await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  const info = await p.evaluate(() => {
    const g = (sel, ...props) => {
      const e = document.querySelector(sel);
      if (!e) return `${sel}: NONE`;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      return `${sel}: ${props.map((k) => `${k}=${cs[k]}`).join(" ")} box=${Math.round(r.width)}x${Math.round(r.height)}`;
    };
    const out = [];
    out.push(g(".feed-quest", "backgroundColor", "border", "borderRadius"));
    out.push(g(".feed-quest-icon", "width"));
    out.push(g(".feed-quest-track", "backgroundColor", "boxShadow"));
    out.push(g(".feed-quest-fill", "backgroundColor", "width"));
    out.push(g(".feed-panel", "backgroundColor", "border"));
    out.push(g(".feed-mate + .feed-mate", "borderTop"));
    const btns = [...document.querySelectorAll("button")];
    out.push(`buttons=${btns.length} ${btns.map((x) => { const r = x.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}${x.disabled ? ":disabled" : ""}`; }).join(",")}`);
    out.push(`motifs=${[...document.querySelectorAll(".feed-quest")].map((q) => q.dataset.motif).join(",")}`);
    out.push(`docW=${document.documentElement.scrollWidth} winW=${window.innerWidth}`);
    return out.join("\n");
  });
  console.log(`== ${name} ==\n${info}\n`);
  await p.close();
}

// ---- REWARD ----
const p2 = await b.newPage();
await p2.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p2.evaluateOnNewDocument(() => { localStorage.clear(); localStorage.setItem("theme", "light"); });
await p2.goto(`${BASE}/critic.html?s=reward`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1500));
await p2.screenshot({ path: path.join(OUT, "reward.png") });
const r = await p2.evaluate(() => {
  const out = [];
  const box = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return `${sel}: NONE`;
    const b = e.getBoundingClientRect();
    return `${sel}: x=${Math.round(b.x)} y=${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`;
  };
  out.push(box(".reward-xp"));
  out.push(`hero pct: w=${(document.querySelector(".reward-xp")?.getBoundingClientRect().width / 390 * 100).toFixed(1)}% h=${(document.querySelector(".reward-xp")?.getBoundingClientRect().height / 844 * 100).toFixed(1)}% top=${(document.querySelector(".reward-xp")?.getBoundingClientRect().y / 844 * 100).toFixed(1)}%`);
  const chips = [...document.querySelectorAll(".reward-line")];
  out.push(`reason chips=${chips.length} rows=${new Set(chips.map((c) => Math.round(c.getBoundingClientRect().y))).size} widths=${chips.map((c) => Math.round(c.getBoundingClientRect().width)).join(",")} texts=${chips.map((c) => c.textContent).join("|")}`);
  const pair = [...document.querySelectorAll(".reward-chip")];
  out.push(`3d chips=${pair.length} ` + pair.map((c) => { const cs = getComputedStyle(c); const b = c.getBoundingClientRect(); return `[${c.className.split(" ").filter((x) => x.startsWith("reward-chip")).join(".")} ${Math.round(b.width)}x${Math.round(b.height)} border=${cs.borderColor} bottom=${cs.borderBottomWidth} outline=${cs.outlineWidth}]`; }).join(" "));
  const claim = [...document.querySelectorAll("button")].find((b) => /claim/i.test(b.textContent || ""));
  if (claim) { const cs = getComputedStyle(claim); out.push(`CLAIM bg=${cs.backgroundColor} color=${cs.color} border=${cs.borderColor} h=${Math.round(claim.getBoundingClientRect().height)}`); }
  const flakes = [...document.querySelectorAll(".reward-flake")].map((f) => f.getBoundingClientRect());
  const hero = document.querySelector(".reward-xp").getBoundingClientRect();
  out.push(`flakes=${flakes.length} above=${flakes.filter((f) => f.y < hero.y).length} leftOf=${flakes.filter((f) => f.x < hero.x).length} rightOf=${flakes.filter((f) => f.x > hero.right).length} belowMid=${flakes.filter((f) => f.y > hero.y + hero.height / 2).length}`);
  out.push(`aside=${document.querySelector(".reward-aside")?.textContent ?? "none"}`);
  out.push(`docW=${document.documentElement.scrollWidth} colScrollW=${document.querySelector(".reward-column")?.scrollWidth}`);
  return out.join("\n");
});
console.log(`== reward ==\n${r}`);
await p2.close();
await b.close();
