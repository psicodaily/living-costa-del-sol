import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFeature, buildCityData } from "./layers.mjs";
import { GEOREF } from "./geo.mjs";

const featBuilding = {
  id: "way/1", properties: { building: "apartments", "building:levels": "5" },
  geometry: { type: "Polygon", coordinates: [[[GEOREF.lon0, GEOREF.lat0], [GEOREF.lon0 + 0.0005, GEOREF.lat0], [GEOREF.lon0 + 0.0005, GEOREF.lat0 + 0.0005], [GEOREF.lon0, GEOREF.lat0]]] },
};
const featRoad = {
  id: "way/2", properties: { highway: "primary" },
  geometry: { type: "LineString", coordinates: [[GEOREF.lon0, GEOREF.lat0], [GEOREF.lon0 + 0.001, GEOREF.lat0]] },
};

test("classifyFeature reconoce edificios y calles", () => {
  assert.equal(classifyFeature(featBuilding), "building");
  assert.equal(classifyFeature(featRoad), "road");
});

test("buildCityData separa capas y proyecta", () => {
  const data = buildCityData({ features: [featBuilding, featRoad] });
  assert.equal(data.buildings.length, 1);
  assert.equal(data.roads.length, 1);
  // El origen lat0/lon0 cae dentro del polígono "Casco Antiguo" (va antes que "Centro")
  assert.equal(data.buildings[0].barrio, "Casco Antiguo");
  assert.ok(data.buildings[0].height > 0);
  assert.ok(Array.isArray(data.buildings[0].footprint));
  assert.equal(data.meta.georef.lat0, GEOREF.lat0);
  assert.deepEqual(data.meta.bbox, [-4.965, 36.475, -4.868, 36.522]);
});
