import * as THREE from "three";
import { CITY, CELL, CITY_HALF } from "../world/index.js";

// Semáforos en los cruces interiores. Muestran el estado del eje Norte-Sur
// (calles verticales); el eje Este-Oeste va al revés.
export function createTrafficLights(scene) {
  const group = new THREE.Group();
  const heads = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.7, metalness: 0.3 });
  const bulb = (c) => new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: c, emissiveIntensity: 0 });

  for (let i = 1; i < CITY.blocks; i++) {
    for (let j = 1; j < CITY.blocks; j++) {
      const x = -CITY_HALF + i * CELL;
      const z = -CITY_HALF + j * CELL;
      const px = x - 5.5;
      const pz = z - 5.5;

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 5, 6), poleMat);
      pole.position.set(px, 2.5, pz);
      pole.castShadow = true;
      group.add(pole);

      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.4), poleMat);
      housing.position.set(px, 5.3, pz);
      group.add(housing);

      const rMat = bulb(0xff2200);
      const aMat = bulb(0xffaa00);
      const gMat = bulb(0x22ff55);
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), rMat);
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), aMat);
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), gMat);
      r.position.set(px, 5.7, pz + 0.22);
      a.position.set(px, 5.3, pz + 0.22);
      g.position.set(px, 4.9, pz + 0.22);
      group.add(r, a, g);
      heads.push({ r: rMat, a: aMat, g: gMat });
    }
  }

  scene.add(group);

  function setNS(state) {
    for (const h of heads) {
      h.r.emissiveIntensity = state === "red" ? 1.4 : 0;
      h.a.emissiveIntensity = state === "amber" ? 1.4 : 0;
      h.g.emissiveIntensity = state === "green" ? 1.4 : 0;
    }
  }

  return { group, setNS };
}
