// Panel de tienda: se abre al pulsar E cerca de un kiosco. Permite gastar el
// dinero (curarte o comprar una gorra). Congela el juego mientras está abierto.

function el(tag, styles, text) {
  const node = document.createElement(tag);
  if (styles) node.style.cssText = styles;
  if (text != null) node.textContent = text;
  return node;
}

export function createShopPanel({ getMoney, onBuyHeal, onBuyHat, onToggle }) {
  let open = false;

  const overlay = el(
    "div",
    [
      "position:fixed", "inset:0", "display:none", "align-items:center", "justify-content:center",
      "background:rgba(6,12,22,0.6)", "backdrop-filter:blur(4px)", "z-index:20",
      "font-family:Segoe UI, system-ui, sans-serif",
    ].join(";")
  );
  const panel = el(
    "div",
    [
      "width:320px", "padding:24px", "background:rgba(14,24,40,0.96)",
      "border:1px solid rgba(255,255,255,0.15)", "border-radius:16px", "color:#fff",
      "box-shadow:0 12px 40px rgba(0,0,0,0.5)",
    ].join(";")
  );
  panel.appendChild(el("div", "font-size:22px;font-weight:800;color:#6fffa0;margin-bottom:6px;text-align:center;", "🛒 TIENDA"));
  const money = el("div", "font-size:14px;color:#ffd24a;text-align:center;margin-bottom:16px;", "");
  panel.appendChild(money);

  const healBtn = btn("❤️  Curarte — 50 €", "#2e7d32", () => {
    if (onBuyHeal()) refresh();
  });
  const hatBtn = btn("🧢  Comprar gorra — 300 €", "#3a4a6a", () => {
    if (onBuyHat()) refresh();
  });
  const closeBtn = btn("✖  Cerrar (E)", "#555b66", () => close());
  panel.appendChild(healBtn);
  panel.appendChild(hatBtn);
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function refresh() {
    money.textContent = "Tienes: " + Math.round(getMoney()).toLocaleString("es-ES") + " €";
  }
  function doOpen() {
    open = true;
    refresh();
    overlay.style.display = "flex";
    if (document.exitPointerLock) document.exitPointerLock();
    if (onToggle) onToggle(true);
  }
  function close() {
    open = false;
    overlay.style.display = "none";
    if (onToggle) onToggle(false);
  }

  return { open: doOpen, close, isOpen: () => open };
}

function btn(label, color, onClick) {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.cssText = [
    "display:block", "width:100%", "margin-top:10px", "padding:11px",
    "background:" + color, "color:#fff", "border:none", "border-radius:10px",
    "font-size:15px", "font-weight:700", "cursor:pointer",
  ].join(";");
  b.addEventListener("click", onClick);
  return b;
}
