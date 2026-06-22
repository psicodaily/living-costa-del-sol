# Plan 3 — Marbella jugable (andar y conducir) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps con checkbox (`- [ ]`).

**Goal:** Una versión jugable (`juego-real.html`) donde recorres la Marbella real **a pie y en coche**, con colisiones contra los edificios reales, sin tocar el juego principal.

**Architecture:** Nuevo entry `src/real/game.js` + `juego-real.html`. Reutiliza el modelo de personaje (`character.js`), los controles (`controls.js`), la cámara en tercera persona (`followCamera.js`) y las colisiones (`physics/obstacles.js`), más la ciudad 3D (`createRealCity`). La movilidad (andar/conducir) se escribe aquí SIN la atadura al tamaño de la cuadrícula que tienen `player.js`/`vehicle.js` (que usan `CITY_HALF`). El coche es un módulo simple propio (`src/real/car.js`).

**Tech Stack:** Three.js 0.169, Vite, Playwright (verificación), Node `node --test` (helper de spawn).

## Global Constraints

- No tocar `src/main.js`, `src/world/**`, `src/player/player.js`, `src/vehicle/**` (los edita el otro chat). Reutilizar SOLO módulos no acoplados al tamaño de mundo: `character.js`, `controls.js`, `followCamera.js`, `physics/obstacles.js`.
- Coordenadas en metros; suelo plano (y=0); colisiones AABB con `city.cityBoxes`.
- Límite de movimiento basado en los `bounds` de la ciudad real (no en `CITY_HALF`).
- Atribución ODbL visible en la página.

---

### Task 1: Punto de aparición sobre una calle (`src/real/spawn.js`)

**Files:**
- Create: `src/real/spawn.js`
- Test: `src/real/spawn.test.mjs`

**Interfaces:**
- Produces: `nearestRoadPoint(roads, x=0, z=0) -> [x, z]` (el vértice de calle más cercano a (x,z); `[0,0]` si no hay).

- [ ] **Step 1: Write the failing test**

`src/real/spawn.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestRoadPoint } from "./spawn.js";

test("nearestRoadPoint elige el vértice de calle más cercano al objetivo", () => {
  const roads = [{ path: [[100, 100], [5, -5]] }, { path: [[50, 50]] }];
  assert.deepEqual(nearestRoadPoint(roads, 0, 0), [5, -5]);
});

test("nearestRoadPoint devuelve [0,0] si no hay calles", () => {
  assert.deepEqual(nearestRoadPoint([], 0, 0), [0, 0]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/real/spawn.test.mjs`
Expected: FAIL ("Cannot find module './spawn.js'").

- [ ] **Step 3: Write minimal implementation**

`src/real/spawn.js`:
```js
export function nearestRoadPoint(roads, x = 0, z = 0) {
  let best = [0, 0];
  let bestD = Infinity;
  for (const r of roads) {
    for (const [px, pz] of r.path || []) {
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bestD) { bestD = d; best = [px, pz]; }
    }
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/real/spawn.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/real/spawn.js src/real/spawn.test.mjs
git commit -m "feat(real): elegir punto de aparicion sobre una calle"
```

---

### Task 2: Coche sencillo no atado a la cuadrícula (`src/real/car.js`)

**Files:**
- Create: `src/real/car.js`

**Interfaces:**
- Produces: `createCar(spawn, bound) -> { group, update(delta, keys), getHeading():number, getSpeed():number, radius:number }`. `bound` = `{minX,maxX,minZ,maxZ}` para limitar el movimiento.

- [ ] **Step 1: Write the implementation**

