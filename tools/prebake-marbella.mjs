import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { simplify } from "@turf/turf";
import { buildQuery, downloadOsm, BBOX } from "./lib/overpass.mjs";
import { buildCityData } from "./lib/layers.mjs";
import { buildElevationSampler } from "./lib/elevation.mjs";
import { latLonToWorld } from "./lib/geo.mjs";

// Construye un mapa de alturas en COORDENADAS DEL MUNDO a partir de la elevación
// real (muestrea lat/lon y proyecta a x,z, que es como está construido el mapa).
function buildHeightGrid(data, sampler) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const scan = (pts) => { for (const [x, z] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  } };
  data.roads.forEach((r) => scan(r.path));
  data.buildings.forEach((b) => scan(b.footprint));
  if (!isFinite(minX)) return null;

  const cols = 220;
  const rows = Math.max(40, Math.round(cols * (maxZ - minZ) / (maxX - minX)));
  const cellW = (maxX - minX) / cols;
  const cellH = (maxZ - minZ) / rows;
  const sum = new Float64Array(cols * rows);
  const cnt = new Float64Array(cols * rows);

  const N = 520;
  for (let i = 0; i < N; i++) {
    const lon = BBOX.west + (BBOX.east - BBOX.west) * (i / (N - 1));
    for (let j = 0; j < N; j++) {
      const lat = BBOX.south + (BBOX.north - BBOX.south) * (j / (N - 1));
      const [wx, wz] = latLonToWorld(lon, lat);
      const cx = Math.floor((wx - minX) / cellW);
      const cz = Math.floor((wz - minZ) / cellH);
      if (cx < 0 || cx >= cols || cz < 0 || cz >= rows) continue;
      const k = cz * cols + cx;
      sum[k] += sampler.elev(lon, lat);
      cnt[k] += 1;
    }
  }

  const values = new Array(cols * rows).fill(null);
  for (let k = 0; k < values.length; k++) if (cnt[k] > 0) values[k] = sum[k] / cnt[k];
  // Rellenar huecos por vecino más cercano (varias pasadas).
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
      const k = z * cols + x;
      if (values[k] != null) continue;
      const nb = [];
      if (x > 0 && values[k - 1] != null) nb.push(values[k - 1]);
      if (x < cols - 1 && values[k + 1] != null) nb.push(values[k + 1]);
      if (z > 0 && values[k - cols] != null) nb.push(values[k - cols]);
      if (z < rows - 1 && values[k + cols] != null) nb.push(values[k + cols]);
      if (nb.length) { values[k] = nb.reduce((a, b) => a + b, 0) / nb.length; changed = true; }
    }
    if (!changed) break;
  }
  let mn = Infinity;
  for (const v of values) if (v != null && v < mn) mn = v;
  if (!isFinite(mn)) mn = 0;
  for (let k = 0; k < values.length; k++) values[k] = Math.round(((values[k] ?? mn) - mn) * 10) / 10;

  return { minX, minZ, cellW, cellH, cols, rows, values };
}

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

  console.log("⛰️  Descargando elevación real (cuestas)…");
  try {
    const sampler = await buildElevationSampler(BBOX, 13);
    data.heightGrid = buildHeightGrid(data, sampler);
    const vals = data.heightGrid?.values || [];
    const max = vals.reduce((a, b) => Math.max(a, b), 0);
    console.log(`   Teselas: ${sampler.tiles}, rejilla ${data.heightGrid?.cols}x${data.heightGrid?.rows}, altura máx ~${Math.round(max)} m`);
  } catch (e) {
    console.log("   ⚠️ Elevación falló, el mundo quedará plano:", e.message);
  }

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
