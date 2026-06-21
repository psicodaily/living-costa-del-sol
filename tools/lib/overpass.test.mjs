import { test } from "node:test";
import assert from "node:assert/strict";
import { BBOX, buildQuery, downloadOsm } from "./overpass.mjs";

test("buildQuery incluye bbox, out geom, nwr building y leisure=marina", () => {
  const q = buildQuery();
  assert.match(q, /36\.475,-4\.965,36\.522,-4\.868/);
  assert.match(q, /out geom;/);
  assert.match(q, /nwr\["building"\]/);
  assert.match(q, /leisure"="marina"/);
  assert.doesNotMatch(q, /amenity"="marina"/);
});

test("downloadOsm devuelve el JSON en el camino feliz (fetch inyectado)", async () => {
  const fake = async () => ({ ok: true, status: 200, json: async () => ({ elements: [{ id: 1 }] }) });
  const data = await downloadOsm("q", { fetchImpl: fake, endpoints: ["x"], retries: 1 });
  assert.equal(data.elements.length, 1);
});
