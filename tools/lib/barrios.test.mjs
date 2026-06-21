import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyBarrio, pointInRing } from "./barrios.mjs";

const cuadrado = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

test("pointInRing detecta dentro/fuera", () => {
  assert.equal(pointInRing([0, 0], cuadrado), true);
  assert.equal(pointInRing([2, 2], cuadrado), false);
});

test("classifyBarrio asigna Puerto Banús a un punto en su zona", () => {
  // Centro aproximado de la marina de Puerto Banús
  assert.equal(classifyBarrio(-4.951, 36.486), "Puerto Banús");
});

test("classifyBarrio devuelve Genérico fuera de todo barrio", () => {
  assert.equal(classifyBarrio(0, 0), "Genérico");
});
