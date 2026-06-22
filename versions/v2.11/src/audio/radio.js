import { getVolume } from "./sfx.js";

// Radio del juego: música generada por código (sin archivos), con varias
// emisoras que se cambian con la tecla R. Usa un planificador de notas (Web
// Audio). El volumen sale del menú de pausa (compartido con los efectos).

const STATIONS = [
  { name: "RADIO APAGADA" },
  { name: "Marbella Chill FM", base: 220, tempo: 0.5, wave: "sine", notes: [0, 4, 7, 11, 12, 11, 7, 4] },
  { name: "Costa del Sol 101", base: 196, tempo: 0.28, wave: "triangle", notes: [0, 3, 7, 10, 12, 10, 7, 3] },
  { name: "Banús Beats", base: 165, tempo: 0.22, wave: "square", notes: [0, 5, 7, 12, 7, 5, 0, -5] },
];

export function createRadio() {
  let ctx = null;
  let master = null;
  let current = 0;
  let step = 0;
  let nextTime = 0;
  let timer = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.18;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function playNote(time, freq, wave) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    const vol = getVolume();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.25 * vol + 0.001, time + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
    osc.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  function schedule() {
    const st = STATIONS[current];
    if (!st.notes) return;
    while (nextTime < ctx.currentTime + 0.25) {
      const semi = st.notes[step % st.notes.length];
      playNote(nextTime, st.base * Math.pow(2, semi / 12), st.wave);
      step++;
      nextTime += st.tempo;
    }
  }

  function start() {
    if (!ensure()) return;
    stop();
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(() => {
      try {
        schedule();
      } catch (e) {
        /* ignore */
      }
    }, 60);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function setStation(i) {
    current = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    if (current === 0) stop();
    else start();
    return current;
  }

  function cycle() {
    return setStation(current + 1);
  }

  return {
    cycle,
    setStation,
    getStation: () => current,
    getName: () => STATIONS[current].name,
  };
}
