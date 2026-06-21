import * as THREE from "three";

// Ciclo día/noche: mueve el sol en arco e interpola color/intensidad del sol,
// el ambiente, el cielo, la niebla y la exposición según la hora. De noche sale
// la luna y se encienden ventanas y farolas.

const DAY_LENGTH = 240; // segundos de tiempo real por día completo
const SUN_DIST = 200;

const DAY_TOP = new THREE.Color(0x3b82c4);
const DAY_BOTTOM = new THREE.Color(0xcfe6f7);
const NIGHT_TOP = new THREE.Color(0x070d1c);
const NIGHT_BOTTOM = new THREE.Color(0x16263e);
const SUNSET = new THREE.Color(0xff8a3d);
const SUN_DAY = new THREE.Color(0xfff2d6);
const SUN_LOW = new THREE.Color(0xffa860);

export function createDayNight({ sky, renderer, scene, windowMaterials = [], lampMaterials = [] }) {
  const { sun, hemiLight, sky: skyMesh, sunDisc, halo } = sky;
  const uni = skyMesh.material.uniforms;

  // Luna: luz tenue azulada + disco visible de noche.
  const moon = new THREE.DirectionalLight(0x9db8e8, 0);
  scene.add(moon);
  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(9, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xeaf0ff, fog: false, toneMapped: false })
  );
  moonDisc.visible = false;
  scene.add(moonDisc);

  let time = 8.5; // hora inicial (mañana)

  const _top = new THREE.Color();
  const _bottom = new THREE.Color();
  const _sun = new THREE.Color();

  function apply() {
    const a = ((time - 6) / 12) * Math.PI; // 0..PI durante el día
    const sx = Math.cos(a);
    const sy = Math.sin(a); // altura del sol (-1..1)

    sun.position.set(sx * SUN_DIST, sy * SUN_DIST, 0.3 * SUN_DIST);

    const dayF = THREE.MathUtils.clamp(sy, 0, 1);
    const nightF = 1 - THREE.MathUtils.clamp((sy + 0.05) / 0.25, 0, 1);
    const goldF = THREE.MathUtils.clamp(1 - Math.abs(sy) / 0.28, 0, 1);

    // Sol.
    sun.intensity = dayF * 2.0;
    sun.visible = sy > -0.05;
    sun.castShadow = sy > 0.05;
    _sun.copy(SUN_LOW).lerp(SUN_DAY, dayF);
    sun.color.copy(_sun);

    // Cielo + niebla.
    _top.copy(NIGHT_TOP).lerp(DAY_TOP, dayF);
    _bottom.copy(NIGHT_BOTTOM).lerp(DAY_BOTTOM, dayF);
    _bottom.lerp(SUNSET, goldF * 0.5);
    uni.topColor.value.copy(_top);
    uni.bottomColor.value.copy(_bottom);
    if (scene.fog) scene.fog.color.copy(_bottom);

    // Ambiente y exposición.
    hemiLight.intensity = 0.18 + dayF * 0.7;
    renderer.toneMappingExposure = 0.7 + dayF * 0.4;

    // Disco del sol / halo (día) y luna (noche).
    sunDisc.position.copy(sun.position).multiplyScalar(2);
    sunDisc.visible = sy > -0.05;
    if (halo) {
      halo.position.copy(sunDisc.position);
      halo.visible = sy > -0.05;
    }
    moon.position.set(-sx * SUN_DIST, Math.max(0.25, -sy) * SUN_DIST, -0.3 * SUN_DIST);
    moon.intensity = nightF * 0.35;
    moonDisc.position.copy(moon.position).multiplyScalar(1.8);
    moonDisc.visible = nightF > 0.1;

    // Ventanas y farolas encendidas de noche.
    for (const m of windowMaterials) m.emissiveIntensity = nightF * 1.1;
    for (const m of lampMaterials) m.emissiveIntensity = nightF * 1.4;
  }

  apply();

  return {
    update(delta) {
      time = (time + (delta * 24) / DAY_LENGTH) % 24;
      apply();
    },
    setTime(h) {
      time = ((h % 24) + 24) % 24;
      apply();
    },
    getClock() {
      const hh = Math.floor(time);
      const mm = Math.floor((time - hh) * 60);
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    },
  };
}
