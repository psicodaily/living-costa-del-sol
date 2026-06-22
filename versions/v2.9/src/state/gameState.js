// Estado central del juego (salud y dinero). Fuente única de verdad para el HUD,
// la economía, los recados, los daños y el guardado de versiones futuras.
//
// Se actualiza de forma INMUTABLE: cada cambio crea un objeto nuevo y avisa a
// los suscriptores (p.ej. el HUD).

let state = {
  health: 100, // 0..100
  money: 2500, // euros
};

const listeners = [];

export function getState() {
  return state;
}

// Aplica un cambio parcial creando un estado nuevo (inmutable) y notifica.
export function setState(patch) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
  return state;
}

// Suscribe una función a los cambios. Se llama una vez al registrarse.
export function onChange(fn) {
  listeners.push(fn);
  fn(state);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

// Atajos de uso común.
export function addMoney(amount) {
  return setState({ money: state.money + amount });
}

export function setHealth(value) {
  return setState({ health: Math.max(0, Math.min(100, value)) });
}

export function damage(amount) {
  return setHealth(state.health - amount);
}
