import * as THREE from "three";

// Cámara en tercera persona que sigue a un objetivo (jugador o vehículo).
// Control con el RATÓN sin mantener el clic (Pointer Lock).
//   - Clic una vez para "capturar" el ratón.
//   - Mover el ratón gira la cámara (izq/dcha y arriba/abajo).
//   - Rueda del ratón para acercar/alejar.  Esc para liberar.
// Al conducir puede auto-colocarse detrás del vehículo cuando no tocas el ratón.

const MIN_DISTANCE = 6;
const MAX_DISTANCE = 22;
const DEFAULT_DISTANCE = 12;
const LOOK_HEIGHT = 2.2;
const FOLLOW_SMOOTH = 8;
const SENSITIVITY = 0.0025;
const MIN_PITCH = 0.12;
const MAX_PITCH = 1.25;
const AUTO_ALIGN_DELAY = 0.8; // s sin tocar el ratón antes de auto-seguir
const AUTO_ALIGN_SPEED = 2.5;

export function createFollowCamera(camera, domElement) {
  let yaw = Math.PI;
  let pitch = 0.45;
  let distance = DEFAULT_DISTANCE;
  let locked = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let idleTime = 0;

  const hint = createHint();

  domElement.addEventListener("click", () => {
    if (!locked) domElement.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === domElement;
    hint.style.opacity = locked ? "0" : "1";
  });

  // Ratón capturado. (Nota: arriba/abajo NO invertido — corregido en v1.3.)
  document.addEventListener("mousemove", (e) => {
    if (!locked) return;
    yaw -= e.movementX * SENSITIVITY;
    pitch += e.movementY * SENSITIVITY;
    pitch = THREE.MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH);
    idleTime = 0;
  });

  // Alternativa: arrastrar con el clic si no se captura el ratón.
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
    pitch += (e.clientY - lastY) * SENSITIVITY * 2;
    pitch = THREE.MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH);
    lastX = e.clientX;
    lastY = e.clientY;
    idleTime = 0;
  });

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

  function getYaw() {
    return yaw;
  }

  return { update, getYaw };
}

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
