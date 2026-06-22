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

  // Lecho marino (claramente por debajo del agua para que no parpadee).
  const seabed = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 1000),
    new THREE.MeshStandardMaterial({ color: 0x125774, roughness: 1 })
  );
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.set(0, -1.0, shore + 450);
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
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.12, shore);
  group.add(foam);

  // Mar con oleaje (shader). Se funde con el horizonte usando niebla manual.
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false, // evita parpadeo con el lecho marino
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x12709f) },
      uShallow: { value: new THREE.Color(0x3aa9c6) },
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
        // Varias olas combinadas (visibles en todo el mar) + rizos finos.
        float w = sin(p.x * 0.09 + uTime * 1.1) * 0.6
                + cos(p.y * 0.11 + uTime * 0.9) * 0.5
                + sin((p.x + p.y) * 0.05 + uTime * 0.7) * 0.4
                + sin(p.x * 0.30 + uTime * 1.8) * 0.12;
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
        // Bandas de color según la altura de la ola (contraste visible).
        vec3 c = mix(uDeep, uShallow, clamp(vWave * 0.45 + 0.5, 0.0, 1.0));
        // Brillo en las crestas.
        c += vec3(0.10) * smoothstep(0.5, 1.4, vWave);
        // Espuma blanca en las crestas más altas.
        float foam = smoothstep(1.1, 1.7, vWave);
        c = mix(c, vec3(0.92, 0.97, 1.0), foam * 0.5);
        float f = clamp((vDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
        c = mix(c, uFog, f);
        gl_FragColor = vec4(c, mix(0.9, 1.0, f));
      }
    `,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(width, 900, 150, 150), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, shore + 450);
  group.add(water);

  scene.add(group);

  function update(time) {
    waterMat.uniforms.uTime.value = time;
  }

  return { group, update };
}
