// Interacciones de choque "con realismo":
//  - Vehículos aparcados: chocas, los empujas y os abolláis los dos.
//  - Árboles/palmeras: a velocidad alta se caen y te abollas un poco; a baja
//    velocidad bloquean (sólidos).
//  - Peatones: al atropellarlos se caen (y se levantan luego), con golpecito.
// Los edificios los gestiona `obstacles` (paredes sólidas que no se mueven).

const PED_RADIUS = 0.6;
const TREE_FALL_SPEED = 6; // por encima de esto, el árbol se cae

export function createInteractions({ fleet, trees, npcs }) {
  // A pie: el jugador no atraviesa coches aparcados ni árboles (sólidos).
  function resolveFoot(pos, radius) {
    for (const v of fleet.vehicles) pushOutCircle(pos, radius, v.group.position.x, v.group.position.z, v.getRadius());
    for (const t of trees.list) {
      if (t.fallen) continue;
      pushOutCircle(pos, radius, t.x, t.z, t.radius + 0.3);
    }
  }

  // Conduciendo: choques contra coches, árboles y peatones.
  function driveCollisions(vehicle, onShake) {
    const p = vehicle.group.position;
    const R = vehicle.getRadius();
    const spd = Math.abs(vehicle.getSpeed());
    const h = vehicle.getHeading();
    const sign = Math.sign(vehicle.getSpeed()) || 1;
    const dirX = Math.sin(h) * sign; // dirección de avance
    const dirZ = Math.cos(h) * sign;

    // Vehículos aparcados.
    for (const v of fleet.vehicles) {
      if (v === vehicle) continue;
      const ox = p.x - v.group.position.x;
      const oz = p.z - v.group.position.z;
      const d = Math.hypot(ox, oz);
      const minD = R + v.getRadius();
      if (d > 0.001 && d < minD) {
        const nx = ox / d;
        const nz = oz / d;
        const overlap = minD - d;
        p.x += nx * overlap * 0.6; // el conductor sale un poco
        p.z += nz * overlap * 0.6;
        v.shove(-nx * spd * 0.9, -nz * spd * 0.9); // el aparcado sale despedido
        if (spd > 3) {
          const dmg = Math.min(22, spd * 0.5);
          vehicle.dent(dmg * 0.6);
          v.dent(dmg);
          vehicle.slow(0.55);
          onShake();
        }
      }
    }

    // Árboles y palmeras.
    for (const t of trees.list) {
      if (t.fallen) continue;
      const ox = p.x - t.x;
      const oz = p.z - t.z;
      const d = Math.hypot(ox, oz);
      const minD = R + t.radius;
      if (d < minD) {
        if (spd > TREE_FALL_SPEED) {
          trees.knock(t, dirX, dirZ);
          vehicle.dent(Math.min(14, spd * 0.4));
          vehicle.slow(0.85);
          onShake();
        } else {
          const nx = ox / (d || 1);
          const nz = oz / (d || 1);
          p.x += nx * (minD - d);
          p.z += nz * (minD - d);
          vehicle.slow(0.5);
        }
      }
    }

    // Peatones (atropello).
    for (const n of npcs.npcs) {
      if (n.isDown && n.isDown()) continue;
      const ox = p.x - n.group.position.x;
      const oz = p.z - n.group.position.z;
      if (Math.hypot(ox, oz) < R + PED_RADIUS && spd > 3) {
        n.knockDown(dirX, dirZ, spd);
        vehicle.dent(2);
        onShake();
      }
    }
  }

  return { resolveFoot, driveCollisions };
}

// Empuja `pos` (radio r) fuera del círculo (cx,cz,cr).
function pushOutCircle(pos, r, cx, cz, cr) {
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const d = Math.hypot(dx, dz);
  const minD = r + cr;
  if (d > 0.001 && d < minD) {
    const push = minD - d;
    pos.x += (dx / d) * push;
    pos.z += (dz / d) * push;
  }
}
