// Grafo de calles reales: convierte las polilíneas de las calles en segmentos
// con nodos compartidos, para que el tráfico y los peatones circulen por ellas
// y giren en los cruces.

const DRIVABLE = new Set([
  "motorway", "trunk", "primary", "secondary", "tertiary",
  "residential", "unclassified", "living_street", "service",
]);

export function buildRoadGraph(roads) {
  const nodes = new Map(); // "rx,rz" -> { x, z, segs: [idx] }
  const segments = []; // { ax, az, bx, bz, len, ka, kb }
  const keyOf = (x, z) => Math.round(x) + "," + Math.round(z);

  for (const r of roads) {
    if (!DRIVABLE.has(r.kind) || !r.path || r.path.length < 2) continue;
    for (let i = 1; i < r.path.length; i++) {
      const ax = r.path[i - 1][0];
      const az = r.path[i - 1][1];
      const bx = r.path[i][0];
      const bz = r.path[i][1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1) continue;
      const ka = keyOf(ax, az);
      const kb = keyOf(bx, bz);
      const idx = segments.length;
      segments.push({ ax, az, bx, bz, len, ka, kb });
      if (!nodes.has(ka)) nodes.set(ka, { x: ax, z: az, segs: [] });
      if (!nodes.has(kb)) nodes.set(kb, { x: bx, z: bz, segs: [] });
      nodes.get(ka).segs.push(idx);
      nodes.get(kb).segs.push(idx);
    }
  }

  // Dada la llegada a un nodo por un segmento, elige el siguiente segmento
  // (preferiblemente seguir recto, evitando dar media vuelta).
  function nextSegment(nodeKey, fromSeg, rand) {
    const node = nodes.get(nodeKey);
    if (!node) return -1;
    const opts = node.segs.filter((s) => s !== fromSeg);
    if (opts.length === 0) return fromSeg; // calle sin salida: media vuelta
    return opts[Math.floor(rand() * opts.length)];
  }

  return { nodes, segments, nextSegment };
}
