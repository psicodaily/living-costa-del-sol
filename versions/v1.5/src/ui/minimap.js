import { CITY, CELL, CITY_HALF } from "../world/index.js";

// Mini-mapa estilo radar (abajo a la izquierda): dibuja la rejilla de calles
// alrededor del jugador, con el norte hacia arriba. Usa un canvas 2D, sin
// segunda cámara 3D.

const SIZE = 180;
const RANGE = 95; // metros visibles alrededor del centro

export function createMinimap() {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.style.cssText = [
    "position:fixed",
    "left:16px",
    "bottom:16px",
    "border-radius:50%",
    "border:2px solid rgba(255,255,255,0.5)",
    "box-shadow:0 4px 14px rgba(0,0,0,0.5)",
    "pointer-events:none",
    "user-select:none",
    "z-index:6",
  ].join(";");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const scale = (SIZE / 2 - 6) / RANGE;

  const roadCoords = [];
  for (let i = 0; i <= CITY.blocks; i++) roadCoords.push(-CITY_HALF + i * CELL);

  function update(cx, cz, heading, dots) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.clip();

    // Fondo (suelo).
    ctx.fillStyle = "#243524";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const toX = (wx) => SIZE / 2 + (wx - cx) * scale;
    const toY = (wz) => SIZE / 2 + (wz - cz) * scale;

    // Calles.
    ctx.strokeStyle = "#5a5f66";
    ctx.lineWidth = CITY.roadWidth * scale;
    for (const rc of roadCoords) {
      ctx.beginPath();
      ctx.moveTo(toX(rc), -5);
      ctx.lineTo(toX(rc), SIZE + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5, toY(rc));
      ctx.lineTo(SIZE + 5, toY(rc));
      ctx.stroke();
    }

    // Puntos (NPCs, coche, etc.).
    for (const d of dots) {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(toX(d.x), toY(d.z), d.size || 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Flecha del jugador en el centro, orientada a su rumbo.
    drawArrow(ctx, SIZE / 2, SIZE / 2, heading);

    // Anillo del borde.
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  return { update };
}

function drawArrow(ctx, x, y, heading) {
  const dx = Math.sin(heading);
  const dy = Math.cos(heading);
  const px = -dy;
  const py = dx;
  ctx.fillStyle = "#ffd24a";
  ctx.beginPath();
  ctx.moveTo(x + dx * 9, y + dy * 9);
  ctx.lineTo(x - dx * 6 + px * 6, y - dy * 6 + py * 6);
  ctx.lineTo(x - dx * 6 - px * 6, y - dy * 6 - py * 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
