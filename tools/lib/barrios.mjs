export const BARRIOS = [
  { name: "Casco Antiguo", ring: [[-4.890, 36.516], [-4.882, 36.516], [-4.882, 36.509], [-4.890, 36.509]] },
  { name: "Centro", ring: [[-4.900, 36.520], [-4.872, 36.520], [-4.872, 36.505], [-4.900, 36.505]] },
  { name: "Puerto Banús", ring: [[-4.962, 36.492], [-4.940, 36.492], [-4.940, 36.480], [-4.962, 36.480]] },
  { name: "Golden Mile", ring: [[-4.940, 36.508], [-4.905, 36.508], [-4.905, 36.495], [-4.940, 36.495]] },
];

export function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function classifyBarrio(lon, lat, barrios = BARRIOS) {
  for (const b of barrios) if (pointInRing([lon, lat], b.ring)) return b.name;
  return "Genérico";
}
