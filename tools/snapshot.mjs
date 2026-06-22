// Herramienta para "congelar" la versión actual en versions/vX.Y
// Uso:  npm run snapshot
// Lee el número de versión de package.json y copia el código fuente a una
// carpeta independiente, de forma que ninguna versión antigua se pierda.

import { cpSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

// Versión "1.1.0" -> carpeta "v1.1"
const short = pkg.version.split(".").slice(0, 2).join(".");
const target = join(root, "versions", `v${short}`);

if (existsSync(target)) {
  console.log(`⚠️  versions/v${short} ya existe. No se sobrescribe.`);
  console.log("   Si quieres regenerarla, bórrala manualmente primero.");
  process.exit(0);
}

mkdirSync(target, { recursive: true });

// Archivos/carpetas que forman una copia jugable (sin node_modules ni dist).
// "public" incluye marbella.json (el mapa real), necesario desde la v2.0.
const items = ["src", "index.html", "vite.config.js", "package.json", "public"];
for (const item of items) {
  const from = join(root, item);
  if (existsSync(from)) cpSync(from, join(target, item), { recursive: true });
}

// Nota explicativa dentro de la copia.
writeFileSync(
  join(target, "LEEME.txt"),
  `Copia congelada de GTA Marbella v${short}.\n\n` +
    `Para jugar a esta versión desde la carpeta raíz del proyecto:\n` +
    `   npm run play -- versions/v${short}\n\n` +
    `(Usa las dependencias ya instaladas en la carpeta raíz, no hace falta instalar nada.)\n`
);

console.log(`✅ Versión congelada en versions/v${short}`);
console.log(`   Para jugarla:  npm run play -- versions/v${short}`);
