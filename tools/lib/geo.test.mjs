import { test } from "node:test";
import assert from "node:assert/strict";
import { GEOREF, project, compact, latLonToWorld } from "./geo.mjs";

const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;

test("el origen lat0/lon0 cae en (0,0)", () => {
  const [x, z] = project(GEOREF.lon0, GEOREF.lat0);
  assert.ok(near(x, 0, 1e-6) && near(z, 0, 1e-6));
});

test("Norte va hacia -Z y Este hacia +X", () => {
  const [, zNorte] = project(GEOREF.lon0, GEOREF.lat0 + 0.01);
  const [xEste] = project(GEOREF.lon0 + 0.01, GEOREF.lat0);
  assert.ok(zNorte < 0, "norte debe ser Z negativo");
  assert.ok(xEste > 0, "este debe ser X positivo");
});

test("compact no toca el centro (r < r0)", () => {
  assert.deepEqual(compact([100, 0]), [100, 0]);
});

test("compact encoge la periferia (r >= r0)", () => {
  // r=2000 -> f = 1200 + (800*0.5) = 1600
  const [x] = compact([2000, 0]);
  assert.ok(near(x, 1600), `esperaba ~1600, obtuve ${x}`);
});

test("latLonToWorld redondea a 0,1 m", () => {
  const [x, z] = latLonToWorld(GEOREF.lon0 + 0.001, GEOREF.lat0 - 0.001);
  assert.equal(x, Math.round(x * 10) / 10);
  assert.equal(z, Math.round(z * 10) / 10);
});
