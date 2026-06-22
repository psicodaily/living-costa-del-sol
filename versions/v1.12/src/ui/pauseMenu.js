// Menú de pausa: congela el juego, libera el ratón y ofrece ajustes.
// Se abre/cierra con P (o Esc). Botones: Reanudar, Reiniciar; sliders de
// sensibilidad del ratón y volumen.

function el(tag, styles, text) {
  const node = document.createElement(tag);
  if (styles) node.style.cssText = styles;
  if (text != null) node.textContent = text;
  return node;
}

export function createPauseMenu({ onSensitivity, onVolume, onRestart, onToggle, onTime, onEffects }) {
  let paused = false;

  const overlay = el(
    "div",
    [
      "position:fixed",
      "inset:0",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "background:rgba(6,12,22,0.6)",
      "backdrop-filter:blur(4px)",
      "z-index:20",
      "font-family:Segoe UI, system-ui, sans-serif",
    ].join(";")
  );

  const panel = el(
    "div",
    [
      "width:320px",
      "padding:24px",
      "background:rgba(14,24,40,0.96)",
      "border:1px solid rgba(255,255,255,0.15)",
      "border-radius:16px",
      "color:#fff",
      "box-shadow:0 12px 40px rgba(0,0,0,0.5)",
    ].join(";")
  );

  const title = el(
    "div",
    "font-size:24px;font-weight:800;color:#ffd24a;margin-bottom:18px;text-align:center;letter-spacing:1px;",
    "PAUSA"
  );
  panel.appendChild(title);

  panel.appendChild(makeSlider("Sensibilidad del ratón", 10, 200, 100, (v) => onSensitivity(v / 100)));
  panel.appendChild(makeSlider("Volumen", 0, 100, 50, (v) => onVolume(v / 100)));
  if (onTime) panel.appendChild(makeSlider("Hora del día", 0, 23, 8, (v) => onTime(v)));

  if (onEffects) {
    let fxOn = true;
    const fxBtn = makeButton("✨ Efectos: ON", "#3a4a6a", () => {
      fxOn = !fxOn;
      fxBtn.textContent = fxOn ? "✨ Efectos: ON" : "✨ Efectos: OFF";
      onEffects(fxOn);
    });
    panel.appendChild(fxBtn);
  }

  const resumeBtn = makeButton("▶  Reanudar", "#2e7d32", () => close());
  const restartBtn = makeButton("↻  Reiniciar partida", "#7a2e2e", () => onRestart());
  panel.appendChild(resumeBtn);
  panel.appendChild(restartBtn);

  const tip = el(
    "div",
    "margin-top:14px;font-size:12px;opacity:0.6;text-align:center;",
    "Pulsa P para abrir/cerrar este menú"
  );
  panel.appendChild(tip);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function open() {
    paused = true;
    overlay.style.display = "flex";
    if (document.exitPointerLock) document.exitPointerLock();
    if (onToggle) onToggle(true);
  }
  function close() {
    paused = false;
    overlay.style.display = "none";
    if (onToggle) onToggle(false);
  }
  function toggle() {
    paused ? close() : open();
  }

  return { open, close, toggle, isPaused: () => paused };
}

function makeSlider(label, min, max, value, onInput) {
  const wrap = el("div", "margin-bottom:16px;");
  wrap.appendChild(el("div", "font-size:13px;margin-bottom:6px;opacity:0.85;", label));
  const input = el("input", "width:100%;cursor:pointer;");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.value = value;
  input.addEventListener("input", () => onInput(Number(input.value)));
  wrap.appendChild(input);
  return wrap;
}

function makeButton(label, color, onClick) {
  const btn = el(
    "button",
    [
      "display:block",
      "width:100%",
      "margin-top:10px",
      "padding:11px",
      "background:" + color,
      "color:#fff",
      "border:none",
      "border-radius:10px",
      "font-size:15px",
      "font-weight:700",
      "cursor:pointer",
    ].join(";"),
    label
  );
  btn.addEventListener("click", onClick);
  return btn;
}
