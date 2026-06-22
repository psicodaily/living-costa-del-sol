import { createSky } from "./sky.js";
import { createGround } from "./ground.js";
import { createBuildings } from "./buildings.js";
import { createTrees } from "./trees.js";
import { createRoundabout } from "./roundabout.js";
import { createCoast } from "./coast.js";
import { createStreetlights } from "./streetlights.js";

// Monta el mundo completo en la escena y devuelve sus piezas.
// `cityBoxes` es la lista de edificios como datos, base para colisiones,
// tráfico e IA en versiones futuras.
export function createWorld(scene) {
  const sky = createSky(scene);
  const ground = createGround(scene);
  const buildings = createBuildings(scene);
  const trees = createTrees(scene);
  const roundabout = createRoundabout(scene);
  const coast = createCoast(scene);
  const streetlights = createStreetlights(scene);

  return {
    sky,
    ground,
    buildings: buildings.group,
    cityBoxes: buildings.boxes,
    windowMaterials: buildings.windowMaterials,
    trees,
    roundabout,
    coast,
    streetlights,
  };
}

// Re-exporta los datos de la ciudad para el resto del juego.
export { CITY, CELL, CITY_HALF, forEachBlock } from "./ground.js";
