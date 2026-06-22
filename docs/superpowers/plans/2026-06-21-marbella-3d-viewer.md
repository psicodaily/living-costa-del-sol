# Plan 2 — Marbella en 3D (constructor + visor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir en 3D la Marbella real (edificios, calles, rotondas y zonas) a partir de `public/marbella.json`, y verla/recorrerla en una página propia (`real.html`) con cámara orbital.

**Architecture:** Módulos NUEVOS e independientes en `src/real/` (no se toca `main.js` ni `src/world/` para no chocar con el desarrollo en paralelo del juego). La lógica de geometría pura va en `src/real/geometry.js` con tests headless (Node). Los edificios se extruyen y se fusionan por color (pocas draw calls). Una página `real.html` monta la escena, la luz, el cielo y una cámara orbital, carga el JSON y construye la ciudad.

**Tech Stack:** Three.js 0.169 (`ExtrudeGeometry`, `ShapeGeometry`, `mergeGeometries`, `OrbitControls`), Vite (sirve `real.html` en dev), Node `node --test` (tests headless de geometría), Playwright (verificación visual).

## Global Constraints

- No modificar `src/main.js` ni `src/world/**` (otro chat trabaja ahí en paralelo). Todo lo nuevo bajo `src/real/` y `real.html`.
- Coordenadas de `marbella.json` en `[x, z]` metros; 1 unidad Three.js = 1 metro.
- Orientación consistente: el suelo es el plano XZ, la altura es +Y. Edificios y zonas se crean con `rotateX(Math.PI/2)` (conserva el signo de Z); las calles se generan directamente en XZ. (Evita el reflejo N-S.)
- Rendimiento: NO un `Mesh` por edificio. Fusionar geometrías por color (`mergeGeometries`) → pocas draw calls.
- Atribución ODbL visible en la página: `Datos del mapa © OpenStreetMap contributors (ODbL)`.
- Materiales de edificios con `side: THREE.DoubleSide` (evita muros invisibles por sentido de giro de los polígonos OSM).

---

### Task 1: Geometría pura (`src/real/geometry.js`)

**Files:**
- Create: `src/real/geometry.js`
- Test: `src/real/geometry.test.mjs`
- Modify: `package.json` (ampliar el script `test`)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `roadRibbon(path, width=6) -> { positions:number[], indices:number[] }` (cinta plana en XZ, y=0).
  - `barrioColor(barrio, type) -> number` (color hex 0xRRGGBB).

- [ ] **Step 1: Write the failing test**

`src/real/geometry.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { roadRibbon, barrioColor } from "./geometry.js";

test("roadRibbon crea 2 vértices por punto y 6 índices por segmento", () => {
  const { positions, indices } = roadRibbon([[0, 0], [10, 0]], 4);
  assert.equal(positions.length, 4 * 3); // 2 puntos * 2 lados * (x,y,z)
  assert.equal(indices.length, 6);       // 1 segmento -> 2 triángulos
  // todos los vértices a y=0
  for (let i = 1; i < positions.length; i += 3) assert.equal(positions[i], 0);
});

test("barrioColor usa el tipo si lo conoce, si no el barrio, si no el genérico", () => {
  assert.equal(barrioColor("Puerto Banús", "hotel"), 0xcdd8e6); // tipo gana
  assert.equal(barrioColor("Puerto Banús"), 0xfdfbf6);          // barrio
  assert.equal(barrioColor("desconocido"), 0xdfd8c8);           // genérico
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/real/geometry.test.mjs`
Expected: FAIL ("Cannot find module './geometry.js'").

- [ ] **Step 3: Write minimal implementation**

`src/real/geometry.js`:
```js
const BARRIO_COLORS = {
  "Casco Antiguo": 0xf4ece0,
  "Centro": 0xe9e4d8,
  "Puerto Banús": 0xfdfbf6,
  "Golden Mile": 0xf7f3ea,
  "Genérico": 0xdfd8c8,
};
const TYPE_COLORS = {
  hotel: 0xcdd8e6, office: 0xc6d2e0,
  commercial: 0xd8d2c4, retail: 0xd8d2c4, supermarket: 0xd8d2c4,
  industrial: 0xb8b8b8, warehouse: 0xb8b8b8,
};

export function barrioColor(barrio, type) {
  if (type && TYPE_COLORS[type]) return TYPE_COLORS[type];
  return BARRIO_COLORS[barrio] ?? BARRIO_COLORS["Genérico"];
}

export function roadRibbon(path, width = 6) {
  const half = width / 2;
  const left = [], right = [];
  for (let i = 0; i < path.length; i++) {
    const [x, z] = path[i];
    const [px, pz] = path[i === 0 ? 0 : i - 1];
    const [nx, nz] = path[i === path.length - 1 ? i : i + 1];
    let dx = nx - px, dz = nz - pz;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const ox = -dz * half, oz = dx * half; // normal perpendicular
    left.push([x + ox, z + oz]);
    right.push([x - ox, z - oz]);
  }
  const positions = [];
  for (let i = 0; i < path.length; i++) {
    positions.push(left[i][0], 0, left[i][1]);
    positions.push(right[i][0], 0, right[i][1]);
  }
  const indices = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }
  return { positions, indices };
}
```

