import * as THREE from "three";
import { createCharacter, animateWalk } from "../player/character.js";
import { CITY, CELL, CITY_HALF } from "../world/index.js";

// Policías: patrullan el perímetro de una manzana y, si tienes nivel de búsqueda
// (estrellas), te persiguen. Si estás cerca sin delinquir, se giran a vigilarte.

const PATROL_SPEED = 3.2;
const CHASE_SPEED = 8.8; // algo menos que el jugador a pie (9): puedes escapar
const DETECT = 9;
const PERIM = CITY.blockSize / 2 - 2;
const BLOCK_MIN = -CITY_HALF + CITY.roadWidth / 2 + CITY.blockSize / 2;

function corner(bx, bz, i) {
  const c = [
    [-PERIM, -PERIM],
    [PERIM, -PERIM],
    [PERIM, PERIM],
    [-PERIM, PERIM],
  ][i];
  return { x: bx + c[0], z: bz + c[1] };
}

function createOfficer(rand) {
  const { group, limbs } = createCharacter(0x20366f); // uniforme azul
  // Gorra para identificarlo.
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x101a33, roughness: 0.7 })
  );
  cap.position.y = 2.78;
  cap.castShadow = true;
  group.add(cap);

  let bx = BLOCK_MIN + Math.floor(rand() * CITY.blocks) * CELL;
  let bz = BLOCK_MIN + Math.floor(rand() * CITY.blocks) * CELL;
  let ci = Math.floor(rand() * 4);
  const s = corner(bx, bz, ci);
  group.position.set(s.x, 0, s.z);
  ci = (ci + 1) % 4;
  let heading = 0;
  let walkTime = rand() * 10;

  function update(delta, playerPos, stars) {
    let mvx = 0;
    let mvz = 0;
    let speed = PATROL_SPEED;
    let moving = true;

    if (stars > 0) {
      // Persecución: va a por el jugador.
      const dx = playerPos.x - group.position.x;
      const dz = playerPos.z - group.position.z;
      const d = Math.hypot(dx, dz) || 1;
      mvx = dx / d;
      mvz = dz / d;
      speed = CHASE_SPEED;
    } else {
      const dx = playerPos.x - group.position.x;
      const dz = playerPos.z - group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < DETECT) {
        moving = false; // se para y te vigila
        heading = Math.atan2(dx, dz);
      } else {
        const t = corner(bx, bz, ci);
        let tdx = t.x - group.position.x;
        let tdz = t.z - group.position.z;
        let td = Math.hypot(tdx, tdz);
        if (td < 1.0) {
          ci = (ci + 1) % 4;
          const t2 = corner(bx, bz, ci);
          tdx = t2.x - group.position.x;
          tdz = t2.z - group.position.z;
          td = Math.hypot(tdx, tdz) || 1;
        }
        mvx = tdx / td;
        mvz = tdz / td;
      }
    }

    if (moving && (mvx !== 0 || mvz !== 0)) {
      group.position.x += mvx * speed * delta;
      group.position.z += mvz * speed * delta;
      heading = Math.atan2(mvx, mvz);
      walkTime += delta * (speed > PATROL_SPEED ? 16 : 9);
      animateWalk(limbs, walkTime, 1);
    } else {
      animateWalk(limbs, 0, 0);
    }

    let diff = heading - group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    group.rotation.y += diff * Math.min(1, 10 * delta);
  }

  return { group, update };
}

function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createPolice(scene, count = 4) {
  const rand = makeRandom(909090);
  const officers = [];
  for (let i = 0; i < count; i++) {
    const o = createOfficer(rand);
    scene.add(o.group);
    officers.push(o);
  }
  function update(delta, playerPos, stars) {
    for (const o of officers) o.update(delta, playerPos, stars);
  }
  return { officers, update };
}
