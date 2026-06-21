import * as THREE from "three";
import { CITY, forEachBlock } from "./ground.js";

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

  forEachBlock((cx, cz) => {
    // Cada manzana tiene de 1 a 4 edificios distribuidos en una sub-rejilla.
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

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
      );
      building.position.set(cx + ox, h / 2, cz + oz);
      building.castShadow = true;
      building.receiveShadow = true;
      buildings.add(building);

      // Tejadito plano de color teja para dar carácter mediterráneo.
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6),
        new THREE.MeshStandardMaterial({ color: ROOF_COLOR, roughness: 0.9 })
      );
      roof.position.set(cx + ox, h + 0.4, cz + oz);
      roof.castShadow = true;
      buildings.add(roof);
    }
  });

  scene.add(buildings);
  return buildings;
}
