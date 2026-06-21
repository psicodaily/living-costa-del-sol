import * as THREE from "three";
import { createWorld } from "./world/index.js";
import { createPlayer } from "./player/player.js";
import { createControls } from "./player/controls.js";
import { createFollowCamera } from "./player/followCamera.js";
import { createNPCs } from "./npc/manager.js";

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

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 8, 16);

// Mundo, jugador, controles, cámara y NPCs.
createWorld(scene);
const player = createPlayer(scene);
const keys = createControls();
const followCamera = createFollowCamera(camera, canvas);
const npcs = createNPCs(scene, 25);

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
  const delta = Math.min(clock.getDelta(), 0.05); // evita saltos si baja el FPS

  player.update(delta, keys, followCamera.getYaw());
  followCamera.update(delta, player.group.position);
  npcs.update(delta);

  renderer.render(scene, camera);
}

animate();

// Oculta la pantalla de carga una vez todo está listo.
const loading = document.getElementById("loading");
if (loading) {
  requestAnimationFrame(() => loading.classList.add("hidden"));
  setTimeout(() => loading.remove(), 800);
}
