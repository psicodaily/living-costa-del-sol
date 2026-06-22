import * as THREE from "three";
import { createVehicle } from "../vehicle/vehicle.js";
import { createTrafficLights } from "./lights.js";
import { CITY, CELL, CITY_HALF } from "../world/index.js";

// Tráfico: coches de la IA que circulan por la rejilla de calles, mantienen su
// carril (derecha), giran en los cruces, frenan detrás de otros coches, ante el
// jugador y en los semáforos en rojo.

const N = CITY.blocks; // índices de cruce válidos: 0..N
const LANE = 2.6; // separación del centro de la calle (dos sentidos)
const BASE_SPEED = 14;
const COLORS = [0x9aa3ad, 0x33415c, 0x7a2d2d, 0x2d5a3a, 0xb08a2a, 0xdedede, 0x444a52];

// Fase de semáforos (segundos).
const NS_GREEN = 8;
const AMBER = 2.2;
const EW_GREEN = 8;
const CYCLE = NS_GREEN + AMBER + EW_GREEN + AMBER;

const rc = (i) => -CITY_HALF + i * CELL;
const valid = (i) => i >= 0 && i <= N;
const laneOffset = (dir) => ({ x: -dir.dj * LANE, z: dir.di * LANE });

export function createTraffic(scene, count = 8) {
  const lights = createTrafficLights(scene);

  let seed = 13579;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const cars = [];
  for (let k = 0; k < count; k++) {
    const v = createVehicle(scene, {
      x: 0,
      z: 0,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      kind: "car",
    });
    const ix = Math.floor(rand() * (N + 1));
    const iz = Math.floor(rand() * (N + 1));
    cars.push({ v, ix, iz, dir: pickInitialDir(ix, iz, rand), progress: rand() * 0.6, speed: BASE_SPEED, bumpT: 0 });
  }

  let phaseT = 0;
  const nsState = () => {
    const t = phaseT % CYCLE;
    if (t < NS_GREEN) return "green";
    if (t < NS_GREEN + AMBER) return "amber";
    return "red";
  };
  const ewState = () => {
    const t = phaseT % CYCLE;
    if (t < NS_GREEN + AMBER) return "red";
    if (t < NS_GREEN + AMBER + EW_GREEN) return "green";
    return "amber";
  };

  const _desired = new THREE.Vector3();

  function update(delta, playerPos) {
    phaseT += delta;
    lights.setNS(nsState());

    for (const c of cars) {
      const fromX = rc(c.ix);
      const fromZ = rc(c.iz);
      const toX = rc(c.ix + c.dir.di);
      const toZ = rc(c.iz + c.dir.dj);
      const off = laneOffset(c.dir);
      const px = fromX + (toX - fromX) * c.progress + off.x;
      const pz = fromZ + (toZ - fromZ) * c.progress + off.z;
      const wdx = Math.sign(c.dir.di);
      const wdz = Math.sign(c.dir.dj);

      let blocked = false;
      if (c.bumpT > 0) {
        c.bumpT -= delta;
        blocked = true;
      }

      // Semáforo al acercarse al cruce destino.
      if (!blocked && c.progress > 0.8) {
        const st = c.dir.di !== 0 ? ewState() : nsState();
        if (st !== "green") blocked = true;
      }
      // Coche delante (mismo sentido).
      if (!blocked) {
        for (const o of cars) {
          if (o === c) continue;
          const ox = o.v.group.position.x - px;
          const oz = o.v.group.position.z - pz;
          const ahead = ox * wdx + oz * wdz;
          const lateral = Math.abs(ox * -wdz + oz * wdx);
          if (ahead > 0 && ahead < 7 && lateral < 2.5) {
            blocked = true;
            break;
          }
        }
      }
      // Jugador delante.
      if (!blocked && playerPos) {
        const ox = playerPos.x - px;
        const oz = playerPos.z - pz;
        const ahead = ox * wdx + oz * wdz;
        const lateral = Math.abs(ox * -wdz + oz * wdx);
        if (ahead > 0 && ahead < 7 && lateral < 3) blocked = true;
      }

      const target = blocked ? 0 : BASE_SPEED;
      c.speed += (target - c.speed) * Math.min(1, 4 * delta);

      c.progress += (c.speed * delta) / CELL;
      if (c.progress >= 1) {
        c.ix += c.dir.di;
        c.iz += c.dir.dj;
        c.progress -= 1;
        c.dir = chooseDir(c.ix, c.iz, c.dir, rand);
      }

      _desired.set(px, 0, pz);
      c.v.group.position.lerp(_desired, Math.min(1, 12 * delta));
      const heading = Math.atan2(wdx, wdz);
      let diff = heading - c.v.group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      c.v.group.rotation.y += diff * Math.min(1, 8 * delta);
    }
  }

  const carHandles = cars.map((c) => ({
    group: c.v.group,
    getRadius: () => c.v.getRadius(),
    bump: (dx, dz) => {
      c.bumpT = 1.2;
      c.v.group.position.x += dx * 0.4;
      c.v.group.position.z += dz * 0.4;
    },
  }));

  return { update, cars: carHandles };
}

function pickInitialDir(ix, iz, rand) {
  const all = [
    { di: 1, dj: 0 },
    { di: -1, dj: 0 },
    { di: 0, dj: 1 },
    { di: 0, dj: -1 },
  ].filter((d) => valid(ix + d.di) && valid(iz + d.dj));
  return all[Math.floor(rand() * all.length)] || { di: 1, dj: 0 };
}

function chooseDir(ix, iz, dir, rand) {
  const straight = { di: dir.di, dj: dir.dj };
  const left = { di: dir.dj, dj: -dir.di };
  const right = { di: -dir.dj, dj: dir.di };
  const opts = [];
  if (valid(ix + straight.di) && valid(iz + straight.dj)) opts.push(straight, straight); // peso doble
  if (valid(ix + left.di) && valid(iz + left.dj)) opts.push(left);
  if (valid(ix + right.di) && valid(iz + right.dj)) opts.push(right);
  if (opts.length === 0) return { di: -dir.di, dj: -dir.dj };
  return opts[Math.floor(rand() * opts.length)];
}
