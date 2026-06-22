// Lee el teclado: flechas y WASD para moverse, Shift para correr.
// Además permite registrar acciones de "pulsación única" (p.ej. E para el coche).
export function createControls() {
  const keys = {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
  };

  const pressHandlers = {};
  function onPress(code, handler) {
    pressHandlers[code] = handler;
  }

  function setKey(code, value) {
    switch (code) {
      case "ArrowUp":
      case "KeyW":
        keys.forward = value;
        break;
      case "ArrowDown":
      case "KeyS":
        keys.back = value;
        break;
      case "ArrowLeft":
      case "KeyA":
        keys.left = value;
        break;
      case "ArrowRight":
      case "KeyD":
        keys.right = value;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.run = value;
        break;
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.code.startsWith("Arrow")) e.preventDefault();
    setKey(e.code, true);
    // Acciones de pulsación única (ignora la repetición al mantener la tecla).
    if (!e.repeat && pressHandlers[e.code]) pressHandlers[e.code]();
  });
  window.addEventListener("keyup", (e) => setKey(e.code, false));

  return { keys, onPress };
}
