import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { barrioColor } from "./geometry.js";

// Textura de ventanas (compartida por todos los edificios). Muro claro con una
// rejilla de ventanas; el color del material la tiñe según el barrio.
function makeWindowTexture() {
  if (typeof document === "undefined") return null; // en Node (tests) no hay canvas
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "#41506a";
  const m = 9, gap = 8, w = (s - m * 2 - gap) / 2;
  for (const ix of [0, 1]) for (const iy of [0, 1]) {
    ctx.fillRect(m + ix * (w + gap), m + iy * (w + gap), w, w);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.22, 0.16); // ~ventanas cada ~4 m de ancho y ~6 m de alto
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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

function shade(hex, f) {
  const r = Math.min(255, Math.round((hex >> 16 & 255) * f));
  const g = Math.min(255, Math.round((hex >> 8 & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}

function hashShade(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return [0.85, 1.0, 1.12][h % 3];
}

export function buildBuildings(buildings) {
  const windowTex = makeWindowTexture();
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
    geo.rotateX(Math.PI / 2);
    geo.translate(0, b.height, 0);

    const color = shade(barrioColor(b.barrio, b.type), hashShade(b.id));
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
    const merged = mergeGeometries(geos, true); // useGroups: conserva caras (0) y muros (1)
    if (!merged) continue;
    const roofMat = new THREE.MeshStandardMaterial({ color: shade(color, 0.55), roughness: 0.95, side: THREE.DoubleSide });
    const wallMat = new THREE.MeshStandardMaterial({ color, map: windowTex || null, roughness: 0.9, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(merged, [roofMat, wallMat]); // grupo 0 = tapas/tejado, 1 = muros
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh);
    for (const g of geos) g.dispose();
  }
  return { meshes, cityBoxes };
}
