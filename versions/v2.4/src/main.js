import * as THREE from "three";
import { createRealCity } from "./real/city.js";
import { nearestRoadPoint } from "./real/spawn.js";
import { createCityLife } from "./real/cityLife.js";
import { createPlayer } from "./player/player.js";
import { createControls } from "./player/controls.js";
import { createFollowCamera } from "./player/followCamera.js";
import { createVehicle } from "./vehicle/vehicle.js";
import { createSky } from "./world/sky.js";
import { createDayNight } from "./world/dayNight.js";
import { createPostFX } from "./render/postfx.js";
import { createObstacles } from "./physics/obstacles.js";
import { createHud } from "./ui/hud.js";
import { createMinimapReal } from "./ui/minimapReal.js";
import { createPauseMenu } from "./ui/pauseMenu.js";
import { createRadio } from "./audio/radio.js";
import { setVolume } from "./audio/sfx.js";
import { getState, setState } from "./state/gameState.js";
import { saveGame, loadGame, clearGame } from "./gameplay/save.js";
import { VERSION, VERSION_NAME } from "./version.js";

// ─────────────────────────────────────────────
//  GTA MARBELLA — v2.0 "Marbella Real"
//  El mapa REAL de Marbella (OpenStreetMap) con mi estilo: cielo, día/noche,
//  brillo de cine, cámara GTA, conducción y HUD. (La IA llega en v2.x.)
// ─────────────────────────────────────────────

document.title = `Living Costa del Sol — v${VERSION}`;
const versionLabel = document.getElementById("version-label");
if (versionLabel) versionLabel.textContent = `v${VERSION} — "${VERSION_NAME}"`;

init();

