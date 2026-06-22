// Carga de modelos 3D (GLB) y utilidad de INSTANCIADO para repetir el mismo
// modelo muchas veces de forma eficiente (1-2 draw calls por modelo).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

function load(url) {
  return new Promise((resolve) => {
    loader.load(url, (g) => resolve(g.scene), undefined, () => resolve(null));
  });
}

// Carga todos los modelos CC0 que usa el juego. Si alguno falla, devuelve null
// y el código tiene un respaldo procedural.
export async function loadAssets() {
  const [palm] = await Promise.all([load("/models/palm.glb")]);
  return { palm };
}

// Normaliza un modelo: lo centra en X/Z, apoya su base en y=0 y lo escala a una
// altura objetivo (metros). Devuelve la lista de mallas con su matriz acumulada.
function normalize(proto, targetH) {
  const box = new THREE.Box3().setFromObject(proto);
  const h = box.max.y - box.min.y || 1;
  const s = targetH / h;
  proto.scale.setScalar(s);
  proto.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  proto.updateMatrixWorld(true);
  const meshes = [];
  proto.traverse((o) => { if (o.isMesh) meshes.push(o); });
  return meshes;
}

// Crea InstancedMesh(es) de un modelo aplicando una transformación por copia.
// transforms: array de THREE.Matrix4 (posición/rotación/escala de cada copia).
export function instancePrototype(proto, transforms, targetH = 7) {
  const group = new THREE.Group();
  if (!proto || !transforms.length) return group;
  const meshes = normalize(proto.clone(true), targetH);
  const tmp = new THREE.Matrix4();
  for (const m of meshes) {
    const inst = new THREE.InstancedMesh(m.geometry, m.material, transforms.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    transforms.forEach((t, i) => { tmp.multiplyMatrices(t, m.matrixWorld); inst.setMatrixAt(i, tmp); });
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    group.add(inst);
  }
  return group;
}
