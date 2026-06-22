import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildBuildings } from "./buildings.js";

test("buildBuildings: altura en +Y (0..h) y Z conservado (sin reflejo)", () => {
  const b = { id: "1", height: 10, barrio: "Centro", type: "yes",
    footprint: [[0, 0], [10, 0], [10, 20], [0, 20]] };
  const { meshes, cityBoxes } = buildBuildings([b]);
  assert.ok(meshes.length >= 1, "debe producir al menos una malla");
  const geo = meshes[0].geometry;
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  assert.ok(bb.min.y >= -0.01 && bb.max.y <= 10.01, "altura 0..10 en +Y");
  assert.ok(bb.max.z > 15, "Z conservado (~20, no reflejado a negativo)");
  assert.equal(cityBoxes.length, 1);
});

test("buildBuildings ignora footprints inválidos", () => {
  const { meshes } = buildBuildings([{ id: "x", height: 5, footprint: [[0, 0]] }]);
  assert.equal(meshes.length, 0);
});