async function init() {
  const canvas = document.getElementById("game-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1); // resolución nativa = bastantes más FPS
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 9000);
  camera.position.set(0, 10, 20);

  // Cielo + día/noche a la escala del mapa real (mucho más grande).
  const sky = createSky(scene, {
    radius: 6000,
    fogNear: 300,
    fogFar: 1500, // niebla más corta; los edificios lejanos se recortan
    shadowHalf: 220,
    shadowFar: 1400,
    shadowMapSize: 1024,
  });

  // Mapa real de Marbella.
  const data = await fetch("/marbella.json").then((r) => r.json());
  const city = createRealCity(data);
  scene.add(city.group);
  // Rendimiento: los edificios NO proyectan sombra (son miles); siguen recibiéndola.
  // Así el jugador y el coche sí proyectan sombra, pero se ahorra el pase pesado.
  const buildingMeshes = [];
  city.group.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
    if (o.userData && o.userData.kind === "building") buildingMeshes.push(o);
  });

  // Colisiones: cajas de edificios (encogidas, las calles reales son estrechas).
  const SHRINK = 0.62;
  const obstacles = createObstacles(
    city.cityBoxes.map((b) => ({ x: b.x, z: b.z, width: b.width * SHRINK, depth: b.depth * SHRINK }))
  );

  const dayNight = createDayNight({ sky, renderer, scene, showDiscs: false });
  const postfx = createPostFX(renderer, scene, camera);

  // Punto de aparición: la zona MÁS DENSA de edificios (centro urbano), para
  // aparecer en una calle reconocible y no en un descampado.
  const [cx0, cz0] = densestCenter(data);
  const [spx, spz] = findSpawn(data, obstacles, cx0, cz0);

  // Jugador.
  const player = createPlayer(scene);
  player.group.position.set(spx, 0, spz);

  // Coche aparcado al lado, en un punto despejado.
  const car = createVehicle(scene, { x: spx + 6, z: spz, color: 0xd11f2a, kind: "car", maxSpeed: 44, accel: 26, turn: 1.8 });
  for (let i = 0; i < 12; i++) obstacles.resolve(car.group.position, car.getRadius());

  const { keys, onPress } = createControls();
  const followCamera = createFollowCamera(camera, canvas);
  let vehicle = null;
  let mode = "foot";

  // Vida urbana: tráfico + peatones por las calles reales (v2.4).
  const life = createCityLife(scene, data.roads, { cars: 8, peds: 14 });

  // HUD y sistemas de mi estilo.
  const hud = createHud();
  const minimap = createMinimapReal(data.roads, { onBigToggle: () => updateCameraActive() });
  function updateCameraActive() {
    followCamera.setActive(!pause.isPaused() && !minimap.isBigOpen());
  }
  const radio = createRadio();
  const fps = makeFps(renderer);
  const clockEl = makeBadge("top:64px;right:16px;font-size:20px;font-weight:800;color:#ffd24a;");
  const speedoEl = makeBadge("bottom:24px;right:24px;font-size:26px;font-weight:800;color:#ffd24a;");
  speedoEl.style.opacity = "0";
  const radioEl = makeBadge("top:104px;left:16px;font-size:14px;font-weight:700;color:#ffd24a;");
  radioEl.style.opacity = "0";
  // Cartel del nombre de la calle (estilo GTA), a la derecha del mini-mapa.
  const streetEl = makeBadge("left:210px;bottom:30px;font-size:16px;font-weight:700;color:#fff;font-family:Segoe UI, system-ui, sans-serif;");
  streetEl.style.opacity = "0";
  let radioTimer = 0;
  let minimapT = 0;
  let streetT = 0;
  let autosaveT = 0;

  // Segmentos de calles CON nombre (para saber en qué calle estás).
  const namedSegs = [];
  for (const r of data.roads) {
    if (!r.name || !r.path || r.path.length < 2) continue;
    for (let i = 1; i < r.path.length; i++) {
      namedSegs.push({ name: r.name, ax: r.path[i - 1][0], az: r.path[i - 1][1], bx: r.path[i][0], bz: r.path[i][1] });
    }
  }

  const pause = createPauseMenu({
    onSensitivity: (m) => followCamera.setSensitivity(m),
    onVolume: (v) => setVolume(v),
    onTime: (h) => dayNight.setTime(h),
    onEffects: (on) => postfx.setEnabled(on),
    onToggle: () => updateCameraActive(),
    onSave: () => doSave(),
    onRestart: () => {
      clearGame();
      location.reload();
    },
  });

  onPress("KeyE", () => {
    if (mode === "drive" && vehicle) {
      mode = "foot";
      const h = vehicle.getHeading();
      player.group.position.set(vehicle.group.position.x + Math.cos(h) * 2.4, 0, vehicle.group.position.z - Math.sin(h) * 2.4);
      player.group.visible = true;
      vehicle = null;
      return;
    }
    const dx = player.group.position.x - car.group.position.x;
    const dz = player.group.position.z - car.group.position.z;
    if (dx * dx + dz * dz < 36) {
      vehicle = car;
      mode = "drive";
      player.group.visible = false;
    }
  });

  onPress("KeyR", () => {
    radio.cycle();
    radioEl.textContent = "📻 " + radio.getName();
    radioEl.style.opacity = "1";
    radioTimer = 3.5;
  });

  // Mapa grande: M para abrir/cerrar, Esc para cerrar (o salir de pausa).
  onPress("KeyM", () => minimap.toggleBig());
  onPress("Escape", () => {
    if (minimap.isBigOpen()) minimap.toggleBig();
    else pause.toggle();
  });
  onPress("KeyP", () => {
    if (!minimap.isBigOpen()) pause.toggle();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    postfx.setSize(window.innerWidth, window.innerHeight);
  });

  function doSave() {
    const s = getState();
    saveGame({ money: s.money, health: s.health, px: player.group.position.x, pz: player.group.position.z });
  }

  // Cargar partida (posición, dinero, salud).
  const saved = loadGame();
  if (saved) {
    setState({ money: saved.money ?? 2500, health: saved.health ?? 100 });
    if (typeof saved.px === "number") player.group.position.set(saved.px, 0, saved.pz);
  }

  const clock = new THREE.Clock();
  const _sunDir = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, 0.05);

    if (pause.isPaused() || minimap.isBigOpen()) {
      postfx.render();
      return;
    }

    // Recorte por distancia: solo se dibujan los trozos de edificios cercanos.
    const camX = camera.position.x;
    const camZ = camera.position.z;
    for (const m of buildingMeshes) {
      const c = m.geometry.boundingSphere.center;
      const dx = c.x - camX;
      const dz = c.z - camZ;
      m.visible = dx * dx + dz * dz < 1650 * 1650;
    }

    if (mode === "foot") {
      player.update(delta, keys, followCamera.getYaw());
      obstacles.resolve(player.group.position, 0.7);
      followCamera.update(delta, player.group.position);
      speedoEl.style.opacity = "0";
    } else {
      vehicle.update(delta, keys);
      const push = obstacles.resolve(vehicle.group.position, vehicle.getRadius());
      if (push > 0.05 && Math.abs(vehicle.getSpeed()) > 6) vehicle.applyImpact(Math.min(28, Math.abs(vehicle.getSpeed()) * 0.8));
      followCamera.update(delta, vehicle.group.position, vehicle.getHeading() + Math.PI);
      speedoEl.style.opacity = "1";
      speedoEl.textContent = `${Math.round(Math.abs(vehicle.getSpeed()) * 3.6)} km/h`;
    }

    const activePos = mode === "foot" ? player.group.position : vehicle.group.position;

    // Vida urbana (tráfico + peatones) sobre las calles reales.
    life.update(delta, activePos);

    // Día/noche: además, sombras y cúpula del cielo siguen al jugador.
    dayNight.update(delta);
    _sunDir.copy(sky.sun.position);
    sky.sun.position.set(activePos.x + _sunDir.x, _sunDir.y, activePos.z + _sunDir.z);
    sky.sun.target.position.set(activePos.x, 0, activePos.z);
    sky.sun.target.updateMatrixWorld();
    sky.sky.position.set(camera.position.x, 0, camera.position.z);

    hud.update(delta);
    fps.update(rawDelta);
    clockEl.textContent = "🕐 " + dayNight.getClock();

    if (radioTimer > 0) {
      radioTimer -= delta;
      if (radioTimer <= 0) radioEl.style.opacity = "0";
    }

    minimapT += delta;
    if (minimapT > 0.1) {
      minimapT = 0;
      const heading = mode === "foot" ? player.group.rotation.y : vehicle.getHeading();
      const dots = life.dots();
      if (mode === "foot") dots.push({ x: car.group.position.x, z: car.group.position.z, color: "#ffd24a", size: 3 });
      minimap.update(activePos.x, activePos.z, heading, dots);
    }

    // Nombre de la calle en la que estás (estilo GTA).
    streetT += delta;
    if (streetT > 0.4) {
      streetT = 0;
      const name = nearestStreetName(namedSegs, activePos.x, activePos.z, 30);
      streetEl.textContent = name || "";
      streetEl.style.opacity = name ? "1" : "0";
    }

    autosaveT += delta;
    if (autosaveT > 15) {
      autosaveT = 0;
      doSave();
    }

    postfx.render();
  }
  animate();

  const loading = document.getElementById("loading");
  if (loading) {
    requestAnimationFrame(() => loading.classList.add("hidden"));
    setTimeout(() => loading.remove(), 800);
  }
}

