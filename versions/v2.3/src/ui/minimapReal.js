// Mini-mapa radar para el MAPA REAL + mapa grande (clic o M).
// El radar rota con el jugador; el mapa grande muestra toda la Costa del Sol.

const SIZE = 180;
const RANGE = 220;

export function createMinimapReal(roads, { onBigToggle } = {}) {
  // Segmentos de calle (planos) para dibujar rápido.
  const segs = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const r of roads) {
    const p = r.path;
    if (!p || p.length < 2) continue;
    for (let i = 1; i < p.length; i++) {
      segs.push([p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]]);
    }
    for (const [x, z] of p) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  const cullR2 = (RANGE + 60) ** 2;

  // --- Radar (esquina) ---
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  canvas.style.cssText = [
    "position:fixed", "left:16px", "bottom:16px", "border-radius:50%",
    "border:2px solid rgba(255,255,255,0.5)", "box-shadow:0 4px 14px rgba(0,0,0,0.5)",
    "cursor:pointer", "z-index:6",
  ].join(";");
  canvas.title = "Clic para abrir el mapa";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const scale = (SIZE / 2 - 6) / RANGE;

  // --- Mapa grande (overlay) ---
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed", "inset:0", "display:none", "align-items:center", "justify-content:center",
    "background:rgba(6,12,22,0.8)", "z-index:18", "font-family:Segoe UI, system-ui, sans-serif",
  ].join(";");
  const big = document.createElement("canvas");
  big.width = big.height = 760;
  big.style.cssText = "max-width:92vmin;max-height:92vmin;border-radius:12px;border:2px solid rgba(255,255,255,0.3);";
  overlay.appendChild(big);
  const hint = document.createElement("div");
  hint.textContent = "Clic, M o Esc para cerrar";
  hint.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);color:#fff;opacity:0.7;font-size:14px;";
  overlay.appendChild(hint);
  document.body.appendChild(overlay);
  const bctx = big.getContext("2d");

  let bigOpen = false;
  let last = { cx: 0, cz: 0, heading: 0 };

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
    last = { cx, cz, heading };
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#222a22";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const beta = heading - Math.PI;
    const cos = Math.cos(beta);
    const sin = Math.sin(beta);
    const tx = (x, z) => SIZE / 2 + ((x - cx) * cos - (z - cz) * sin) * scale;
    const ty = (x, z) => SIZE / 2 + ((x - cx) * sin + (z - cz) * cos) * scale;

    ctx.strokeStyle = "#7a8088";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const s of segs) {
      if ((s[0] - cx) ** 2 + (s[1] - cz) ** 2 > cullR2 && (s[2] - cx) ** 2 + (s[3] - cz) ** 2 > cullR2) continue;
      ctx.moveTo(tx(s[0], s[1]), ty(s[0], s[1]));
      ctx.lineTo(tx(s[2], s[3]), ty(s[2], s[3]));
    }
    ctx.stroke();

    for (const d of dots || []) {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(tx(d.x, d.z), ty(d.x, d.z), d.size || 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    arrowUp(ctx, SIZE / 2, SIZE / 2);
    ring(ctx, SIZE / 2, SIZE / 2, SIZE / 2 - 3);
  }

  // Mapa grande: toda la ciudad (norte arriba) + posición del jugador.
  function drawBig() {
    const W = big.width;
    bctx.fillStyle = "#1a241a";
    bctx.fillRect(0, 0, W, W);
    const pad = 30;
    const sc = Math.min((W - pad * 2) / (maxX - minX), (W - pad * 2) / (maxZ - minZ));
    const offX = (W - (maxX - minX) * sc) / 2;
    const offZ = (W - (maxZ - minZ) * sc) / 2;
    const bx = (x) => offX + (x - minX) * sc;
    const bz = (z) => offZ + (z - minZ) * sc;

    bctx.strokeStyle = "#6f757d";
    bctx.lineWidth = 1;
    bctx.beginPath();
    for (const s of segs) {
      bctx.moveTo(bx(s[0]), bz(s[1]));
      bctx.lineTo(bx(s[2]), bz(s[3]));
    }
    bctx.stroke();

    // Jugador.
    const px = bx(last.cx);
    const pz = bz(last.cz);
    bctx.fillStyle = "#ffd24a";
    bctx.strokeStyle = "#000";
    bctx.lineWidth = 1.5;
    const dx = Math.sin(last.heading);
    const dy = Math.cos(last.heading);
    bctx.beginPath();
    bctx.moveTo(px + dx * 11, pz + dy * 11);
    bctx.lineTo(px - dx * 7 - dy * 6, pz - dy * 7 + dx * 6);
    bctx.lineTo(px - dx * 7 + dy * 6, pz - dy * 7 - dx * 6);
    bctx.closePath();
    bctx.fill();
    bctx.stroke();

    bctx.fillStyle = "#fff";
    bctx.font = "bold 22px Segoe UI, sans-serif";
    bctx.fillText("MAPA — Costa del Sol (Marbella)", 18, 34);
  }

  return { update, toggleBig, isBigOpen: () => bigOpen };
}

function arrowUp(ctx, x, y) {
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

function ring(ctx, x, y, r) {
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
