// Mini-mapa radar (esquina) + MAPA GRANDE con zoom, arrastre, edificios, zonas
// verdes/playa y NOMBRES de calles al acercar.

const SIZE = 180;
const RANGE = 220;
const GREEN = new Set(["park", "garden", "grass", "forest", "meadow", "recreation_ground"]);

export function createMinimapReal(data, { onBigToggle } = {}) {
  const roads = data.roads || [];

  // Segmentos de calle (para el radar) + límites del mundo.
  const segs = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const r of roads) {
    const p = r.path;
    if (!p || p.length < 2) continue;
    for (let i = 1; i < p.length; i++) segs.push([p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]]);
    for (const [x, z] of p) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }
  const cullR2 = (RANGE + 60) ** 2;

  // Edificios como rectángulos (para el mapa grande).
  const bRects = [];
  for (const b of data.buildings || []) {
    const f = b.footprint;
    if (!f || f.length < 3) continue;
    let aX = Infinity, bX = -Infinity, aZ = Infinity, bZ = -Infinity;
    for (const [x, z] of f) { if (x < aX) aX = x; if (x > bX) bX = x; if (z < aZ) aZ = z; if (z > bZ) bZ = z; }
    bRects.push([aX, aZ, bX - aX, bZ - aZ]);
  }
  // Zonas verdes / playa.
  const areas = [];
  for (const a of data.areas || []) {
    if (!a.polygon || a.polygon.length < 3) continue;
    const beach = a.kind === "beach" || a.kind === "sand";
    if (beach || GREEN.has(a.kind)) areas.push({ beach, poly: a.polygon });
  }
  // Un punto por nombre de calle (el de la calle más larga con ese nombre).
  const nameMap = new Map();
  for (const r of roads) {
    if (!r.name || !r.path || r.path.length < 2) continue;
    let len = 0;
    for (let i = 1; i < r.path.length; i++) len += Math.hypot(r.path[i][0] - r.path[i - 1][0], r.path[i][1] - r.path[i - 1][1]);
    const mid = r.path[Math.floor(r.path.length / 2)];
    const cur = nameMap.get(r.name);
    if (!cur || len > cur.len) nameMap.set(r.name, { x: mid[0], z: mid[1], len });
  }
  const names = [...nameMap.entries()].map(([name, p]) => ({ name, x: p.x, z: p.z }));

  // --- Radar ---
  const canvas = el("canvas");
  canvas.width = canvas.height = SIZE;
  canvas.style.cssText = ["position:fixed", "left:16px", "bottom:16px", "border-radius:50%", "border:2px solid rgba(255,255,255,0.5)", "box-shadow:0 4px 14px rgba(0,0,0,0.5)", "cursor:pointer", "z-index:6"].join(";");
  canvas.title = "Clic para abrir el mapa";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const rScale = (SIZE / 2 - 6) / RANGE;

  // --- Mapa grande ---
  const overlay = el("div");
  overlay.style.cssText = ["position:fixed", "inset:0", "display:none", "align-items:center", "justify-content:center", "background:rgba(6,12,22,0.85)", "z-index:18", "font-family:Segoe UI, system-ui, sans-serif"].join(";");
  const big = el("canvas");
  big.width = big.height = 820;
  big.style.cssText = "max-width:94vmin;max-height:94vmin;border-radius:12px;border:2px solid rgba(255,255,255,0.3);cursor:grab;";
  overlay.appendChild(big);
  const hint = el("div");
  hint.textContent = "Rueda: zoom · Arrastra: mover · M/Esc: cerrar";
  hint.style.cssText = "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);color:#fff;opacity:0.75;font-size:14px;background:rgba(0,0,0,0.4);padding:4px 12px;border-radius:10px;";
  overlay.appendChild(hint);
  document.body.appendChild(overlay);
  const bctx = big.getContext("2d");

  let bigOpen = false;
  let last = { cx: 0, cz: 0, heading: 0 };
  const BW = big.width;
  let viewCx = (minX + maxX) / 2;
  let viewCz = (minZ + maxZ) / 2;
  let ppm = (BW - 40) / Math.max(maxX - minX, maxZ - minZ); // píxeles por metro

  // Interacción del mapa grande.
  big.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = big.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * BW;
    const my = ((e.clientY - rect.top) / rect.height) * BW;
    const wx = viewCx + (mx - BW / 2) / ppm;
    const wz = viewCz + (my - BW / 2) / ppm;
    ppm *= e.deltaY < 0 ? 1.2 : 1 / 1.2;
    ppm = Math.max((BW - 40) / Math.max(maxX - minX, maxZ - minZ) / 1.5, Math.min(ppm, 3));
    viewCx = wx - (mx - BW / 2) / ppm;
    viewCz = wz - (my - BW / 2) / ppm;
    drawBig();
  }, { passive: false });
  let dragging = false;
  let lastMX = 0, lastMY = 0;
  big.addEventListener("pointerdown", (e) => { dragging = true; lastMX = e.clientX; lastMY = e.clientY; big.style.cursor = "grabbing"; });
  window.addEventListener("pointerup", () => { dragging = false; if (big) big.style.cursor = "grab"; });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = big.getBoundingClientRect();
    const s = BW / rect.width;
    viewCx -= ((e.clientX - lastMX) * s) / ppm;
    viewCz -= ((e.clientY - lastMY) * s) / ppm;
    lastMX = e.clientX; lastMY = e.clientY;
    drawBig();
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeBig(); });

  function toggleBig() { bigOpen ? closeBig() : openBig(); }
  function openBig() {
    bigOpen = true;
    overlay.style.display = "flex";
    // Centrar en el jugador al abrir.
    viewCx = last.cx; viewCz = last.cz;
    ppm = 0.12;
    drawBig();
    if (onBigToggle) onBigToggle(true);
  }
  function closeBig() {
    if (!bigOpen) return;
    bigOpen = false;
    overlay.style.display = "none";
    if (onBigToggle) onBigToggle(false);
  }

  function drawBig() {
    const bx = (x) => (x - viewCx) * ppm + BW / 2;
    const bz = (z) => (z - viewCz) * ppm + BW / 2;
    const half = BW / 2 / ppm;
    const vMinX = viewCx - half, vMaxX = viewCx + half, vMinZ = viewCz - half, vMaxZ = viewCz + half;
    const inView = (x, z, m = 0) => x > vMinX - m && x < vMaxX + m && z > vMinZ - m && z < vMaxZ + m;

    bctx.fillStyle = "#1a241a";
    bctx.fillRect(0, 0, BW, BW);

    // Zonas verdes / playa.
    for (const a of areas) {
      bctx.fillStyle = a.beach ? "#cdb98a" : "#33522a";
      bctx.beginPath();
      a.poly.forEach(([x, z], i) => (i ? bctx.lineTo(bx(x), bz(z)) : bctx.moveTo(bx(x), bz(z))));
      bctx.closePath();
      bctx.fill();
    }
    // Edificios (recortados a lo visible).
    bctx.fillStyle = "#5b5f66";
    for (const r of bRects) {
      if (!inView(r[0], r[1], r[2]) ) continue;
      bctx.fillRect(bx(r[0]), bz(r[1]), Math.max(1, r[2] * ppm), Math.max(1, r[3] * ppm));
    }
    // Calles.
    bctx.strokeStyle = "#9aa0a8";
    bctx.lineWidth = Math.max(0.6, ppm * 5);
    bctx.beginPath();
    for (const s of segs) {
      if (!inView(s[0], s[1]) && !inView(s[2], s[3])) continue;
      bctx.moveTo(bx(s[0]), bz(s[1]));
      bctx.lineTo(bx(s[2]), bz(s[3]));
    }
    bctx.stroke();
    // Nombres de calle (al acercar).
    if (ppm > 0.22) {
      bctx.fillStyle = "#fff";
      bctx.font = "12px Segoe UI, sans-serif";
      bctx.shadowColor = "#000";
      bctx.shadowBlur = 3;
      for (const n of names) {
        if (!inView(n.x, n.z)) continue;
        bctx.fillText(n.name, bx(n.x) + 3, bz(n.z));
      }
      bctx.shadowBlur = 0;
    }
    // Jugador.
    const px = bx(last.cx), pz = bz(last.cz);
    const dx = Math.sin(last.heading), dy = Math.cos(last.heading);
    bctx.fillStyle = "#ffd24a";
    bctx.strokeStyle = "#000";
    bctx.lineWidth = 1.5;
    bctx.beginPath();
    bctx.moveTo(px + dx * 12, pz + dy * 12);
    bctx.lineTo(px - dx * 8 - dy * 7, pz - dy * 8 + dx * 7);
    bctx.lineTo(px - dx * 8 + dy * 7, pz - dy * 8 - dx * 7);
    bctx.closePath();
    bctx.fill();
    bctx.stroke();

    bctx.fillStyle = "#fff";
    bctx.font = "bold 20px Segoe UI, sans-serif";
    bctx.fillText("MAPA — Costa del Sol (Marbella)", 16, 30);
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
    const cos = Math.cos(beta), sin = Math.sin(beta);
    const tx = (x, z) => SIZE / 2 + ((x - cx) * cos - (z - cz) * sin) * rScale;
    const ty = (x, z) => SIZE / 2 + ((x - cx) * sin + (z - cz) * cos) * rScale;
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
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  return { update, toggleBig, isBigOpen: () => bigOpen };
}

function el(tag) {
  return document.createElement(tag);
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
