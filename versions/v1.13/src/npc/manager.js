import { createNPC } from "./npc.js";

function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const MIN_SEP = 1.4; // separación mínima entre peatones

// Crea y gestiona todos los NPCs de la ciudad.
export function createNPCs(scene, count = 30) {
  const rand = makeRandom(424242);
  const npcs = [];

  for (let i = 0; i < count; i++) {
    const npc = createNPC(rand);
    scene.add(npc.group);
    npcs.push(npc);
  }

  // playerPos: posición del jugador o vehículo. threat: true si corre o conduce.
  function update(delta, playerPos, threat) {
    for (const npc of npcs) npc.update(delta, playerPos, threat);
    separate();
  }

  // Anti-solapamiento: empuja suavemente a los peatones que se juntan demasiado.
  function separate() {
    for (let i = 0; i < npcs.length; i++) {
      for (let j = i + 1; j < npcs.length; j++) {
        if (npcs[i].isDown() || npcs[j].isDown()) continue;
        const a = npcs[i].group.position;
        const b = npcs[j].group.position;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < MIN_SEP) {
          const push = (MIN_SEP - d) / 2;
          const nx = dx / d;
          const nz = dz / d;
          a.x += nx * push;
          a.z += nz * push;
          b.x -= nx * push;
          b.z -= nz * push;
        }
      }
    }
  }

  return { npcs, update };
}
