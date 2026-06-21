import { createSky } from "./sky.js";
import { createGround } from "./ground.js";
import { createBuildings } from "./buildings.js";
import { createTrees } from "./trees.js";

// Monta el mundo completo de la v1.0 en la escena.
export function createWorld(scene) {
  const sky = createSky(scene);
  const ground = createGround(scene);
  const buildings = createBuildings(scene);
  const trees = createTrees(scene);

  return { sky, ground, buildings, trees };
}

export { CITY_HALF } from "./ground.js";
