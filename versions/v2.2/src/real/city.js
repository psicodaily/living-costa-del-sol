import * as THREE from "three";
import { buildBuildings } from "./buildings.js";
import { buildGround } from "./ground.js";
import { createTrees } from "./trees.js";

export function createRealCity(data) {
  const group = new THREE.Group();
  group.add(buildGround(data));

  const { meshes, cityBoxes } = buildBuildings(data.buildings);
  for (const m of meshes) group.add(m);

  group.add(createTrees(data));

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const box of cityBoxes) {
    if (box.x < minX) minX = box.x;
    if (box.x > maxX) maxX = box.x;
    if (box.z < minZ) minZ = box.z;
    if (box.z > maxZ) maxZ = box.z;
  }
  return { group, cityBoxes, bounds: { minX, maxX, minZ, maxZ } };
}
