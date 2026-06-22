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

// Texturas PBR (CC0): diffuse + normal + roughness, con repetición.
function texSet(slug) {
  const tl = new THREE.TextureLoader();
  const t = (url, srgb) => {
    const tx = tl.load(url);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.anisotropy = 8;
    if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  };
  return {
    map: t(`/textures/${slug}_diff.jpg`, true),
    normalMap: t(`/textures/${slug}_nor.jpg`, false),
    roughnessMap: t(`/textures/${slug}_rough.jpg`, false),
  };
}

// Carga modelos + texturas CC0. Si algo falla, hay respaldo procedural.
export async function loadAssets() {
  const [palm, sailboat] = await Promise.all([
    load("/models/palm.glb"),
    load("/models/sailboat.glb"),
  ]);
  const tex = {
    asphalt: texSet("asphalt"),
    paving: texSet("paving"),
    wall: texSet("wall"),
  };
  return { palm, sailboat, tex };
}

// Clon de un modelo escalado para que su LADO MÁS LARGO mida targetLen y con la
// base apoyada en y=0. Útil para colocar barcos/coches del tamaño correcto.
export function sizedClone(proto, targetLen) {
  const g = proto.clone(true);
  const box = new THREE.Box3().setFromObject(g);
  const dim = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
  const s = targetLen / dim;
  g.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(g);
  g.position.y = -box2.min.y;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
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
