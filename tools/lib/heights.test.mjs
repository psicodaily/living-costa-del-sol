import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHeight, clampHeight, estimateHeight, jitterHeight } from "./heights.mjs";

test("parseHeight normaliza unidades y comas", () => {
  assert.equal(parseHeight("12 m"), 12);
  assert.equal(parseHeight("12,5"), 12.5);
  assert.equal(Math.round(parseHeight("20'")), 6); // pies -> metros
  assert.equal(parseHeight(undefined), null);
});

test("clampHeight limita a 2..60", () => {
  assert.equal(clampHeight(0.5), 2);
  assert.equal(clampHeight(999), 60);
  assert.equal(clampHeight(10), 10);
});

test("estimateHeight usa height, luego levels, luego default", () => {
  assert.equal(estimateHeight({ height: "15" }), 15);
  assert.equal(estimateHeight({ "building:levels": "4" }), 12.8); // 4*3.2
  assert.equal(estimateHeight({ building: "hotel" }), 24);
  assert.equal(estimateHeight({ building: "yes" }), 7);
});

test("jitterHeight es determinista por id", () => {
  const a = jitterHeight(10, "way/123");
  const b = jitterHeight(10, "way/123");
  const c = jitterHeight(10, "way/999");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(a >= 8.5 && a <= 13);
});
