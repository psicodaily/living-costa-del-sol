// Lee el teclado: flechas y WASD para moverse, Shift para correr.
export function createControls() {
  const keys = {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
  };

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
    // Evita que las flechas hagan scroll en la página.
    if (e.code.startsWith("Arrow")) e.preventDefault();
    setKey(e.code, true);
  });
  window.addEventListener("keyup", (e) => setKey(e.code, false));

  return keys;
}
