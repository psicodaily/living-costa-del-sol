import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { simplify } from "@turf/turf";
import { buildQuery, downloadOsm } from "./lib/overpass.mjs";
import { buildCityData } from "./lib/layers.mjs";

const require = createRequire(import.meta.url);
const osmtogeojson = require("osmtogeojson");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public");
const OUT = path.join(OUT_DIR, "marbella.json");

async function main() {
  console.log("⏬ Descargando datos de OpenStreetMap (puede tardar 1-2 min)…");
  const raw = await downloadOsm(buildQuery());
  if (!raw || !Array.isArray(raw.elements) || raw.elements.length === 0) {
    throw new Error("Respuesta de Overpass vacía: NO sobreescribo marbella.json.");
  }
  console.log(`   Elementos OSM recibidos: ${raw.elements.length}`);

  const geojson = osmtogeojson(raw, { flatProperties: true });
  for (const f of geojson.features) {
    try { simplify(f, { tolerance: 0.00002, highQuality: true, mutate: true }); } catch { /* geometría rara: la dejamos */ }
  }

  const data = buildCityData(geojson);
  const counts = {
    edificios: data.buildings.length,
    calles: data.roads.length,
    rotondas: data.roundabouts.length,
    costa: data.coastline.length,
    areas: data.areas.length,
  };
  console.log("🏙️  Generado:", counts);

  if (data.buildings.length === 0 && data.roads.length === 0) {
    throw new Error("Sin edificios ni calles: NO sobreescribo marbella.json.");
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(data));
  console.log("✅ Escrito:", OUT);
}

main().catch((e) => {
  console.error("❌ ERROR:", e.message);
  process.exit(1);
});
