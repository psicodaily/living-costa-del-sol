// Puerto Banús: coloca YATES en el agua de la marina, en dos filas a lo largo de
// un pantalán, meciéndose suavemente. El agua ya la pone el mar global (ground.js).
import * as THREE from "three";

const YACHT_SIZES = [
  { len: 9, beam: 3.2, cabinH: 1.7, color: 0xf4f4f0 },
  { len: 15, beam: 4.6, cabinH: 2.3, color: 0xeef1f5 },
  { len: 23, beam: 6.2, cabinH: 3.1, color: 0xffffff },
];

// Casco + proa achaflanada + cubierta + cabina.
function makeYacht({ len, beam, cabinH, color }) {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1f3346, roughness: 0.5 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(beam, beam * 0.5, len), hullMat);
  hull.position.y = beam * 0.22;
  hull.castShadow = true;

  const bow = new THREE.Mesh(new THREE.ConeGeometry(beam * 0.5, len * 0.3, 4), hullMat);
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 1, 0.5);
  bow.position.set(0, beam * 0.22, len * 0.5);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.9, 0.16, len * 0.9), trimMat);
  deck.position.y = beam * 0.48;

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(beam * 0.7, cabinH, len * 0.38),
    new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.3, metalness: 0.1 })
  );
  cabin.position.set(0, beam * 0.48 + cabinH / 2, -len * 0.06);
  cabin.castShadow = true;

  g.add(hull, bow, deck, cabin);
  return g;
}

function pointInPoly(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function createMarina(area, waterY = 0.5) {
  const ring = area.polygon;
  const group = new THREE.Group();

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const horizontal = (maxX - minX) >= (maxZ - minZ); // eje largo en X o en Z

  // Pontón central (pasarela de madera) a lo largo del eje largo.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 });
  const along0 = horizontal ? minX + 8 : minZ + 8;
  const along1 = horizontal ? maxX - 8 : maxZ - 8;
  const crossMid = horizontal ? (minZ + maxZ) / 2 : (minX + maxX) / 2;
  const pierLen = Math.max(4, along1 - along0);
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(horizontal ? pierLen : 2.5, 0.4, horizontal ? 2.5 : pierLen),
    pierMat
  );
  pier.position.set(
    horizontal ? (along0 + along1) / 2 : crossMid,
    waterY + 0.25,
    horizontal ? crossMid : (along0 + along1) / 2
  );
  group.add(pier);

  // Yates en dos filas a ambos lados del pontón.
  const yachts = [];
  const STEP = 16, ROW_GAP = 13;
  let n = 0;
  for (let a = along0 + 4; a <= along1 - 4; a += STEP) {
    for (const side of [-1, 1]) {
      const cross = crossMid + side * (ROW_GAP / 2);
      const x = horizontal ? a : cross;
      const z = horizontal ? cross : a;
      if (!pointInPoly(x, z, ring)) continue;
      const size = YACHT_SIZES[n % 5 === 0 ? 2 : n % 2 === 0 ? 1 : 0];
      const y = makeYacht(size);
      y.position.set(x, waterY, z);
      // Proa hacia el agua (perpendicular al pontón).
      y.rotation.y = horizontal ? (side > 0 ? Math.PI : 0) : (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      y.userData.phase = (n * 1.7) % (Math.PI * 2);
      group.add(y);
      yachts.push(y);
      n++;
    }
  }

  function update(t) {
    for (const y of yachts) {
      const ph = y.userData.phase;
      y.rotation.z = Math.sin(t * 0.8 + ph) * 0.03;
      y.position.y = waterY + Math.sin(t * 0.6 + ph) * 0.08;
    }
  }

  return { group, update, count: yachts.length };
}
