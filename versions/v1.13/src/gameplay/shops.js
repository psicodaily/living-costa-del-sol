import * as THREE from "three";

// Tiendas/kioscos repartidos por la ciudad. Marca un punto donde, al pulsar E
// cerca, se abre el panel de compra. Devuelve posiciones para el mini-mapa.
const SPOTS = [
  { x: 52, z: -52 },
  { x: -104, z: 0 },
  { x: 104, z: 52 },
];

export function createShops(scene) {
  const group = new THREE.Group();
  const shops = [];

  for (const s of SPOTS) {
    const kiosk = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2.6, 3),
      new THREE.MeshStandardMaterial({ color: 0x2f7d52, roughness: 0.8 })
    );
    body.position.y = 1.3;
    body.castShadow = true;
    kiosk.add(body);
    // Toldo.
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.3, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xd84a4a, roughness: 0.7 })
    );
    awning.position.set(0, 2.6, 1.9);
    kiosk.add(awning);
    // Letrero luminoso ($) para verlo.
    const sign = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x6fffa0, emissive: 0x33ff77, emissiveIntensity: 1 })
    );
    sign.position.set(0, 3.4, 0);
    kiosk.add(sign);

    kiosk.position.set(s.x, 0, s.z);
    group.add(kiosk);
    shops.push({ x: s.x, z: s.z });
  }

  scene.add(group);

  function nearest(pos, maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const s of shops) {
      const d = (pos.x - s.x) ** 2 + (pos.z - s.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  return { shops, nearest };
}
