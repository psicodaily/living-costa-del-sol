import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { roadRibbon } from "./geometry.js";

const ROAD_WIDTH = {
  motorway: 14, trunk: 12, primary: 10, secondary: 8, tertiary: 7,
  residential: 6, service: 4, living_street: 5, pedestrian: 4, footway: 2.5,
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
  g.rotateX(Math.PI / 2); // XY -> XZ conservando signo de Z
  if (y) g.translate(0, y, 0);
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

export function buildGround(data) {
  const group = new THREE.Group();
  const b = bounds(data);
  const pad = 100;

  // Plano base (terreno).
  const baseW = b.maxX - b.minX + pad * 2;
  const baseD = b.maxZ - b.minZ + pad * 2;
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(baseW, baseD),
    new THREE.MeshStandardMaterial({ color: 0x57633f, roughness: 1 })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.set((b.minX + b.maxX) / 2, -0.05, (b.minZ + b.maxZ) / 2);
  base.receiveShadow = true;
  group.add(base);

  // Zonas (parques verdes, playa arena, etc.) ligeramente sobre el suelo.
  const greenGeos = [], beachGeos = [];
  for (const a of data.areas) {
    if (!a.polygon || a.polygon.length < 3) continue;
    const g = flatPolygon(a.polygon, 0.02);
    (a.kind === "beach" ? beachGeos : greenGeos).push(g);
  }
  const green = mergedMesh(greenGeos, new THREE.MeshStandardMaterial({ color: 0x4e7a3a, roughness: 1 }));
  if (green) group.add(green);
  const beach = mergedMesh(beachGeos, new THREE.MeshStandardMaterial({ color: 0xd9c89a, roughness: 1 }));
  if (beach) group.add(beach);

  // Calles (cintas) a y=0.05.
  const roadGeos = [];
  for (const r of data.roads) {
    if (!r.path || r.path.length < 2) continue;
    const w = ROAD_WIDTH[r.kind] ?? 6;
    const { positions, indices } = roadRibbon(r.path, w);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.translate(0, 0.05, 0);
    g.computeVertexNormals();
    roadGeos.push(g);
  }
  const roads = mergedMesh(roadGeos, new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 1 }));
  if (roads) group.add(roads);

  // Rotondas (asfalto) a y=0.06.
  const roundGeos = [];
  for (const rb of data.roundabouts) {
    if (!rb.path || rb.path.length < 3) continue;
    roundGeos.push(flatPolygon(rb.path, 0.06));
  }
  const rounds = mergedMesh(roundGeos, new THREE.MeshStandardMaterial({ color: 0x33363d, roughness: 1 }));
  if (rounds) group.add(rounds);

  return group;
}
