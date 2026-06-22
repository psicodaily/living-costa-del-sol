import { getState, onChange } from "../state/gameState.js";

// HUD estilo GTA (abajo a la izquierda, encima del mini-mapa): dinero con
// contador animado y barra de salud que cambia de color.

function div(styles, text) {
  const el = document.createElement("div");
  el.style.cssText = styles;
  if (text != null) el.textContent = text;
  return el;
}

export function createHud() {
  const wrap = div(
    [
      "position:fixed",
      "left:16px",
      "bottom:206px",
      "width:180px",
      "font-family:Segoe UI, system-ui, sans-serif",
      "pointer-events:none",
      "user-select:none",
      "z-index:6",
    ].join(";")
  );

  const money = div(
    [
      "color:#ffd24a",
      "font-size:24px",
      "font-weight:800",
      "text-shadow:0 2px 5px rgba(0,0,0,0.6)",
      "text-align:right",
      "margin-bottom:6px",
    ].join(";"),
    "€ 0"
  );

  const barOuter = div(
    [
      "height:14px",
      "background:rgba(10,20,35,0.7)",
      "border:1px solid rgba(255,255,255,0.18)",
      "border-radius:8px",
      "overflow:hidden",
    ].join(";")
  );
  const barFill = div(
    ["height:100%", "width:100%", "background:#4caf50", "transition:width 0.25s ease, background 0.25s ease"].join(";")
  );
  barOuter.appendChild(barFill);

  wrap.appendChild(money);
  wrap.appendChild(barOuter);
  document.body.appendChild(wrap);

  onChange((s) => {
    barFill.style.width = s.health + "%";
    barFill.style.background = s.health > 50 ? "#4caf50" : s.health > 20 ? "#ffb300" : "#e53935";
  });

  // El dinero mostrado "sube" suavemente hasta el valor real.
  let shown = 0;
  function update(delta) {
    const target = getState().money;
    if (shown !== target) {
      shown += (target - shown) * Math.min(1, 6 * delta);
      if (Math.abs(target - shown) < 1) shown = target;
      money.textContent = "€ " + Math.round(shown).toLocaleString("es-ES");
    }
  }

  return { update };
}