- [ ] **Step 4: Ampliar el script `test` y verificar que pasa**

En `package.json`, cambiar el script `test` a:
```json
    "test": "node --test \"tools/lib/*.test.mjs\" \"src/real/*.test.mjs\""
```
Run: `node --test src/real/geometry.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/real/geometry.js src/real/geometry.test.mjs package.json
git commit -m "feat(real): geometria pura (cinta de calle y color por barrio)"
```

---

### Task 2: Constructor de edificios (`src/real/buildings.js`)

**Files:**
- Create: `src/real/buildings.js`
- Test: `src/real/buildings.test.mjs`

**Interfaces:**
- Consumes: `barrioColor` (Task 1); Three.js.
- Produces: `buildBuildings(buildings) -> { meshes: THREE.Mesh[], cityBoxes: {x,z,width,depth}[] }`.

- [ ] **Step 1: Write the failing test**

`src/real/buildings.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildBuildings } from "./buildings.js";

test("buildBuildings: altura en +Y (0..h) y Z conservado (sin reflejo)", () => {
  const b = { id: "1", height: 10, barrio: "Centro", type: "yes",
    footprint: [[0, 0], [10, 0], [10, 20], [0, 20]] };
  const { meshes, cityBoxes } = buildBuildings([b]);
  assert.ok(meshes.length >= 1, "debe producir al menos una malla");
  const geo = meshes[0].geometry;
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  assert.ok(bb.min.y >= -0.01 && bb.max.y <= 10.01, "altura 0..10 en +Y");
  assert.ok(bb.max.z > 15, "Z conservado (~20, no reflejado a negativo)");
  assert.equal(cityBoxes.length, 1);
});

test("buildBuildings ignora footprints inválidos", () => {
  const { meshes } = buildBuildings([{ id: "x", height: 5, footprint: [[0, 0]] }]);
  assert.equal(meshes.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/real/buildings.test.mjs`
Expected: FAIL ("Cannot find module './buildings.js'").

- [ ] **Step 3: Write minimal implementation**

`src/real/buildings.js`:
```js
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
    // Shape vive en XY y extruye en +Z. Lo tumbamos al suelo conservando el signo de Z
    // y subimos la altura a +Y.
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/real/buildings.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/real/buildings.js src/real/buildings.test.mjs
git commit -m "feat(real): edificios extruidos y fusionados por color"
```

---

### Task 3: Suelo, calles, rotondas y zonas (`src/real/ground.js`)

**Files:**
- Create: `src/real/ground.js`

**Interfaces:**
- Consumes: `roadRibbon` (Task 1); Three.js.
- Produces: `buildGround(data) -> THREE.Group` (incluye plano base, calles, rotondas y áreas).

- [ ] **Step 1: Write the implementation**

`src/real/ground.js`:
```js
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

  // Calles (cintas) y rotondas (asfalto), a y=0.05.
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

  const roundGeos = [];
  for (const rb of data.roundabouts) {
    if (!rb.path || rb.path.length < 3) continue;
    roundGeos.push(flatPolygon(rb.path, 0.06));
  }
  const rounds = mergedMesh(roundGeos, new THREE.MeshStandardMaterial({ color: 0x33363d, roughness: 1 }));
  if (rounds) group.add(rounds);

  return group;
}
```

- [ ] **Step 2: Smoke test in Node (sin navegador)**

Run:
```bash
node --input-type=module -e "import('three').then(async()=>{const {buildGround}=await import('./src/real/ground.js');const d=require('./public/marbella.json');const g=buildGround(d);console.log('hijos del suelo:',g.children.length)})" 2>&1 | tail -3
```
Expected: imprime "hijos del suelo: 5" aprox (base, verde, playa, calles, rotondas), sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/real/ground.js
git commit -m "feat(real): suelo, calles, rotondas y zonas"
```

---

### Task 4: Ensamblador de la ciudad (`src/real/city.js`)

**Files:**
- Create: `src/real/city.js`

**Interfaces:**
- Consumes: `buildBuildings` (Task 2), `buildGround` (Task 3); Three.js.
- Produces: `createRealCity(data) -> { group: THREE.Group, cityBoxes, bounds:{minX,maxX,minZ,maxZ} }`.

- [ ] **Step 1: Write the implementation**

`src/real/city.js`:
```js
import * as THREE from "three";
import { buildBuildings } from "./buildings.js";
import { buildGround } from "./ground.js";

export function createRealCity(data) {
  const group = new THREE.Group();
  group.add(buildGround(data));

  const { meshes, cityBoxes } = buildBuildings(data.buildings);
  for (const m of meshes) group.add(m);

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const box of cityBoxes) {
    if (box.x < minX) minX = box.x; if (box.x > maxX) maxX = box.x;
    if (box.z < minZ) minZ = box.z; if (box.z > maxZ) maxZ = box.z;
  }
  return { group, cityBoxes, bounds: { minX, maxX, minZ, maxZ } };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/real/city.js
