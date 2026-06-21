import * as THREE from "three";
import { createWorld } from "./world/index.js";
import { createPlayer } from "./player/player.js";
import { createControls } from "./player/controls.js";
import { createFollowCamera } from "./player/followCamera.js";
import { createNPCs } from "./npc/manager.js";
import { createCar } from "./vehicle/car.js";
import { createHud } from "./ui/hud.js";
import { createMinimap } from "./ui/minimap.js";
import { createErrands } from "./gameplay/errands.js";
import { createPauseMenu } from "./ui/pauseMenu.js";
import { setVolume } from "./audio/sfx.js";
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
const { keys, onPress } = createControls();
const followCamera = createFollowCamera(camera, canvas);
const npcs = createNPCs(scene, 25);

// Coche conducible y máquina de estados a-pie / conduciendo (v1.3).
const car = createCar(scene, 0, -16);
let mode = "foot"; // "foot" | "drive"

const speedo = createSpeedo();
const enterHint = createEnterHint();
const fpsEl = createFpsCounter();
let fpsFrames = 0;
let fpsAccum = 0;

// HUD de salud/dinero y mini-mapa (v1.4).
const hud = createHud();
const minimap = createMinimap();

// Recados, menú de pausa y reloj de oleaje (v1.5).
const errands = createErrands(scene);
let elapsed = 0;

const pause = createPauseMenu({
  onSensitivity: (mult) => followCamera.setSensitivity(mult),
  onVolume: (v) => setVolume(v),
  onRestart: () => location.reload(),
});
onPress("KeyP", () => pause.toggle());
onPress("Escape", () => pause.toggle());

function isNearCar() {
  return player.group.position.distanceTo(car.group.position) < 4.5;
}

onPress("KeyE", () => {
  if (mode === "foot" && isNearCar()) {
    mode = "drive";
    player.group.visible = false;
  } else if (mode === "drive") {
    mode = "foot";
    const h = car.getHeading();
    // Dejar al jugador junto a la puerta (lado del coche).
    player.group.position.set(
      car.group.position.x + Math.cos(h) * 2.0,
      0,
      car.group.position.z - Math.sin(h) * 2.0
    );
    player.group.visible = true;
  }
});

// Ajuste al cambiar el tamaño de la ventana.
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bucle principal del juego.
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 0.05); // evita saltos si baja el FPS

  // En pausa: congela el mundo pero sigue dibujando.
  if (pause.isPaused()) {
    renderer.render(scene, camera);
    return;
  }

  elapsed += rawDelta;
  world.coast.update(elapsed); // oleaje del mar

  if (mode === "foot") {
    player.update(delta, keys, followCamera.getYaw());
    followCamera.update(delta, player.group.position);
    enterHint.style.opacity = isNearCar() ? "1" : "0";
    speedo.style.opacity = "0";
  } else {
    car.update(delta, keys);
    followCamera.update(delta, car.group.position, car.getHeading() + Math.PI);
    enterHint.style.opacity = "0";
    speedo.style.opacity = "1";
    speedo.textContent = `${Math.round(Math.abs(car.getSpeed()) * 3.6)} km/h`;
  }
  // Recados: usa la posición activa (jugador a pie o coche).
  const activePos = mode === "foot" ? player.group.position : car.group.position;
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
  if (mode === "foot") {
    dots.push({ x: car.group.position.x, z: car.group.position.z, color: "#ff4444", size: 3 });
    minimap.update(player.group.position.x, player.group.position.z, player.group.rotation.y, dots);
  } else {
    minimap.update(car.group.position.x, car.group.position.z, car.getHeading(), dots);
  }

  renderer.render(scene, camera);
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
