import * as THREE from "three";
import { createCharacter, animateWalk } from "../player/character.js";
import { CITY, CELL, CITY_HALF } from "../world/index.js";

const NPC_COLORS = [0xc0392b, 0x27ae60, 0x8e44ad, 0xe67e22, 0x16a085, 0x2c3e50, 0xd35400];
const WALK_SPEED = 3.4;
const FLEE_SPEED = 7.5;
const ALERT_RADIUS = 7; // te mira
const SCARE_RADIUS = 3.2; // huye (si hay amenaza)
const PERIM = CITY.blockSize / 2 - 2; // distancia del centro de la manzana a la acera
const BLOCK_MIN = -CITY_HALF + CITY.roadWidth / 2 + CITY.blockSize / 2;
const BLOCK_MAX = BLOCK_MIN + (CITY.blocks - 1) * CELL;

// Las 4 esquinas (acera) de una manzana, en sentido horario.
function corner(bx, bz, i) {
  const c = [
    [-PERIM, -PERIM],
    [PERIM, -PERIM],
    [PERIM, PERIM],
    [-PERIM, PERIM],
  ][i];
  return { x: bx + c[0], z: bz + c[1] };
}

// Un peatón que camina por las aceras siguiendo el perímetro de las manzanas,
// cruza por las esquinas y reacciona al jugador.
export function createNPC(rand) {
  const color = NPC_COLORS[Math.floor(rand() * NPC_COLORS.length)];
  const { group, limbs } = createCharacter(color);

  // Manzana inicial aleatoria y esquina de partida.
  let bx = BLOCK_MIN + Math.floor(rand() * CITY.blocks) * CELL;
  let bz = BLOCK_MIN + Math.floor(rand() * CITY.blocks) * CELL;
  let ci = Math.floor(rand() * 4);
  const start = corner(bx, bz, ci);
  group.position.set(start.x, 0, start.z);
  ci = (ci + 1) % 4;

  let heading = rand() * Math.PI * 2;
  let walkTime = rand() * 10;
  let downTimer = 0;
  group.rotation.y = heading;

  const _axis = new THREE.Vector3();

  function knockDown(dx, dz, speed) {
    if (downTimer > 0) return;
    downTimer = 3.5 + Math.random() * 2;
    const len = Math.hypot(dx, dz) || 1;
    _axis.set(dz / len, 0, -dx / len);
    group.setRotationFromAxisAngle(_axis, Math.PI / 2);
    group.position.x += (dx / len) * Math.min(3, speed * 0.1);
    group.position.z += (dz / len) * Math.min(3, speed * 0.1);
  }

  function nearestCorner() {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < 4; i++) {
      const c = corner(bx, bz, i);
      const d = (c.x - group.position.x) ** 2 + (c.z - group.position.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function crossOrTurn() {
    // A veces cruza a una manzana vecina; si no, sigue rodeando la manzana.
    if (rand() < 0.28) {
      const dirs = [
        [CELL, 0],
        [-CELL, 0],
        [0, CELL],
        [0, -CELL],
      ];
      const d = dirs[Math.floor(rand() * 4)];
      const nx = bx + d[0];
      const nz = bz + d[1];
      if (nx >= BLOCK_MIN - 1 && nx <= BLOCK_MAX + 1 && nz >= BLOCK_MIN - 1 && nz <= BLOCK_MAX + 1) {
        bx = nx;
        bz = nz;
        ci = nearestCorner();
        return;
      }
    }
    ci = (ci + 1) % 4;
  }

  function update(delta, playerPos, threat) {
    if (downTimer > 0) {
      downTimer -= delta;
      if (downTimer <= 0) group.rotation.set(0, heading, 0);
      return;
    }

    const pdx = playerPos.x - group.position.x;
    const pdz = playerPos.z - group.position.z;
    const pdist = Math.hypot(pdx, pdz);

    let mvx = 0;
    let mvz = 0;
    let speed = WALK_SPEED;
    let moving = true;

    if (threat && pdist < SCARE_RADIUS && pdist > 0.001) {
      // Asustado: huye del jugador.
      mvx = -pdx / pdist;
      mvz = -pdz / pdist;
      speed = FLEE_SPEED;
    } else if (pdist < ALERT_RADIUS) {
      // Alerta: se para y se gira a mirar al jugador.
      moving = false;
      heading = Math.atan2(pdx, pdz);
    } else {
      // Normal: camina hacia la esquina objetivo.
      const t = corner(bx, bz, ci);
      let tdx = t.x - group.position.x;
      let tdz = t.z - group.position.z;
      let td = Math.hypot(tdx, tdz);
      if (td < 1.0) {
        crossOrTurn();
        const t2 = corner(bx, bz, ci);
        tdx = t2.x - group.position.x;
        tdz = t2.z - group.position.z;
        td = Math.hypot(tdx, tdz) || 1;
      }
      mvx = tdx / td;
      mvz = tdz / td;
    }

    if (moving && (mvx !== 0 || mvz !== 0)) {
      group.position.x += mvx * speed * delta;
      group.position.z += mvz * speed * delta;
      heading = Math.atan2(mvx, mvz);
      walkTime += delta * (speed > WALK_SPEED ? 16 : 9);
      animateWalk(limbs, walkTime, 1);
    } else {
      animateWalk(limbs, 0, 0);
    }

    let diff = heading - group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    group.rotation.y += diff * Math.min(1, 10 * delta);
  }

  return { group, update, knockDown, isDown: () => downTimer > 0 };
}
