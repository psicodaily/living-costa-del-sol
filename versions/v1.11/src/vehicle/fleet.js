import { createVehicle } from "./vehicle.js";

// Flota de vehículos aparcados por la ciudad. Cada uno tiene estadísticas
// propias. Todos están sobre calles (x o z coincide con el centro de una calle).
const SPOTS = [
  { x: 0, z: -16, color: 0xd11f2a, kind: "car", maxSpeed: 44, accel: 26, turn: 1.8 }, // deportivo (rojo)
  { x: 0, z: -44, color: 0x2e6fb0, kind: "car", maxSpeed: 34, accel: 18, turn: 1.5 }, // utilitario (azul)
  { x: 52, z: -16, color: 0x3a3f47, kind: "car", maxSpeed: 30, accel: 16, turn: 1.3, scaleW: 1.15, scaleL: 1.15 }, // todoterreno
  { x: -52, z: -16, color: 0xe0a02a, kind: "car", maxSpeed: 30, accel: 16, turn: 1.35, scaleW: 1.1, scaleL: 1.35 }, // furgoneta
  { x: 0, z: -30, color: 0x141414, kind: "moto", maxSpeed: 50, accel: 32, turn: 2.4 }, // moto
];

export function createFleet(scene) {
  const vehicles = SPOTS.map((s) => createVehicle(scene, s));

  // Devuelve el vehículo aparcado más cercano dentro de maxDist (o null).
  function findNearest(pos, maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const v of vehicles) {
      const dx = pos.x - v.group.position.x;
      const dz = pos.z - v.group.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  return { vehicles, findNearest };
}
