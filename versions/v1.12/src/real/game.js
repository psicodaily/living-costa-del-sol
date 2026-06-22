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

// Punto de aparición: el vértice de calle más cercano al origen que esté
// DESPEJADO de edificios (el centro es muy denso; evita aparecer encajonado).
function findSpawn() {
  const pts = [];
  for (const r of data.roads) for (const p of r.path) pts.push(p);
  pts.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]));
  let checked = 0;
  for (const [x, z] of pts) {
    if (checked++ > 4000) break;
    if (obstacles.resolve({ x, z }, 1.6) === 0) return [x, z];
  }
  return nearestRoadPoint(data.roads, 0, 0);
}
const [spx, spz] = findSpawn();

// Jugador a pie.
const { group: pgroup, limbs } = createCharacter(0x1f6fd6);
pgroup.position.set(spx, 0, spz);
scene.add(pgroup);
let walkTime = 0, targetAngle = 0;

// Coche aparcado al lado (en la posición ya despejada del jugador).
const car = createCar([pgroup.position.x + 5, pgroup.position.z], city.bounds);
for (let i = 0; i < 12; i++) obstacles.resolve(car.group.position, car.radius);
scene.add(car.group);
sun.target = pgroup;
scene.add(sun.target);

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
  } else {
    animateWalk(limbs, 0, 0);
  }
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
window.__game = { player: pgroup, car, keys, getMode: () => mode };
console.log(`Marbella jugable lista en (${Math.round(spx)}, ${Math.round(spz)})`);
