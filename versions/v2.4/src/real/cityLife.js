import { createVehicle } from "../vehicle/vehicle.js";
import { createCharacter, animateWalk } from "../player/character.js";
import { buildRoadGraph } from "./roadGraph.js";

// Vida urbana sobre las calles REALES: coches y peatones que circulan por el
// grafo de calles. Solo se simula un conjunto pequeño que se RECICLA cerca del
// jugador (para que el mapa enorme vaya fluido).

const CAR_COLORS = [0x9aa3ad, 0x33415c, 0x7a2d2d, 0x2d5a3a, 0xb08a2a, 0xdedede, 0x444a52, 0xc0392b, 0x2e6fb0];
const PED_COLORS = [0xc0392b, 0x27ae60, 0x8e44ad, 0xe67e22, 0x2c3e50, 0x16a085];
const FAR = 340; // si se aleja más, reaparece cerca del jugador
const NEAR_MIN = 45;
const NEAR_MAX = 200;

export function createCityLife(scene, roads, { cars = 8, peds = 14 } = {}) {
  const graph = buildRoadGraph(roads);
  const segs = graph.segments;
  if (segs.length === 0) return { update() {}, dots: () => [] };
  const rand = Math.random;

  function spawnState(near) {
    let si = Math.floor(rand() * segs.length);
    if (near) {
      let best = si;
      let bestD = Infinity;
      for (let k = 0; k < 40; k++) {
        const c = Math.floor(rand() * segs.length);
        const s = segs[c];
        const d = Math.hypot((s.ax + s.bx) / 2 - near.x, (s.az + s.bz) / 2 - near.z);
        if (d >= NEAR_MIN && d <= NEAR_MAX) {
          best = c;
          break;
        }
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      si = best;
    }
    return { si, forward: rand() < 0.5, progress: rand() };
  }

  const agents = [];
  for (let i = 0; i < cars; i++) {
    const v = createVehicle(scene, {
      x: 0, z: -1e6, color: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], kind: "car",
    });
    agents.push({ kind: "car", group: v.group, speed: 8 + rand() * 7, lane: 2.3, ...spawnState() });
  }
  for (let i = 0; i < peds; i++) {
    const { group, limbs } = createCharacter(PED_COLORS[Math.floor(rand() * PED_COLORS.length)]);
    group.position.set(0, 0, -1e6);
    scene.add(group);
    agents.push({ kind: "ped", group, limbs, walkTime: rand() * 10, speed: 2.6 + rand() * 1.3, lane: 3.2, ...spawnState() });
  }

  function update(delta, playerPos) {
    for (const a of agents) {
      let s = segs[a.si];
      a.progress += (a.speed * delta) / s.len;
      if (a.progress >= 1) {
        const endKey = a.forward ? s.kb : s.ka;
        const ni = graph.nextSegment(endKey, a.si, rand);
        const ns = segs[ni];
        a.forward = ns.ka === endKey;
        a.si = ni;
        a.progress = 0;
        s = ns;
      }
      const sx = a.forward ? s.ax : s.bx;
      const sz = a.forward ? s.az : s.bz;
      const ex = a.forward ? s.bx : s.ax;
      const ez = a.forward ? s.bz : s.az;
      let dx = ex - sx;
      let dz = ez - sz;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl;
      dz /= dl;
      // Carril a un lado (perpendicular); sentidos opuestos quedan separados.
      const px = sx + (ex - sx) * a.progress - dz * a.lane;
      const pz = sz + (ez - sz) * a.progress + dx * a.lane;
      a.group.position.set(px, 0, pz);
      a.group.rotation.y = Math.atan2(dx, dz);

      if (a.kind === "ped") {
        a.walkTime += delta * 9;
        animateWalk(a.limbs, a.walkTime, 1);
      }

      const fx = px - playerPos.x;
      const fz = pz - playerPos.z;
      if (fx * fx + fz * fz > FAR * FAR) Object.assign(a, spawnState(playerPos));
    }
  }

  function dots() {
    return agents.map((a) => ({
      x: a.group.position.x,
      z: a.group.position.z,
      color: a.kind === "car" ? "#ff5555" : "#bfc5cf",
      size: a.kind === "car" ? 3 : 2,
    }));
  }

  return { update, dots };
}
