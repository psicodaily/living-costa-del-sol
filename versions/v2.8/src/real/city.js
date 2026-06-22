import * as THREE from "three";
import { buildBuildings } from "./buildings.js";
import { buildGround } from "./ground.js";
import { createTrees } from "./trees.js";
import { createHeightfield } from "./heightfield.js";

export function createRealCity(data) {
  const group = new THREE.Group();

  // Relieve real (cuestas). Si no hay datos, queda plano.
  const { heightAt } = createHeightfield(data.heightGrid);

  group.add(buildGround(data, heightAt));

  const { meshes, cityBoxes } = buildBuildings(data.buildings, heightAt);
  for (const m of meshes) group.add(m);

  group.add(createTrees(data, 1600, heightAt));

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const box of cityBoxes) {
    if (box.x < minX) minX = box.x;
    if (box.x > maxX) maxX = box.x;
    if (box.z < minZ) minZ = box.z;
    if (box.z > maxZ) maxZ = box.z;
  }
  return { group, cityBoxes, bounds: { minX, maxX, minZ, maxZ }, heightAt };
}
