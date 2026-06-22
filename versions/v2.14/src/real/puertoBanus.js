// Distrito de Puerto Banús FIEL (Fase 1): edificios mediterráneos con planta
// comercial (escaparate + toldo + cornisa), alturas variadas y tejado de teja;
// paseo con palmeras, farolas y papeleras; y un faro en el espigón.
// Sustituye el render genérico de los edificios SOLO en la zona de Puerto Banús.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const FLOOR_H = 3.2;
const AWNING_COLORS = [0x7a2230, 0x1f3a5f, 0x2f5d3a, 0x6b5a2a, 0xece6d8]; // burdeos, azul, verde, ocre, crema

// ---------- Texturas ----------
function makeWindowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#efe9dc"; x.fillRect(0, 0, 128, 128); // pared crema
  // ventana con balconera
  x.fillStyle = "#33455c"; x.fillRect(36, 26, 56, 64); // cristal
  x.fillStyle = "#8fa6c0"; x.fillRect(36, 26, 56, 10); // reflejo
  x.fillStyle = "#d8d2c4"; x.fillRect(32, 22, 64, 6);  // dintel
  x.fillStyle = "#b9b2a2"; x.fillRect(34, 92, 60, 5);  // baranda balcón
  for (let i = 0; i < 6; i++) x.fillRect(36 + i * 11, 92, 2, 10); // barrotes
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.34, 1 / FLOOR_H);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Geometría auxiliar ----------
function shapeFrom(footprint, holes) {
  const s = new THREE.Shape();
  footprint.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)));
  for (const h of holes || []) {
    if (!h || h.length < 3) continue;
    const p = new THREE.Path();
    h.forEach(([x, z], i) => (i ? p.lineTo(x, z) : p.moveTo(x, z)));
    s.holes.push(p);
  }
  return s;
}

// Banda vertical alrededor del footprint (escalado), de y0 a y1 (alturas mundo).
function wallRing(fp, cx, cz, scale, y0, y1) {
  const pos = [], idx = [];
  let v = 0;
  const pts = fp.map(([x, z]) => [cx + (x - cx) * scale, cz + (z - cz) * scale]);
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    pos.push(ax, y0, az, bx, y0, bz, ax, y1, az, bx, y1, bz);
    idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    v += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Anillo horizontal (toldo/cornisa) entre dos escalados, a altura y.
function flatRing(fp, cx, cz, sIn, sOut, y) {
  const pos = [], idx = [];
  let v = 0;
  const inn = fp.map(([x, z]) => [cx + (x - cx) * sIn, cz + (z - cz) * sIn]);
  const out = fp.map(([x, z]) => [cx + (x - cx) * sOut, cz + (z - cz) * sOut]);
  for (let i = 0; i < fp.length; i++) {
    const a = inn[i], b = inn[(i + 1) % fp.length], c = out[i], d = out[(i + 1) % fp.length];
    pos.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1], d[0], y, d[1]);
    idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    v += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function footprintInfo(fp) {
  let aX = Infinity, bX = -Infinity, aZ = Infinity, bZ = -Infinity, cx = 0, cz = 0;
  for (const [x, z] of fp) {
    if (x < aX) aX = x; if (x > bX) bX = x; if (z < aZ) aZ = z; if (z > bZ) bZ = z;
    cx += x; cz += z;
  }
  cx /= fp.length; cz /= fp.length;
  let r = 0;
  for (const [x, z] of fp) r += Math.hypot(x - cx, z - cz);
  r /= fp.length;
  return { cx, cz, w: bX - aX, d: bZ - aZ, r: Math.max(2, r) };
}

const hash = (id) => { let h = 2166136261; const s = String(id); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };

// ---------- Mobiliario ----------
function makePalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 6, 6), new THREE.MeshStandardMaterial({ color: 0x8a6b45, roughness: 1 }));
  trunk.position.y = 3; trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.2, 4), leafMat);
    leaf.position.set(0, 6, 0);
    leaf.rotation.z = Math.PI / 2.4;
    leaf.rotation.y = (i / 7) * Math.PI * 2;
    leaf.translateY(1.4);
    g.add(leaf);
  }
  return g;
}
function makeLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5, 6), new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.7, metalness: 0.4 }));
  pole.position.y = 2.5; g.add(pole);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffd98a, emissiveIntensity: 0.6 }));
  lamp.position.y = 5; g.add(lamp);
  return g;
}
function makeTrashCan() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x16507a, roughness: 0.6, metalness: 0.2 }));
  m.position.y = 0.5; m.castShadow = true;
  return m;
}
function makeLighthouse() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 10, 12), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8 }));
  base.position.y = 5; base.castShadow = true; g.add(base);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 2.2, 12), new THREE.MeshStandardMaterial({ color: 0xb4392f, roughness: 0.8 }));
  band.position.y = 6.5; g.add(band);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2, 12), new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.5, metalness: 0.3 }));
  top.position.y = 11; g.add(top);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10), new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0xffd070, emissiveIntensity: 0.8 }));
  light.position.y = 11; g.add(light);
  return g;
}

