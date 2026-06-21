// "Ojos" avanzados: ejecuta una SECUENCIA de acciones y va sacando capturas,
// para poder probar cosas como caminar -> entrar al coche -> conducir.
//
// Uso:
//   node tools/playtest.mjs "wait:800;hold:ArrowUp:1500;tap:KeyE;hold:ArrowUp:1800;shot:tools/shots/conduciendo.png"
//
// Pasos disponibles:
//   wait:MS            espera
//   hold:TECLA:MS      mantiene una tecla pulsada ese tiempo
//   tap:TECLA          pulsa y suelta una vez
//   shot:RUTA.png      guarda una captura

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const sequence = process.argv[2] || "wait:2000;shot:tools/shots/shot.png";
const url = process.argv[3] || "http://localhost:5173";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "load", timeout: 30000 });

for (const raw of sequence.split(";").map((s) => s.trim()).filter(Boolean)) {
  const [op, a, b] = raw.split(":");
  if (op === "wait") {
    await page.waitForTimeout(Number(a));
  } else if (op === "hold") {
    await page.keyboard.down(a);
    await page.waitForTimeout(Number(b));
    await page.keyboard.up(a);
  } else if (op === "tap") {
    await page.keyboard.press(a);
  } else if (op === "shot") {
    mkdirSync(dirname(a), { recursive: true });
    await page.screenshot({ path: a });
    console.log("📸 " + a);
  }
}

await browser.close();
console.log(errors.length ? "⚠️ ERRORES:\n" + errors.join("\n") : "✅ Sin errores de consola.");
