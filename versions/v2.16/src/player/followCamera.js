import * as THREE from "three";

// Cámara en tercera persona estilo GTA.
// Funciona con "captura de ratón" (Pointer Lock): haces UN clic en la pantalla y
// el ratón queda capturado (cursor oculto). A partir de ahí giras la cámara con
// total libertad y suavidad, igual que GTA en PC — sin volver a hacer clic.
//   - Clic en el juego  -> capturar ratón (entrar en modo cámara).
//   - Mover ratón        -> girar (izq/dcha y arriba/abajo).
//   - Rueda              -> acercar / alejar.
//   - Esc                -> soltar el ratón.   M -> abrir el mapa.

const MIN_DISTANCE = 5;
const MAX_DISTANCE = 20;
const DEFAULT_DISTANCE = 8.5;
const LOOK_HEIGHT = 2.0;
const FOLLOW_SMOOTH = 10;
const SENSITIVITY = 0.0022;
const MIN_PITCH = 0.08;
const MAX_PITCH = 1.3;
const AUTO_ALIGN_DELAY = 0.9;
const AUTO_ALIGN_SPEED = 2.2;

export function createFollowCamera(camera, domElement) {
  let yaw = Math.PI;
  let pitch = 0.32;
  let distance = DEFAULT_DISTANCE;
  let idleTime = 0;
  let sensitivity = SENSITIVITY;
  let active = true; // se desactiva en pausa o con el mapa abierto
  let locked = false;

  const hint = createHint();

  // Clic en el área de juego -> capturar el ratón (mouselook).
  domElement.addEventListener("click", () => {
    if (active && !locked) domElement.requestPointerLock?.();
  });

  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === domElement;
    hint.style.opacity = !locked && active ? "1" : "0";
  });

  // Giro de cámara con el ratón capturado.
  document.addEventListener("mousemove", (e) => {
    if (!locked) return;
    yaw -= e.movementX * sensitivity;
    pitch += e.movementY * sensitivity;
    pitch = THREE.MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH);
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

  function setActive(v) {
    active = v;
    if (!v && locked && document.exitPointerLock) document.exitPointerLock();
    hint.style.opacity = !locked && active ? "1" : "0";
  }

  return {
    update,
    getYaw: () => yaw,
    setSensitivity: (mult) => (sensitivity = SENSITIVITY * mult),
    setActive,
  };
}

function createHint() {
  const el = document.createElement("div");
  el.textContent = "🖱️ Haz clic para mirar con el ratón (como GTA)";
  el.style.cssText = [
    "position:fixed",
    "bottom:28px",
    "left:50%",
    "transform:translateX(-50%)",
    "padding:8px 16px",
    "background:rgba(10,20,35,0.78)",
    "color:#fff",
    "font-family:Segoe UI, system-ui, sans-serif",
    "font-size:14px",
    "border:1px solid rgba(255,255,255,0.15)",
    "border-radius:20px",
    "pointer-events:none",
    "user-select:none",
    "transition:opacity 0.4s ease",
    "z-index:7",
  ].join(";");
  document.body.appendChild(el);
  return el;
}
