const DEG2RAD = Math.PI / 180;

export const GEOREF = {
  version: 1,
  R: 6371000,
  lat0: 36.5154,
  lon0: -4.8858,
  cosLat0: Math.cos(36.5154 * DEG2RAD),
  scaleGlobal: 1.0,
  axis: { east: "+X", north: "-Z", up: "+Y" },
  rotationDeg: 0,
  opOrder: ["project", "rotate", "compact", "scale"],
  compaction: { mode: "radial-continuous", r0: 1200, k: 0.5 },
};

const mPerDegLat = (ref) => ref.R * DEG2RAD;
const mPerDegLon = (ref) => ref.R * DEG2RAD * Math.cos(ref.lat0 * DEG2RAD);

export function project(lon, lat, ref = GEOREF) {
  const x = (lon - ref.lon0) * mPerDegLon(ref);
  const z = -(lat - ref.lat0) * mPerDegLat(ref); // Norte = -Z
  return [x, z];
}

export function compact([x, z], ref = GEOREF) {
  const { r0, k } = ref.compaction;
  const r = Math.hypot(x, z);
  if (r <= r0 || r === 0) return [x, z];
  const s = (r0 + (r - r0) * k) / r;
  return [x * s, z * s];
}

export function latLonToWorld(lon, lat, ref = GEOREF) {
  const [x, z] = compact(project(lon, lat, ref), ref);
  return [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
}
