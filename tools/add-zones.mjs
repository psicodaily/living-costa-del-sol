// Inyecta las ZONAS (distritos) en public/marbella.json SIN volver a descargar
// OSM: convierte cada polígono lon/lat a coordenadas del mundo con latLonToWorld.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ZONES } from "./lib/barrios.mjs";
import { latLonToWorld } from "./lib/geo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "..", "public", "marbella.json");

const data = JSON.parse(readFileSync(FILE, "utf8"));
data.zones = ZONES.map((z) => ({
  name: z.name,
  polygon: z.ring.map(([lon, lat]) => latLonToWorld(lon, lat)),
}));
writeFileSync(FILE, JSON.stringify(data));
console.log("✅ Zonas añadidas:", data.zones.map((z) => z.name).join(", "));
