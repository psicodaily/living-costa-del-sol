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

// Vértice de calle más cercano que esté en TIERRA (por encima del nivel del mar),
// para no aparecer dentro del agua de la marina. Si no hay ninguno, usa el normal.
export function nearestDryRoadPoint(roads, x, z, heightAt, minY = 1.1) {
  let best = null;
  let bestD = Infinity;
  for (const r of roads) {
    for (const [px, pz] of r.path || []) {
      if (heightAt(px, pz) < minY) continue;
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bestD) { bestD = d; best = [px, pz]; }
    }
  }
  return best || nearestRoadPoint(roads, x, z);
}
