export function nearestRoadPoint(roads, x = 0, z = 0) {
  let best = [0, 0];
  let bestD = Infinity;
  for (const r of roads) {
    for (const [px, pz] of r.path || []) {
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bestD) { bestD = d; best = [px, pz]; }
    }
  }
  return best;
}
