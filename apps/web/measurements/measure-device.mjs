/**
 * The device half of the Phase 4 exit: serves the built app on the local
 * network so the reference devices (Pixel 6a and iPhone 12, per the Budgets
 * table) can load it over WiFi, and tells you what to do.
 *
 * The page records its own frame timestamps (window.__blueberryFrames), and
 * with ?stats=1 it draws a small on-screen fps readout, so the phone needs no
 * cable or devtools: run the animation, read the number, write it into
 * measurements/device-results.json where the template rows wait.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve(process.cwd(), "dist");
if (!existsSync(path.join(distDir, "index.html"))) {
  throw new Error("dist/index.html not found. Run `npm run build` first.");
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  try {
    const body = await readFile(path.join(distDir, file));
    response.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

const PORT = 4174;
await new Promise((resolve) => server.listen(PORT, "0.0.0.0", resolve));

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface) => iface !== undefined && iface.family === "IPv4" && !iface.internal)
  .map((iface) => iface.address);

console.log("Device measurement server running.");
console.log("");
for (const address of addresses) {
  console.log(`  On the phone, open:  http://${address}:${PORT}/?auto=1&stats=1#/trainer`);
}
console.log("");
console.log("Steps, per reference device (Pixel 6a, then iPhone 12):");
console.log("  1. Same WiFi network as this machine.");
console.log("  2. Open the URL above. The step loops and an fps readout draws top-left.");
console.log("  3. Watch for 30 seconds. Note the fps readout's average and its lowest dip.");
console.log("  4. Tap the 3D button and repeat, to measure the lazy renderer too.");
console.log("  5. Write both numbers into measurements/device-results.json.");
console.log("");
console.log("Ctrl+C stops the server.");
