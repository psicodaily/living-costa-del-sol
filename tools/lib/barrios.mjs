export const BARRIOS = [
  { name: "Casco Antiguo", ring: [[-4.890, 36.516], [-4.882, 36.516], [-4.882, 36.509], [-4.890, 36.509]] },
  { name: "Centro", ring: [[-4.900, 36.520], [-4.872, 36.520], [-4.872, 36.505], [-4.900, 36.505]] },
  { name: "Puerto Banús", ring: [[-4.962, 36.492], [-4.940, 36.492], [-4.940, 36.480], [-4.962, 36.480]] },
  { name: "Golden Mile", ring: [[-4.940, 36.508], [-4.905, 36.508], [-4.905, 36.495], [-4.940, 36.495]] },
];

// Zonas/distritos reconocibles para PINTAR en el mapa (perímetro + nombre).
// Son polígonos lon/lat aproximados (OSM no trae límites de barrio fiables),
// dibujados a mano para que cuadren con la Marbella real dentro del mapa.
export const ZONES = [
  { name: "Puerto Banús", ring: [[-4.961, 36.491], [-4.944, 36.491], [-4.944, 36.481], [-4.961, 36.481]] },
  { name: "Nueva Andalucía", ring: [[-4.962, 36.506], [-4.936, 36.506], [-4.936, 36.491], [-4.962, 36.491]] },
  { name: "Golden Mile", ring: [[-4.936, 36.511], [-4.906, 36.511], [-4.906, 36.496], [-4.936, 36.496]] },
  { name: "Sierra Blanca", ring: [[-4.922, 36.522], [-4.896, 36.522], [-4.896, 36.510], [-4.922, 36.510]] },
  { name: "Centro", ring: [[-4.904, 36.520], [-4.878, 36.520], [-4.878, 36.505], [-4.904, 36.505]] },
  { name: "Casco Antiguo", ring: [[-4.8908, 36.5158], [-4.8812, 36.5158], [-4.8812, 36.5086], [-4.8908, 36.5086]] },
  { name: "Playa / Paseo Marítimo", ring: [[-4.906, 36.506], [-4.873, 36.506], [-4.873, 36.499], [-4.906, 36.499]] },
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
