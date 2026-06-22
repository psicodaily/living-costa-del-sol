import { chromium } from "playwright";

const browser = await chromium.launch();
const errors = [];

async function shot(url, file, waitMs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(`${file} PAGEERROR: ` + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${file}: ` + m.text()); });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: file });
  await page.close();
}

await shot("http://localhost:5173/real.html", "tools/shots/mejora-3d.png", 2500);
await shot("http://localhost:5173/juego-real.html", "tools/shots/mejora-juego.png", 2200);

console.log("errores:", errors.length ? errors : "ninguno");
await browser.close();
