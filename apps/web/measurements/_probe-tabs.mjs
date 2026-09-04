import puppeteer from "puppeteer-core";
const EXE = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await puppeteer.launch({ executablePath: EXE, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 3 });
await p.goto("http://localhost:5174/#/pathway", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));
const el = await p.$(".tabbar");
if (el) { await el.screenshot({ path: "measurements/_shots/tabbar.png" }); console.log("tabbar shot"); }
else console.log("no .tabbar found");
await b.close();