`src/real/car.js`:
```js
import * as THREE from "three";

const MAX_SPEED = 38, ACCEL = 24, BRAKE = 50, ENGINE_BRAKE = 10, MAX_REVERSE = 12, TURN = 1.7;

export function createCar([sx, sz], bound) {
  const group = new THREE.Group();
  group.position.set(sx, 0, sz);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.6, 4.2),
    new THREE.MeshStandardMaterial({ color: 0xd11f2a, roughness: 0.4, metalness: 0.35 })
  );
  body.position.y = 0.7; body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.15 })
  );
  cabin.position.set(0, 1.15, -0.2); group.add(cabin);
  for (const [wx, wz] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.32, 14),
      new THREE.MeshStandardMaterial({ color: 0x121212 })
    );
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.5, wz); group.add(w);
  }

  let speed = 0, heading = 0;
  const pad = 200;

  function update(delta, keys) {
    if (keys.forward) speed += ACCEL * delta;
    else if (keys.back) speed -= (speed > 0.2 ? BRAKE : ACCEL * 0.7) * delta;
    else speed += (speed > 0 ? -1 : 1) * Math.min(Math.abs(speed), ENGINE_BRAKE * delta);
    speed = THREE.MathUtils.clamp(speed, -MAX_REVERSE, MAX_SPEED);

    const steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    const sf = THREE.MathUtils.clamp(Math.abs(speed) / 10, 0, 1);
    if (Math.abs(speed) > 0.3) heading += steer * TURN * sf * delta * Math.sign(speed);
    group.rotation.y = heading;

    group.position.x += Math.sin(heading) * speed * delta;
    group.position.z += Math.cos(heading) * speed * delta;
    group.position.x = THREE.MathUtils.clamp(group.position.x, bound.minX - pad, bound.maxX + pad);
    group.position.z = THREE.MathUtils.clamp(group.position.z, bound.minZ - pad, bound.maxZ + pad);
  }

  return {
    group, update,
    getHeading: () => heading,
    getSpeed: () => speed,
    slow: () => (speed *= 0.3),
    radius: 2.0,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/real/car.js
git commit -m "feat(real): coche sencillo conducible sin atadura de mundo"
```

---

### Task 3: Entry jugable (`src/real/game.js` + `juego-real.html`)

**Files:**
- Create: `src/real/game.js`
- Create: `juego-real.html`

**Interfaces:**
- Consumes: `createRealCity`, `nearestRoadPoint`, `createCar`, `createCharacter`/`animateWalk`, `createControls`, `createFollowCamera`, `createObstacles`.

- [ ] **Step 1: Write `juego-real.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GTA Marbella — Marbella real (jugable)</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #bfe0ff; }
    #game-canvas { display: block; width: 100%; height: 100%; }
    #hud { position: fixed; top: 10px; left: 10px; z-index: 6; font: 13px system-ui; color: #11334d;
      background: rgba(255,255,255,0.82); padding: 8px 12px; border-radius: 8px; }
    #credit { position: fixed; bottom: 8px; left: 8px; z-index: 6; font: 12px system-ui; color: #11334d;
      background: rgba(255,255,255,0.7); padding: 4px 8px; border-radius: 6px; }
  </style>
</head>
<body>
  <div id="hud">🚶 WASD moverte · ⇧ correr · 🚗 E entrar/salir del coche · 🖱️ clic para mirar</div>
  <canvas id="game-canvas"></canvas>
  <div id="credit">Datos del mapa © OpenStreetMap contributors (ODbL)</div>
  <script type="module" src="/src/real/game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `src/real/game.js`**

```js
import * as THREE from "three";
import { createRealCity } from "./city.js";
import { nearestRoadPoint } from "./spawn.js";
import { createCar } from "./car.js";
import { createCharacter, animateWalk } from "../player/character.js";
import { createControls } from "../player/controls.js";
import { createFollowCamera } from "../player/followCamera.js";
import { createObstacles } from "../physics/obstacles.js";

const WALK = 9, RUN = 18, TURN_SMOOTH = 12;

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe0ff);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 6000);

scene.add(new THREE.HemisphereLight(0xffffff, 0x7a8460, 0.9));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.5);
sun.position.set(400, 700, 300); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 50; sun.shadow.camera.far = 2500;
const sc = sun.shadow.camera; sc.left = -400; sc.right = 400; sc.top = 400; sc.bottom = -400;
scene.add(sun);

const data = await fetch("/marbella.json").then((r) => r.json());
const city = createRealCity(data);
scene.add(city.group);
scene.fog = new THREE.Fog(0xbfe0ff, 600, 4000);

const obstacles = createObstacles(city.cityBoxes);
const [spx, spz] = nearestRoadPoint(data.roads, 0, 0);

// Jugador a pie.
const { group: pgroup, limbs } = createCharacter(0x1f6fd6);
pgroup.position.set(spx, 0, spz);
scene.add(pgroup);
let walkTime = 0, targetAngle = 0;

