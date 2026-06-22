// Mini-mapa radar (esquina) + MAPA GRANDE: zoom, arrastre, edificios, zonas,
// nombres de calle (sin amontonarse) e iconos de sitios importantes (POIs).

const SIZE = 180;
const RANGE = 220;
const GREEN = new Set(["park", "garden", "grass", "forest", "meadow", "recreation_ground"]);

// Icono, color e importancia de cada tipo de sitio.
const POI_INFO = {
  hospital: { icon: "🏥", major: true },
  townhall: { icon: "🏛️", major: true },
  police: { icon: "🚓", major: true },
  fire_station: { icon: "🚒", major: true },
  marketplace: { icon: "🛒", major: true },
  place_of_worship: { icon: "⛪", major: false },
  pharmacy: { icon: "💊", major: false },
  bank: { icon: "🏦", major: false },
  fuel: { icon: "⛽", major: false },
};

export function createMinimapReal(data, { onBigToggle } = {}) {
  const roads = data.roads || [];
  const pois = (data.pois || []).map((p) => ({ ...p, info: POI_INFO[p.kind] || { icon: "📍", major: false } }));

  // Segmentos de calle + límites del mundo.
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

  const bRects = [];
  for (const b of data.buildings || []) {
    const f = b.footprint;
    if (!f || f.length < 3) continue;
    let aX = Infinity, bX = -Infinity, aZ = Infinity, bZ = -Infinity;
    for (const [x, z] of f) { if (x < aX) aX = x; if (x > bX) bX = x; if (z < aZ) aZ = z; if (z > bZ) bZ = z; }
    bRects.push([aX, aZ, bX - aX, bZ - aZ]);
  }
  const areas = [];
  for (const a of data.areas || []) {
    if (!a.polygon || a.polygon.length < 3) continue;
    const beach = a.kind === "beach" || a.kind === "sand";
    if (beach || GREEN.has(a.kind)) areas.push({ beach, poly: a.polygon });
  }
  // Un punto por nombre de calle (la calle más larga con ese nombre).
  const nameMap = new Map();
  for (const r of roads) {
    if (!r.name || !r.path || r.path.length < 2) continue;
    let len = 0;
    for (let i = 1; i < r.path.length; i++) len += Math.hypot(r.path[i][0] - r.path[i - 1][0], r.path[i][1] - r.path[i - 1][1]);
    const mid = r.path[Math.floor(r.path.length / 2)];
    const cur = nameMap.get(r.name);
    if (!cur || len > cur.len) nameMap.set(r.name, { x: mid[0], z: mid[1], len });
  }
  const names = [...nameMap.entries()].map(([name, p]) => ({ name, x: p.x, z: p.z, len: p.len }))
    .sort((a, b) => b.len - a.len); // las avenidas largas primero

  // --- Radar ---
  const canvas = el("canvas");
  canvas.width = canvas.height = SIZE;
  canvas.style.cssText = ["position:fixed", "left:16px", "bottom:16px", "border-radius:50%", "border:2px solid rgba(255,255,255,0.5)", "box-shadow:0 4px 14px rgba(0,0,0,0.5)", "cursor:pointer", "z-index:6"].join(";");
  canvas.title = "Pulsa M para el mapa grande";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const rScale = (SIZE / 2 - 6) / RANGE;

  // --- Mapa grande (apaisado, ocupa casi toda la pantalla) ---
  const overlay = el("div");
  overlay.style.cssText = ["position:fixed", "inset:0", "display:none", "align-items:center", "justify-content:center", "background:rgba(6,12,22,0.9)", "z-index:18", "font-family:Segoe UI, system-ui, sans-serif"].join(";");
  const big = el("canvas");
  big.width = 1500;
  big.height = 900;
  big.style.cssText = "width:96vw;height:auto;max-height:92vh;border-radius:10px;border:2px solid rgba(255,255,255,0.3);cursor:grab;";
  overlay.appendChild(big);
  const hint = el("div");
  hint.textContent = "Rueda: zoom · Arrastra: mover · M/Esc: cerrar";
  hint.style.cssText = "position:fixed;bottom:14px;left:50%;transform:translateX(-50%);color:#fff;opacity:0.8;font-size:14px;background:rgba(0,0,0,0.45);padding:4px 12px;border-radius:10px;";
  overlay.appendChild(hint);
  document.body.appendChild(overlay);
  const bctx = big.getContext("2d");
  const BW = big.width, BH = big.height;

  let bigOpen = false;
  let last = { cx: 0, cz: 0, heading: 0 };
  let viewCx = (minX + maxX) / 2;
  let viewCz = (minZ + maxZ) / 2;
  let ppm = Math.min((BW - 40) / (maxX - minX), (BH - 40) / (maxZ - minZ));
  const minPpm = ppm * 0.8;

  big.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = big.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * BW;
    const my = ((e.clientY - rect.top) / rect.height) * BH;
    const wx = viewCx + (mx - BW / 2) / ppm;
    const wz = viewCz + (my - BH / 2) / ppm;
    ppm = Math.max(minPpm, Math.min(ppm * (e.deltaY < 0 ? 1.25 : 0.8), 4));
    viewCx = wx - (mx - BW / 2) / ppm;
    viewCz = wz - (my - BH / 2) / ppm;
    drawBig();
  }, { passive: false });
  let dragging = false, lastMX = 0, lastMY = 0;
  big.addEventListener("pointerdown", (e) => { dragging = true; lastMX = e.clientX; lastMY = e.clientY; big.style.cursor = "grabbing"; });
  window.addEventListener("pointerup", () => { dragging = false; if (big) big.style.cursor = "grab"; });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = big.getBoundingClientRect();
    viewCx -= ((e.clientX - lastMX) * (BW / rect.width)) / ppm;
    viewCz -= ((e.clientY - lastMY) * (BH / rect.height)) / ppm;
    lastMX = e.clientX; lastMY = e.clientY;
    drawBig();
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeBig(); });

  function toggleBig() { bigOpen ? closeBig() : openBig(); }
  function openBig() {
    bigOpen = true;
    overlay.style.display = "flex";
    // Encaja toda Marbella en pantalla (no centrado solo en el jugador).
    viewCx = (minX + maxX) / 2;
    viewCz = (minZ + maxZ) / 2;
    ppm = Math.min((BW - 60) / (maxX - minX), (BH - 80) / (maxZ - minZ));
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
    const bz = (z) => (z - viewCz) * ppm + BH / 2;
    const hx = BW / 2 / ppm, hz = BH / 2 / ppm;
    const vMinX = viewCx - hx, vMaxX = viewCx + hx, vMinZ = viewCz - hz, vMaxZ = viewCz + hz;
    const inV = (x, z, m = 0) => x > vMinX - m && x < vMaxX + m && z > vMinZ - m && z < vMaxZ + m;

    bctx.fillStyle = "#16201a";
    bctx.fillRect(0, 0, BW, BH);

    for (const a of areas) {
      bctx.fillStyle = a.beach ? "#cdb98a" : "#33522a";
      bctx.beginPath();
      a.poly.forEach(([x, z], i) => (i ? bctx.lineTo(bx(x), bz(z)) : bctx.moveTo(bx(x), bz(z))));
      bctx.closePath();
      bctx.fill();
    }
    bctx.fillStyle = "#5b5f66";
    for (const r of bRects) {
      if (!inV(r[0], r[1], r[2])) continue;
      bctx.fillRect(bx(r[0]), bz(r[1]), Math.max(1, r[2] * ppm), Math.max(1, r[3] * ppm));
    }
    bctx.strokeStyle = "#aab0b8";
    bctx.lineWidth = Math.max(0.6, ppm * 5);
    bctx.beginPath();
    for (const s of segs) {
      if (!inV(s[0], s[1]) && !inV(s[2], s[3])) continue;
      bctx.moveTo(bx(s[0]), bz(s[1]));
      bctx.lineTo(bx(s[2]), bz(s[3]));
    }
    bctx.stroke();

    // Etiquetas sin amontonarse: reservamos rectángulos ocupados.
    const taken = [];
    const fits = (x, y, w, h) => {
      for (const t of taken) if (x < t[0] + t[2] && x + w > t[0] && y < t[1] + t[3] && y + h > t[1]) return false;
      taken.push([x, y, w, h]);
      return true;
    };

    // 1) POIs (prioritarios). Mayores siempre; menores solo con zoom.
    bctx.textBaseline = "middle";
    for (const p of pois) {
      if (!inV(p.x, p.z)) continue;
      if (!p.info.major && ppm < 0.5) continue;
      const X = bx(p.x), Y = bz(p.z);
      bctx.font = "16px sans-serif";
      bctx.fillText(p.info.icon, X - 8, Y);
      if (p.name && (p.info.major || ppm > 0.8)) {
        bctx.font = "bold 12px Segoe UI, sans-serif";
        const w = bctx.measureText(p.name).width;
        if (fits(X + 10, Y - 7, w + 4, 14)) {
          bctx.fillStyle = "#fff";
          bctx.shadowColor = "#000"; bctx.shadowBlur = 3;
          bctx.fillText(p.name, X + 11, Y);
          bctx.shadowBlur = 0;
        }
      }
    }

    // 2) Nombres de calle (cuando hay zoom), evitando solapes.
    if (ppm > 0.3) {
      bctx.font = "12px Segoe UI, sans-serif";
      bctx.fillStyle = "#e7e7e7";
      for (const n of names) {
        if (!inV(n.x, n.z)) continue;
        const w = bctx.measureText(n.name).width;
        const X = bx(n.x), Y = bz(n.z);
        if (!fits(X, Y - 7, w + 6, 14)) continue;
        bctx.shadowColor = "#000"; bctx.shadowBlur = 3;
        bctx.fillText(n.name, X, Y);
        bctx.shadowBlur = 0;
      }
    }

    // Jugador.
    const px = bx(last.cx), pz = bz(last.cz);
    const dx = Math.sin(last.heading), dy = Math.cos(last.heading);
    bctx.fillStyle = "#ffd24a";
    bctx.strokeStyle = "#000";
    bctx.lineWidth = 1.5;
    bctx.beginPath();
    bctx.moveTo(px + dx * 13, pz + dy * 13);
    bctx.lineTo(px - dx * 9 - dy * 8, pz - dy * 9 + dx * 8);
    bctx.lineTo(px - dx * 9 + dy * 8, pz - dy * 9 - dx * 8);
    bctx.closePath();
    bctx.fill();
    bctx.stroke();

    bctx.textBaseline = "alphabetic";
    bctx.fillStyle = "#fff";
    bctx.font = "bold 22px Segoe UI, sans-serif";
    bctx.fillText("MAPA — Costa del Sol (Marbella)", 18, 34);
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
    // POIs mayores cercanos como iconos pequeños en el radar.
    ctx.textBaseline = "middle";
    ctx.font = "13px sans-serif";
    for (const p of pois) {
      if (!p.info.major) continue;
      if ((p.x - cx) ** 2 + (p.z - cz) ** 2 > cullR2) continue;
      ctx.fillText(p.info.icon, tx(p.x, p.z) - 7, ty(p.x, p.z));
    }
    ctx.textBaseline = "alphabetic";
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