// Devuelve el nombre de la calle más cercana (si estás a menos de maxDist).
function nearestStreetName(segs, x, z, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const s of segs) {
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const l2 = dx * dx + dz * dz;
    let t = l2 > 0 ? ((x - s.ax) * dx + (z - s.az) * dz) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = s.ax + t * dx;
    const cz = s.az + t * dz;
    const d = (x - cx) ** 2 + (z - cz) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s.name;
    }
  }
  return best;
}

// Encuentra el centro de la zona con MÁS edificios (el núcleo urbano).
function densestCenter(data) {
  const CELL = 130;
  const counts = new Map();
  let bestKey = null;
  let bestCount = 0;
  for (const b of data.buildings) {
    if (!b.footprint || !b.footprint.length) continue;
    const [x, z] = b.footprint[0];
    const gx = Math.floor(x / CELL);
    const gz = Math.floor(z / CELL);
    const key = gx + "," + gz;
    const c = (counts.get(key) || 0) + 1;
    counts.set(key, c);
    if (c > bestCount) {
      bestCount = c;
      bestKey = key;
    }
  }
  if (!bestKey) return [0, 0];
  const [gx, gz] = bestKey.split(",").map(Number);
  return [(gx + 0.5) * CELL, (gz + 0.5) * CELL];
}

// Aparece en el vértice de calle más cercano al núcleo urbano y lo separa de los
// edificios (para nacer EN la calle, con edificios al lado, no en un descampado).
function findSpawn(data, obstacles, tx, tz) {
  const [nx, nz] = nearestRoadPoint(data.roads, tx, tz);
  const p = { x: nx, z: nz };
  for (let i = 0; i < 25; i++) obstacles.resolve(p, 2.5);
  return [p.x, p.z];
}

// ── Pequeños ayudantes de HUD ──
function makeBadge(extra) {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed", "padding:6px 14px", "background:rgba(10,20,35,0.78)",
    "color:#fff", "font-family:Consolas, monospace",
    "border:1px solid rgba(255,255,255,0.15)", "border-radius:10px",
    "pointer-events:none", "user-select:none", "z-index:6", "transition:opacity 0.3s ease",
    extra,
  ].join(";");
  document.body.appendChild(el);
  return el;
}

function makeFps(renderer) {
  const el = makeBadge("top:14px;right:16px;font-size:13px;text-align:right;");
  let frames = 0;
  let accum = 0;
  return {
    update(rawDelta) {
      frames++;
      accum += rawDelta;
      if (accum >= 0.5) {
        const f = Math.round(frames / accum);
        el.textContent = `${f} FPS · ${renderer.info.render.calls} draws`;
        el.style.color = f >= 50 ? "#7CFC83" : f >= 30 ? "#ffd24a" : "#ff6b6b";
        frames = 0;
        accum = 0;
      }
    },
  };
}
