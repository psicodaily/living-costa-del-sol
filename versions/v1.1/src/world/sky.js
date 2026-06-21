import * as THREE from "three";

// Cielo, luces y atmósfera de Marbella (sol intenso mediterráneo).
// Devuelve el color de cielo para reutilizarlo en la niebla del escenario.
export const SKY_COLOR = 0x87c5ff;

export function createSky(scene) {
  // Color de fondo + niebla para dar sensación de distancia.
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, 120, 420);

  // Luz ambiental del cielo (azul arriba) y reflejo del suelo (cálido abajo).
  const hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0xdcc9a6, 0.9);
  scene.add(hemiLight);

  // Sol: luz direccional fuerte con sombras.
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.6);
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

  // Disco solar visible en el cielo (estético).
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(14, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false })
  );
  sunDisc.position.copy(sun.position).multiplyScalar(2.4);
  scene.add(sunDisc);

  return { sun, hemiLight };
}
