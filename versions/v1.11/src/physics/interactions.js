// Interacciones de choque "con realismo":
//  - Vehículos aparcados y del tráfico: chocas, los empujas y os abolláis.
//  - Árboles/palmeras: a velocidad alta se caen; a baja velocidad bloquean.
//  - Peatones: a pie son sólidos (no los atraviesas); al atropellarlos se caen.
// Los edificios los gestiona `obstacles` (paredes sólidas que no se mueven).

const PED_RADIUS = 0.5;
const TREE_FALL_SPEED = 6;

export function createInteractions({ fleet, trees, npcs, traffic }) {
  // A pie: el jugador no atraviesa coches, árboles ni peatones.
  function resolveFoot(pos, radius) {
    for (const v of fleet.vehicles) {
      pushOutCircle(pos, radius, v.group.position.x, v.group.position.z, v.getRadius());
    }
    if (traffic) {
      for (const c of traffic.cars) {
        pushOutCircle(pos, radius, c.group.position.x, c.group.position.z, c.getRadius());
      }
    }
    for (const t of trees.list) {
      if (t.fallen) continue;
      pushOutCircle(pos, radius, t.x, t.z, t.radius + 0.3);
    }
    for (const n of npcs.npcs) {
      if (n.isDown && n.isDown()) continue;
      pushOutCircle(pos, radius, n.group.position.x, n.group.position.z, PED_RADIUS + 0.2);
    }
  }

  // Conduciendo: choques contra coches (aparcados y del tráfico), árboles y peatones.
  function driveCollisions(vehicle, onShake) {
    const p = vehicle.group.position;
    const R = vehicle.getRadius();
    const spd = Math.abs(vehicle.getSpeed());
    const h = vehicle.getHeading();
    const sign = Math.sign(vehicle.getSpeed()) || 1;
    const dirX = Math.sin(h) * sign;
    const dirZ = Math.cos(h) * sign;

    // Vehículos aparcados (se pueden empujar y abollar).
    for (const v of fleet.vehicles) {
      if (v === vehicle) continue;
      const ox = p.x - v.group.position.x;
      const oz = p.z - v.group.position.z;
      const d = Math.hypot(ox, oz);
      const minD = R + v.getRadius();
      if (d > 0.001 && d < minD) {
        const nx = ox / d;
        const nz = oz / d;
        p.x += nx * (minD - d) * 0.6;
        p.z += nz * (minD - d) * 0.6;
        v.shove(-nx * spd * 0.9, -nz * spd * 0.9);
        vehicle.slow(0.55);
        if (spd > 6) {
          const dmg = Math.min(20, spd * 0.45);
          vehicle.dent(dmg * 0.6);
          v.dent(dmg);
          onShake();
        }
      }
    }

    // Coches del tráfico (sólidos: te frenan y abollan, ellos se desvían).
    if (traffic) {
      for (const c of traffic.cars) {
        const ox = p.x - c.group.position.x;
        const oz = p.z - c.group.position.z;
        const d = Math.hypot(ox, oz);
        const minD = R + c.getRadius();
        if (d > 0.001 && d < minD) {
          const nx = ox / d;
          const nz = oz / d;
          p.x += nx * (minD - d) * 0.6;
          p.z += nz * (minD - d) * 0.6;
          c.bump(-nx * spd, -nz * spd);
          vehicle.slow(0.55);
          if (spd > 6) {
            vehicle.dent(Math.min(18, spd * 0.4));
            onShake();
          }
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
