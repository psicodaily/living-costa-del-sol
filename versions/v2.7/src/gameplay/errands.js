import * as THREE from "three";
import { addMoney } from "../state/gameState.js";
import { playPickup } from "../audio/sfx.js";

// Recados: un marcador luminoso aparece en la ciudad. Al llegar (a pie o en
// coche) cobras dinero, suena un logro y aparece el siguiente. Primer bucle
// jugable: ir -> cobrar -> repetir. Solo comprobación de distancia (sin choques).

const REWARD = 250;
const REACH = 4.5;

// Puntos sobre cruces de calles (todos en asfalto).
const SPOTS = [
  { x: 52, z: 0 },
  { x: -52, z: 52 },
  { x: 104, z: -52 },
  { x: 0, z: 104 },
  { x: -104, z: -104 },
  { x: 52, z: -104 },
  { x: -104, z: 52 },
];

export function createErrands(scene) {
  const marker = createMarker();
  scene.add(marker.group);

  let index = 0;
  place(0);

  function place(i) {
    const spot = SPOTS[i % SPOTS.length];
    marker.group.position.set(spot.x, 0, spot.z);
  }

  function update(delta, pos) {
    marker.spin(delta);
    const dx = pos.x - marker.group.position.x;
    const dz = pos.z - marker.group.position.z;
    if (dx * dx + dz * dz < REACH * REACH) {
      addMoney(REWARD);
      playPickup();
      index++;
      place(index);
    }
  }

  function getTarget() {
    return marker.group.position;
  }

  return { update, getTarget };
}

function createMarker() {
  const group = new THREE.Group();

  // Anillo en el suelo.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.28, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0xffcc33, emissive: 0xffaa00, emissiveIntensity: 1.1 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.3;
  group.add(ring);

  // Diamante flotante (gira y sube/baja).
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffb020, emissiveIntensity: 1.2 })
  );
  gem.position.y = 2.6;
  group.add(gem);

  // Haz de luz vertical para verlo de lejos.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 20, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = 10;
  group.add(beam);

  let t = 0;
  function spin(delta) {
    t += delta;
    gem.rotation.y += delta * 2;
    gem.position.y = 2.6 + Math.sin(t * 2) * 0.3;
  }

  return { group, spin };
}
