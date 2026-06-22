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

// Polígono plano que sigue el relieve (cada vértice a la altura del terreno).
function flatPolygon(ring, yOffset, heightAt) {
  const shape = new THREE.Shape();
  ring.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)));
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)) + yOffset);
  }
  g.computeVertexNormals();
  return g;
}

// Cinta de calle que sigue el relieve.
function ribbonGeometry(path, width, yOffset, heightAt) {
  const { positions, indices } = roadRibbon(path, width);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] = heightAt(positions[i], positions[i + 2]) + yOffset;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
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

export function buildGround(data, heightAt = () => 0) {
  const group = new THREE.Group();
  const b = bounds(data);
  const pad = 120;
  const w = b.maxX - b.minX + pad * 2;
  const d = b.maxZ - b.minZ + pad * 2;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;

  // Suelo base: malla con RELIEVE real. CLAVE: la malla se alinea EXACTAMENTE a
  // la rejilla de alturas (mismos vértices) para que el jugador/coche no floten.
  const hg = data.heightGrid;
  let terrainW = w, terrainD = d, tcx = cx, tcz = cz, segX, segZ;
  if (hg && hg.cols > 1 && hg.rows > 1) {
    terrainW = (hg.cols - 1) * hg.cellW;
    terrainD = (hg.rows - 1) * hg.cellH;
    tcx = hg.minX + terrainW / 2;
    tcz = hg.minZ + terrainD / 2;
    segX = hg.cols - 1;
    segZ = hg.rows - 1;
  } else {
    segX = 200;
    segZ = Math.max(40, Math.round(segX * (d / w)));
  }
  const terrainGeo = new THREE.PlaneGeometry(terrainW, terrainD, segX, segZ);
  terrainGeo.rotateX(-Math.PI / 2);
  const tp = terrainGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    tp.setY(i, heightAt(tp.getX(i) + tcx, tp.getZ(i) + tcz) - 0.05);
  }
  terrainGeo.computeVertexNormals();
  const base = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ color: 0xb9b09b, roughness: 1 }));
  base.position.set(tcx, 0, tcz);
  base.receiveShadow = true;
  group.add(base);

  // Zonas verdes y playa.
  const greenGeos = [], beachGeos = [];
  for (const a of data.areas) {
    if (!a.polygon || a.polygon.length < 3) continue;
    if (a.kind === "beach" || a.kind === "sand") beachGeos.push(flatPolygon(a.polygon, 0.04, heightAt));
    else if (GREEN_KINDS.has(a.kind)) greenGeos.push(flatPolygon(a.polygon, 0.05, heightAt));
  }
  const green = mergedMesh(greenGeos, new THREE.MeshStandardMaterial({ color: 0x5a8a3c, roughness: 1 }));
  if (green) group.add(green);
  const beach = mergedMesh(beachGeos, new THREE.MeshStandardMaterial({ color: 0xe2d2a0, roughness: 1 }));
  if (beach) group.add(beach);

  // Aceras (debajo) y calzadas, siguiendo el relieve.
  const sidewalkGeos = [], roadGeos = [];
  for (const r of data.roads) {
    if (!r.path || r.path.length < 2) continue;
    const rw = ROAD_WIDTH[r.kind] ?? 6;
    sidewalkGeos.push(ribbonGeometry(r.path, rw + 3.5, 0.06, heightAt));
    roadGeos.push(ribbonGeometry(r.path, rw, 0.12, heightAt));
  }
  const sidewalks = mergedMesh(sidewalkGeos, new THREE.MeshStandardMaterial({ color: 0xa9a59b, roughness: 1 }));
  if (sidewalks) group.add(sidewalks);
  const roads = mergedMesh(roadGeos, new THREE.MeshStandardMaterial({ color: 0x34373d, roughness: 0.95 }));
  if (roads) group.add(roads);

  // Rotondas.
  const roundGeos = [];
  for (const rb of data.roundabouts) {
    if (!rb.path || rb.path.length < 3) continue;
    roundGeos.push(flatPolygon(rb.path, 0.14, heightAt));
  }
  const rounds = mergedMesh(roundGeos, new THREE.MeshStandardMaterial({ color: 0x303338, roughness: 0.95 }));
  if (rounds) group.add(rounds);

  return group;
}

export { bounds, ROAD_WIDTH };
