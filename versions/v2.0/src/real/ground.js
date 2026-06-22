import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { roadRibbon } from "./geometry.js";

// Ancho de cada tipo de calle (metros).
const ROAD_WIDTH = {
  motorway: 16, trunk: 13, primary: 11, secondary: 9, tertiary: 7.5,
  residential: 6, unclassified: 6, living_street: 5, service: 4.5,
  pedestrian: 4, footway: 2.5, path: 2,
};

function bounds(data) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const scan = (pts) => { for (const [x, z] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }};
  data.roads.forEach((r) => scan(r.path));
  data.buildings.forEach((b) => scan(b.footprint));
  return { minX, maxX, minZ, maxZ };
}

function flatPolygon(ring, y) {
  const shape = new THREE.Shape();
  ring.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)));
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(Math.PI / 2);
  if (y) g.translate(0, y, 0);
  return g;
}

function ribbonGeometry(path, width, y) {
  const { positions, indices } = roadRibbon(path, width);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  if (y) g.translate(0, y, 0);
  g.computeVertexNormals();
  return g;
}

function mergedMesh(geos, material) {
  if (!geos.length) return null;
  const merged = mergeGeometries(geos, false);
  if (!merged) return null;
  const mesh = new THREE.Mesh(merged, material);
  mesh.receiveShadow = true;
  for (const g of geos) g.dispose();
  return mesh;
}

const GREEN_KINDS = new Set(["park", "garden", "grass", "forest", "meadow", "recreation_ground"]);

export function buildGround(data) {
  const group = new THREE.Group();
  const b = bounds(data);
  const pad = 120;

  // Suelo base: tono urbano cálido (NO verde), para que el asfalto destaque.
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(b.maxX - b.minX + pad * 2, b.maxZ - b.minZ + pad * 2),
    new THREE.MeshStandardMaterial({ color: 0xb9b09b, roughness: 1 })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.set((b.minX + b.maxX) / 2, -0.05, (b.minZ + b.maxZ) / 2);
  base.receiveShadow = true;
  group.add(base);

  // Zonas verdes (solo parques/jardines/césped) y playa (arena).
  const greenGeos = [], beachGeos = [];
  for (const a of data.areas) {
    if (!a.polygon || a.polygon.length < 3) continue;
    if (a.kind === "beach" || a.kind === "sand") beachGeos.push(flatPolygon(a.polygon, 0.02));
    else if (GREEN_KINDS.has(a.kind)) greenGeos.push(flatPolygon(a.polygon, 0.02));
  }
  const green = mergedMesh(greenGeos, new THREE.MeshStandardMaterial({ color: 0x5a8a3c, roughness: 1 }));
  if (green) group.add(green);
  const beach = mergedMesh(beachGeos, new THREE.MeshStandardMaterial({ color: 0xe2d2a0, roughness: 1 }));
  if (beach) group.add(beach);

  // Aceras (gris claro, un poco más anchas) DEBAJO de las calles.
  const sidewalkGeos = [], roadGeos = [];
  for (const r of data.roads) {
    if (!r.path || r.path.length < 2) continue;
    const w = ROAD_WIDTH[r.kind] ?? 6;
    sidewalkGeos.push(ribbonGeometry(r.path, w + 3.5, 0.04));
    roadGeos.push(ribbonGeometry(r.path, w, 0.08));
  }
  const sidewalks = mergedMesh(sidewalkGeos, new THREE.MeshStandardMaterial({ color: 0xa9a59b, roughness: 1 }));
  if (sidewalks) group.add(sidewalks);
  const roads = mergedMesh(roadGeos, new THREE.MeshStandardMaterial({ color: 0x34373d, roughness: 0.95 }));
  if (roads) group.add(roads);

  // Rotondas (asfalto) un pelín por encima.
  const roundGeos = [];
  for (const rb of data.roundabouts) {
    if (!rb.path || rb.path.length < 3) continue;
    roundGeos.push(flatPolygon(rb.path, 0.1));
  }
  const rounds = mergedMesh(roundGeos, new THREE.MeshStandardMaterial({ color: 0x303338, roughness: 0.95 }));
  if (rounds) group.add(rounds);

  return group;
}

export { bounds, ROAD_WIDTH };
