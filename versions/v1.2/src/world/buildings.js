import * as THREE from "three";
import { CITY, forEachBlock } from "./ground.js";
import { createWindowTexture, tiled } from "./textures.js";

// Generador pseudo-aleatorio con semilla (resultados estables en cada arranque).
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Paleta mediterránea: cremas y blancos con algún color de acento.
const WALL_COLORS = [0xf4ece0, 0xe9dcc6, 0xf0e6d2, 0xe7d8c0, 0xd9c7aa, 0xcdb8d4, 0xb8cdd4];
const ROOF_COLOR = 0xb05a3a; // teja

export function createBuildings(scene) {
  const rand = makeRandom(20260621);
  const buildings = new THREE.Group();
  const windowBase = createWindowTexture();

  // Registro de cajas (datos), para que colisiones / tráfico / IA puedan leer
  // dónde está cada edificio sin reconstruir el cálculo aleatorio.
  const boxes = [];

  forEachBlock((cx, cz) => {
    const half = CITY.blockSize / 2 - 2;
    const spots = [
      [-half / 2, -half / 2],
      [half / 2, -half / 2],
      [-half / 2, half / 2],
      [half / 2, half / 2],
    ];

    for (const [ox, oz] of spots) {
      if (rand() < 0.18) continue; // a veces se deja un hueco (plaza)

      const w = 10 + rand() * 8;
      const d = 10 + rand() * 8;
      const h = 8 + rand() * 34; // alturas variadas
      const color = WALL_COLORS[Math.floor(rand() * WALL_COLORS.length)];
      const x = cx + ox;
      const z = cz + oz;

      // Ventanas: la misma textura base, repetida según el tamaño del edificio.
      const winTex = tiled(windowBase, Math.max(2, Math.round(w / 4)), Math.max(2, Math.round(h / 4)));

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, map: winTex, roughness: 0.82 })
      );
      building.position.set(x, h / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      buildings.add(building);

      // Tejadito de color teja.
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6),
        new THREE.MeshStandardMaterial({ color: ROOF_COLOR, roughness: 0.9 })
      );
      roof.position.set(x, h + 0.4, z);
      roof.castShadow = true;
      buildings.add(roof);

      boxes.push({ x, z, width: w, depth: d, height: h });
    }
  });

  scene.add(buildings);
  return { group: buildings, boxes };
}
