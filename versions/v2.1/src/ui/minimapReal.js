// Mini-mapa radar para el MAPA REAL: dibuja las calles reales (polilíneas)
// alrededor del jugador, rotando para que "delante" quede arriba.

const SIZE = 180;
const RANGE = 220; // metros visibles alrededor

export function createMinimapReal(roads) {
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
    "z-index:6",
  ].join(";");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const scale = (SIZE / 2 - 6) / RANGE;

  // Aplana las calles en segmentos para dibujar rápido.
  const segs = [];
  for (const r of roads) {
    const p = r.path;
    if (!p || p.length < 2) continue;
    for (let i = 1; i < p.length; i++) {
      segs.push([p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]]);
    }
  }
  const cullR2 = (RANGE + 60) ** 2;

  function update(cx, cz, heading, dots) {
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
      if ((s[0] - cx) ** 2 + (s[1] - cz) ** 2 > cullR2 && (s[2] - cx) ** 2 + (s[3] - cz) ** 2 > cullR2) {
        continue;
      }
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

    // Flecha del jugador (siempre hacia arriba).
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.moveTo(SIZE / 2, SIZE / 2 - 9);
    ctx.lineTo(SIZE / 2 - 6, SIZE / 2 + 6);
    ctx.lineTo(SIZE / 2 + 6, SIZE / 2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  return { update };
}
