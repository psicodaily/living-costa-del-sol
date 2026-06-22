import * as THREE from "three";
import { createRealCity } from "./real/city.js";
import { createMarina } from "./real/marina.js";
import { loadAssets } from "./real/assets.js";
import { SEA_Y } from "./real/ground.js";
import { nearestDryRoadPoint } from "./real/spawn.js";
import { createCityLife } from "./real/cityLife.js";
import { createPlayer } from "./player/player.js";
import { createControls } from "./player/controls.js";
import { createFollowCamera } from "./player/followCamera.js";
import { createVehicle } from "./vehicle/vehicle.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
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

  // Iluminación realista: cielo HDRI (da reflejos en agua/cristal y luz ambiente
  // natural). Solo como ENTORNO (reflejos/ambiente); el cielo visible y el
  // día/noche siguen siendo los nuestros.
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load("/hdr/sky.hdr", (hdr) => {
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.55;
    hdr.dispose();
    pmrem.dispose();
  });

  // Cielo + día/noche a la escala del mapa real (mucho más grande).
  const sky = createSky(scene, {
    radius: 6000,
    fogNear: 400,
    fogFar: 2800, // con 60 FPS de margen, se ve mucha más ciudad
    shadowHalf: 220,
    shadowFar: 1400,
    shadowMapSize: 1024,
  });

  // Mapa real de Marbella + modelos 3D (CC0).
  const [data, assets] = await Promise.all([
    fetch("/marbella.json").then((r) => r.json()),
    loadAssets(),
  ]);
  const city = createRealCity(data, assets);
  scene.add(city.group);
  const heightAt = city.heightAt; // relieve real (cuestas)
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

  // Punto de aparición: PUERTO BANÚS (zona conocida) para poder revisar el juego.
  const marinaArea = puertoBanusMarina(data);
  const [pbx, pbz] = marinaArea ? centroidOf(marinaArea.polygon) : [-3533.8, 1858.2];
  const [spx, spz] = findSpawn(data, obstacles, pbx, pbz, heightAt);

  // Yates en la marina de Puerto Banús (flotan en el mar global, a nivel del mar).
  const marina = marinaArea ? createMarina(marinaArea, SEA_Y, heightAt) : null;
  if (marina) scene.add(marina.group);

  // Jugador.
  const player = createPlayer(scene);
  player.group.position.set(spx, heightAt(spx, spz), spz);

  // Varios coches aparcados PEGADOS al jugador (distintos colores) para cogerlos.
  const CAR_SLOTS = [
    [5, 0, 0xd11f2a], [-5, 1.5, 0x1f5fd1], [2.5, 6, 0x222428],
    [-3, -5.5, 0xe0a81f], [7, -3.5, 0xdedede],
  ];
  const cars = [];
  for (const [ox, oz, color] of CAR_SLOTS) {
    // No aparcar coches sobre el agua.
    if (heightAt(spx + ox, spz + oz) < SEA_Y + 0.3) continue;
    const c = createVehicle(scene, {
      x: spx + ox, z: spz + oz, color, kind: "car", maxSpeed: 44, accel: 26, turn: 1.8,
    });
    for (let k = 0; k < 14; k++) obstacles.resolve(c.group.position, c.getRadius());
    c.group.position.y = heightAt(c.group.position.x, c.group.position.z);
    cars.push(c);
  }

  const { keys, onPress } = createControls();
  const followCamera = createFollowCamera(camera, canvas);
  let vehicle = null;
  let mode = "foot";

  // Vida urbana: tráfico + peatones por las calles reales (más densidad en v2.12).
  const life = createCityLife(scene, data.roads, { cars: 12, peds: 20 }, heightAt);

  // HUD y sistemas de mi estilo.
  const hud = createHud();
  const minimap = createMinimapReal(data, { onBigToggle: () => updateCameraActive() });
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
    // Coger el coche aparcado más cercano (a menos de ~9 m).
    let best = null, bestD = 81;
    for (const c of cars) {
      const dx = player.group.position.x - c.group.position.x;
      const dz = player.group.position.z - c.group.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) {
      vehicle = best;
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

  // Cargar partida (dinero, salud). La POSICIÓN se ignora a propósito: por ahora
  // el jugador siempre empieza en Puerto Banús para poder revisar la zona.
  const saved = loadGame();
  if (saved) setState({ money: saved.money ?? 2500, health: saved.health ?? 100 });

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
      m.visible = dx * dx + dz * dz < 2900 * 2900;
    }

    if (mode === "foot") {
      const ox = player.group.position.x, oz = player.group.position.z;
      player.update(delta, keys, followCamera.getYaw());
      obstacles.resolve(player.group.position, 0.7);
      // Barrera de agua: no se puede andar sobre el mar.
      if (heightAt(player.group.position.x, player.group.position.z) < SEA_Y - 0.2) {
        player.group.position.x = ox; player.group.position.z = oz;
      }
      player.group.position.y = heightAt(player.group.position.x, player.group.position.z); // sigue el terreno
      followCamera.update(delta, player.group.position);
      speedoEl.style.opacity = "0";
    } else {
      const ox = vehicle.group.position.x, oz = vehicle.group.position.z;
      vehicle.update(delta, keys);
      const push = obstacles.resolve(vehicle.group.position, vehicle.getRadius());
      if (push > 0.05 && Math.abs(vehicle.getSpeed()) > 6) vehicle.applyImpact(Math.min(28, Math.abs(vehicle.getSpeed()) * 0.8));
      // Barrera de agua: el coche no entra en el mar.
      if (heightAt(vehicle.group.position.x, vehicle.group.position.z) < SEA_Y - 0.2) {
        vehicle.group.position.x = ox; vehicle.group.position.z = oz;
        if (Math.abs(vehicle.getSpeed()) > 4) vehicle.applyImpact(6);
      }
      vehicle.group.position.y = heightAt(vehicle.group.position.x, vehicle.group.position.z); // sigue el terreno
      followCamera.update(delta, vehicle.group.position, vehicle.getHeading() + Math.PI);
      speedoEl.style.opacity = "1";
      speedoEl.textContent = `${Math.round(Math.abs(vehicle.getSpeed()) * 3.6)} km/h`;
    }

    const activePos = mode === "foot" ? player.group.position : vehicle.group.position;

    // Vida urbana (tráfico + peatones) sobre las calles reales.
    life.update(delta, activePos);
    if (marina) marina.update(clock.getElapsedTime());

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
      for (const c of cars) {
        if (mode === "drive" && c === vehicle) continue;
        dots.push({ x: c.group.position.x, z: c.group.position.z, color: "#ffd24a", size: 3 });
      }
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

// Centroide de un polígono [[x,z],...].
function centroidOf(poly) {
  let x = 0, z = 0;
  for (const [px, pz] of poly) { x += px; z += pz; }
  return [x / poly.length, z / poly.length];
}

// Devuelve el ÁREA de la marina de Puerto Banús (para spawn + yates).
function puertoBanusMarina(data) {
  const marinas = (data.areas || []).filter((a) => a.kind === "marina" && a.polygon && a.polygon.length >= 3);
  let area = marinas.find((a) => a.barrio === "Puerto Banús") || null;
  if (!area && marinas.length) {
    const RX = -3533.8, RZ = 1858.2;
    let bd = Infinity;
    for (const a of marinas) {
      const [cx, cz] = centroidOf(a.polygon);
      const d = (cx - RX) ** 2 + (cz - RZ) ** 2;
      if (d < bd) { bd = d; area = a; }
    }
  }
  return area;
}

// Aparece en el vértice de calle más cercano al núcleo urbano y lo separa de los
// edificios (para nacer EN la calle, con edificios al lado, no en un descampado).
function findSpawn(data, obstacles, tx, tz, heightAt) {
  const [nx, nz] = nearestDryRoadPoint(data.roads, tx, tz, heightAt);
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
