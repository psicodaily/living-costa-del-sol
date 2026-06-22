// Mini-mapa radar (esquina) + MAPA GRANDE de Marbella.
// Funciones: relieve (sombreado de cuestas), leyenda/índice de iconos,
// nombres de calle SOBRE cada carretera (rotados y ajustados al ancho), y
// marcar un destino para ver la RUTA por las calles (en el mapa y en el radar).

import { buildRouteGraph } from "../real/routeGraph.js";

const SIZE = 180;
const RANGE = 220;
const GREEN = new Set(["park", "garden", "grass", "forest", "meadow", "recreation_ground"]);

// Icono, etiqueta (para la leyenda) e importancia de cada tipo de sitio.
const POI_INFO = {
  hospital: { icon: "🏥", major: true, label: "Hospitales" },
  townhall: { icon: "🏛️", major: true, label: "Ayuntamiento" },
  police: { icon: "🚓", major: true, label: "Policía" },
  fire_station: { icon: "🚒", major: true, label: "Bomberos" },
  marketplace: { icon: "🛒", major: true, label: "Mercados" },
  place_of_worship: { icon: "⛪", major: false, label: "Iglesias" },
  pharmacy: { icon: "💊", major: false, label: "Farmacias" },
  bank: { icon: "🏦", major: false, label: "Bancos" },
  fuel: { icon: "⛽", major: false, label: "Gasolineras" },
};

// Abreviaturas para que el nombre quepa sobre la carretera.
const ABBR = [
  [/^Avenida\b/i, "Av."], [/^Carretera\b/i, "Ctra."], [/^Calle\b/i, "C/"],
  [/^Plaza\b/i, "Pl."], [/^Camino\b/i, "Cno."], [/^Paseo\b/i, "Pº"],
  [/^Urbanización\b/i, "Urb."], [/^Autovía\b/i, "A-"],
];
const FONT_MIN = 9, FONT_MAX = 20, ROAD_M = 5;

