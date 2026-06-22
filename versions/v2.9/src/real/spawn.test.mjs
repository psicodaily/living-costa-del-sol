import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestRoadPoint } from "./spawn.js";

test("nearestRoadPoint elige el vértice de calle más cercano al objetivo", () => {
  const roads = [{ path: [[100, 100], [5, -5]] }, { path: [[50, 50]] }];
  assert.deepEqual(nearestRoadPoint(roads, 0, 0), [5, -5]);
});

test("nearestRoadPoint devuelve [0,0] si no hay calles", () => {
  assert.deepEqual(nearestRoadPoint([], 0, 0), [0, 0]);
});
