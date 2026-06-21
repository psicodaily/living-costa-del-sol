import * as THREE from "three";

// Cámara en tercera persona que sigue al jugador por detrás.
// v1.1: control con el RATÓN sin tener que mantener el clic (Pointer Lock).
//   - Haz clic una vez en la pantalla para "capturar" el ratón.
//   - Mueve el ratón para girar la cámara (izquierda/derecha y arriba/abajo).
//   - Rueda del ratón para acercar/alejar.
//   - Pulsa Esc para liberar el ratón.
// Si el ratón NO está capturado, también funciona arrastrando con el clic (alternativa).

const MIN_DISTANCE = 6;
const MAX_DISTANCE = 22;
const DEFAULT_DISTANCE = 12;
const LOOK_HEIGHT = 2.2;
const FOLLOW_SMOOTH = 8;
const SENSITIVITY = 0.0025;
const MIN_PITCH = 0.12; // casi a ras de suelo
const MAX_PITCH = 1.25; // casi en picado desde arriba

export function createFollowCamera(camera, domElement) {
  let yaw = Math.PI; // ángulo horizontal
  let pitch = 0.45; // ángulo vertical (elevación)
  let distance = DEFAULT_DISTANCE;
  let locked = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  // Aviso visual para que el usuario sepa que debe hacer clic.
  const hint = createHint();

  // --- Pointer Lock: clic para capturar el ratón ---
  domElement.addEventListener("click", () => {
    if (!locked) domElement.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === domElement;
    hint.style.opacity = locked ? "0" : "1";
  });

  // Movimiento del ratón cuando está capturado.
  document.addEventListener("mousemove", (e) => {
    if (locked) {
      yaw -= e.movementX * SENSITIVITY;
      pitch -= e.movementY * SENSITIVITY;
      pitch = THREE.MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH);
    }
  });

  // --- Alternativa: arrastrar con el clic si no se captura el ratón ---
  domElement.addEventListener("pointerdown", (e) => {
    if (locked) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener("pointerup", () => (dragging = false));
  window.addEventListener("pointermove", (e) => {
    if (!dragging || locked) return;
    yaw -= (e.clientX - lastX) * SENSITIVITY * 2;
    pitch -= (e.clientY - lastY) * SENSITIVITY * 2;
    pitch = THREE.MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH);
    lastX = e.clientX;
    lastY = e.clientY;
  });

  // Rueda del ratón: zoom de la cámara.
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

  function update(delta, targetPos) {
    const cosP = Math.cos(pitch);
    // Posición orbital detrás y por encima del jugador.
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

  // El movimiento del jugador es relativo a la dirección horizontal de la cámara.
  function getYaw() {
    return yaw;
  }

  return { update, getYaw };
}

// Pequeño cartel central que invita a hacer clic para activar el ratón.
function createHint() {
  const el = document.createElement("div");
  el.textContent = "🖱️ Haz clic para mirar con el ratón";
  el.style.cssText = [
    "position:fixed",
    "bottom:28px",
    "left:50%",
    "transform:translateX(-50%)",
    "padding:8px 16px",
    "background:rgba(10,20,35,0.72)",
    "color:#fff",
    "font-family:Segoe UI, system-ui, sans-serif",
    "font-size:14px",
    "border:1px solid rgba(255,255,255,0.15)",
    "border-radius:20px",
    "pointer-events:none",
    "user-select:none",
    "transition:opacity 0.4s ease",
    "z-index:5",
  ].join(";");
  document.body.appendChild(el);
  return el;
}
