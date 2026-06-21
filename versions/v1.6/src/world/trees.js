import * as THREE from "three";
import { CITY, CITY_HALF, CELL } from "./ground.js";

// Árboles a los lados de las calles: palmeras (Marbella) y algún árbol redondo.
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createPalm() {
  const palm = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.45, 6, 7),
    new THREE.MeshStandardMaterial({ color: 0x9c7b4f, roughness: 1 })
  );
  trunk.position.y = 3;
  trunk.castShadow = true;
  palm.add(trunk);

  // Copa: varias hojas (conos aplastados) en abanico.
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.8 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.6, 4, 5), leafMat);
    leaf.position.y = 6;
    leaf.rotation.z = Math.PI / 2.6;
    leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.translateY(1.6);
    leaf.castShadow = true;
    palm.add(leaf);
  }
  return palm;
}

function createRoundTree() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 })
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  tree.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a9d4a, roughness: 0.9 })
  );
  crown.position.y = 4.2;
  crown.castShadow = true;
  tree.add(crown);
  return tree;
}

export function createTrees(scene) {
  const rand = makeRandom(7777);
  const trees = new THREE.Group();

  // Coloca árboles en los bordes de las manzanas (junto a las aceras).
  for (let i = 0; i <= CITY.blocks; i++) {
    for (let j = 0; j < CITY.blocks; j++) {
      const line = -CITY_HALF + i * CELL - CITY.roadWidth / 2 - 1;
      const along = -CITY_HALF + CITY.roadWidth / 2 + CITY.blockSize / 2 + j * CELL;

      if (rand() < 0.7) {
        const t = rand() < 0.7 ? createPalm() : createRoundTree();
        t.position.set(line, 0, along + (rand() - 0.5) * 10);
        t.rotation.y = rand() * Math.PI * 2;
        trees.add(t);
      }
      if (rand() < 0.7) {
        const t = rand() < 0.7 ? createPalm() : createRoundTree();
        t.position.set(along + (rand() - 0.5) * 10, 0, line);
        t.rotation.y = rand() * Math.PI * 2;
        trees.add(t);
      }
    }
  }

  scene.add(trees);
  return trees;
}
