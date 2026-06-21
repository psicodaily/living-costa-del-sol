export const METROS_POR_PLANTA = 3.2;
const MIN_H = 2, MAX_H = 60;

const DEFAULTS = {
  house: 6, detached: 6, bungalow: 6, villa: 9,
  residential: 9, apartments: 15,
  retail: 5, commercial: 5, supermarket: 5, kiosk: 5,
  office: 18, hotel: 24, church: 12,
  industrial: 8, warehouse: 8, garage: 3, hut: 3,
  yes: 7,
};

export function parseHeight(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase().replace(",", ".");
  const feet = s.includes("'") || s.includes("ft");
  s = s.replace(/['"]/g, "").replace("ft", "").replace("m", "").trim();
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return feet ? n * 0.3048 : n;
}

export function clampHeight(h) {
  return Math.max(MIN_H, Math.min(MAX_H, h));
}

export function estimateHeight(tags = {}) {
  const h = parseHeight(tags.height ?? tags["building:height"]);
  if (h != null) return clampHeight(h);
  const levels = parseInt(tags["building:levels"], 10);
  if (Number.isInteger(levels) && levels > 0) return clampHeight(levels * METROS_POR_PLANTA);
  const type = tags.building && tags.building !== "yes" ? tags.building : "yes";
  return clampHeight(DEFAULTS[type] ?? DEFAULTS.yes);
}

export function jitterHeight(h, id) {
  const s = String(id);
  let seed = 0;
  for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
  const r = (seed % 233280) / 233280; // 0..1 determinista
  return Math.round(h * (0.85 + r * 0.3) * 10) / 10;
}
