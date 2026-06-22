// Puerto Banús: coloca YATES (con forma de barco) en el agua de la dársena, en
// dos filas a lo largo de un pantalán, meciéndose suavemente. El agua la pone el
// mar global (ground.js); aquí solo ponemos barcos donde realmente hay agua.
import * as THREE from "three";

const YACHT_SIZES = [
  { len: 11, beam: 3.0, cabinH: 1.5, color: 0xf6f6f2 },
  { len: 17, beam: 4.2, cabinH: 2.0, color: 0xeef2f6 },
  { len: 26, beam: 5.6, cabinH: 2.7, color: 0xffffff },
];

// Casco con PROA PUNTIAGUDA (forma de barco, largo y estrecho) + cubierta +
// cabina hacia popa. Se ve claramente como un barco, no como un coche.
function makeYacht({ len, beam, cabinH, color }) {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x9c8a6a, roughness: 0.8 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xeaf0f6, roughness: 0.3, metalness: 0.1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1b3142, roughness: 0.2, metalness: 0.3 });

  // Casco: contorno de barco visto desde arriba (popa ancha, proa en punta).
  const hb = beam / 2;
  const s = new THREE.Shape();
  s.moveTo(-hb, -len / 2);
  s.lineTo(hb, -len / 2);
  s.lineTo(hb, len * 0.22);
  s.lineTo(0, len / 2);          // proa en punta
  s.lineTo(-hb, len * 0.22);
  s.closePath();
  const hullH = beam * 0.62;
  const hullGeo = new THREE.ExtrudeGeometry(s, { depth: hullH, bevelEnabled: false });
  hullGeo.rotateX(-Math.PI / 2); // largo -> -Z, altura -> +Y
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = -hullH * 0.35; // se hunde un poco en el agua
  hull.castShadow = true;
  g.add(hull);

  // Cubierta de madera (encima del casco).
  const deck = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.86, 0.12, len * 0.82), deckMat);
  deck.position.y = hullH * 0.65;
  g.add(deck);

  // Cabina/superestructura hacia popa (+Z, porque la proa va a -Z) con cristales.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.62, cabinH, len * 0.34), cabinMat);
  cabin.position.set(0, hullH * 0.65 + cabinH / 2, len * 0.12);
  cabin.castShadow = true;
  g.add(cabin);
  const wind = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.64, cabinH * 0.5, len * 0.36), glassMat);
  wind.position.set(0, hullH * 0.65 + cabinH * 0.62, len * 0.12);
  g.add(wind);

  return g;
}

export function createMarina(area, waterY = 0.5, heightAt = () => 0) {
  const ring = area.polygon;
  const group = new THREE.Group();

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const horizontal = (maxX - minX) >= (maxZ - minZ);
  const isWater = (x, z) => heightAt(x, z) < waterY - 0.4; // solo donde hay agua de verdad

  // Pantalán central solo en los tramos con agua.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 });
  const crossMid = horizontal ? (minZ + maxZ) / 2 : (minX + maxX) / 2;
  const along0 = horizontal ? minX : minZ;
  const along1 = horizontal ? maxX : maxZ;

  const yachts = [];
  const STEP = 15, ROW_GAP = 13;
  let n = 0;
  for (let a = along0 + 6; a <= along1 - 6; a += STEP) {
    // Tramo de pantalán (si hay agua en el centro).
    const px = horizontal ? a : crossMid;
    const pz = horizontal ? crossMid : a;
    if (isWater(px, pz)) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? STEP * 0.8 : 2.2, 0.4, horizontal ? 2.2 : STEP * 0.8),
        pierMat
      );
      seg.position.set(px, waterY + 0.2, pz);
      group.add(seg);
    }
    for (const side of [-1, 1]) {
      const cross = crossMid + side * (ROW_GAP / 2);
      const x = horizontal ? a : cross;
      const z = horizontal ? cross : a;
      if (!isWater(x, z)) continue; // nunca en tierra
      const size = YACHT_SIZES[n % 5 === 0 ? 2 : n % 2 === 0 ? 1 : 0];
      const y = makeYacht(size);
      y.position.set(x, waterY, z);
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
      y.rotation.z = Math.sin(t * 0.8 + ph) * 0.025;
      y.position.y = waterY + Math.sin(t * 0.6 + ph) * 0.07;
    }
  }

  return { group, update, count: yachts.length };
}
