# Plan 1 — Datos de Marbella (pre-bake OSM → `marbella.json`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una herramienta que descarga UNA vez los datos reales de Marbella (centro + Puerto Banús) de OpenStreetMap y produce `public/marbella.json`, más un visor 2D para comprobar el resultado.

**Architecture:** Una tubería *pre-bake* en `tools/`: descarga de Overpass → `osmtogeojson` → simplificación con Turf → proyección a metros + compactación → escritura de `marbella.json`. La lógica pura (proyección, alturas, barrios, consulta) va en módulos pequeños en `tools/lib/` con tests unitarios (runner integrado de Node, sin dependencias). El juego (Plan 2) solo consumirá el JSON.

**Tech Stack:** Node 24 (runner `node --test` y `fetch` nativos), `osmtogeojson@2.2.12`, `@turf/turf@7`, Vite (para servir el visor de depuración). Todo ESM.

## Global Constraints

- Node ≥ 18 (el equipo tiene v24). Usar `fetch` y `node:test` nativos; no añadir frameworks de test.
- Dependencias EXACTAS (devDependencies): `osmtogeojson@2.2.12` (NO `latest`, es beta), `@turf/turf@7`.
- `osmtogeojson` es CommonJS → cargarlo con `createRequire`. El resto, ESM (`import`).
- Proyección: `R = 6371000`, `lat0 = 36.5154`, `lon0 = -4.8858`. Norte = **−Z** (¡el signo menos es obligatorio!). 1 unidad = 1 metro.
- Compactación: `mode: "radial-continuous"`, `r0 = 1200`, `k = 0.5`. Sus parámetros DEBEN guardarse en `meta.georef` (si no, la costa del Plan de la playa no encajará).
- Coordenadas de salida en `[x, z]` metros, redondeadas a 0,1 m.
- Overpass: cabecera `User-Agent` obligatoria; usar `nwr[...]` en áreas/edificios; `out geom;`; Puerto Banús con `leisure=marina` (NUNCA `amenity=marina`); bbox `(36.475, -4.965, 36.522, -4.868)`.
- Robustez: reintentos + mirrors; **fail-fast**: si la respuesta viene vacía, NO escribir `marbella.json`.
- Licencia ODbL: incluir nota de atribución (`tools/NOTICE-osm.md`). La atribución visible en pantalla se hará en el Plan 2.

---

### Task 0: Inicializar Git, dependencias y scripts

**Files:**
- Modify: `package.json`
- Create: `tools/NOTICE-osm.md`

**Interfaces:**
- Consumes: nada.
- Produces: scripts npm `prebake` y `test`; devDependencies disponibles para el resto de tareas.

- [ ] **Step 1: Inicializar el repositorio Git**

Run:
```bash
git init
git add -A
git commit -m "chore: estado inicial antes del generador de Marbella"
```
Expected: crea el repo y un commit con el proyecto actual. (El proyecto aún no era repo Git; esto también prepara la futura sincronización con el VPS.)

- [ ] **Step 2: Instalar las dependencias de la herramienta**

Run:
```bash
npm install --save-dev osmtogeojson@2.2.12 @turf/turf@7
```
Expected: se añaden a `devDependencies` y aparecen en `package-lock.json`.

- [ ] **Step 3: Añadir los scripts `prebake` y `test`**

En `package.json`, dentro de `"scripts"`, añadir:
```json
    "prebake": "node tools/prebake-marbella.mjs",
    "test": "node --test tools/"
```

- [ ] **Step 4: Crear la nota de licencia OSM**

Crear `tools/NOTICE-osm.md`:
```markdown
# Atribución de datos de mapa

Este proyecto usa datos de **OpenStreetMap**.

> Datos del mapa © OpenStreetMap contributors, disponibles bajo la
> Open Database License (ODbL). https://www.openstreetmap.org/copyright

- Fecha de descarga: (rellenar al ejecutar `npm run prebake`)
- Zona (bbox, sur,oeste,norte,este): 36.475, -4.965, 36.522, -4.868
- Consulta Overpass: ver `tools/lib/overpass.mjs` (función `buildQuery`)

Si se redistribuye el *dataset* derivado (`marbella.json`), debe ir bajo ODbL.
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tools/NOTICE-osm.md
git commit -m "chore: deps (osmtogeojson, turf), scripts prebake/test y nota ODbL"
```

---

