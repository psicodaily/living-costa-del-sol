import * as THREE from "three";

const GREEN = new Set(["park", "garden", "grass", "forest", "meadow", "recreation_ground"]);

function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function ringBounds(ring) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, z] of ring) { if (x < a) a = x; if (x > b) b = x; if (z < c) c = z; if (z > d) d = z; }
  return [a, b, c, d];
}

export function createTrees(data, max = 1600, heightAt = () => 0) {
  const positions = [];

  // Árboles dentro de parques/jardines.
  for (const area of data.areas) {
    if (!GREEN.has(area.kind) || !area.polygon || area.polygon.length < 3) continue;
    const [minx, maxx, minz, maxz] = ringBounds(area.polygon);
    const n = Math.min(40, Math.max(2, Math.floor(((maxx - minx) * (maxz - minz)) / 350)));
    let placed = 0, tries = 0;
    while (placed < n && tries < n * 6 && positions.length < max) {
      tries++;
      const x = minx + Math.random() * (maxx - minx);
      const z = minz + Math.random() * (maxz - minz);
      if (pointInRing(x, z, area.polygon)) { positions.push([x, z]); placed++; }
    }
    if (positions.length >= max) break;
  }

  // (Antes había árboles a los lados de las avenidas, pero quedaban colocados
  // raros sobre aceras/edificios. Ahora solo van en parques y jardines reales.)

  const group = new THREE.Group();
  const count = positions.length;
  if (count === 0) return group;

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.4, 6);
  trunkGeo.translate(0, 1.2, 0);
  const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 }), count);

  const foliageGeo = new THREE.ConeGeometry(1.9, 4.4, 7);
  foliageGeo.translate(0, 4.7, 0);
  const foliage = new THREE.InstancedMesh(foliageGeo, new THREE.MeshStandardMaterial({ color: 0x2f6d33, roughness: 1 }), count);
  trunk.castShadow = foliage.castShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sv = new THREE.Vector3();
  const pv = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const [x, z] = positions[i];
    const s = 0.8 + Math.random() * 0.7;
    m.compose(pv.set(x, heightAt(x, z), z), q, sv.set(s, s, s));
    trunk.setMatrixAt(i, m);
    foliage.setMatrixAt(i, m);
  }
  trunk.instanceMatrix.needsUpdate = true;
  foliage.instanceMatrix.needsUpdate = true;
  group.add(trunk, foliage);
  return group;
}
