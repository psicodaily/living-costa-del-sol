import { latLonToWorld, GEOREF } from "./geo.mjs";
import { estimateHeight, jitterHeight } from "./heights.mjs";
import { classifyBarrio, ZONES } from "./barrios.mjs";
import { BBOX } from "./overpass.mjs";

const lineToWorld = (coords) => coords.map(([lon, lat]) => latLonToWorld(lon, lat));

function centroidLonLat(coords) {
  let x = 0, y = 0;
  for (const [a, b] of coords) { x += a; y += b; }
  const n = coords.length || 1;
  return [x / n, y / n];
}

// Devuelve [lon, lat] representativo de cualquier geometría (punto o centroide).
function featureLonLat(g) {
  if (!g || !g.type) return null;
  if (g.type === "Point") return g.coordinates;
  let ring = null;
  if (g.type === "Polygon") ring = g.coordinates[0];
  else if (g.type === "LineString") ring = g.coordinates;
  else if (g.type === "MultiPolygon") ring = g.coordinates[0] && g.coordinates[0][0];
  if (!ring || !ring.length) return null;
  return centroidLonLat(ring);
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
    roads: [], roundabouts: [], buildings: [], coastline: [], areas: [], pois: [],
    zones: ZONES.map((z) => ({ name: z.name, polygon: z.ring.map(([lon, lat]) => latLonToWorld(lon, lat)) })),
  };

  const POI = new Set(["hospital", "townhall", "police", "fire_station", "pharmacy", "fuel", "bank", "place_of_worship", "marketplace"]);
  const poiSeen = new Set();

  for (const f of geojson.features || []) {
    const p = f.properties || {};
    const g = f.geometry || {};
    const id = f.id ?? p.id ?? 0;

    // Puntos de interés (independiente de si además es edificio/calle).
    if (p.amenity && POI.has(p.amenity)) {
      const ll = featureLonLat(g);
      if (ll) {
        const [x, z] = latLonToWorld(ll[0], ll[1]);
        const k = p.amenity + ":" + Math.round(x / 20) + ":" + Math.round(z / 20);
        if (!poiSeen.has(k)) {
          poiSeen.add(k);
          out.pois.push({ kind: p.amenity, name: p.name || "", x, z });
        }
      }
    }

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
        name: p.name || undefined, // nombre real de la calle (si lo tiene en OSM)
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
