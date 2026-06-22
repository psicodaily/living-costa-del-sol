import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { barrioColor } from "./geometry.js";

// Textura de ventanas (compartida por todos los edificios). Muro claro con una
// rejilla de ventanas; el color del material la tiñe según el barrio.
function makeWindowTexture() {
  if (typeof document === "undefined") return null; // en Node (tests) no hay canvas
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  // Pared (blanca: la tiñe el color del material según el barrio).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, s, s);
  // Una ventana con marco y reflejo (la baldosa se repite ~cada 3.5 m).
  const mx = s * 0.2;
  const my = s * 0.18;
  const ww = s * 0.6;
  const wh = s * 0.52;
  ctx.fillStyle = "#33445c"; // cristal
  ctx.fillRect(mx, my, ww, wh);
  ctx.fillStyle = "#8fa6c0"; // reflejo en la mitad superior
  ctx.fillRect(mx, my, ww, wh * 0.42);
  ctx.fillStyle = "#cfcfcf"; // alféizar
  ctx.fillRect(mx - 2, my + wh, ww + 4, 4);
  ctx.strokeStyle = "#d6d6d6"; // marco
  ctx.lineWidth = 3;
  ctx.strokeRect(mx, my, ww, wh);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.28, 0.32); // ~1 ventana cada 3.5 m de ancho y ~3 m de alto (pisos)
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

export function buildBuildings(buildings, heightAt = () => 0) {
  const windowTex = makeWindowTexture();
  const groups = new Map(); // "chx,chz|color" -> { color, geos[] }
  const cityBoxes = [];

  for (const b of buildings) {
    if (!b.footprint || b.footprint.length < 3) continue;

    // Relieve real bajo el edificio (esquinas + centro del footprint).
    let aX = Infinity, bX = -Infinity, aZ = Infinity, bZ = -Infinity;
    for (const [x, z] of b.footprint) {
      if (x < aX) aX = x; if (x > bX) bX = x; if (z < aZ) aZ = z; if (z > bZ) bZ = z;
    }
    const cx = (aX + bX) / 2;
    const cz = (aZ + bZ) / 2;
    let minT = Infinity, maxT = -Infinity;
    for (const [x, z] of [[aX, aZ], [bX, aZ], [aX, bZ], [bX, bZ], [cx, cz]]) {
      const h = heightAt(x, z);
      if (h < minT) minT = h;
      if (h > maxT) maxT = h;
    }
    // Cimiento que cubre TODA la pendiente: el edificio baja hasta el punto más
    // bajo y sube su altura por encima del más alto → ni flota ni se entierra.
    const foundation = maxT - minT + 1;

    let geo;
    try {
      const shape = footprintToShape(b.footprint, b.holes);
      geo = new THREE.ExtrudeGeometry(shape, { depth: b.height + foundation, bevelEnabled: false, steps: 1 });
    } catch {
      continue;
    }
    geo.rotateX(Math.PI / 2);
    geo.translate(0, b.height + foundation + (minT - 1), 0); // base en el punto más bajo - 1 m

    cityBoxes.push({ x: cx, z: cz, width: bX - aX, depth: bZ - aZ });

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
        // Tejado de teja (terracota) → aspecto mediterráneo, menos "bloque gris".
        new THREE.MeshStandardMaterial({ color: 0xa85a36, roughness: 0.9, side: THREE.DoubleSide }),
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
