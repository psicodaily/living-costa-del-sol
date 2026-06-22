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
// La niebla se ajusta al tamaño real de la ciudad más abajo (cuando se conoce `dist`).

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

// Niebla suave proporcional al tamaño de la ciudad (no debe tapar los edificios).
scene.fog = new THREE.Fog(0xbfe0ff, dist, dist * 4);
// Plano lejano de la cámara con margen para que nada se recorte.
camera.far = dist * 6;
camera.updateProjectionMatrix();

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
