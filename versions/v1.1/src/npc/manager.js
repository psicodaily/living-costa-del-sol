import { createNPC } from "./npc.js";

function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Crea y gestiona todos los NPCs de la ciudad.
export function createNPCs(scene, count = 25) {
  const rand = makeRandom(424242);
  const npcs = [];

  for (let i = 0; i < count; i++) {
    const npc = createNPC(rand);
    scene.add(npc.group);
    npcs.push(npc);
  }

  function update(delta) {
    for (const npc of npcs) npc.update(delta);
  }

  return { npcs, update };
}
