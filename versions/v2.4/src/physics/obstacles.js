// Registro de obstáculos para colisiones sencillas (cajas AABB).
// El actor se trata como un círculo (radio). Al solaparse con una caja, se le
// empuja fuera por el lado más cercano, lo que produce un deslizamiento natural
// a lo largo de las paredes. Devuelve cuánto se empujó (para detectar impactos).

export function createObstacles(boxes) {
  const aabb = boxes.map((b) => ({
    minX: b.x - b.width / 2,
    maxX: b.x + b.width / 2,
    minZ: b.z - b.depth / 2,
    maxZ: b.z + b.depth / 2,
  }));

  function resolve(pos, radius) {
    let maxPush = 0;
    for (const b of aabb) {
      const nx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const dx = pos.x - nx;
      const dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;

      if (d2 < radius * radius) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = radius - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
          if (push > maxPush) maxPush = push;
        } else {
          // Centro dentro de la caja: empujar al borde más cercano.
          const toL = pos.x - b.minX;
          const toR = b.maxX - pos.x;
          const toT = pos.z - b.minZ;
          const toB = b.maxZ - pos.z;
          const m = Math.min(toL, toR, toT, toB);
          if (m === toL) pos.x = b.minX - radius;
          else if (m === toR) pos.x = b.maxX + radius;
          else if (m === toT) pos.z = b.minZ - radius;
          else pos.z = b.maxZ + radius;
          maxPush = radius;
        }
      }
    }
    return maxPush;
  }

  return { resolve };
}