export function createMinimapReal(data, { onBigToggle } = {}) {
  const roads = data.roads || [];
  const pois = (data.pois || []).map((p) => ({ ...p, info: POI_INFO[p.kind] || { icon: "📍", major: false } }));
  const hidden = new Set(); // tipos de POI ocultados desde la leyenda

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

  // Zonas/distritos (perímetro + nombre), con un color por zona.
  const ZONE_COLORS = ["#e8643c", "#36b5e6", "#9a6cff", "#e8c33c", "#46c86a", "#ff5fa8", "#48d6c0"];
  const zones = (data.zones || []).map((z, i) => {
    let zx = 0, zz = 0;
    for (const [x, zc] of z.polygon) { zx += x; zz += zc; }
    const n = z.polygon.length || 1;
    return { name: z.name, poly: z.polygon, cx: zx / n, cz: zz / n, color: ZONE_COLORS[i % ZONE_COLORS.length] };
  });

  // Nombres de calle: fusionamos los tramos casi rectos de cada calle y nos
  // quedamos con el TRAMO más largo de cada nombre, para rotar la etiqueta
  // siguiéndolo y que quepa a lo largo de la calle (no del grosor).
  const ANG_TOL = Math.cos((28 * Math.PI) / 180);
  const nameRun = new Map(); // name -> { ax, az, bx, bz, lenM }
  for (const r of roads) {
    if (!r.name || !r.path || r.path.length < 2) continue;
    const path = r.path;
    let i = 0;
    while (i < path.length - 1) {
      const ax = path[i][0], az = path[i][1];
      let dirx = path[i + 1][0] - ax, dirz = path[i + 1][1] - az;
      let dl = Math.hypot(dirx, dirz) || 1; dirx /= dl; dirz /= dl;
      let j = i + 1;
      while (j < path.length - 1) {
        let nx = path[j + 1][0] - path[j][0], nz = path[j + 1][1] - path[j][1];
        const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        if (dirx * nx + dirz * nz < ANG_TOL) break; // giro fuerte: cierra el tramo
        j++;
      }
      const bx2 = path[j][0], bz2 = path[j][1];
      const lenM = Math.hypot(bx2 - ax, bz2 - az);
      const cur = nameRun.get(r.name);
      if (!cur || lenM > cur.lenM) nameRun.set(r.name, { ax, az, bx: bx2, bz: bz2, lenM });
      i = j;
    }
  }
  const names = [...nameRun.entries()].map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.lenM - a.lenM); // avenidas largas primero (ganan el anti-solape)

  // Relieve: canvas cacheado con el sombreado de las cuestas.
  const grid = data.heightGrid || null;
  const hillCanvas = grid && grid.values && grid.values.length ? buildHillshadeCanvas(grid) : null;

  // Grafo de calles para calcular rutas (waypoint): une rotondas y parte los
  // cruces para que el camino conecte por toda la ciudad.
  const graph = buildRouteGraph(roads, data.roundabouts || []);
  const nodeList = [...graph.nodes.entries()].map(([key, n]) => ({ key, x: n.x, z: n.z }));
  let route = null; // [{x,z}, ...] polilínea de la ruta
  let dest = null;  // {x,z} destino marcado

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
  hint.textContent = "Rueda: zoom · Arrastra: mover · Clic: marcar destino · Clic derecho: quitar · M/Esc: cerrar";
  hint.style.cssText = "position:fixed;bottom:14px;left:50%;transform:translateX(-50%);color:#fff;opacity:0.85;font-size:14px;background:rgba(0,0,0,0.45);padding:4px 12px;border-radius:10px;";
  overlay.appendChild(hint);
  overlay.appendChild(buildLegend());
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

  // Clic = marcar destino · Arrastre = mover el mapa (umbral para distinguir).
  let dragging = false, lastMX = 0, lastMY = 0, downX = 0, downY = 0, moved = false;
  const DRAG_THRESH = 6;
  big.addEventListener("pointerdown", (e) => {
    dragging = true; moved = false;
    downX = e.clientX; downY = e.clientY; lastMX = e.clientX; lastMY = e.clientY;
    big.style.cursor = "grabbing";
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_THRESH) moved = true;
    const rect = big.getBoundingClientRect();
    viewCx -= ((e.clientX - lastMX) * (BW / rect.width)) / ppm;
    viewCz -= ((e.clientY - lastMY) * (BH / rect.height)) / ppm;
    lastMX = e.clientX; lastMY = e.clientY;
    drawBig();
  });
  window.addEventListener("pointerup", (e) => {
    if (dragging && !moved && bigOpen && e.button === 0) {
      const rect = big.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * BW;
      const my = ((e.clientY - rect.top) / rect.height) * BH;
      if (mx >= 0 && mx <= BW && my >= 0 && my <= BH) {
        setDestination(viewCx + (mx - BW / 2) / ppm, viewCz + (my - BH / 2) / ppm);
      }
    }
    dragging = false;
    if (big) big.style.cursor = "grab";
  });
  big.addEventListener("contextmenu", (e) => { e.preventDefault(); clearRoute(); });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeBig(); });

  function toggleBig() { bigOpen ? closeBig() : openBig(); }
  function openBig() {
    bigOpen = true;
    overlay.style.display = "flex";
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

  // --- Ruta (waypoint) ---
  function nearestNode(wx, wz) {
    let best = null, bd = Infinity;
    for (const n of nodeList) {
      const d = (n.x - wx) ** 2 + (n.z - wz) ** 2;
      if (d < bd) { bd = d; best = n.key; }
    }
    return best;
  }
  function findPath(startKey, goalKey) {
    const { nodes, edges } = graph;
    if (!startKey || !goalKey || startKey === goalKey) return null;
    const goal = nodes.get(goalKey);
    const h = (k) => { const n = nodes.get(k); return Math.hypot(n.x - goal.x, n.z - goal.z); };
    const g = new Map([[startKey, 0]]);
    const f = new Map([[startKey, h(startKey)]]);
    const prev = new Map();
    const open = new Set([startKey]);
    while (open.size) {
      let cur = null, cf = Infinity;
      for (const k of open) { const v = f.get(k) ?? Infinity; if (v < cf) { cf = v; cur = k; } }
      if (cur === goalKey) break;
      open.delete(cur);
      for (const ei of nodes.get(cur).edges) {
        const e = edges[ei];
        const nb = e.a === cur ? e.b : e.a;
        const tentative = (g.get(cur) ?? Infinity) + e.len;
        if (tentative < (g.get(nb) ?? Infinity)) {
          prev.set(nb, cur);
          g.set(nb, tentative);
          f.set(nb, tentative + h(nb));
          open.add(nb);
        }
      }
    }
    if (!prev.has(goalKey)) return null;
    const keys = [goalKey];
    let c = goalKey;
    while (c !== startKey) { c = prev.get(c); if (c == null) return null; keys.push(c); }
    keys.reverse();
    return keys.map((k) => { const n = nodes.get(k); return { x: n.x, z: n.z }; });
  }
  function setDestination(wx, wz) {
    dest = { x: wx, z: wz };
    const mid = findPath(nearestNode(last.cx, last.cz), nearestNode(wx, wz));
    route = mid && mid.length
      ? [{ x: last.cx, z: last.cz }, ...mid, { x: wx, z: wz }]
      : [{ x: last.cx, z: last.cz }, { x: wx, z: wz }];
    drawBig();
  }
  function clearRoute() { route = null; dest = null; drawBig(); }

  function drawBig() {
    const bx = (x) => (x - viewCx) * ppm + BW / 2;
    const bz = (z) => (z - viewCz) * ppm + BH / 2;
    const hx = BW / 2 / ppm, hz = BH / 2 / ppm;
    const vMinX = viewCx - hx, vMaxX = viewCx + hx, vMinZ = viewCz - hz, vMaxZ = viewCz + hz;
    const inV = (x, z, m = 0) => x > vMinX - m && x < vMaxX + m && z > vMinZ - m && z < vMaxZ + m;

    bctx.fillStyle = "#0f2233"; // mar / fondo
    bctx.fillRect(0, 0, BW, BH);

    // Relieve (capa base de tierra) bajo todo lo demás.
    if (hillCanvas) {
      bctx.imageSmoothingEnabled = true;
      bctx.globalAlpha = 0.95;
      bctx.drawImage(hillCanvas, bx(grid.minX), bz(grid.minZ), grid.cols * grid.cellW * ppm, grid.rows * grid.cellH * ppm);
      bctx.globalAlpha = 1;
    }

    for (const a of areas) {
      bctx.globalAlpha = 0.72;
      bctx.fillStyle = a.beach ? "#d8c184" : "#3c6b2c";
      bctx.beginPath();
      a.poly.forEach(([x, z], i) => (i ? bctx.lineTo(bx(x), bz(z)) : bctx.moveTo(bx(x), bz(z))));
      bctx.closePath();
      bctx.fill();
    }
    // Relleno muy tenue de las zonas (debajo de edificios y calles).
    for (const z of zones) {
      bctx.globalAlpha = 0.12;
      bctx.fillStyle = z.color;
      bctx.beginPath();
      z.poly.forEach(([x, zc], i) => (i ? bctx.lineTo(bx(x), bz(zc)) : bctx.moveTo(bx(x), bz(zc))));
      bctx.closePath();
      bctx.fill();
    }
    bctx.globalAlpha = 1;
    bctx.fillStyle = "#5b5f66";
    for (const r of bRects) {
      if (!inV(r[0], r[1], r[2])) continue;
      bctx.fillRect(bx(r[0]), bz(r[1]), Math.max(1, r[2] * ppm), Math.max(1, r[3] * ppm));
    }
    bctx.strokeStyle = "#cfd4da";
    bctx.lineWidth = Math.max(0.6, ppm * ROAD_M);
    bctx.beginPath();
    for (const s of segs) {
      if (!inV(s[0], s[1]) && !inV(s[2], s[3])) continue;
      bctx.moveTo(bx(s[0]), bz(s[1]));
      bctx.lineTo(bx(s[2]), bz(s[3]));
    }
    bctx.stroke();

    // Ruta (sobre las calles, debajo de etiquetas/iconos).
    if (route && route.length > 1) {
      bctx.lineJoin = bctx.lineCap = "round";
      bctx.strokeStyle = "rgba(0,0,0,0.45)";
      bctx.lineWidth = Math.max(4, ppm * 9);
      strokePath(bctx, route, bx, bz);
      bctx.strokeStyle = "#2bd1ff";
      bctx.lineWidth = Math.max(2.5, ppm * 6);
      strokePath(bctx, route, bx, bz);
    }

    // Anti-solape de etiquetas: rectángulos ocupados.
    const taken = [];
    const fits = (x, y, w, h) => {
      for (const t of taken) if (x < t[0] + t[2] && x + w > t[0] && y < t[1] + t[3] && y + h > t[1]) return false;
      taken.push([x, y, w, h]);
      return true;
    };

    // POIs (prioritarios; respetan el filtro de la leyenda).
    bctx.textBaseline = "middle";
    bctx.textAlign = "start";
    for (const p of pois) {
      if (hidden.has(p.kind)) continue;
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

    // Nombres de calle SOBRE la carretera (rotados, sin pasarse del tramo).
    if (ppm > 0.3) {
      bctx.textAlign = "center";
      bctx.textBaseline = "middle";
      const widthAt = (px, txt) => { bctx.font = px + "px Segoe UI, sans-serif"; return bctx.measureText(txt).width; };
      for (const n of names) {
        if (!inV(n.ax, n.az) && !inV(n.bx, n.bz)) continue;
        const segPx = n.lenM * ppm;
        if (segPx < 26) continue; // tramo demasiado corto para una etiqueta legible
        const maxW = segPx * 0.9; // el texto no debe rebasar el tramo de calle
        const ax = bx(n.ax), ay = bz(n.az), bx2 = bx(n.bx), by2 = bz(n.bz);
        const cxp = (ax + bx2) / 2, cyp = (ay + by2) / 2;
        let ang = Math.atan2(by2 - ay, bx2 - ax);
        if (ang > Math.PI / 2) ang -= Math.PI;
        else if (ang < -Math.PI / 2) ang += Math.PI;

        // Letra legible que crece un poco con el zoom; se reduce/abrevia si no cabe.
        let label = n.name;
        let fontPx = Math.max(FONT_MIN, Math.min(FONT_MAX, 11 + ppm * 1.5));
        let w = widthAt(fontPx, label);
        while (w > maxW && fontPx > FONT_MIN) { fontPx -= 1; w = widthAt(fontPx, label); }
        if (w > maxW) {
          for (const [re, ab] of ABBR) if (re.test(label)) { label = label.replace(re, ab); break; }
          w = widthAt(fontPx, label);
          while (w > maxW && fontPx > FONT_MIN) { fontPx -= 1; w = widthAt(fontPx, label); }
        }
        if (w > maxW) continue; // ni abreviado cabe: lo omitimos

        const hw = w / 2 + 2, hh = fontPx / 2 + 2;
        const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
        const bbW = 2 * (hw * c + hh * s), bbH = 2 * (hw * s + hh * c);
        if (!fits(cxp - bbW / 2, cyp - bbH / 2, bbW, bbH)) continue;

        bctx.save();
        bctx.translate(cxp, cyp);
        bctx.rotate(ang);
        bctx.font = fontPx + "px Segoe UI, sans-serif";
        bctx.fillStyle = "#fbfbf6";
        bctx.shadowColor = "#000"; bctx.shadowBlur = 3;
        bctx.fillText(label, 0, 0);
        bctx.shadowBlur = 0;
        bctx.restore();
      }
      bctx.textAlign = "start";
    }

    // Zonas: perímetro punteado + nombre del distrito (estilo GTA).
    bctx.lineWidth = 2;
    bctx.setLineDash([9, 7]);
    for (const z of zones) {
      bctx.strokeStyle = z.color;
      bctx.beginPath();
      z.poly.forEach(([x, zc], i) => (i ? bctx.lineTo(bx(x), bz(zc)) : bctx.moveTo(bx(x), bz(zc))));
      bctx.closePath();
      bctx.stroke();
    }
    bctx.setLineDash([]);
    bctx.textAlign = "center";
    bctx.textBaseline = "middle";
    for (const z of zones) {
      if (!inV(z.cx, z.cz)) continue;
      const f = Math.max(13, Math.min(30, 12 + ppm * 7));
      bctx.font = `800 ${f}px Segoe UI, sans-serif`;
      bctx.fillStyle = "rgba(255,255,255,0.92)";
      bctx.shadowColor = "#000"; bctx.shadowBlur = 8;
      bctx.fillText(z.name.toUpperCase(), bx(z.cx), bz(z.cz));
      bctx.shadowBlur = 0;
    }
    bctx.textAlign = "start";

    // Marcador de destino.
    if (dest) {
      const X = bx(dest.x), Y = bz(dest.z);
      bctx.fillStyle = "#ff3b3b"; bctx.strokeStyle = "#fff"; bctx.lineWidth = 2;
      bctx.beginPath(); bctx.arc(X, Y, 8, 0, Math.PI * 2); bctx.fill(); bctx.stroke();
      bctx.beginPath(); bctx.arc(X, Y, 3, 0, Math.PI * 2); bctx.fillStyle = "#fff"; bctx.fill();
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
    bctx.textAlign = "start";
    bctx.fillStyle = "#fff";
    bctx.font = "bold 22px Segoe UI, sans-serif";
    bctx.shadowColor = "#000"; bctx.shadowBlur = 4;
    bctx.fillText("MAPA — Costa del Sol (Marbella)", 18, 34);
    bctx.shadowBlur = 0;
  }

  function update(cx, cz, heading, dots) {
    last = { cx, cz, heading };
    if (dest && Math.hypot(cx - dest.x, cz - dest.z) < 12) clearRoute();

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#16252b";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const beta = heading - Math.PI;
    const cos = Math.cos(beta), sin = Math.sin(beta);
    const tx = (x, z) => SIZE / 2 + ((x - cx) * cos - (z - cz) * sin) * rScale;
    const ty = (x, z) => SIZE / 2 + ((x - cx) * sin + (z - cz) * cos) * rScale;

    // Relieve en el radar (mismo canvas cacheado, rotado con el rumbo).
    if (hillCanvas) {
      const a = grid.cellW * cos * rScale, b = grid.cellW * sin * rScale;
      const cc = -grid.cellH * sin * rScale, d = grid.cellH * cos * rScale;
      const e = SIZE / 2 + ((grid.minX - cx) * cos - (grid.minZ - cz) * sin) * rScale;
      const ff = SIZE / 2 + ((grid.minX - cx) * sin + (grid.minZ - cz) * cos) * rScale;
      ctx.save();
      ctx.setTransform(a, b, cc, d, e, ff);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(hillCanvas, 0, 0);
      ctx.restore(); // vuelve a identidad + clip
    }

    ctx.strokeStyle = "#c2c7cd";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const s of segs) {
      if ((s[0] - cx) ** 2 + (s[1] - cz) ** 2 > cullR2 && (s[2] - cx) ** 2 + (s[3] - cz) ** 2 > cullR2) continue;
      ctx.moveTo(tx(s[0], s[1]), ty(s[0], s[1]));
      ctx.lineTo(tx(s[2], s[3]), ty(s[2], s[3]));
    }
    ctx.stroke();

    // Ruta en el radar.
    if (route && route.length > 1) {
      ctx.strokeStyle = "#2bd1ff";
      ctx.lineWidth = 3; ctx.lineJoin = ctx.lineCap = "round";
      strokePath(ctx, route, tx, ty);
    }

    // POIs mayores cercanos (respetan el filtro de la leyenda).
    ctx.textBaseline = "middle";
    ctx.font = "13px sans-serif";
    for (const p of pois) {
      if (!p.info.major || hidden.has(p.kind)) continue;
      if ((p.x - cx) ** 2 + (p.z - cz) ** 2 > cullR2) continue;
      ctx.fillText(p.info.icon, tx(p.x, p.z) - 7, ty(p.x, p.z));
    }
    ctx.textBaseline = "alphabetic";
    for (const dt of dots || []) {
      ctx.fillStyle = dt.color;
      ctx.beginPath();
      ctx.arc(tx(dt.x, dt.z), ty(dt.x, dt.z), dt.size || 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (dest) {
      ctx.fillStyle = "#ff3b3b";
      ctx.beginPath(); ctx.arc(tx(dest.x, dest.z), ty(dest.x, dest.z), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    arrowUp(ctx, SIZE / 2, SIZE / 2);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Construye el panel-leyenda (índice de iconos, con filtro al pulsar).
  function buildLegend() {
    const legend = el("div");
    legend.style.cssText = [
      "position:absolute", "top:18px", "right:18px", "z-index:3", "min-width:172px",
      "padding:12px 10px 10px", "background:linear-gradient(180deg,rgba(14,22,34,0.92),rgba(10,16,26,0.9))",
      "border:1px solid rgba(255,255,255,0.14)", "border-radius:12px",
      "box-shadow:0 8px 28px rgba(0,0,0,0.55)", "color:#e9edf2", "font-size:13px", "user-select:none",
    ].join(";");
    const title = el("div");
    title.textContent = "LEYENDA";
    title.style.cssText = "font-weight:700;font-size:11px;letter-spacing:1.5px;color:#9fb0c4;margin:0 4px 8px;";
    legend.appendChild(title);

    const makeRow = (icon, text, kind) => {
      const row = el("div");
      row.style.cssText = ["display:flex", "align-items:center", "gap:9px", "padding:5px 6px",
        "border-radius:8px", kind ? "cursor:pointer" : "cursor:default", "transition:background 120ms"].join(";");
      const ic = el("span");
      ic.textContent = icon;
      ic.style.cssText = "font-size:16px;width:20px;text-align:center;flex:0 0 auto;";
      const lb = el("span");
      lb.textContent = text;
      lb.style.cssText = "flex:1;white-space:nowrap;";
      row.appendChild(ic); row.appendChild(lb);
      if (kind) {
        const refresh = () => {
          const off = hidden.has(kind);
          row.style.opacity = off ? "0.4" : "1";
          lb.style.textDecoration = off ? "line-through" : "none";
        };
        row.addEventListener("mouseenter", () => { row.style.background = "rgba(255,255,255,0.08)"; });
        row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
        row.addEventListener("click", () => { hidden.has(kind) ? hidden.delete(kind) : hidden.add(kind); refresh(); drawBig(); });
        refresh();
      }
      return row;
    };

    for (const [kind, info] of Object.entries(POI_INFO)) legend.appendChild(makeRow(info.icon, info.label, kind));
    const sep = el("div");
    sep.style.cssText = "height:1px;background:rgba(255,255,255,0.12);margin:8px 4px;";
    legend.appendChild(sep);
    legend.appendChild(makeRow("🔺", "Tú (jugador)", null));
    legend.appendChild(makeRow("📍", "Destino", null));
    legend.appendChild(makeRow("🟦", "Ruta a seguir", null));
    return legend;
  }

  return { update, toggleBig, isBigOpen: () => bigOpen, setDestination, clearRoute };
}

function strokePath(c, pts, fx, fz) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(fx(p.x, p.z), fz(p.x, p.z)) : c.moveTo(fx(p.x, p.z), fz(p.x, p.z))));
  c.stroke();
}

// Sombreado de relieve (hillshade) a partir de la rejilla de alturas.
function buildHillshadeCanvas(grid) {
  const { cols, rows, values, cellW, cellH } = grid;
  const az = (315 * Math.PI) / 180, elev = (45 * Math.PI) / 180;
  const lx = Math.cos(elev) * Math.sin(az), ly = Math.cos(elev) * Math.cos(az), lz = Math.sin(elev);
  const ZSCALE = 3.0;
  // Paleta de tierra: de sombra (oscuro) a luz (oliva claro).
  const sh = [44, 58, 46], li = [150, 156, 116];

  const img = new ImageData(cols, rows);
  const d = img.data;
  const at = (x, z) => values[z * cols + x] || 0;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const xl = x > 0 ? x - 1 : x, xr = x < cols - 1 ? x + 1 : x;
      const zt = z > 0 ? z - 1 : z, zb = z < rows - 1 ? z + 1 : z;
      const dzdx = ((at(xr, z) - at(xl, z)) / (2 * cellW)) * ZSCALE;
      const dzdy = ((at(x, zb) - at(x, zt)) / (2 * cellH)) * ZSCALE;
      const nx = -dzdx, ny = -dzdy, nz = 1;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      let lum = (nx * lx + ny * ly + nz * lz) * inv;
      if (lum < 0) lum = 0;
      const k = (z * cols + x) * 4;
      d[k] = sh[0] + (li[0] - sh[0]) * lum;
      d[k + 1] = sh[1] + (li[1] - sh[1]) * lum;
      d[k + 2] = sh[2] + (li[2] - sh[2]) * lum;
      d[k + 3] = 255;
    }
  }
  const c = document.createElement("canvas");
  c.width = cols; c.height = rows;
  c.getContext("2d").putImageData(img, 0, 0);
  return c;
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
