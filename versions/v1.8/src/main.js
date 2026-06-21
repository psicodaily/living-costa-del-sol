import * as THREE from "three";
import { createWorld } from "./world/index.js";
import { createPlayer } from "./player/player.js";
import { createControls } from "./player/controls.js";
import { createFollowCamera } from "./player/followCamera.js";
import { createNPCs } from "./npc/manager.js";
import { createFleet } from "./vehicle/fleet.js";
import { createHud } from "./ui/hud.js";
import { createMinimap } from "./ui/minimap.js";
import { createErrands } from "./gameplay/errands.js";
import { createPauseMenu } from "./ui/pauseMenu.js";
import { setVolume } from "./audio/sfx.js";
import { createObstacles } from "./physics/obstacles.js";
import { createDayNight } from "./world/dayNight.js";
import { createPostFX } from "./render/postfx.js";
import { VERSION, VERSION_NAME } from "./version.js";

// Muestra la versión en el HUD y en el título de la pestaña (fuente única: version.js).
document.title = `GTA Marbella — v${VERSION}`;
const versionLabel = document.getElementById("version-label");
if (versionLabel) versionLabel.textContent = `v${VERSION} — "${VERSION_NAME}"`;

// ─────────────────────────────────────────────
//  GTA MARBELLA — v1.0 "Se mueve"
//  Punto de entrada: crea la escena y arranca el bucle del juego.
// ─────────────────────────────────────────────

const canvas = document.getElementById("game-canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Render fino (v1.2): gestión de color + tono cinematográfico ACES, para que
// los blancos mediterráneos no se "quemen" y los colores se vean naturales.
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 8, 16);

// Mundo, jugador, controles, cámara y NPCs.
const world = createWorld(scene);
const player = createPlayer(scene);
player.group.position.set(0, 0, -24); // aparta del centro (allí va la rotonda)

// Obstáculos para colisiones: edificios + la isleta de la rotonda (v1.6).
const obstacles = createObstacles([
  ...world.cityBoxes,
  { x: 0, z: 0, width: 14, depth: 14 },
]);

// Ciclo día/noche y postprocesado (v1.8).
const dayNight = createDayNight({
  sky: world.sky,
  renderer,
  scene,
  windowMaterials: world.windowMaterials,
  lampMaterials: world.streetlights.lampMaterials,
});
const postfx = createPostFX(renderer, scene, camera);
const clockEl = createClock();
const { keys, onPress } = createControls();
const followCamera = createFollowCamera(camera, canvas);
const npcs = createNPCs(scene, 25);

// Flota de vehículos y máquina de estados a-pie / conduciendo (v1.3 → v1.7).
const fleet = createFleet(scene);
let vehicle = null; // vehículo que se conduce ahora (null = a pie)
let mode = "foot"; // "foot" | "drive"

const speedo = createSpeedo();
const enterHint = createEnterHint();
const fpsEl = createFpsCounter();
const carBar = createCarBar();
let fpsFrames = 0;
let fpsAccum = 0;
let shakeTime = 0;

// HUD de salud/dinero y mini-mapa (v1.4). El clic en el mapa lo abre en grande.
const hud = createHud();
const minimap = createMinimap({ onBigToggle: updateCameraActive });

// Recados, menú de pausa y reloj de oleaje (v1.5).
const errands = createErrands(scene);
let elapsed = 0;

const pause = createPauseMenu({
  onSensitivity: (mult) => followCamera.setSensitivity(mult),
  onVolume: (v) => setVolume(v),
  onRestart: () => location.reload(),
  onToggle: updateCameraActive,
  onTime: (h) => dayNight.setTime(h),
  onEffects: (on) => postfx.setEnabled(on),
});

// La cámara solo responde al ratón si no hay pausa ni mapa abiertos.
function updateCameraActive() {
  followCamera.setActive(!pause.isPaused() && !minimap.isBigOpen());
}

onPress("KeyM", () => minimap.toggleBig());
onPress("KeyP", () => {
  if (!minimap.isBigOpen()) pause.toggle();
});
onPress("Escape", () => {
  if (minimap.isBigOpen()) minimap.toggleBig();
  else pause.toggle();
});

function nearestVehicle() {
  return fleet.findNearest(player.group.position, 5);
}

onPress("KeyE", () => {
  if (mode === "foot") {
    const v = nearestVehicle();
    if (v) {
      vehicle = v;
      mode = "drive";
      player.group.visible = false;
    }
  } else if (mode === "drive" && vehicle) {
    mode = "foot";
    const h = vehicle.getHeading();
    // Dejar al jugador junto al vehículo.
    player.group.position.set(
      vehicle.group.position.x + Math.cos(h) * 2.2,
      0,
      vehicle.group.position.z - Math.sin(h) * 2.2
    );
    player.group.visible = true;
    vehicle = null;
  }
});

