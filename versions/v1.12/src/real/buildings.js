import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { barrioColor } from "./geometry.js";

function footprintToShape(footprint, holes) {
  const shape = new THREE.Shape();
  footprint.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)));
  shape.closePath();
  for (const hole of holes || []) {
    if (!hole || hole.length < 3) continue;
    const p = new THREE.Path();
    hole.forEach(([x, z], i) => (i ? p.lineTo(x, z) : p.moveTo(x, z)));
    p.closePath();
    shape.holes.push(p);
  }
  return shape;
}

export function buildBuildings(buildings) {
  const byColor = new Map(); // color -> THREE.BufferGeometry[]
  const cityBoxes = [];

  for (const b of buildings) {
    if (!b.footprint || b.footprint.length < 3) continue;
    let geo;
    try {
      const shape = footprintToShape(b.footprint, b.holes);
      geo = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false, steps: 1 });
    } catch {
      continue;
    }
    // Shape vive en XY y extruye en +Z. Lo tumbamos al suelo conservando el signo
    // de Z y subimos la altura a +Y.
    geo.rotateX(Math.PI / 2);
    geo.translate(0, b.height, 0);

    const color = barrioColor(b.barrio, b.type);
    if (!byColor.has(color)) byColor.set(color, []);
    byColor.get(color).push(geo);

    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    cityBoxes.push({
      x: (bb.min.x + bb.max.x) / 2,
      z: (bb.min.z + bb.max.z) / 2,
      width: bb.max.x - bb.min.x,
      depth: bb.max.z - bb.min.z,
    });
  }

  const meshes = [];
  for (const [color, geos] of byColor) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh);
    for (const g of geos) g.dispose();
  }
  return { meshes, cityBoxes };
}
