import { latLonToWorld, GEOREF } from "./geo.mjs";
import { estimateHeight, jitterHeight } from "./heights.mjs";
import { classifyBarrio } from "./barrios.mjs";
import { BBOX } from "./overpass.mjs";

const lineToWorld = (coords) => coords.map(([lon, lat]) => latLonToWorld(lon, lat));

function centroidLonLat(coords) {
  let x = 0, y = 0;
  for (const [a, b] of coords) { x += a; y += b; }
  const n = coords.length || 1;
  return [x / n, y / n];
}

export function classifyFeature(f) {
  const p = f.properties || {};
  const t = f.geometry?.type;
  if (p.building) return "building";
  if (p.junction === "roundabout" || p.junction === "circular") return "roundabout";
  if (p.natural === "coastline") return "coastline";
  if (p.highway && t === "LineString") return "road";
  if (p.leisure === "park" || p.leisure === "garden" || p.leisure === "marina" || p.natural === "beach" || p.landuse) return "area";
  return null;
}

export function buildCityData(geojson) {
  const out = {
    meta: {
      version: 1,
      georef: GEOREF,
      bbox: [BBOX.west, BBOX.south, BBOX.east, BBOX.north],
      source: "OpenStreetMap / Overpass",
      license: "© OpenStreetMap contributors (ODbL)",
    },
    roads: [], roundabouts: [], buildings: [], coastline: [], areas: [],
  };

  for (const f of geojson.features || []) {
    const p = f.properties || {};
    const g = f.geometry || {};
    const id = f.id ?? p.id ?? 0;
    const kind = classifyFeature(f);
    if (!kind) continue;

    if (kind === "building") {
      if (g.type !== "Polygon") continue;
      const ring = g.coordinates[0];
      const [clon, clat] = centroidLonLat(ring);
      out.buildings.push({
        id,
        height: jitterHeight(estimateHeight(p), id),
        type: p.building,
        barrio: classifyBarrio(clon, clat),
        footprint: lineToWorld(ring),
        holes: (g.coordinates.slice(1) || []).map(lineToWorld),
      });
    } else if (kind === "road") {
      out.roads.push({
        id,
        kind: p.highway,
        lanes: p.lanes ? Number(p.lanes) : undefined,
        oneway: p.oneway === "yes",
        path: lineToWorld(g.coordinates),
      });
    } else if (kind === "roundabout") {
      const coords = g.type === "Polygon" ? g.coordinates[0] : g.coordinates;
      out.roundabouts.push({ id, path: lineToWorld(coords) });
    } else if (kind === "coastline") {
      if (g.type !== "LineString") continue;
      out.coastline.push({ id, path: lineToWorld(g.coordinates) });
    } else if (kind === "area") {
      if (g.type !== "Polygon") continue;
      const ring = g.coordinates[0];
      const [clon, clat] = centroidLonLat(ring);
      out.areas.push({
        id,
        kind: p.natural === "beach" ? "beach" : p.leisure || p.landuse || "area",
        barrio: classifyBarrio(clon, clat),
        polygon: lineToWorld(ring),
      });
    }
  }
  return out;
}
