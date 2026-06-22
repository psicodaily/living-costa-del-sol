// Guardado y carga de la partida en el navegador (localStorage).
// Persiste lo esencial: dinero, salud, posición del jugador y emisora de radio.

const KEY = "gta-marbella-save-v1";

export function saveGame(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearGame() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
}
