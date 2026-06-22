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
const LANE_ROADS = new Set(["motorway", "trunk", "primary", "secondary", "tertiary"]);

// Líneas discontinuas del centro de las vías principales (en una sola malla).
function laneMarkings(roads, heightAt) {
  const HALF = 0.18, Y = 0.30, DASH = 3.5, PERIOD = 8.5;
  const positions = [], indices = [];
  let vb = 0;
  const addQuad = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az) || 1;
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    const px = -dz * HALF, pz = dx * HALF;
    const ya = heightAt(ax, az) + Y, yb = heightAt(bx, bz) + Y;
    positions.push(ax + px, ya, az + pz, ax - px, ya, az - pz, bx + px, yb, bz + pz, bx - px, yb, bz - pz);
    indices.push(vb, vb + 1, vb + 2, vb + 1, vb + 3, vb + 2);
    vb += 4;
  };
  for (const r of roads) {
    if (!LANE_ROADS.has(r.kind) || !r.path || r.path.length < 2) continue;
    let phase = 0;
    for (let i = 1; i < r.path.length; i++) {
      const ax = r.path[i - 1][0], az = r.path[i - 1][1], bx = r.path[i][0], bz = r.path[i][1];
      const segLen = Math.hypot(bx - ax, bz - az);
      if (segLen < 0.01) continue;
      const dx = (bx - ax) / segLen, dz = (bz - az) / segLen;
      let pos = 0;
      while (pos < segLen) {
        const inDash = phase < DASH;
        const step = Math.min((inDash ? DASH : PERIOD) - phase, segLen - pos);
        if (inDash) addQuad(ax + dx * pos, az + dz * pos, ax + dx * (pos + step), az + dz * (pos + step));
        pos += step; phase += step;
        if (phase >= PERIOD) phase -= PERIOD;
      }
    }
  }
  if (!positions.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

// Nivel del mar (las alturas se normalizan a mínimo 0; el mar queda en ~0).
const SEA_Y = 0.5;

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
  const base = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ color: 0x9a8e6f, roughness: 1 }));
  base.position.set(tcx, 0, tcz);
  base.receiveShadow = true;
  group.add(base);

  // MAR: gran plano de agua al nivel del mar (las alturas están normalizadas a
  // mínimo 0, así que el mar y la costa quedan por debajo de este plano).
  const seaSize = Math.max(w, d) * 3;
  const seaGeo = new THREE.PlaneGeometry(seaSize, seaSize);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x1d6f9e, roughness: 0.25, metalness: 0.25 }));
  sea.position.set(cx, SEA_Y, cz);
  sea.receiveShadow = true;
  group.add(sea);

  // Material de superficie que se dibuja SIEMPRE por encima del terreno
  // (polygonOffset), para que las calles/aceras no se entierren en las cuestas.
  const surfMat = (color, rough = 1, metal = 0) => new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal,
    side: THREE.DoubleSide, // las cintas/polígonos quedan con la normal hacia abajo
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });

  // Zonas verdes y playa.
  const greenGeos = [], beachGeos = [];
  for (const a of data.areas) {
    if (!a.polygon || a.polygon.length < 3) continue;
    if (a.kind === "beach" || a.kind === "sand") beachGeos.push(flatPolygon(a.polygon, 0.08, heightAt));
    else if (GREEN_KINDS.has(a.kind)) greenGeos.push(flatPolygon(a.polygon, 0.10, heightAt));
  }
  const green = mergedMesh(greenGeos, surfMat(0x5a8a3c));
  if (green) group.add(green);
  const beach = mergedMesh(beachGeos, surfMat(0xe6d6a4));
  if (beach) group.add(beach);

  // Aceras (debajo, más anchas) y calzadas (encima), siguiendo el relieve.
  const sidewalkGeos = [], roadGeos = [];
  for (const r of data.roads) {
    if (!r.path || r.path.length < 2) continue;
    const rw = ROAD_WIDTH[r.kind] ?? 6;
    sidewalkGeos.push(ribbonGeometry(r.path, rw + 3.5, 0.18, heightAt));
    roadGeos.push(ribbonGeometry(r.path, rw, 0.24, heightAt));
  }
  const sidewalks = mergedMesh(sidewalkGeos, surfMat(0xbdb9af));
  if (sidewalks) group.add(sidewalks);
  const roads = mergedMesh(roadGeos, surfMat(0x3b3f47, 0.95));
  if (roads) group.add(roads);

  // Líneas de carril (discontinuas) en las vías principales.
  const laneGeo = laneMarkings(data.roads, heightAt);
  if (laneGeo) {
    const lanes = new THREE.Mesh(laneGeo, new THREE.MeshBasicMaterial({
      color: 0xeadfab, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    }));
    group.add(lanes);
  }

  // Rotondas.
  const roundGeos = [];
  for (const rb of data.roundabouts) {
    if (!rb.path || rb.path.length < 3) continue;
    roundGeos.push(flatPolygon(rb.path, 0.26, heightAt));
  }
  const rounds = mergedMesh(roundGeos, surfMat(0x35383f, 0.95));
  if (rounds) group.add(rounds);

  return group;
}

export { bounds, ROAD_WIDTH, SEA_Y };
