import * as THREE from "three";
import {
  createAsphaltTexture,
  createConcreteTexture,
  createCrosswalkTexture,
  createLaneTexture,
  tiled,
} from "./textures.js";

// Suelo + cuadrícula de calles.
// La ciudad es una rejilla: "manzanas" (acera de hormigón) separadas por calles
// asfaltadas, con líneas de carril, bordillos y pasos de cebra en los cruces.
export const CITY = {
  blocks: 6, // nº de manzanas por lado
  blockSize: 40, // tamaño de cada manzana
  roadWidth: 12, // ancho de las calles
};

export const CELL = CITY.blockSize + CITY.roadWidth;
export const CITY_HALF = (CITY.blocks * CELL) / 2;

// Centro de cada calle (i = 0..blocks). Las calles van ENTRE las manzanas.
function roadCoord(i) {
  return -CITY_HALF + i * CELL;
}

export function createGround(scene) {
  const asphaltBase = createAsphaltTexture();
  const concreteBase = createConcreteTexture();
  const laneBase = createLaneTexture();
  const crossTex = createCrosswalkTexture();

  const laneBaseH = laneBase.clone();
  laneBaseH.center.set(0.5, 0.5);
  laneBaseH.rotation = Math.PI / 2;
  laneBaseH.needsUpdate = true;

  // Suelo base (hierba). Llega solo hasta el borde sur de la ciudad (donde
  // empieza la playa): así el césped NO se mete bajo el mar (evita el verde
  // raro) y está más abajo que calles/aceras (evita el parpadeo / z-fighting).
  const groundW = CITY.blocks * CELL + 260;
  const landNorth = -(CITY_HALF + 130);
  const landSouth = CITY_HALF; // aquí empieza la playa
  const groundD = landSouth - landNorth;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundW, groundD),
    new THREE.MeshStandardMaterial({ color: 0x93b863, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.2, (landNorth + landSouth) / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  // Aceras: una losa de hormigón por manzana.
  const sidewalks = new THREE.Group();
  forEachBlock((cx, cz) => {
    const slab = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.blockSize, CITY.blockSize),
      new THREE.MeshStandardMaterial({
        map: tiled(concreteBase, CITY.blockSize / 6, CITY.blockSize / 6),
        roughness: 0.95,
      })
    );
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(cx, 0.02, cz);
    slab.receiveShadow = true;
    sidewalks.add(slab);
  });
  scene.add(sidewalks);

  // Calzadas asfaltadas + líneas de carril.
  const roads = new THREE.Group();
  const markings = new THREE.Group();
  const totalLen = CITY.blocks * CELL + CITY.roadWidth;
  const rw = CITY.roadWidth;
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    roughness: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  for (let i = 0; i <= CITY.blocks; i++) {
    const rc = roadCoord(i);

    // Calle vertical (a lo largo de Z).
    const vRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(rw, totalLen),
      new THREE.MeshStandardMaterial({
        map: tiled(asphaltBase, rw / 8, totalLen / 8),
        roughness: 0.95,
      })
    );
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(rc, 0.0, 0);
    vRoad.receiveShadow = true;
    roads.add(vRoad);
    addLine(markings, new THREE.PlaneGeometry(0.3, totalLen), rc, 0, edgeMat, true, tiled(laneBase, 1, totalLen / 6));
    addLine(markings, new THREE.PlaneGeometry(0.18, totalLen), rc - rw / 2 + 0.5, 0, edgeMat, false);
    addLine(markings, new THREE.PlaneGeometry(0.18, totalLen), rc + rw / 2 - 0.5, 0, edgeMat, false);

    // Calle horizontal (a lo largo de X).
    const hRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(totalLen, rw),
      new THREE.MeshStandardMaterial({
        map: tiled(asphaltBase, totalLen / 8, rw / 8),
        roughness: 0.95,
      })
    );
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.0, rc);
    hRoad.receiveShadow = true;
    roads.add(hRoad);
    addLineH(markings, new THREE.PlaneGeometry(totalLen, 0.3), 0, rc, edgeMat, true, tiled(laneBaseH, totalLen / 6, 1));
    addLineH(markings, new THREE.PlaneGeometry(totalLen, 0.18), 0, rc - rw / 2 + 0.5, edgeMat, false);
    addLineH(markings, new THREE.PlaneGeometry(totalLen, 0.18), 0, rc + rw / 2 - 0.5, edgeMat, false);
  }
  scene.add(roads);
  scene.add(markings);

  // Bordillos: marco bajo alrededor de cada manzana.
  const curbs = new THREE.Group();
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xbdb9b0, roughness: 0.9 });
  const B = CITY.blockSize;
  const curbH = 0.18;
  const curbT = 0.5;
  forEachBlock((cx, cz) => {
    const edges = [
      [cx, cz - B / 2, B + curbT, curbT],
      [cx, cz + B / 2, B + curbT, curbT],
      [cx - B / 2, cz, curbT, B + curbT],
      [cx + B / 2, cz, curbT, B + curbT],
    ];
    for (const [x, z, w, d] of edges) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(w, curbH, d), curbMat);
      curb.position.set(x, curbH / 2, z);
      curb.receiveShadow = true;
      curb.castShadow = true;
      curbs.add(curb);
    }
  });
  scene.add(curbs);

  // Pasos de cebra en los cruces interiores (los 4 lados).
  const crosswalks = new THREE.Group();
  const crossTexH = crossTex.clone();
  crossTexH.center.set(0.5, 0.5);
  crossTexH.rotation = Math.PI / 2;
  crossTexH.needsUpdate = true;
  const crossOpts = { transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };
  const matV = new THREE.MeshStandardMaterial({ map: crossTex, ...crossOpts });
  const matH = new THREE.MeshStandardMaterial({ map: crossTexH, ...crossOpts });

  const band = 3;
  const gap = rw / 2 + band / 2 + 0.4;
  const span = rw - 1.5;
  for (let i = 1; i < CITY.blocks; i++) {
    for (let j = 1; j < CITY.blocks; j++) {
      const ix = roadCoord(i);
      const jz = roadCoord(j);
      addCross(crosswalks, matV, ix, jz - gap, span, band); // norte
      addCross(crosswalks, matV, ix, jz + gap, span, band); // sur
      addCross(crosswalks, matH, ix - gap, jz, band, span); // oeste
      addCross(crosswalks, matH, ix + gap, jz, band, span); // este
    }
  }
  scene.add(crosswalks);

  return { ground, roads, markings, sidewalks, curbs, crosswalks };
}

