// "Ojos" del desarrollo: abre el juego en un navegador automático y guarda una
// captura, para poder revisar el resultado visual y los errores de consola.
//
// Uso:
//   node tools/screenshot.mjs [salida.png] [esperaMs] [url] [teclasAMantener]
// Ejemplos:
//   node tools/screenshot.mjs tools/shots/ciudad.png
//   node tools/screenshot.mjs tools/shots/anda.png 2500 http://localhost:5173 ArrowUp

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || join(root, "tools", "shots", "shot.png");
const waitMs = Number(process.argv[3] || 3000);
const url = process.argv[4] || "http://localhost:5173";
const keys = (process.argv[5] || "").split(",").filter(Boolean);

mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(800);

// Mantener teclas pulsadas durante la espera (para capturar en movimiento).
for (const k of keys) await page.keyboard.down(k);
await page.waitForTimeout(waitMs);
for (const k of keys) await page.keyboard.up(k);

await page.screenshot({ path: out });
await browser.close();

if (errors.length) {
  console.log("⚠️ ERRORES DE CONSOLA:\n" + errors.join("\n"));
} else {
  console.log("✅ Sin errores de consola.");
}
console.log("📸 Guardado: " + out);
