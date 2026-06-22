import * as THREE from "three";

// Misiones encadenadas sencillas: ve al marcador, lee el diálogo, avanza al
// siguiente y cobra al final. Repetible (vuelve a empezar tras completarla).

const REACH = 5;

const STEPS = [
  { x: -52, z: 0, text: "Manolo: ¡Eh, chaval! ¿Buscas curro? Lleva esto al puerto deportivo." },
  { x: 104, z: 104, text: "Manolo (radio): Bien. Ahora pásate por la rotonda a cobrar." },
  { x: 0, z: -24, text: "Manolo: ¡Buen trabajo! Toma 1000 €. Vuelve cuando quieras.", reward: 1000 },
];

export function createMissions(scene, { showDialog, onReward }) {
  const marker = createMarker();
  scene.add(marker.group);

  let i = 0;
  let cooldown = 0;
  place(0);

  function place(idx) {
    marker.group.position.set(STEPS[idx].x, 0, STEPS[idx].z);
    marker.group.visible = true;
  }

  function update(delta, pos) {
    if (cooldown > 0) {
      cooldown -= delta;
      if (cooldown <= 0) {
        i = 0;
        place(0);
      }
      return;
    }
    marker.spin(delta);
    const dx = pos.x - marker.group.position.x;
    const dz = pos.z - marker.group.position.z;
    if (dx * dx + dz * dz < REACH * REACH) {
      const step = STEPS[i];
      showDialog(step.text);
      if (step.reward) onReward(step.reward);
      i++;
      if (i >= STEPS.length) {
        marker.group.visible = false;
        cooldown = 12; // vuelve a ofrecerse en 12 s
      } else {
        place(i);
      }
    }
  }

  function getTarget() {
    return marker.group.visible ? marker.group.position : null;
  }

  return { update, getTarget };
}

function createMarker() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.28, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0x4aa3ff, emissive: 0x1f6fff, emissiveIntensity: 1.2 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.3;
  group.add(ring);

  const gem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0),
    new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x2f8fff, emissiveIntensity: 1.2 })
  );
  gem.position.y = 2.6;
  group.add(gem);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 20, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
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
