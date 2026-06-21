import { createSky } from "./sky.js";
import { createGround } from "./ground.js";
import { createBuildings } from "./buildings.js";
import { createTrees } from "./trees.js";

// Monta el mundo completo en la escena y devuelve sus piezas.
// `cityBoxes` es la lista de edificios como datos, base para colisiones,
// tráfico e IA en versiones futuras.
export function createWorld(scene) {
  const sky = createSky(scene);
  const ground = createGround(scene);
  const buildings = createBuildings(scene);
  const trees = createTrees(scene);

  return {
    sky,
    ground,
    buildings: buildings.group,
    cityBoxes: buildings.boxes,
    trees,
  };
}

// Re-exporta los datos de la ciudad para el resto del juego.
export { CITY, CELL, CITY_HALF, forEachBlock } from "./ground.js";
