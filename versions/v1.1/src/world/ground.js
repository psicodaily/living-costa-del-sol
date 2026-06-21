import * as THREE from "three";

// Suelo + cuadrícula de calles.
// La ciudad es una rejilla: "manzanas" separadas por calles grises.
export const CITY = {
  blocks: 6, // nº de manzanas por lado
  blockSize: 40, // tamaño de cada manzana
  roadWidth: 12, // ancho de las calles
};

// Distancia entre el centro de una manzana y la siguiente.
export const CELL = CITY.blockSize + CITY.roadWidth;
// Mitad del tamaño total de la ciudad (para limitar el movimiento).
export const CITY_HALF = (CITY.blocks * CELL) / 2;

export function createGround(scene) {
  // Suelo base (hierba/tierra clara mediterránea) bajo todo.
  const groundSize = CITY.blocks * CELL + 200;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    new THREE.MeshStandardMaterial({ color: 0x9bbf6a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  // Asfalto de las calles: una rejilla de barras horizontales y verticales.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.95 });
  const roads = new THREE.Group();
  const totalLen = CITY.blocks * CELL + CITY.roadWidth;

  for (let i = 0; i <= CITY.blocks; i++) {
    const offset = -CITY_HALF + i * CELL - CITY.roadWidth / 2 + CITY.roadWidth / 2;
    const pos = -CITY_HALF + i * CELL - CITY.blockSize / 2 - CITY.roadWidth / 2;

    // Calle vertical (a lo largo del eje Z).
    const vRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.roadWidth, totalLen),
      roadMat
    );
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(pos, 0.0, 0);
    vRoad.receiveShadow = true;
    roads.add(vRoad);

    // Calle horizontal (a lo largo del eje X).
    const hRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(totalLen, CITY.roadWidth),
      roadMat
    );
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.0, pos);
    hRoad.receiveShadow = true;
    roads.add(hRoad);
  }
  scene.add(roads);

  return { ground, roads };
}

// Recorre los centros de cada manzana (útil para colocar edificios).
export function forEachBlock(callback) {
  for (let row = 0; row < CITY.blocks; row++) {
    for (let col = 0; col < CITY.blocks; col++) {
      const x = -CITY_HALF + CITY.roadWidth / 2 + CITY.blockSize / 2 + col * CELL;
      const z = -CITY_HALF + CITY.roadWidth / 2 + CITY.blockSize / 2 + row * CELL;
      callback(x, z, row, col);
    }
  }
}
