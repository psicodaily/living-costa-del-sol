import * as THREE from "three";
import { createCharacter, animateWalk } from "../player/character.js";
import { CITY_HALF } from "../world/index.js";

const NPC_COLORS = [0xc0392b, 0x27ae60, 0x8e44ad, 0xe67e22, 0x16a085, 0x2c3e50, 0xd35400];
const SPEED = 4.5;
const BOUND = CITY_HALF + 20;

// Un NPC que deambula: anda en una dirección y cambia de rumbo cada cierto tiempo.
export function createNPC(rand) {
  const color = NPC_COLORS[Math.floor(rand() * NPC_COLORS.length)];
  const { group, limbs } = createCharacter(color);

  // Posición inicial aleatoria dentro del mapa.
  group.position.set((rand() - 0.5) * CITY_HALF * 2, 0, (rand() - 0.5) * CITY_HALF * 2);

  let heading = rand() * Math.PI * 2;
  let timeToTurn = 2 + rand() * 4;
  let walkTime = rand() * 10;
  let downTimer = 0; // > 0 mientras está atropellado en el suelo
  group.rotation.y = heading;

  const _axis = new THREE.Vector3();

  // Atropello: el peatón cae al suelo en la dirección del golpe y se levanta luego.
  function knockDown(dx, dz, speed) {
    if (downTimer > 0) return;
    downTimer = 3.5 + Math.random() * 2;
    const len = Math.hypot(dx, dz) || 1;
    _axis.set(dz / len, 0, -dx / len);
    group.setRotationFromAxisAngle(_axis, Math.PI / 2); // tumbado
    // Pequeño empujón en la dirección del coche.
    group.position.x += (dx / len) * Math.min(3, speed * 0.1);
    group.position.z += (dz / len) * Math.min(3, speed * 0.1);
  }

  function update(delta) {
    // Si está atropellado: se queda en el suelo hasta que se levanta.
    if (downTimer > 0) {
      downTimer -= delta;
      if (downTimer <= 0) {
        group.rotation.set(0, heading, 0); // se levanta
      }
      return;
    }

    timeToTurn -= delta;
    if (timeToTurn <= 0) {
      heading += (rand() - 0.5) * Math.PI; // gira un poco
      timeToTurn = 2 + rand() * 4;
    }

    const dx = Math.sin(heading);
    const dz = Math.cos(heading);
    group.position.x += dx * SPEED * delta;
    group.position.z += dz * SPEED * delta;

    // Si choca con el borde, da media vuelta.
    if (Math.abs(group.position.x) > BOUND || Math.abs(group.position.z) > BOUND) {
      heading += Math.PI;
      group.position.x = THREE.MathUtils.clamp(group.position.x, -BOUND, BOUND);
      group.position.z = THREE.MathUtils.clamp(group.position.z, -BOUND, BOUND);
    }

    // Giro suave hacia el rumbo y animación de caminar.
    let diff = heading - group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    group.rotation.y += diff * Math.min(1, 8 * delta);

    walkTime += delta * 9;
    animateWalk(limbs, walkTime, 1);
  }

  return { group, update, knockDown, isDown: () => downTimer > 0 };
}
