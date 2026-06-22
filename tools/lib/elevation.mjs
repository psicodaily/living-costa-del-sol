import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

// Descarga teselas de elevación (Terrarium, AWS, gratis y sin clave) y permite
// consultar la altura real (metros) en cualquier lat/lon de la zona.
const TILE_URL = (z, x, y) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const lonToX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * 2 ** z;
};

async function fetchTile(z, x, y) {
  try {
    const res = await fetch(TILE_URL(z, x, y));
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return PNG.sync.read(buf);
  } catch (e) {
    return null;
  }
}

export async function buildElevationSampler(bbox, z = 13) {
  const x0 = Math.floor(lonToX(bbox.west, z));
  const x1 = Math.floor(lonToX(bbox.east, z));
  const y0 = Math.floor(latToY(bbox.north, z));
  const y1 = Math.floor(latToY(bbox.south, z));
  const tiles = new Map();
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const png = await fetchTile(z, x, y);
      if (png) tiles.set(x + "," + y, png);
    }
  }
  const n = 2 ** z;

  function elev(lon, lat) {
    const fx = lonToX(lon, z);
    const fy = latToY(lat, z);
    const tx = Math.floor(fx);
    const ty = Math.floor(fy);
    const png = tiles.get(tx + "," + ty);
    if (!png) return 0;
    const px = Math.min(255, Math.max(0, Math.floor((fx - tx) * 256)));
    const py = Math.min(255, Math.max(0, Math.floor((fy - ty) * 256)));
    const i = (py * 256 + px) * 4;
    const R = png.data[i];
    const G = png.data[i + 1];
    const B = png.data[i + 2];
    return R * 256 + G + B / 256 - 32768;
  }

  return { elev, tiles: tiles.size };
}