// Ajuste al cambiar el tamaño de la ventana.
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx.setSize(window.innerWidth, window.innerHeight);
});

// Bucle principal del juego.
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 0.05); // evita saltos si baja el FPS

  // En pausa o con el mapa abierto: congela el mundo pero sigue dibujando.
  if (pause.isPaused() || minimap.isBigOpen()) {
    postfx.render();
    return;
  }

  elapsed += rawDelta;
  world.coast.update(elapsed); // oleaje del mar
  dayNight.update(delta); // ciclo día/noche
  clockEl.textContent = "🕐 " + dayNight.getClock();

  if (mode === "foot") {
    player.update(delta, keys, followCamera.getYaw());
    obstacles.resolve(player.group.position, 0.7); // no atravesar edificios
    followCamera.update(delta, player.group.position);
    enterHint.style.opacity = nearestVehicle() ? "1" : "0";
    speedo.style.opacity = "0";
    carBar.wrap.style.opacity = "0";
  } else {
    vehicle.update(delta, keys);
    // Choque: si el vehículo es empujado fuera de un obstáculo yendo rápido, daña.
    const push = obstacles.resolve(vehicle.group.position, vehicle.getRadius());
    if (push > 0.05 && Math.abs(vehicle.getSpeed()) > 7) {
      vehicle.applyImpact(Math.min(30, Math.abs(vehicle.getSpeed()) * 0.8));
      shakeTime = 0.28;
    }
    followCamera.update(delta, vehicle.group.position, vehicle.getHeading() + Math.PI);
    enterHint.style.opacity = "0";
    speedo.style.opacity = "1";
    speedo.textContent = `${Math.round(Math.abs(vehicle.getSpeed()) * 3.6)} km/h`;
    const cond = vehicle.getCondition();
    carBar.wrap.style.opacity = "1";
    carBar.fill.style.width = cond + "%";
    carBar.fill.style.background = cond > 50 ? "#4caf50" : cond > 20 ? "#ffb300" : "#e53935";
  }

  // Sacudida de cámara tras un golpe.
  if (shakeTime > 0) {
    shakeTime -= delta;
    const a = Math.max(0, shakeTime) * 1.4;
    camera.position.x += (Math.random() - 0.5) * a;
    camera.position.y += (Math.random() - 0.5) * a;
    camera.position.z += (Math.random() - 0.5) * a;
  }
  // Recados: usa la posición activa (jugador a pie o vehículo).
  const activePos = mode === "foot" ? player.group.position : vehicle.group.position;
  errands.update(delta, activePos);

  npcs.update(delta);
  hud.update(delta);

  // Mini-mapa: centrado en el jugador (a pie) o en el coche (conduciendo).
  const dots = npcs.npcs.map((n) => ({
    x: n.group.position.x,
    z: n.group.position.z,
    color: "#bfc5cf",
    size: 2,
  }));
  const tg = errands.getTarget();
  dots.push({ x: tg.x, z: tg.z, color: "#ffd24a", size: 4 }); // destino del recado
  // Vehículos aparcados (no el que conduces) en el mini-mapa.
  for (const v of fleet.vehicles) {
    if (v === vehicle) continue;
    dots.push({
      x: v.group.position.x,
      z: v.group.position.z,
      color: v.kind === "moto" ? "#ff9c2a" : "#ff4444",
      size: 3,
    });
  }
  if (mode === "foot") {
    minimap.update(player.group.position.x, player.group.position.z, player.group.rotation.y, dots);
  } else {
    minimap.update(vehicle.group.position.x, vehicle.group.position.z, vehicle.getHeading(), dots);
  }

  postfx.render();
  updateFps(rawDelta);
}

animate();

// Oculta la pantalla de carga una vez todo está listo.
const loading = document.getElementById("loading");
if (loading) {
  requestAnimationFrame(() => loading.classList.add("hidden"));
  setTimeout(() => loading.remove(), 800);
}

// Velocímetro (visible solo al conducir).
function createSpeedo() {
  const el = document.createElement("div");
  el.textContent = "0 km/h";
  el.style.cssText = [
    "position:fixed", "bottom:24px", "right:24px", "padding:10px 18px",
    "background:rgba(10,20,35,0.72)", "color:#ffd24a",
    "font-family:Segoe UI, system-ui, sans-serif", "font-size:26px", "font-weight:800",
    "border:1px solid rgba(255,255,255,0.15)", "border-radius:12px",
    "pointer-events:none", "user-select:none", "opacity:0",
    "transition:opacity 0.3s ease", "z-index:6",
  ].join(";");
  document.body.appendChild(el);
  return el;
}

