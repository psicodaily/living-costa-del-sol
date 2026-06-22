import * as THREE from "three";

// Cielo, luces y atmósfera de Marbella (sol intenso mediterráneo).
// v1.2: cielo con degradado vertical (cúpula) + halo suave en el sol +
// niebla del color del horizonte para fundir la distancia con el cielo.

const HORIZON_COLOR = 0xcfe6f7; // azul muy claro junto al horizonte
const ZENITH_COLOR = 0x3b82c4; // azul más intenso arriba
const FOG_COLOR = 0xc4ddee;

export const SKY_COLOR = HORIZON_COLOR;

export function createSky(scene) {
  // Color de respaldo y niebla (tono del horizonte para fundir la lejanía).
  scene.background = new THREE.Color(HORIZON_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 140, 460);

  // Cúpula del cielo: esfera grande vista por dentro con degradado.
  const skyGeo = new THREE.SphereGeometry(600, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      topColor: { value: new THREE.Color(ZENITH_COLOR) },
      bottomColor: { value: new THREE.Color(HORIZON_COLOR) },
      offset: { value: 60 },
      exponent: { value: 0.8 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        float t = pow(max(h, 0.0), exponent);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Luz ambiental del cielo (azul arriba) y reflejo del suelo (cálido abajo).
  const hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0xdcc9a6, 0.85);
  scene.add(hemiLight);

  // Sol: luz direccional fuerte con sombras.
  const sun = new THREE.DirectionalLight(0xfff2d6, 2.0);
  sun.position.set(80, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -180;
  sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  // Disco solar visible en el cielo.
  const sunPos = sun.position.clone().multiplyScalar(2.4);
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(14, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false, toneMapped: false })
  );
  sunDisc.position.copy(sunPos);
  scene.add(sunDisc);

  // Halo suave alrededor del sol (sprite con degradado radial).
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xfff0c8,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
  );
  halo.scale.set(160, 160, 1);
  halo.position.copy(sunPos);
  scene.add(halo);

  return { sun, hemiLight, sky, sunDisc, halo };
}

// Textura de brillo radial (blanco al centro, transparente al borde).
function createGlowTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.25, "rgba(255,240,200,0.45)");
  g.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
