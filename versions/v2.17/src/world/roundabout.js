import * as THREE from "three";
import { createPalm } from "./trees.js";

// Rotonda central en el cruce (0,0): isleta ajardinada con bordillo y palmera.
// Sirve como hito de orientación memorable en el centro de la ciudad.
const RADIUS = 7;

export function createRoundabout(scene) {
  const group = new THREE.Group();

  // Isleta de césped.
  const island = new THREE.Mesh(
    new THREE.CircleGeometry(RADIUS, 40),
    new THREE.MeshStandardMaterial({ color: 0x6fae50, roughness: 1 })
  );
  island.rotation.x = -Math.PI / 2;
  island.position.y = 0.1;
  island.receiveShadow = true;
  group.add(island);

  // Bordillo (anillo de hormigón).
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(RADIUS, 0.4, 10, 48),
    new THREE.MeshStandardMaterial({ color: 0xbdb9b0, roughness: 0.9 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.22;
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);

  // Palmera central (más grande).
  const palm = createPalm();
  palm.position.set(0, 0.1, 0);
  palm.scale.set(1.5, 1.5, 1.5);
  group.add(palm);

  // Arbustos alrededor de la palmera.
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x4a9d4a, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), bushMat);
    bush.position.set(Math.cos(a) * 3.5, 0.7, Math.sin(a) * 3.5);
    bush.castShadow = true;
    group.add(bush);
  }

  scene.add(group);
  return group;
}
