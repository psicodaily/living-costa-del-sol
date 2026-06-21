import * as THREE from "three";
import {
  createAsphaltTexture,
  createConcreteTexture,
  createCrosswalkTexture,
  tiled,
} from "./textures.js";

// Suelo + cuadrícula de calles.
// La ciudad es una rejilla: "manzanas" (con acera de hormigón) separadas por
// calles asfaltadas, con bordillos y pasos de cebra en los cruces.
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
  const asphaltBase = createAsphaltTexture();
  const concreteBase = createConcreteTexture();
  const crossTex = createCrosswalkTexture();

  // Suelo base (hierba/tierra clara) por debajo de todo, visible en las afueras.
  const groundSize = CITY.blocks * CELL + 240;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    new THREE.MeshStandardMaterial({ color: 0x93b863, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // Aceras: una losa de hormigón por manzana (a ras de suelo).
  const sidewalks = new THREE.Group();
  forEachBlock((cx, cz) => {
    const slab = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.blockSize, CITY.blockSize),
      new THREE.MeshStandardMaterial({
        map: tiled(concreteBase, CITY.blockSize / 6, CITY.blockSize / 6),
        roughness: 0.95,
      })
    );
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(cx, 0.02, cz);
    slab.receiveShadow = true;
    sidewalks.add(slab);
  });
  scene.add(sidewalks);

  // Calles asfaltadas (rejilla de barras horizontales y verticales).
  const roads = new THREE.Group();
  const totalLen = CITY.blocks * CELL + CITY.roadWidth;
  for (let i = 0; i <= CITY.blocks; i++) {
    const pos = -CITY_HALF + i * CELL - CITY.blockSize / 2 - CITY.roadWidth / 2;

    const vRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.roadWidth, totalLen),
      new THREE.MeshStandardMaterial({
        map: tiled(asphaltBase, CITY.roadWidth / 8, totalLen / 8),
        roughness: 0.95,
      })
    );
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(pos, 0.0, 0);
    vRoad.receiveShadow = true;
    roads.add(vRoad);

    const hRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(totalLen, CITY.roadWidth),
      new THREE.MeshStandardMaterial({
        map: tiled(asphaltBase, totalLen / 8, CITY.roadWidth / 8),
        roughness: 0.95,
      })
    );
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.0, pos);
    hRoad.receiveShadow = true;
    roads.add(hRoad);
  }
  scene.add(roads);

  // Bordillos: marco bajo alrededor de cada manzana (separa acera de calzada).
  const curbs = new THREE.Group();
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xbdb9b0, roughness: 0.9 });
  const B = CITY.blockSize;
  const curbH = 0.18;
  const curbT = 0.5;
  forEachBlock((cx, cz) => {
    const edges = [
      [cx, cz - B / 2, B + curbT, curbT],
      [cx, cz + B / 2, B + curbT, curbT],
      [cx - B / 2, cz, curbT, B + curbT],
      [cx + B / 2, cz, curbT, B + curbT],
    ];
    for (const [x, z, w, d] of edges) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(w, curbH, d), curbMat);
      curb.position.set(x, curbH / 2, z);
      curb.receiveShadow = true;
      curb.castShadow = true;
      curbs.add(curb);
    }
  });
  scene.add(curbs);

  // Pasos de cebra: en cada cruce, en los cuatro lados.
  const crosswalks = new THREE.Group();
  const crossTexH = crossTex.clone();
  crossTexH.center.set(0.5, 0.5);
  crossTexH.rotation = Math.PI / 2;
  crossTexH.needsUpdate = true;
  const matV = new THREE.MeshStandardMaterial({
    map: crossTex,
    transparent: true,
    roughness: 0.7,
  });
  const matH = new THREE.MeshStandardMaterial({
    map: crossTexH,
    transparent: true,
    roughness: 0.7,
  });

  const lines = [];
  for (let i = 0; i <= CITY.blocks; i++) {
    lines.push(-CITY_HALF + i * CELL - CITY.blockSize / 2 - CITY.roadWidth / 2);
  }
  const rw = CITY.roadWidth;
  const band = 3.2;
  const gap = rw / 2 + band / 2 + 0.3;
  for (const ix of lines) {
    for (const jz of lines) {
      addCross(crosswalks, matV, ix, jz - gap, rw - 1, band); // norte
      addCross(crosswalks, matV, ix, jz + gap, rw - 1, band); // sur
      addCross(crosswalks, matH, ix - gap, jz, band, rw - 1); // oeste
      addCross(crosswalks, matH, ix + gap, jz, band, rw - 1); // este
    }
  }
  scene.add(crosswalks);

  return { ground, roads, sidewalks, curbs, crosswalks };
}

function addCross(group, material, x, z, w, d) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, 0.03, z);
  plane.receiveShadow = true;
  group.add(plane);
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
