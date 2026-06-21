import * as THREE from "three";
import { CITY_HALF } from "./ground.js";

// Costa sur: playa de arena + mar translúcido con oleaje. Módulo independiente
// que se coloca más allá del borde sur de la ciudad, sin tocar la rejilla.

export function createCoast(scene) {
  const group = new THREE.Group();
  const edge = CITY_HALF;
  const beachDepth = 55;
  const width = 760;
  const shore = edge + beachDepth;

  // Lecho marino (evita ver el césped bajo el agua).
  const seabed = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 1000),
    new THREE.MeshStandardMaterial({ color: 0x114a64, roughness: 1 })
  );
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.set(0, -0.3, shore + 450);
  seabed.receiveShadow = true;
  group.add(seabed);

  // Playa de arena.
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(width, beachDepth),
    new THREE.MeshStandardMaterial({ color: 0xe9d9a8, roughness: 1 })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.0, edge + beachDepth / 2);
  beach.receiveShadow = true;
  group.add(beach);

  // Línea de orilla (espuma).
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 3.5),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.06, shore);
  group.add(foam);

  // Mar con oleaje (shader). Se funde con el horizonte usando niebla manual.
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x0a5a8c) },
      uShallow: { value: new THREE.Color(0x37acc6) },
      uFog: { value: new THREE.Color(0xc4ddee) },
      uFogNear: { value: 140 },
      uFogFar: { value: 470 },
    },
    vertexShader: `
      uniform float uTime;
      varying float vWave;
      varying float vDist;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.08 + uTime * 1.4) * 0.5 + cos(p.y * 0.12 + uTime * 1.1) * 0.4;
        p.z += w;
        vWave = w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFog;
      uniform float uFogNear;
      uniform float uFogFar;
      varying float vWave;
      varying float vDist;
      void main() {
        vec3 c = mix(uDeep, uShallow, clamp(vWave * 0.6 + 0.5, 0.0, 1.0));
        float f = clamp((vDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
        c = mix(c, uFog, f);
        gl_FragColor = vec4(c, mix(0.85, 1.0, f));
      }
    `,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(width, 900, 80, 80), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, shore + 450);
  group.add(water);

  scene.add(group);

  function update(time) {
    waterMat.uniforms.uTime.value = time;
  }

  return { group, update };
}
