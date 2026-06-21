// Efectos de sonido generados por código (Web Audio), sin archivos.
// El volumen se controla desde el menú de pausa.

let ctx = null;
let volume = 0.5;

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
}

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Pequeño "ding" ascendente de logro.
export function playPickup() {
  try {
    const ac = ensureCtx();
    if (!ac) return;
    const now = ac.currentTime;
    [660, 880, 1175].forEach((freq, i) => {
      const t = now + i * 0.09;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume * 0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (e) {
    /* el audio no es crítico: si falla, se ignora */
  }
}
