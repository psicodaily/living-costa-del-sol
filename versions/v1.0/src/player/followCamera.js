import * as THREE from "three";

// Cámara en tercera persona que sigue al jugador por detrás.
// Se puede girar arrastrando el ratón.
const DISTANCE = 12;
const HEIGHT = 6;
const LOOK_HEIGHT = 2.2;
const FOLLOW_SMOOTH = 6;

export function createFollowCamera(camera, domElement) {
  let yaw = Math.PI; // ángulo horizontal de la cámara
  let dragging = false;
  let lastX = 0;

  domElement.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
  });
  window.addEventListener("pointerup", () => (dragging = false));
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.005;
    lastX = e.clientX;
  });

  const desired = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  function update(delta, targetPos) {
    // Posición deseada: detrás del jugador según el ángulo `yaw`.
    desired.set(
      targetPos.x + Math.sin(yaw) * DISTANCE,
      targetPos.y + HEIGHT,
      targetPos.z + Math.cos(yaw) * DISTANCE
    );

    // Movimiento suave de la cámara hacia la posición deseada.
    const t = Math.min(1, FOLLOW_SMOOTH * delta);
    camera.position.lerp(desired, t);

    lookAt.set(targetPos.x, targetPos.y + LOOK_HEIGHT, targetPos.z);
    camera.lookAt(lookAt);
  }

  // El jugador se mueve relativo a la dirección de la cámara.
  function getYaw() {
    return yaw;
  }

  return { update, getYaw };
}