git commit -m "feat(real): ensamblador createRealCity (suelo + edificios)"
```

---

### Task 5: Página visor 3D (`real.html` + `src/real/main.js`)

**Files:**
- Create: `real.html`
- Create: `src/real/main.js`

**Interfaces:**
- Consumes: `createRealCity` (Task 4); Three.js + `OrbitControls`; `public/marbella.json` (servido en `/marbella.json`).
- Produces: una página en `http://localhost:5173/real.html` que muestra y deja orbitar la Marbella 3D, con crédito ODbL.

- [ ] **Step 1: Write the page**

`real.html`:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Marbella 3D — visor</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #cfe8ff; }
    #canvas { display: block; width: 100%; height: 100%; }
    #credit {
      position: fixed; bottom: 8px; left: 8px; z-index: 5;
      font: 12px system-ui, sans-serif; color: #11334d;
      background: rgba(255,255,255,0.7); padding: 4px 8px; border-radius: 6px;
    }
    #hint {
      position: fixed; top: 10px; left: 10px; z-index: 5;
      font: 13px system-ui, sans-serif; color: #11334d;
      background: rgba(255,255,255,0.8); padding: 6px 10px; border-radius: 8px;
    }
  </style>
</head>
<body>
  <div id="hint">🖱️ Arrastra para girar · rueda para acercar · clic derecho para desplazar</div>
  <canvas id="canvas"></canvas>
  <div id="credit">Datos del mapa © OpenStreetMap contributors (ODbL)</div>
  <script type="module" src="/src/real/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the viewer logic**

`src/real/main.js`:
```js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createRealCity } from "./city.js";

const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe0ff);
scene.fog = new THREE.Fog(0xbfe0ff, 1500, 4000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 8000);

// Luz: ambiente cálido mediterráneo + sol direccional con sombra.
scene.add(new THREE.HemisphereLight(0xffffff, 0x7a8460, 0.85));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(800, 1200, 600);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 100;
sun.shadow.camera.far = 4000;
const sc = sun.shadow.camera;
sc.left = -1500; sc.right = 1500; sc.top = 1500; sc.bottom = -1500;
scene.add(sun);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05; // no bajar de la horizontal

const data = await fetch("/marbella.json").then((r) => r.json());
const city = createRealCity(data);
scene.add(city.group);

// Centrar la cámara sobre la ciudad.
const cx = (city.bounds.minX + city.bounds.maxX) / 2 || 0;
const cz = (city.bounds.minZ + city.bounds.maxZ) / 2 || 0;
const spanX = (city.bounds.maxX - city.bounds.minX) || 1000;
const dist = Math.max(spanX, 1000);
controls.target.set(cx, 0, cz);
camera.position.set(cx, dist * 0.6, cz + dist * 0.7);
controls.update();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

console.log(`Marbella 3D lista: ${data.buildings.length} edificios, ${data.roads.length} calles`);
```

- [ ] **Step 3: Verify in the browser (Playwright)**

Crear `tools/verify-real.mjs`:
```js
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
await page.goto("http://localhost:5173/real.html", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const drawn = await page.evaluate(() => {
  const c = document.getElementById("canvas");
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const px = new Uint8Array(4 * c.width * c.height);
  gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let nonSky = 0;
  for (let i = 0; i < px.length; i += 4) {
    // cielo ~ (191,224,255); cuenta píxeles claramente distintos
    if (Math.abs(px[i] - 191) + Math.abs(px[i + 1] - 224) + Math.abs(px[i + 2] - 255) > 60) nonSky++;
  }
  return nonSky;
});
await page.screenshot({ path: "tools/shots/marbella-3d.png" });
console.log("pixeles no-cielo:", drawn);
console.log("errores:", errors.length ? errors : "ninguno");
await browser.close();
```
Run (con `npm run dev` activo): `node tools/verify-real.mjs`
Expected: "errores: ninguno" y "pixeles no-cielo" > 50000 (hay ciudad dibujada). Revisar `tools/shots/marbella-3d.png`: se ven edificios 3D y calles.

- [ ] **Step 4: Limpiar y commit**

```bash
rm -f tools/verify-real.mjs
git add real.html src/real/main.js
git commit -m "feat(real): pagina visor 3D de Marbella con camara orbital y credito ODbL"
```

---

## Notas de cierre
- Tras este plan, `http://localhost:5173/real.html` muestra la Marbella real en 3D (edificios, calles, rotondas, zonas) con cámara orbital, SIN tocar el juego principal.
- **Plan 3 (futuro)** — integrar `createRealCity` en el juego (`main.js`) con un interruptor frente a la ciudad de cuadrícula, conectar colisiones (`cityBoxes`), NPCs y la costa compartida con el chat de la playa. Se hará cuando lo indiques (y conviene tras mover el proyecto al VPS, por el peso del 3D en desarrollo).