// Línea de carril vertical (a lo largo de Z). `dashed` usa textura discontinua.
function addLine(group, geo, x, z, mat, dashed, dashMap) {
  const material = dashed
    ? new THREE.MeshStandardMaterial({
        map: dashMap,
        transparent: true,
        roughness: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    : mat;
  const line = new THREE.Mesh(geo, material);
  line.rotation.x = -Math.PI / 2;
  line.position.set(x, 0.04, z);
  group.add(line);
}

// Línea de carril horizontal (a lo largo de X).
function addLineH(group, geo, x, z, mat, dashed, dashMap) {
  addLine(group, geo, x, z, mat, dashed, dashMap);
}

function addCross(group, material, x, z, w, d) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, 0.06, z);
  plane.receiveShadow = true;
  group.add(plane);
}

// Recorre los centros de cada manzana (útil para colocar edificios).
export function forEachBlock(callback) {
  for (let row = 0; row < CITY.blocks; row++) {
    for (let col = 0; col < CITY.blocks; col++) {
      const x = -CITY_HALF + CITY.roadWidth / 2 + CITY.blockSize / 2 + col * CELL;
      const z = -CITY_HALF + CITY.roadWidth / 2 + CITY.blockSize / 2 + row * CELL;
      callback(x, z, row, col);
    }
  }
}
