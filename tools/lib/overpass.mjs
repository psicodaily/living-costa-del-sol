export const BBOX = { south: 36.475, west: -4.965, north: 36.522, east: -4.868 };

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const BACKOFF_MS = [5000, 15000, 45000];

export function buildQuery(bbox = BBOX) {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:180];
(
  way["highway"](${b});
  way["junction"="roundabout"](${b});
  way["junction"="circular"](${b});
  nwr["building"](${b});
  way["natural"="coastline"](${b});
  nwr["natural"="beach"](${b});
  nwr["leisure"="park"](${b});
  nwr["leisure"="garden"](${b});
  nwr["leisure"="marina"](${b});
  nwr["landuse"~"^(grass|residential|commercial|forest)$"](${b});
  way["highway"="pedestrian"]["area"="yes"](${b});
);
out geom;`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function downloadOsm(query, opts = {}) {
  const { fetchImpl = fetch, endpoints = ENDPOINTS, retries = 3 } = opts;
  let lastErr;
  for (const url of endpoints) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 200000);
        const res = await fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "GTA-Marbella-prebake/1.0 (infodanitamames@gmail.com)",
          },
          body: "data=" + encodeURIComponent(query),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.status === 429 || res.status === 504) throw new Error("rate-limit " + res.status);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.json();
      } catch (e) {
        lastErr = e;
        if (attempt < retries - 1) await sleep(BACKOFF_MS[attempt] ?? 45000);
      }
    }
  }
  throw lastErr ?? new Error("descarga fallida");
}
