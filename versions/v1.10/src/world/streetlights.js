import * as THREE from "three";
import { CITY, CELL, CITY_HALF } from "./ground.js";

// Farolas en los cruces. Sus lámparas se "encienden" de noche (emissive) y, con
// el bloom, brillan. No proyectan luz real (para no penalizar el rendimiento).
export function createStreetlights(scene) {
  const group = new THREE.Group();
  const lampMaterials = [];
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.7, metalness: 0.3 });

  for (let i = 0; i <= CITY.blocks; i++) {
    for (let j = 0; j <= CITY.blocks; j++) {
      const x = -CITY_HALF + i * CELL;
      const z = -CITY_HALF + j * CELL;
      const fx = x + 5;
      const fz = z + 5;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 6, 8), postMat);
      post.position.set(fx, 3, fz);
      post.castShadow = true;
      group.add(post);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 1.4), postMat);
      arm.position.set(fx, 5.9, fz - 0.7);
      group.add(arm);

      const lampMat = new THREE.MeshStandardMaterial({
        color: 0x4a3818,
        emissive: 0xffcb6b,
        emissiveIntensity: 0,
      });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), lampMat);
      lamp.position.set(fx, 5.8, fz - 1.4);
      group.add(lamp);
      lampMaterials.push(lampMat);
    }
  }

  scene.add(group);
  return { group, lampMaterials };
}
