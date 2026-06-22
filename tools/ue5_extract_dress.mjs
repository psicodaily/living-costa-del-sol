// Extrae CALLES y ARBOLES reales de Puerto Banús a coordenadas de Unreal,
// reutilizando EXACTAMENTE la misma georef/transformación que tools/ue5_extract.mjs
// para que las calles encajen con los edificios ya colocados.
//   Transform final a Unreal (cm):  X = -z_local*100,  Y = x_local*100
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const d = JSON.parse(readFileSync("public/marbella.json", "utf8"));

// --- GEOREF (idéntica a ue5_extract.mjs / tools/lib/geo.mjs) ---
const R = 6371000, lat0 = 36.5154, lon0 = -4.8858, DEG = Math.PI / 180, r0 = 1200, k = 0.5;
const mLat = R * DEG, mLon = R * DEG * Math.cos(lat0 * DEG);
// inversa de compact(): world(warp) -> metros reales (ox,oz) respecto al centro georef
function unwarp(x, z) {
  const r = Math.hypot(x, z);
  if (r > r0 && r !== 0) { const ro = r0 + (r - r0) / k; const s = ro / r; return [x * s, z * s]; }
  return [x, z];
}
const toLonLat = (x, z) => { const [ox, oz] = unwarp(x, z); return [lon0 + ox / mLon, lat0 - oz / mLat]; };

// --- zona Puerto Banús (mismo polígono que usa el extractor de edificios) ---
const pz = (d.zones || []).find(z => z.name === "Puerto Banús");
if (!pz) throw new Error("No se encontró la zona 'Puerto Banús'");
// point-in-polygon en coords warp (las mismas en que vienen path/footprint)
const pip = (x, z, r) => {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, zi] = r[i], [xj, zj] = r[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
const cen = fp => { let x = 0, z = 0; for (const [a, b] of fp) { x += a; z += b; } return [x / fp.length, z / fp.length]; };

// --- origen local = centroide de la marina PB (en metros reales) — idéntico a ue5_extract.mjs ---
const marina = (d.areas || []).find(a => a.kind === "marina" && a.barrio === "Puerto Banús")
  || (d.areas || []).find(a => a.kind === "marina");
if (!marina) throw new Error("No se encontró la marina de Puerto Banús");
const [mcx, mcz] = cen(marina.polygon);
const [omx, omz] = unwarp(mcx, mcz); // metros reales del centro de la marina

// warp -> metros locales (respecto a la marina), igual que ue5_extract.mjs::toLocal
const toLocalM = (x, z) => { const [ox, oz] = unwarp(x, z); return [ox - omx, oz - omz]; };
// metros locales -> Unreal (cm), con el eje pedido: X = -z_local*100, Y = x_local*100
const toUE = (x, z) => {
  const [lx, lz] = toLocalM(x, z);
  return [Math.round(-lz * 10000) / 100, Math.round(lx * 10000) / 100]; // *100 m->cm, redondeo a 2 decimales
};

// --- ancho de vía por tipo (metros) ---
const WIDTH = {
  motorway: 16, trunk: 16, motorway_link: 8, trunk_link: 8,
  primary: 14, primary_link: 8,
  secondary: 10, secondary_link: 7,
  tertiary: 8, tertiary_link: 6,
  living_street: 7, residential: 7, unclassified: 7,
  service: 5, track: 4, cycleway: 3,
  pedestrian: 3, footway: 3, path: 3, steps: 3, platform: 3,
};
const widthFor = (r) => {
  // si hay carriles, ~3.25 m por carril (mínimo el del tipo)
  const base = WIDTH[r.kind] ?? 6;
  if (r.lanes != null && Number.isFinite(+r.lanes) && +r.lanes > 0) {
    return Math.max(base, Math.round(+r.lanes * 3.25 * 10) / 10);
  }
  return base;
};

// --- filtrar calles a la zona Puerto Banús ---
// una calle entra si CUALQUIER punto de su trazado cae dentro del polígono de la zona.
const pbRoads = (d.roads || []).filter(r => {
  if (!r.path || r.path.length < 2) return false;
  return r.path.some(([x, z]) => pip(x, z, pz.polygon));
});

const roads = pbRoads.map(r => ({
  pts: r.path.map(([x, z]) => toUE(x, z)),
  width: widthFor(r),
  kind: r.kind || "unknown",
  ...(r.name ? { name: r.name } : {}),
}));

// --- ARBOLES ---
// No existen datos de árboles/palmeras puntuales en marbella.json:
// no hay POIs natural=tree ni una capa de árboles; las únicas capas de vegetación
// son polígonos de áreas (forest/park/garden/grass), que NO son árboles individuales.
// Por honestidad, dejamos trees vacío.
const trees = [];

mkdirSync("ue5", { recursive: true });
const out = {
  origin: { lon: toLonLat(mcx, mcz)[0], lat: toLonLat(mcx, mcz)[1] },
  units: "cm (Unreal). X=-z_local*100, Y=x_local*100. Mismo origen que puertobanus_blockout.json",
  roads,
  trees,
};
writeFileSync("ue5/puertobanus_dress.json", JSON.stringify(out));

// --- informe ---
const byKind = {};
for (const r of roads) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
for (const r of roads) for (const [x, y] of r.pts) { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
console.log("origen marina lon/lat:", toLonLat(mcx, mcz).map(n => n.toFixed(4)), "(esperado ~ -4.953, 36.487)");
console.log("calles Puerto Banús:", roads.length, "de", (d.roads || []).length, "totales");
console.log("por tipo:", JSON.stringify(byKind));
console.log("árboles:", trees.length, "(no hay datos de árboles puntuales en marbella.json)");
console.log("extensión calles (cm UE): X", Math.round(mnx), "..", Math.round(mxx), " Y", Math.round(mny), "..", Math.round(mxy));
console.log("archivo:", "ue5/puertobanus_dress.json", (JSON.stringify(out).length / 1024).toFixed(0) + " KB");
