import { test } from "node:test";
import assert from "node:assert/strict";
import { roadRibbon, barrioColor } from "./geometry.js";

test("roadRibbon crea 2 vértices por punto y 6 índices por segmento", () => {
  const { positions, indices } = roadRibbon([[0, 0], [10, 0]], 4);
  assert.equal(positions.length, 4 * 3); // 2 puntos * 2 lados * (x,y,z)
  assert.equal(indices.length, 6);       // 1 segmento -> 2 triángulos
  for (let i = 1; i < positions.length; i += 3) assert.equal(positions[i], 0);
});

test("barrioColor usa el tipo si lo conoce, si no el barrio, si no el genérico", () => {
  assert.equal(barrioColor("Puerto Banús", "hotel"), 0xcdd8e6); // tipo gana
  assert.equal(barrioColor("Puerto Banús"), 0xfdfbf6);          // barrio
  assert.equal(barrioColor("desconocido"), 0xdfd8c8);           // genérico
});
