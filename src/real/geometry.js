const BARRIO_COLORS = {
  "Casco Antiguo": 0xf4ece0,
  "Centro": 0xe9e4d8,
  "Puerto Banús": 0xfdfbf6,
  "Golden Mile": 0xf7f3ea,
  "Genérico": 0xdfd8c8,
};
const TYPE_COLORS = {
  hotel: 0xcdd8e6, office: 0xc6d2e0,
  commercial: 0xd8d2c4, retail: 0xd8d2c4, supermarket: 0xd8d2c4,
  industrial: 0xb8b8b8, warehouse: 0xb8b8b8,
};

export function barrioColor(barrio, type) {
  if (type && TYPE_COLORS[type]) return TYPE_COLORS[type];
  return BARRIO_COLORS[barrio] ?? BARRIO_COLORS["Genérico"];
}

export function roadRibbon(path, width = 6) {
  const half = width / 2;
  const left = [], right = [];
  for (let i = 0; i < path.length; i++) {
    const [x, z] = path[i];
    const [px, pz] = path[i === 0 ? 0 : i - 1];
    const [nx, nz] = path[i === path.length - 1 ? i : i + 1];
    let dx = nx - px, dz = nz - pz;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const ox = -dz * half, oz = dx * half; // normal perpendicular
    left.push([x + ox, z + oz]);
    right.push([x - ox, z - oz]);
  }
  const positions = [];
  for (let i = 0; i < path.length; i++) {
    positions.push(left[i][0], 0, left[i][1]);
    positions.push(right[i][0], 0, right[i][1]);
  }
  const indices = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }
  return { positions, indices };
}
