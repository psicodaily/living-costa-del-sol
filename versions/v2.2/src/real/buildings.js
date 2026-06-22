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

// Tamaño de cada "trozo" (chunk) en metros. Los edificios se fusionan por
// trozo + color, para que el motor solo dibuje los trozos visibles (frustum
// culling) y se pueda recortar por distancia. Esto sube mucho los FPS.
const CHUNK = 450;

export function buildBuildings(buildings) {
  const windowTex = makeWindowTexture();
  const groups = new Map(); // "chx,chz|color" -> { color, geos[] }
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

    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;
    cityBoxes.push({ x: cx, z: cz, width: bb.max.x - bb.min.x, depth: bb.max.z - bb.min.z });

    const color = shade(barrioColor(b.barrio, b.type), hashShade(b.id));
    const key = Math.floor(cx / CHUNK) + "," + Math.floor(cz / CHUNK) + "|" + color;
    if (!groups.has(key)) groups.set(key, { color, geos: [] });
    groups.get(key).geos.push(geo);
  }

  // Materiales compartidos por color (menos programas/texturas en la GPU).
  const matCache = new Map();
  function materials(color) {
    if (!matCache.has(color)) {
      matCache.set(color, [
        new THREE.MeshStandardMaterial({ color: shade(color, 0.55), roughness: 0.95, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color, map: windowTex || null, roughness: 0.9, side: THREE.DoubleSide }),
      ]);
    }
    return matCache.get(color);
  }

  const meshes = [];
  for (const { color, geos } of groups.values()) {
    const merged = mergeGeometries(geos, true); // grupo 0 = tejado, 1 = muros
    if (!merged) continue;
    merged.computeBoundingSphere(); // necesario para el recorte por frustum/distancia
    const mesh = new THREE.Mesh(merged, materials(color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.kind = "building"; // para recortar por distancia en el bucle
    meshes.push(mesh);
    for (const g of geos) g.dispose();
  }
  return { meshes, cityBoxes };
}