function pointInPoly(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// ---------- Distrito ----------
export function createPuertoBanus(buildings, data, heightAt = () => 0) {
  const group = new THREE.Group();
  const cityBoxes = [];
  const windowTex = makeWindowTexture();

  const wallGeos = [], roofGeos = [], glassGeos = [], parapetGeos = [];
  const awningGeos = AWNING_COLORS.map(() => []);

  for (const b of buildings) {
    if (!b.footprint || b.footprint.length < 3) continue;
    const fp = b.footprint;
    const { cx, cz, w, d, r } = footprintInfo(fp);

    // Cimiento sobre el relieve (como el resto de edificios).
    let minT = Infinity, maxT = -Infinity;
    for (const [x, z] of [[Math.min(...fp.map(p => p[0])), cz], [Math.max(...fp.map(p => p[0])), cz], [cx, Math.min(...fp.map(p => p[1]))], [cx, Math.max(...fp.map(p => p[1]))], [cx, cz]]) {
      const h = heightAt(x, z); if (h < minT) minT = h; if (h > maxT) maxT = h;
    }
    const foundation = maxT - minT + 1;
    const baseY = minT - 1;

    // Alturas variadas (Mediterráneo): 2–6 plantas según tamaño + algo de azar.
    const big = Math.max(w, d);
    let floors = Math.round((b.height || 9) / FLOOR_H);
    floors = Math.max(2, Math.min(6, floors + (big > 28 ? 1 : 0) + (hash(b.id) > 0.7 ? 1 : 0)));
    const wallTop = baseY + foundation + floors * FLOOR_H;

    // Cuerpo principal (muros crema + tejado de teja), con cimiento.
    let body;
    try {
      body = new THREE.ExtrudeGeometry(shapeFrom(fp, b.holes), { depth: foundation + floors * FLOOR_H, bevelEnabled: false, steps: 1 });
    } catch { continue; }
    body.rotateX(Math.PI / 2);
    body.translate(0, foundation + floors * FLOOR_H, 0);
    body.translate(0, baseY, 0);
    // grupos: 0 = tejado/caps, 1 = muros
    wallGeos.push(body);

    // Escaparate (planta baja): banda de cristal oscuro, ligeramente saliente.
    const sGlass = (r + 0.25) / r;
    glassGeos.push(wallRing(fp, cx, cz, sGlass, baseY + foundation + 0.2, baseY + foundation + FLOOR_H * 0.92));

    // Toldo/cornisa de la planta baja (anillo horizontal de color), volado ~1.1 m.
    const sIn = (r + 0.25) / r, sOut = (r + 1.2) / r;
    const ci = Math.floor(hash(b.id + "a") * AWNING_COLORS.length) % AWNING_COLORS.length;
    awningGeos[ci].push(flatRing(fp, cx, cz, sIn, sOut, baseY + foundation + FLOOR_H * 0.95));

    // Cornisa/parapeto en la azotea.
    parapetGeos.push(wallRing(fp, cx, cz, (r + 0.15) / r, wallTop, wallTop + 0.7));

    cityBoxes.push({ x: cx, z: cz, width: w, depth: d });
  }

  const add = (geos, mat) => {
    if (!geos.length) return;
    const m = mergeGeometries(geos, geos === wallGeos);
    if (!m) return;
    m.computeBoundingSphere(); // lo usa el recorte por distancia en main.js
    const mesh = new THREE.Mesh(m, mat);
    mesh.userData.kind = "building";
    mesh.receiveShadow = true;
    group.add(mesh);
    for (const g of geos) g.dispose();
  };
  // Muros: material multi-grupo [tejado, pared]
  add(wallGeos, [
    new THREE.MeshStandardMaterial({ color: 0xa85a36, roughness: 0.9, side: THREE.DoubleSide }), // teja
    new THREE.MeshStandardMaterial({ color: 0xefe9dc, map: windowTex, roughness: 0.92, side: THREE.DoubleSide }), // pared crema
  ]);
  add(glassGeos, new THREE.MeshStandardMaterial({ color: 0x24323f, roughness: 0.25, metalness: 0.35, side: THREE.DoubleSide }));
  add(parapetGeos, new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.9, side: THREE.DoubleSide }));
  awningGeos.forEach((geos, i) => add(geos, new THREE.MeshStandardMaterial({ color: AWNING_COLORS[i], roughness: 0.85, side: THREE.DoubleSide })));

  // ----- Mobiliario del paseo, alrededor de la dársena (lado de tierra) -----
  const marina = (data.areas || []).find((a) => a.kind === "marina" && a.barrio === "Puerto Banús" && a.polygon)
    || (data.areas || []).find((a) => a.kind === "marina" && a.polygon);
  if (marina) {
    const ring = marina.polygon;
    // Recorre el contorno y coloca palmeras/farolas/papeleras en tierra.
    let acc = 0; let kind = 0;
    let cxm = 0, czm = 0; for (const [x, z] of ring) { cxm += x; czm += z; } cxm /= ring.length; czm /= ring.length;
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
      const segLen = Math.hypot(bx - ax, bz - az);
      const steps = Math.max(1, Math.floor(segLen / 14));
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        let x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        // empujar ligeramente hacia tierra (fuera del agua)
        const dx = x - cxm, dz = z - czm; const dl = Math.hypot(dx, dz) || 1;
        x += (dx / dl) * 5; z += (dz / dl) * 5;
        const y = heightAt(x, z);
        if (y < 0.7) continue; // saltar si cae en agua
        let item;
        const k = (kind++) % 4;
        if (k === 0 || k === 1) item = makePalm();
        else if (k === 2) item = makeLamp();
        else item = makeTrashCan();
        item.position.set(x, y, z);
        group.add(item);
      }
    }
    // Faro en el punto más alejado del centro (extremo del espigón).
    let far = null, fd = 0;
    for (const [x, z] of ring) { const dd = (x - cxm) ** 2 + (z - czm) ** 2; if (dd > fd) { fd = dd; far = [x, z]; } }
    if (far) {
      const lh = makeLighthouse();
      lh.position.set(far[0], Math.max(heightAt(far[0], far[1]), 0.3), far[1]);
      group.add(lh);
    }
  }

  return { group, cityBoxes };
}

export { pointInPoly };
