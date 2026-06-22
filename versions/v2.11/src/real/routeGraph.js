// Grafo ENRUTABLE para el GPS del mapa: une las calles conducibles + las
// rotondas, fusiona los nodos casi coincidentes y, sobre todo, PARTE los
// segmentos donde otra calle se cruza (cruces en T) para que el camino conecte.
// Es independiente del grafo del tráfico (roadGraph.js) para no afectarlo.

const DRIVABLE = new Set([
  "motorway", "trunk", "primary", "secondary", "tertiary",
  "residential", "unclassified", "living_street", "service",
  "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link",
]);

const SNAP = 2;          // fusiona nodos a menos de ~2 m
const SPLIT_DIST = 3.5;  // parte un segmento si un nodo cae a < 3.5 m de él
const CELL = 24;         // tamaño de celda del hash espacial

export function buildRouteGraph(roads = [], roundabouts = []) {
  const keyOf = (x, z) => Math.round(x / SNAP) + "," + Math.round(z / SNAP);

  // 1) Polilíneas → nodos (con su posición) y segmentos crudos por clave.
  const nodePos = new Map(); // key -> { x, z }
  const rawSegs = [];        // { a, b }
  function addPath(path) {
    let prevKey = null;
    for (const [x, z] of path) {
      const k = keyOf(x, z);
      if (!nodePos.has(k)) nodePos.set(k, { x, z });
      if (prevKey != null && prevKey !== k) rawSegs.push({ a: prevKey, b: k });
      prevKey = k;
    }
  }
  for (const r of roads) if (DRIVABLE.has(r.kind) && r.path && r.path.length > 1) addPath(r.path);
  for (const r of roundabouts) if (r.path && r.path.length > 1) addPath(r.path);

  // 2) Hash espacial de nodos.
  const grid = new Map();
  const cellKey = (x, z) => Math.floor(x / CELL) + "," + Math.floor(z / CELL);
  for (const [k, p] of nodePos) {
    const ck = cellKey(p.x, p.z);
    if (!grid.has(ck)) grid.set(ck, []);
    grid.get(ck).push(k);
  }
  const nodesNear = (x, z) => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    const out = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const arr = grid.get((cx + i) + "," + (cz + j));
      if (arr) out.push(...arr);
    }
    return out;
  };

  // 3) Parte cada segmento en los nodos que caen sobre su interior (cruces en T).
  const edges = []; // { a, b, len }
  const addEdge = (ka, kb) => {
    if (ka === kb) return;
    const A = nodePos.get(ka), B = nodePos.get(kb);
    edges.push({ a: ka, b: kb, len: Math.hypot(B.x - A.x, B.z - A.z) });
  };
  for (const s of rawSegs) {
    const A = nodePos.get(s.a), B = nodePos.get(s.b);
    const dx = B.x - A.x, dz = B.z - A.z;
    const L2 = dx * dx + dz * dz;
    if (L2 === 0) continue;
    // Candidatos: nodos en las celdas que recorre el segmento.
    const steps = Math.max(1, Math.ceil(Math.sqrt(L2) / (CELL / 2)));
    const cand = new Set();
    for (let st = 0; st <= steps; st++) {
      const t = st / steps;
      for (const k of nodesNear(A.x + t * dx, A.z + t * dz)) cand.add(k);
    }
    const splits = [];
    for (const k of cand) {
      if (k === s.a || k === s.b) continue;
      const P = nodePos.get(k);
      const t = ((P.x - A.x) * dx + (P.z - A.z) * dz) / L2;
      if (t <= 0.002 || t >= 0.998) continue;
      const d = Math.hypot(P.x - (A.x + t * dx), P.z - (A.z + t * dz));
      if (d <= SPLIT_DIST) splits.push({ t, key: k });
    }
    if (splits.length === 0) { addEdge(s.a, s.b); continue; }
    splits.sort((p, q) => p.t - q.t);
    let prev = s.a;
    for (const sp of splits) { addEdge(prev, sp.key); prev = sp.key; }
    addEdge(prev, s.b);
  }

  // 4) Adyacencia.
  const nodes = new Map(); // key -> { x, z, edges: [idx] }
  for (const [k, p] of nodePos) nodes.set(k, { x: p.x, z: p.z, edges: [] });
  const E = [];
  for (const e of edges) {
    const idx = E.length;
    E.push(e);
    nodes.get(e.a).edges.push(idx);
    nodes.get(e.b).edges.push(idx);
  }

  return { nodes, edges: E };
}
