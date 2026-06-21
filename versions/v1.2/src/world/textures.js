import * as THREE from "three";

// Texturas generadas por código (canvas). No descargan imágenes: son ligeras
// y se reutilizan entre objetos. Cada una se devuelve como "base"; para cada
// objeto se clona con tiled() y se ajusta cuántas veces se repite.

function makeCanvas(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

function finish(canvas, { repeat = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Devuelve una copia de una textura base con su propia repetición.
export function tiled(baseTex, repeatX, repeatY) {
  const t = baseTex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY));
  t.needsUpdate = true;
  return t;
}

// Fachada: fondo blanco (para que el color del edificio lo tiñe) con rejilla
// de ventanas más oscuras. Una "baldosa" = 3x3 ventanas.
export function createWindowTexture() {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const cells = 3;
  const cell = size / cells;
  const winW = cell * 0.58;
  const winH = cell * 0.62;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const px = x * cell + (cell - winW) / 2;
      const py = y * cell + (cell - winH) / 2;
      ctx.fillStyle = "#6f8294"; // cristal (más oscuro que la pared)
      ctx.fillRect(px, py, winW, winH);
      ctx.fillStyle = "#9fb1c2"; // reflejo suave en la mitad superior
      ctx.fillRect(px, py, winW, winH * 0.42);
      ctx.strokeStyle = "#d8d8d8"; // marco
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, winW, winH);
    }
  }
  return finish(c);
}

// Asfalto: gris oscuro con grano sutil.
export function createAsphaltTexture() {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#3a3f47";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 40 + Math.random() * 35;
    ctx.fillStyle = `rgba(${v},${v},${v + 6},0.18)`;
    ctx.fillRect(x, y, 2, 2);
  }
  return finish(c);
}

// Acera: hormigón claro con junturas tipo baldosa.
export function createConcreteTexture() {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c8c4ba";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 180 + Math.random() * 40;
    ctx.fillStyle = `rgba(${v},${v},${v - 8},0.15)`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Junturas (baldosas).
  ctx.strokeStyle = "rgba(120,116,108,0.55)";
  ctx.lineWidth = 3;
  const tiles = 2;
  const step = size / tiles;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }
  return finish(c);
}

// Paso de cebra: barras blancas verticales sobre fondo transparente.
export function createCrosswalkTexture() {
  const size = 128;
  const c = makeCanvas(size);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  const bars = 5;
  const barW = size / (bars * 2);
  ctx.fillStyle = "#f2f2f2";
  for (let i = 0; i < bars; i++) {
    ctx.fillRect(i * barW * 2 + barW * 0.5, 4, barW, size - 8);
  }
  return finish(c, { repeat: false });
}
