import * as THREE from "three";

// Cámara en tercera persona que sigue a un objetivo (jugador o vehículo).
// v1.6: se controla SOLO moviendo el ratón (sin hacer clic). El clic queda libre
// para abrir el mapa. La rueda acerca/aleja.

const MIN_DISTANCE = 6;
const MAX_DISTANCE = 22;
const DEFAULT_DISTANCE = 12;
const LOOK_HEIGHT = 2.2;
const FOLLOW_SMOOTH = 8;
const SENSITIVITY = 0.0022;
const MIN_PITCH = 0.12;
const MAX_PITCH = 1.25;
const AUTO_ALIGN_DELAY = 0.8;
const AUTO_ALIGN_SPEED = 2.5;

export function createFollowCamera(camera, domElement) {
  let yaw = Math.PI;
  let pitch = 0.45;
  let distance = DEFAULT_DISTANCE;
  let idleTime = 0;
  let sensitivity = SENSITIVITY;
  let active = true; // se desactiva en pausa o con el mapa abierto

  // Mover el ratón gira la cámara (sin necesidad de clic).
  window.addEventListener("mousemove", (e) => {
    if (!active) return;
    yaw -= e.movementX * sensitivity;
    pitch += e.movementY * sensitivity;
    pitch = THREE.MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH);
    idleTime = 0;
  });

  // Rueda: acercar/alejar.
  domElement.addEventListener(
    "wheel",
    (e) => {
      distance = THREE.MathUtils.clamp(
        distance + Math.sign(e.deltaY) * 1.2,
        MIN_DISTANCE,
        MAX_DISTANCE
      );
    },
    { passive: true }
  );

  const desired = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  // autoYaw: ángulo al que la cámara se alinea sola (p.ej. detrás del coche).
  function update(delta, targetPos, autoYaw = null) {
    idleTime += delta;
    if (autoYaw !== null && idleTime > AUTO_ALIGN_DELAY) {
      let d = autoYaw - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * Math.min(1, AUTO_ALIGN_SPEED * delta);
    }

    const cosP = Math.cos(pitch);
    desired.set(
      targetPos.x + Math.sin(yaw) * distance * cosP,
      targetPos.y + 2 + Math.sin(pitch) * distance,
      targetPos.z + Math.cos(yaw) * distance * cosP
    );

    const t = Math.min(1, FOLLOW_SMOOTH * delta);
    camera.position.lerp(desired, t);

    lookAt.set(targetPos.x, targetPos.y + LOOK_HEIGHT, targetPos.z);
    camera.lookAt(lookAt);
  }

  return {
    update,
    getYaw: () => yaw,
    setSensitivity: (mult) => (sensitivity = SENSITIVITY * mult),
    setActive: (v) => (active = v),
  };
}
