import { CITY, CELL, CITY_HALF, forEachBlock } from "../world/index.js";

// Mini-mapa estilo radar (abajo a la izquierda): ROTA con el jugador, así la
// flecha siempre apunta "hacia delante" (arriba). Al hacer clic se abre el
// mapa grande (toda la ciudad, norte arriba).

const SIZE = 180;
const RANGE = 95;

export function createMinimap({ onBigToggle } = {}) {
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
    "cursor:pointer",
    "z-index:6",
  ].join(";");
  canvas.title = "Clic para abrir el mapa";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const scale = (SIZE / 2 - 6) / RANGE;

  const roadCoords = [];
  for (let i = 0; i <= CITY.blocks; i++) roadCoords.push(-CITY_HALF + i * CELL);

  // --- Mapa grande (overlay) ---
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "display:none",
    "align-items:center",
    "justify-content:center",
    "background:rgba(6,12,22,0.75)",
    "z-index:18",
    "font-family:Segoe UI, system-ui, sans-serif",
  ].join(";");
  const big = document.createElement("canvas");
  big.width = 720;
  big.height = 720;
  big.style.cssText = "max-width:90vmin;max-height:90vmin;border-radius:12px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 12px 40px rgba(0,0,0,0.6);";
  overlay.appendChild(big);
  const hint = document.createElement("div");
  hint.textContent = "Clic o M / Esc para cerrar";
  hint.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);color:#fff;opacity:0.7;font-size:14px;";
  overlay.appendChild(hint);
  document.body.appendChild(overlay);
  const bctx = big.getContext("2d");

  let bigOpen = false;
  let last = { cx: 0, cz: 0, heading: 0, dots: [] };

  canvas.addEventListener("click", () => toggleBig());
  overlay.addEventListener("click", () => closeBig());

  function toggleBig() {
    bigOpen ? closeBig() : openBig();
  }
  function openBig() {
    bigOpen = true;
    overlay.style.display = "flex";
    drawBig();
    if (onBigToggle) onBigToggle(true);
  }
  function closeBig() {
    if (!bigOpen) return;
    bigOpen = false;
    overlay.style.display = "none";
    if (onBigToggle) onBigToggle(false);
  }

  function update(cx, cz, heading, dots) {
    last = { cx, cz, heading, dots };

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#243524";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Rotación para que "delante" quede arriba.
    const beta = heading - Math.PI;
    const cos = Math.cos(beta);
    const sin = Math.sin(beta);
    const tx = (wx, wz) => SIZE / 2 + ((wx - cx) * cos - (wz - cz) * sin) * scale;
    const ty = (wx, wz) => SIZE / 2 + ((wx - cx) * sin + (wz - cz) * cos) * scale;

    ctx.strokeStyle = "#5a5f66";
    ctx.lineWidth = CITY.roadWidth * scale;
    for (const rc of roadCoords) {
      line(ctx, tx(rc, cz - 300), ty(rc, cz - 300), tx(rc, cz + 300), ty(rc, cz + 300));
      line(ctx, tx(cx - 300, rc), ty(cx - 300, rc), tx(cx + 300, rc), ty(cx + 300, rc));
    }
    for (const d of dots) {
      ctx.fillStyle = d.color;
      dot(ctx, tx(d.x, d.z), ty(d.x, d.z), d.size || 2.2);
    }
    ctx.restore();

    drawArrowUp(ctx, SIZE / 2, SIZE / 2);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Mapa grande: toda la ciudad, norte arriba.
  function drawBig() {
    const W = big.width;
    const minX = -200;
    const maxX = 200;
    const minZ = -210;
    const maxZ = 260;
    const sc = W / (maxZ - minZ);
    const offX = (W - (maxX - minX) * sc) / 2;
    const bx = (wx) => offX + (wx - minX) * sc;
    const by = (wz) => (wz - minZ) * sc;

    // Tierra, playa y mar.
    bctx.fillStyle = "#3f5a36";
    bctx.fillRect(0, 0, W, by(CITY_HALF));
    bctx.fillStyle = "#e3d2a0";
    bctx.fillRect(0, by(CITY_HALF), W, by(CITY_HALF + 55) - by(CITY_HALF));
    bctx.fillStyle = "#1f6e93";
    bctx.fillRect(0, by(CITY_HALF + 55), W, W - by(CITY_HALF + 55));

    // Manzanas.
    bctx.fillStyle = "#c8c4ba";
    forEachBlock((cx2, cz2) => {
      const s = CITY.blockSize * sc;
      bctx.fillRect(bx(cx2) - s / 2, by(cz2) - s / 2, s, s);
    });

    // Calles.
    bctx.strokeStyle = "#3a3f47";
    bctx.lineWidth = CITY.roadWidth * sc;
    for (const rc of roadCoords) {
      line(bctx, bx(rc), by(-CITY_HALF - 6), bx(rc), by(CITY_HALF + 6));
      line(bctx, bx(-CITY_HALF - 6), by(rc), bx(CITY_HALF + 6), by(rc));
    }

    // Entidades (norte arriba).
    for (const d of last.dots) {
      bctx.fillStyle = d.color;
      dot(bctx, bx(d.x), by(d.z), (d.size || 2.2) * 1.6);
    }
    // Jugador con flecha de rumbo.
    const px = bx(last.cx);
    const py = by(last.cz);
    const dx = Math.sin(last.heading);
    const dy = Math.cos(last.heading);
    bctx.fillStyle = "#ffd24a";
    bctx.strokeStyle = "#000";
    bctx.lineWidth = 1.5;
    bctx.beginPath();
    bctx.moveTo(px + dx * 12, py + dy * 12);
    bctx.lineTo(px - dx * 8 - dy * 7, py - dy * 8 + dx * 7);
    bctx.lineTo(px - dx * 8 + dy * 7, py - dy * 8 - dx * 7);
    bctx.closePath();
    bctx.fill();
    bctx.stroke();

    // Título.
    bctx.fillStyle = "#fff";
    bctx.font = "bold 22px Segoe UI, sans-serif";
    bctx.fillText("MAPA — Marbella", 18, 32);
  }

  return { update, toggleBig, isBigOpen: () => bigOpen };
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawArrowUp(ctx, x, y) {
  ctx.fillStyle = "#ffd24a";
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x - 6, y + 6);
  ctx.lineTo(x + 6, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
