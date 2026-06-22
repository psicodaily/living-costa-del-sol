// Nivel de búsqueda estilo GTA (0 a 3 estrellas).
// Sube con acciones agresivas (atropellar peatones, embestir coches) y baja solo
// con el tiempo si dejas de delinquir (escapas).

const MAX_HEAT = 100;
const DECAY_PER_SEC = 2.2; // cuánto baja el "calor" por segundo sin delitos
const STAR_STEP = 25; // 25/50/75 de calor = 1/2/3 estrellas

export function createWanted() {
  let heat = 0;

  return {
    update(delta) {
      if (heat > 0) heat = Math.max(0, heat - DECAY_PER_SEC * delta);
    },
    addCrime(amount) {
      heat = Math.min(MAX_HEAT, heat + amount);
    },
    getStars() {
      return Math.min(3, Math.floor(heat / STAR_STEP));
    },
    getHeat() {
      return heat;
    },
  };
}