### Task 1: Proyección y compactación (`tools/lib/geo.mjs`)

**Files:**
- Create: `tools/lib/geo.mjs`
- Test: `tools/lib/geo.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `GEOREF` (objeto con `version, R, lat0, lon0, cosLat0, scaleGlobal, axis, rotationDeg, opOrder, compaction{mode,r0,k}`).
  - `project(lon, lat, ref=GEOREF) -> [x, z]` (metros, sin compactar).
  - `compact([x, z], ref=GEOREF) -> [x, z]`.
  - `latLonToWorld(lon, lat, ref=GEOREF) -> [x, z]` (proyecta + compacta + redondea a 0,1 m).

- [ ] **Step 1: Write the failing test**

`tools/lib/geo.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { GEOREF, project, compact, latLonToWorld } from "./geo.mjs";

const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;

test("el origen lat0/lon0 cae en (0,0)", () => {
  const [x, z] = project(GEOREF.lon0, GEOREF.lat0);
  assert.ok(near(x, 0, 1e-6) && near(z, 0, 1e-6));
});

test("Norte va hacia -Z y Este hacia +X", () => {
  const [, zNorte] = project(GEOREF.lon0, GEOREF.lat0 + 0.01);
  const [xEste] = project(GEOREF.lon0 + 0.01, GEOREF.lat0);
  assert.ok(zNorte < 0, "norte debe ser Z negativo");
  assert.ok(xEste > 0, "este debe ser X positivo");
});

test("compact no toca el centro (r < r0)", () => {
  assert.deepEqual(compact([100, 0]), [100, 0]);
});

test("compact encoge la periferia (r >= r0)", () => {
  // r=2000 -> f = 1200 + (800*0.5) = 1600
  const [x] = compact([2000, 0]);
  assert.ok(near(x, 1600), `esperaba ~1600, obtuve ${x}`);
});