// Contador de rendimiento (arriba a la derecha): FPS, ms por fotograma y nº de
// llamadas de dibujo. Se actualiza dos veces por segundo.
function createFpsCounter() {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed", "top:14px", "right:16px", "padding:6px 12px",
    "background:rgba(10,20,35,0.72)", "color:#cfe3ff",
    "font-family:Consolas, monospace", "text-align:right",
    "border:1px solid rgba(255,255,255,0.12)", "border-radius:10px",
    "pointer-events:none", "user-select:none", "z-index:6", "line-height:1.35",
  ].join(";");
  const l1 = document.createElement("div");
  l1.textContent = "-- FPS";
  l1.style.cssText = "font-size:18px;font-weight:800;color:#7CFC83;";
  const l2 = document.createElement("div");
  l2.textContent = "-- ms";
  l2.style.cssText = "font-size:11px;opacity:0.85;";
  el.appendChild(l1);
  el.appendChild(l2);
  document.body.appendChild(el);
  return el;
}

function updateFps(rawDelta) {
  fpsFrames++;
  fpsAccum += rawDelta;
  if (fpsAccum >= 0.5) {
    const fps = Math.round(fpsFrames / fpsAccum);
    const ms = ((fpsAccum / fpsFrames) * 1000).toFixed(1);
    const calls = renderer.info.render.calls;
    fpsEl.firstChild.textContent = `${fps} FPS`;
    fpsEl.lastChild.textContent = `${ms} ms · ${calls} draws`;
    fpsEl.firstChild.style.color = fps >= 50 ? "#7CFC83" : fps >= 30 ? "#ffd24a" : "#ff6b6b";
    fpsFrames = 0;
    fpsAccum = 0;
  }
}

// Reloj del juego (arriba en el centro): muestra la hora del ciclo día/noche.
function createClock() {
  const el = document.createElement("div");
  el.textContent = "🕐 --:--";
  el.style.cssText = [
    "position:fixed", "top:14px", "left:50%", "transform:translateX(-50%)",
    "padding:5px 14px", "background:rgba(10,20,35,0.72)", "color:#fff",
    "font-family:Consolas, monospace", "font-size:16px",
    "border:1px solid rgba(255,255,255,0.12)", "border-radius:10px",
    "pointer-events:none", "user-select:none", "z-index:6",
  ].join(";");
  document.body.appendChild(el);
  return el;
}

// Indicador de estado del coche (visible solo al conducir).
function createCarBar() {
  const wrap = document.createElement("div");
  wrap.style.cssText = [
    "position:fixed", "bottom:64px", "right:24px", "width:150px", "opacity:0",
    "transition:opacity 0.3s ease", "z-index:6", "pointer-events:none",
    "font-family:Segoe UI, system-ui, sans-serif",
  ].join(";");
  const label = document.createElement("div");
  label.textContent = "COCHE";
  label.style.cssText =
    "color:#cfe3ff;font-size:11px;margin-bottom:3px;text-align:right;text-shadow:0 1px 3px rgba(0,0,0,0.6);";
  const outer = document.createElement("div");
  outer.style.cssText =
    "height:10px;background:rgba(10,20,35,0.7);border:1px solid rgba(255,255,255,0.18);border-radius:6px;overflow:hidden;";
  const fill = document.createElement("div");
  fill.style.cssText =
    "height:100%;width:100%;background:#4caf50;transition:width 0.2s ease, background 0.2s ease;";
  outer.appendChild(fill);
  wrap.appendChild(label);
  wrap.appendChild(outer);
  document.body.appendChild(wrap);
  return { wrap, fill };
}

// Aviso "Pulsa E para conducir" (visible al acercarse al coche a pie).
function createEnterHint() {
  const el = document.createElement("div");
  el.textContent = "🚗 Pulsa E para conducir";
  el.style.cssText = [
    "position:fixed", "bottom:72px", "left:50%", "transform:translateX(-50%)",
    "padding:8px 16px", "background:rgba(20,120,40,0.85)", "color:#fff",
    "font-family:Segoe UI, system-ui, sans-serif", "font-size:15px", "font-weight:600",
    "border-radius:20px", "pointer-events:none", "user-select:none", "opacity:0",
    "transition:opacity 0.3s ease", "z-index:6",
  ].join(";");
  document.body.appendChild(el);
  return el;
}