// Coche, aparcado al lado.
const car = createCar([spx + 4, spz], city.bounds);
sun.target = pgroup; scene.add(sun.target);

const { keys, onPress } = createControls();
const followCamera = createFollowCamera(camera, canvas);
let mode = "foot";

onPress("KeyE", () => {
  if (mode === "foot") {
    const dx = pgroup.position.x - car.group.position.x;
    const dz = pgroup.position.z - car.group.position.z;
    if (dx * dx + dz * dz < 36) { mode = "drive"; pgroup.visible = false; }
  } else {
    mode = "foot"; pgroup.visible = true;
    const h = car.getHeading();
    pgroup.position.set(car.group.position.x + Math.cos(h) * 2.5, 0, car.group.position.z - Math.sin(h) * 2.5);
  }
});

const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), mv = new THREE.Vector3();
function updateFoot(delta) {
  const yaw = followCamera.getYaw();
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  rgt.set(Math.cos(yaw), 0, -Math.sin(yaw));
  const ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const iz = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
  mv.set(0, 0, 0).addScaledVector(fwd, iz).addScaledVector(rgt, ix);
  if (mv.lengthSq() > 1e-4) {
    mv.normalize();
    pgroup.position.addScaledVector(mv, (keys.run ? RUN : WALK) * delta);
    targetAngle = Math.atan2(mv.x, mv.z);
    walkTime += delta * (keys.run ? 16 : 10);
    animateWalk(limbs, walkTime, 1);
  } else animateWalk(limbs, 0, 0);
  let d = targetAngle - pgroup.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  pgroup.rotation.y += d * Math.min(1, TURN_SMOOTH * delta);
  obstacles.resolve(pgroup.position, 0.7);
  followCamera.update(delta, pgroup.position);
}

function updateDrive(delta) {
  car.update(delta, keys);
  const push = obstacles.resolve(car.group.position, car.radius);
  if (push > 0.05 && Math.abs(car.getSpeed()) > 6) car.slow();
  followCamera.update(delta, car.group.position, car.getHeading() + Math.PI);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (mode === "foot") updateFoot(delta);
  else updateDrive(delta);
  renderer.render(scene, camera);
}
animate();

// Expuesto para verificación automática.
window.__game = { player: pgroup, car, getMode: () => mode };
console.log(`Marbella jugable lista en (${Math.round(spx)}, ${Math.round(spz)})`);
```

- [ ] **Step 3: Verify (Playwright)** — con `npm run dev` activo, crear `tools/verify-game.mjs`:
```js
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
await page.goto("http://localhost:5173/juego-real.html", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const before = await page.evaluate(() => ({ x: window.__game.player.position.x, z: window.__game.player.position.z }));
await page.evaluate(() => window.focus());
await page.keyboard.down("KeyW");
await page.waitForTimeout(700);
await page.keyboard.up("KeyW");
const after = await page.evaluate(() => ({ x: window.__game.player.position.x, z: window.__game.player.position.z }));
const moved = Math.hypot(after.x - before.x, after.z - before.z);
await page.screenshot({ path: "tools/shots/marbella-jugable.png" });
console.log("se movió (m):", moved.toFixed(2));
console.log("errores:", errors.length ? errors : "ninguno");
await browser.close();
```
Run: `node tools/verify-game.mjs`
Expected: "errores: ninguno" y "se movió" > 1 (el personaje anduvo). Revisar `tools/shots/marbella-jugable.png`: se ve el personaje en una calle de Marbella en 3ª persona.

- [ ] **Step 4: Limpiar y commit**
```bash
rm -f tools/verify-game.mjs
git add juego-real.html src/real/game.js
git commit -m "feat(real): Marbella jugable (andar y conducir) en pagina propia"
```

---

## Notas de cierre
- Tras este plan: `http://localhost:5173/juego-real.html` permite **andar y conducir por la Marbella real** con colisiones, sin tocar el juego principal.
- **Integración final (futuro):** cuando el otro chat estabilice `main.js`, sustituir `createWorld` por `createRealCity` allí (un cambio pequeño), conectando NPCs, día/noche y la costa de la playa.