test("latLonToWorld redondea a 0,1 m", () => {
  const [x, z] = latLonToWorld(GEOREF.lon0 + 0.001, GEOREF.lat0 - 0.001);
  assert.equal(x, Math.round(x * 10) / 10);
  assert.equal(z, Math.round(z * 10) / 10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/lib/geo.test.mjs`
Expected: FAIL ("Cannot find module './geo.mjs'").

- [ ] **Step 3: Write minimal implementation**

`tools/lib/geo.mjs`:
```js
const DEG2RAD = Math.PI / 180;

export const GEOREF = {
  version: 1,
  R: 6371000,
  lat0: 36.5154,
  lon0: -4.8858,
  cosLat0: Math.cos(36.5154 * DEG2RAD),
  scaleGlobal: 1.0,
  axis: { east: "+X", north: "-Z", up: "+Y" },
  rotationDeg: 0,
  opOrder: ["project", "rotate", "compact", "scale"],
  compaction: { mode: "radial-continuous", r0: 1200, k: 0.5 },
};

const mPerDegLat = (ref) => ref.R * DEG2RAD;
const mPerDegLon = (ref) => ref.R * DEG2RAD * Math.cos(ref.lat0 * DEG2RAD);

export function project(lon, lat, ref = GEOREF) {
  const x = (lon - ref.lon0) * mPerDegLon(ref);
  const z = -(lat - ref.lat0) * mPerDegLat(ref); // Norte = -Z
  return [x, z];
}

export function compact([x, z], ref = GEOREF) {
  const { r0, k } = ref.compaction;
  const r = Math.hypot(x, z);
  if (r <= r0 || r === 0) return [x, z];
  const s = (r0 + (r - r0) * k) / r;
  return [x * s, z * s];
}

export function latLonToWorld(lon, lat, ref = GEOREF) {
  const [x, z] = compact(project(lon, lat, ref), ref);
  return [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/lib/geo.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/geo.mjs tools/lib/geo.test.mjs
git commit -m "feat(prebake): proyeccion lat/lon a metros y compactacion radial"
```

---

### Task 2: Estimación de alturas (`tools/lib/heights.mjs`)

**Files:**
- Create: `tools/lib/heights.mjs`
- Test: `tools/lib/heights.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `parseHeight(raw) -> number|null` (normaliza " m", coma decimal, pies).
  - `clampHeight(h) -> number` (2..60).
  - `estimateHeight(tags) -> number` (cascada height → levels → default por tipo).
  - `jitterHeight(h, id) -> number` (±15 % determinista por id de cadena).

- [ ] **Step 1: Write the failing test**

`tools/lib/heights.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHeight, clampHeight, estimateHeight, jitterHeight } from "./heights.mjs";

test("parseHeight normaliza unidades y comas", () => {
  assert.equal(parseHeight("12 m"), 12);
  assert.equal(parseHeight("12,5"), 12.5);
  assert.equal(Math.round(parseHeight("20'")), 6); // pies -> metros
  assert.equal(parseHeight(undefined), null);
});

test("clampHeight limita a 2..60", () => {
  assert.equal(clampHeight(0.5), 2);
  assert.equal(clampHeight(999), 60);
  assert.equal(clampHeight(10), 10);
});

test("estimateHeight usa height, luego levels, luego default", () => {
  assert.equal(estimateHeight({ height: "15" }), 15);
  assert.equal(estimateHeight({ "building:levels": "4" }), 12.8); // 4*3.2
  assert.equal(estimateHeight({ building: "hotel" }), 24);
  assert.equal(estimateHeight({ building: "yes" }), 7);
});

test("jitterHeight es determinista por id", () => {
  const a = jitterHeight(10, "way/123");
  const b = jitterHeight(10, "way/123");
  const c = jitterHeight(10, "way/999");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(a >= 8.5 && a <= 13);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/lib/heights.test.mjs`
Expected: FAIL ("Cannot find module './heights.mjs'").

- [ ] **Step 3: Write minimal implementation**

`tools/lib/heights.mjs`:
```js
export const METROS_POR_PLANTA = 3.2;
const MIN_H = 2, MAX_H = 60;

const DEFAULTS = {
  house: 6, detached: 6, bungalow: 6, villa: 9,
  residential: 9, apartments: 15,
  retail: 5, commercial: 5, supermarket: 5, kiosk: 5,
  office: 18, hotel: 24, church: 12,
  industrial: 8, warehouse: 8, garage: 3, hut: 3,
  yes: 7,
};

export function parseHeight(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase().replace(",", ".");
  const feet = s.includes("'") || s.includes("ft");
  s = s.replace(/['"]/g, "").replace("ft", "").replace("m", "").trim();
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return feet ? n * 0.3048 : n;
}

export function clampHeight(h) {
  return Math.max(MIN_H, Math.min(MAX_H, h));
}

export function estimateHeight(tags = {}) {
  const h = parseHeight(tags.height ?? tags["building:height"]);
  if (h != null) return clampHeight(h);
  const levels = parseInt(tags["building:levels"], 10);
  if (Number.isInteger(levels) && levels > 0) return clampHeight(levels * METROS_POR_PLANTA);
  const type = tags.building && tags.building !== "yes" ? tags.building : "yes";
  return clampHeight(DEFAULTS[type] ?? DEFAULTS.yes);
}

export function jitterHeight(h, id) {
  const s = String(id);
  let seed = 0;
  for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
  const r = (seed % 233280) / 233280; // 0..1 determinista
  return Math.round(h * (0.85 + r * 0.3) * 10) / 10;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/lib/heights.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/heights.mjs tools/lib/heights.test.mjs
git commit -m "feat(prebake): estimacion de alturas con cascada y jitter estable"
```

---

### Task 3: Clasificación por barrio (`tools/lib/barrios.mjs`)

**Files:**
- Create: `tools/lib/barrios.mjs`
- Test: `tools/lib/barrios.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `BARRIOS` (array `{ name, ring }`, anillos en `[lon, lat]`).
  - `pointInRing([lon, lat], ring) -> boolean` (ray casting puro).
  - `classifyBarrio(lon, lat, barrios=BARRIOS) -> string`.

- [ ] **Step 1: Write the failing test**

`tools/lib/barrios.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyBarrio, pointInRing } from "./barrios.mjs";

const cuadrado = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

test("pointInRing detecta dentro/fuera", () => {
  assert.equal(pointInRing([0, 0], cuadrado), true);
  assert.equal(pointInRing([2, 2], cuadrado), false);
});

test("classifyBarrio asigna Puerto Banús a un punto en su zona", () => {
  // Centro aproximado de la marina de Puerto Banús
  assert.equal(classifyBarrio(-4.951, 36.486), "Puerto Banús");
});

test("classifyBarrio devuelve Genérico fuera de todo barrio", () => {
  assert.equal(classifyBarrio(0, 0), "Genérico");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/lib/barrios.test.mjs`
Expected: FAIL ("Cannot find module './barrios.mjs'").

- [ ] **Step 3: Write minimal implementation**

`tools/lib/barrios.mjs` (anillos aproximados en `[lon, lat]`; se afinan más adelante):
```js
export const BARRIOS = [
  { name: "Casco Antiguo", ring: [[-4.890, 36.516], [-4.882, 36.516], [-4.882, 36.509], [-4.890, 36.509]] },
  { name: "Centro", ring: [[-4.900, 36.520], [-4.872, 36.520], [-4.872, 36.505], [-4.900, 36.505]] },
  { name: "Puerto Banús", ring: [[-4.962, 36.492], [-4.940, 36.492], [-4.940, 36.480], [-4.962, 36.480]] },
  { name: "Golden Mile", ring: [[-4.940, 36.508], [-4.905, 36.508], [-4.905, 36.495], [-4.940, 36.495]] },
];

export function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function classifyBarrio(lon, lat, barrios = BARRIOS) {
  for (const b of barrios) if (pointInRing([lon, lat], b.ring)) return b.name;
  return "Genérico";
}
```
Nota: el orden importa (el primero que contenga el punto gana). "Casco Antiguo" va antes que "Centro" porque está dentro de él.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/lib/barrios.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/barrios.mjs tools/lib/barrios.test.mjs
git commit -m "feat(prebake): clasificacion de edificios por barrio (punto en poligono)"
```

---

### Task 4: Consulta y descarga Overpass (`tools/lib/overpass.mjs`)

**Files:**
- Create: `tools/lib/overpass.mjs`
- Test: `tools/lib/overpass.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `BBOX` (`{ south, west, north, east }`).
  - `buildQuery(bbox=BBOX) -> string` (Overpass QL).
  - `downloadOsm(query, { fetchImpl, endpoints, retries }) -> Promise<object>` (JSON de Overpass).

- [ ] **Step 1: Write the failing test**

`tools/lib/overpass.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { BBOX, buildQuery, downloadOsm } from "./overpass.mjs";

test("buildQuery incluye bbox, out geom, nwr building y leisure=marina", () => {
  const q = buildQuery();
  assert.match(q, /36\.475,-4\.965,36\.522,-4\.868/);
  assert.match(q, /out geom;/);
  assert.match(q, /nwr\["building"\]/);
  assert.match(q, /leisure"="marina"/);
  assert.doesNotMatch(q, /amenity"="marina"/);
});

test("downloadOsm devuelve el JSON en el camino feliz (fetch inyectado)", async () => {
  const fake = async () => ({ ok: true, status: 200, json: async () => ({ elements: [{ id: 1 }] }) });
  const data = await downloadOsm("q", { fetchImpl: fake, endpoints: ["x"], retries: 1 });
  assert.equal(data.elements.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/lib/overpass.test.mjs`
Expected: FAIL ("Cannot find module './overpass.mjs'").

- [ ] **Step 3: Write minimal implementation**

`tools/lib/overpass.mjs`:
```js
export const BBOX = { south: 36.475, west: -4.965, north: 36.522, east: -4.868 };

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const BACKOFF_MS = [5000, 15000, 45000];

export function buildQuery(bbox = BBOX) {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:180];
(
  way["highway"](${b});
  way["junction"="roundabout"](${b});
  way["junction"="circular"](${b});
  nwr["building"](${b});
  way["natural"="coastline"](${b});
  nwr["natural"="beach"](${b});
  nwr["leisure"="park"](${b});
  nwr["leisure"="garden"](${b});
  nwr["leisure"="marina"](${b});
  nwr["landuse"~"^(grass|residential|commercial|forest)$"](${b});
  way["highway"="pedestrian"]["area"="yes"](${b});
);
out geom;`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function downloadOsm(query, opts = {}) {
  const { fetchImpl = fetch, endpoints = ENDPOINTS, retries = 3 } = opts;
  let lastErr;
  for (const url of endpoints) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 200000);
        const res = await fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "GTA-Marbella-prebake/1.0 (infodanitamames@gmail.com)",
          },
          body: "data=" + encodeURIComponent(query),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.status === 429 || res.status === 504) throw new Error("rate-limit " + res.status);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.json();
      } catch (e) {
        lastErr = e;
        if (attempt < retries - 1) await sleep(BACKOFF_MS[attempt] ?? 45000);
      }
    }
  }
  throw lastErr ?? new Error("descarga fallida");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/lib/overpass.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/overpass.mjs tools/lib/overpass.test.mjs
git commit -m "feat(prebake): consulta Overpass y descarga con reintentos/mirrors"
```

---

### Task 5: Construcción de capas (`tools/lib/layers.mjs`)

**Files:**
- Create: `tools/lib/layers.mjs`
- Test: `tools/lib/layers.test.mjs`

**Interfaces:**
- Consumes: `latLonToWorld`, `GEOREF` (Task 1); `estimateHeight`, `jitterHeight` (Task 2); `classifyBarrio` (Task 3); `BBOX` (Task 4).
- Produces:
  - `classifyFeature(feature) -> 'building'|'road'|'roundabout'|'coastline'|'area'|null`.
  - `buildCityData(geojson) -> { meta, roads, roundabouts, buildings, coastline, areas }`.

- [ ] **Step 1: Write the failing test**

`tools/lib/layers.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFeature, buildCityData } from "./layers.mjs";
import { GEOREF } from "./geo.mjs";

const featBuilding = {
  id: "way/1", properties: { building: "apartments", "building:levels": "5" },
  geometry: { type: "Polygon", coordinates: [[[GEOREF.lon0, GEOREF.lat0], [GEOREF.lon0 + 0.0005, GEOREF.lat0], [GEOREF.lon0 + 0.0005, GEOREF.lat0 + 0.0005], [GEOREF.lon0, GEOREF.lat0]]] },
};
const featRoad = {
  id: "way/2", properties: { highway: "primary" },
  geometry: { type: "LineString", coordinates: [[GEOREF.lon0, GEOREF.lat0], [GEOREF.lon0 + 0.001, GEOREF.lat0]] },
};

test("classifyFeature reconoce edificios y calles", () => {
  assert.equal(classifyFeature(featBuilding), "building");
  assert.equal(classifyFeature(featRoad), "road");
});

test("buildCityData separa capas y proyecta", () => {
  const data = buildCityData({ features: [featBuilding, featRoad] });
  assert.equal(data.buildings.length, 1);
  assert.equal(data.roads.length, 1);
  // El origen lat0/lon0 cae dentro del polígono "Casco Antiguo" (va antes que "Centro")
  assert.equal(data.buildings[0].barrio, "Casco Antiguo");
  assert.ok(data.buildings[0].height > 0);
  assert.ok(Array.isArray(data.buildings[0].footprint));
  assert.equal(data.meta.georef.lat0, GEOREF.lat0);
  assert.deepEqual(data.meta.bbox, [-4.965, 36.475, -4.868, 36.522]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/lib/layers.test.mjs`
Expected: FAIL ("Cannot find module './layers.mjs'").

- [ ] **Step 3: Write minimal implementation**

`tools/lib/layers.mjs`:
```js
import { latLonToWorld, GEOREF } from "./geo.mjs";
import { estimateHeight, jitterHeight } from "./heights.mjs";
import { classifyBarrio } from "./barrios.mjs";
import { BBOX } from "./overpass.mjs";

const lineToWorld = (coords) => coords.map(([lon, lat]) => latLonToWorld(lon, lat));

function centroidLonLat(coords) {
  let x = 0, y = 0;
  for (const [a, b] of coords) { x += a; y += b; }
  const n = coords.length || 1;
  return [x / n, y / n];
}

export function classifyFeature(f) {
  const p = f.properties || {};
  const t = f.geometry?.type;
  if (p.building) return "building";
  if (p.junction === "roundabout" || p.junction === "circular") return "roundabout";
  if (p.natural === "coastline") return "coastline";
  if (p.highway && t === "LineString") return "road";
  if (p.leisure === "park" || p.leisure === "garden" || p.leisure === "marina" || p.natural === "beach" || p.landuse) return "area";
  return null;
}

export function buildCityData(geojson) {
  const out = {
    meta: {
      version: 1,
      georef: GEOREF,
      bbox: [BBOX.west, BBOX.south, BBOX.east, BBOX.north],
      source: "OpenStreetMap / Overpass",
      license: "© OpenStreetMap contributors (ODbL)",
    },
    roads: [], roundabouts: [], buildings: [], coastline: [], areas: [],
  };

  for (const f of geojson.features || []) {
    const p = f.properties || {};
    const g = f.geometry || {};
    const id = f.id ?? p.id ?? 0;
    const kind = classifyFeature(f);
    if (!kind) continue;

    if (kind === "building") {
      if (g.type !== "Polygon") continue;
      const ring = g.coordinates[0];
      const [clon, clat] = centroidLonLat(ring);
      out.buildings.push({
        id,
        height: jitterHeight(estimateHeight(p), id),
        type: p.building,
        barrio: classifyBarrio(clon, clat),
        footprint: lineToWorld(ring),
        holes: (g.coordinates.slice(1) || []).map(lineToWorld),
      });
    } else if (kind === "road") {
      out.roads.push({
        id,
        kind: p.highway,
        lanes: p.lanes ? Number(p.lanes) : undefined,
        oneway: p.oneway === "yes",
        path: lineToWorld(g.coordinates),
      });
    } else if (kind === "roundabout") {
      const coords = g.type === "Polygon" ? g.coordinates[0] : g.coordinates;
      out.roundabouts.push({ id, path: lineToWorld(coords) });
    } else if (kind === "coastline") {
      if (g.type !== "LineString") continue;
      out.coastline.push({ id, path: lineToWorld(g.coordinates) });
    } else if (kind === "area") {
      if (g.type !== "Polygon") continue;
      const ring = g.coordinates[0];
      const [clon, clat] = centroidLonLat(ring);
      out.areas.push({
        id,
        kind: p.natural === "beach" ? "beach" : p.leisure || p.landuse || "area",
        barrio: classifyBarrio(clon, clat),
        polygon: lineToWorld(ring),
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/lib/layers.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/layers.mjs tools/lib/layers.test.mjs
git commit -m "feat(prebake): separar GeoJSON en capas y construir marbella.json"
```

---

### Task 6: Orquestador `prebake` (descarga real → `public/marbella.json`)

**Files:**
- Create: `tools/prebake-marbella.mjs`
- Create (generado al ejecutar): `public/marbella.json`

**Interfaces:**
- Consumes: `buildQuery`, `downloadOsm` (Task 4); `buildCityData` (Task 5); `osmtogeojson`, `@turf/turf` (Task 0).
- Produces: el archivo `public/marbella.json` con la estructura de `buildCityData`.

- [ ] **Step 1: Write the orchestrator**

`tools/prebake-marbella.mjs`:
```js
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { simplify } from "@turf/turf";
import { buildQuery, downloadOsm } from "./lib/overpass.mjs";
import { buildCityData } from "./lib/layers.mjs";

const require = createRequire(import.meta.url);
const osmtogeojson = require("osmtogeojson");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public");
const OUT = path.join(OUT_DIR, "marbella.json");

async function main() {
  console.log("⏬ Descargando datos de OpenStreetMap (puede tardar 1-2 min)…");
  const raw = await downloadOsm(buildQuery());
  if (!raw || !Array.isArray(raw.elements) || raw.elements.length === 0) {
    throw new Error("Respuesta de Overpass vacía: NO sobreescribo marbella.json.");
  }
  console.log(`   Elementos OSM recibidos: ${raw.elements.length}`);

  const geojson = osmtogeojson(raw, { flatProperties: true });
  for (const f of geojson.features) {
    try { simplify(f, { tolerance: 0.00002, highQuality: true, mutate: true }); } catch { /* geometría rara: la dejamos */ }
  }

  const data = buildCityData(geojson);
  const counts = {
    edificios: data.buildings.length,
    calles: data.roads.length,
    rotondas: data.roundabouts.length,
    costa: data.coastline.length,
    areas: data.areas.length,
  };
  console.log("🏙️  Generado:", counts);

  if (data.buildings.length === 0 && data.roads.length === 0) {
    throw new Error("Sin edificios ni calles: NO sobreescribo marbella.json.");
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(data));
  console.log("✅ Escrito:", OUT);
}

main().catch((e) => {
  console.error("❌ ERROR:", e.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run the full prebake (descarga real)**

Run: `npm run prebake`
Expected: imprime el conteo (cientos/miles de edificios y calles) y `✅ Escrito: .../public/marbella.json`. Si Overpass está saturado puede tardar o reintentar; al final debe escribir el archivo.

- [ ] **Step 3: Verify the output**

Run:
```bash
node -e "const d=require('./public/marbella.json');console.log('edificios',d.buildings.length,'calles',d.roads.length,'costa',d.coastline.length);console.log('georef.lat0',d.meta.georef.lat0,'compaction',JSON.stringify(d.meta.georef.compaction));"
```
Expected: números > 0 en edificios y calles, y `meta.georef` presente con la compactación.

- [ ] **Step 4: Commit**

```bash
git add tools/prebake-marbella.mjs public/marbella.json
git commit -m "feat(prebake): orquestador que descarga OSM y genera marbella.json"
```

---

### Task 7: Visor 2D de depuración (¡ver Marbella!)

**Files:**
- Create: `public/debug-map.html`

**Interfaces:**
- Consumes: `public/marbella.json` (Task 6), servido por Vite en `/marbella.json`.
- Produces: una página `/debug-map.html` que dibuja el plano real (calles, edificios, costa) en un canvas.

- [ ] **Step 1: Write the debug viewer**

`public/debug-map.html`:
```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" /><title>Marbella real — visor 2D</title>
<style>
  html,body{margin:0;background:#0f1216;color:#cbd5e1;font-family:system-ui}
  #info{position:fixed;top:10px;left:10px;font-size:13px;background:#1b2330;padding:8px 12px;border-radius:8px}
  canvas{display:block}
</style>
</head>
<body>
<div id="info">Cargando marbella.json…</div>
<canvas id="c"></canvas>
<script type="module">
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const info = document.getElementById("info");

const data = await fetch("/marbella.json").then((r) => r.json());

// Calcular límites del mundo
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
const scan = (pts) => pts.forEach(([x, z]) => {
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
});
data.roads.forEach((r) => scan(r.path));
data.buildings.forEach((b) => scan(b.footprint));
data.coastline.forEach((c) => scan(c.path));

function resize() {
  cv.width = innerWidth; cv.height = innerHeight;
  draw();
}
function world2screen(x, z) {
  const pad = 20;
  const sx = (cv.width - pad * 2) / (maxX - minX);
  const sz = (cv.height - pad * 2) / (maxZ - minZ);
  const s = Math.min(sx, sz);
  return [pad + (x - minX) * s, pad + (z - minZ) * s];
}
function poly(pts, { stroke, fill, close }) {
  ctx.beginPath();
  pts.forEach(([x, z], i) => {
    const [sx, sy] = world2screen(x, z);
    i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
  });
  if (close) ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function draw() {
  ctx.fillStyle = "#0f1216";
  ctx.fillRect(0, 0, cv.width, cv.height);
  data.areas.forEach((a) => poly(a.polygon, { fill: a.kind === "beach" ? "#3b3320" : "#16241c", close: true }));
  data.coastline.forEach((c) => poly(c.path, { stroke: "#2f6fb0" }));
  ctx.lineWidth = 1;
  data.roads.forEach((r) => poly(r.path, { stroke: "#5b6678" }));
  data.buildings.forEach((b) => poly(b.footprint, { fill: "#9aa6b8", close: true }));
  info.textContent = `Marbella real · ${data.buildings.length} edificios · ${data.roads.length} calles · ${data.coastline.length} tramos de costa`;
}
addEventListener("resize", resize);
resize();
</script>
</body>
</html>
```

- [ ] **Step 2: Verify in the browser**

Run: `npm run dev`
Abrir `http://localhost:5173/debug-map.html`.
Expected: se ve el **plano real de Marbella** (manzanas, calles y la línea de costa). El recuadro de arriba muestra los conteos. Comprobar a ojo que la forma se parece a Marbella (no aparece reflejada N-S: el mar debe quedar abajo/sur).

- [ ] **Step 3: Commit**

```bash
git add public/debug-map.html
git commit -m "feat(prebake): visor 2D de depuracion del mapa de Marbella"
```

---

## Notas de cierre

- **Tras este plan** existe `public/marbella.json` con la Marbella real (datos) y un visor 2D para comprobarla. Todavía NO está en el mundo 3D del juego.
- **Plan 2 (siguiente)** — "Constructor de Marbella en el juego": leer `marbella.json` y construir calles, edificios y rotondas en Three.js (extrude + fusión por celdas), integrarlo con un interruptor frente a la ciudad de cuadrícula actual, y añadir la atribución ODbL visible. Depende del `meta.georef` que genera este Plan 1 (mismo dato que usará el chat de la playa).
- **Costa compartida:** la capa `coastline` y el objeto `meta.georef` de `marbella.json` son el "contrato" para el chat de la playa (sección 8 del diseño).
