# Diseño — "Marbella real": generador de ciudad desde OpenStreetMap

> Fecha: 2026-06-21 · Estado: **aprobado el diseño base, pendiente de tu revisión final**
> Apunta a la versión **v1.9 "Marbella reconocible"**.
> Basado en una investigación verificada (16 agentes, 5 áreas, 10 afirmaciones comprobadas).

---

## 1. En lenguaje sencillo (qué vamos a hacer y por qué)

Queremos que el juego use **la Marbella de verdad**: las mismas calles, las mismas rotondas
y los edificios en su sitio real (centro de Marbella + Puerto Banús).

No se puede "escanear Google Maps" (su licencia lo prohíbe y son fotos, no datos).
La solución es **OpenStreetMap (OSM)**: un mapa mundial libre y gratuito que para un
programa SÍ es información descargable (trazado de cada calle, forma de cada edificio,
rotondas, línea de costa…).

La idea: una **herramienta** que descarga esos datos UNA vez y los convierte en un archivo
del juego (`marbella.json`). Luego, dentro del juego, un **constructor** lee ese archivo y
levanta la ciudad sola. Así, en vez de colocar edificios a mano uno a uno, la ciudad real
se genera automáticamente. Esa es la gran ganancia de velocidad.

### Decisiones ya tomadas contigo
- **Zona**: Centro de Marbella + Puerto Banús (y la franja de costa entre ambos).
- **Escala**: "compactada estilo GTA" (formas locales reales, distancias largas acortadas).
- **Costa**: el generador **también** produce la línea de costa como dato, para que el otro
  chat (la playa, v1.5) la use y todo encaje.
- **Edificios**: formas reales + altura estimada + **variedad por barrio**.
- **Patrón**: *pre-bake* (descarga única → archivo → el juego no necesita internet al jugar).

### Lo honesto (límites de esta primera versión)
- Las **alturas** vienen pocas veces en los datos (~4–6%); el resto se **estiman** por tipo
  de edificio → algún edificio quedará más alto/bajo de lo real. Se afina después.
- El **terreno será plano** (sin cuestas) de momento.
- Las **fachadas** llevan texturas genéricas por barrio, no la foto exacta de cada edificio.
- Lo que SÍ será fiel desde el primer día: **calles, rotondas, manzanas y la forma + posición
  de cada edificio**. Que es lo que hace que digas "¡esto es Marbella!".

---

## 2. Arquitectura: dos piezas separadas

```
[ HERRAMIENTA (se ejecuta a mano, de vez en cuando) ]      [ JUEGO (cada vez que se juega) ]
Overpass/OSM → descarga → convierte → proyecta+compacta → marbella.json → constructor → escena 3D
        (carpeta tools/, una sola vez)                   (en public/)     (src/world/)
```

1. **La herramienta de pre-bake** — `tools/prebake-marbella.mjs`.
   Descarga de OSM, separa capas, simplifica, proyecta a metros, compacta y escribe
   `public/marbella.json`. Necesita internet solo cuando TÚ la ejecutas (`npm run prebake`).

2. **El constructor en el juego** — nuevo módulo en `src/world/` (p. ej. `cityFromData.js`).
   Lee `marbella.json` (con `fetch`, no `import`) y construye edificios, calles y rotondas.
   No necesita internet.

**Por qué separadas:** el juego arranca rápido y siempre construye lo mismo; la descarga
pesada solo ocurre cuando quieras actualizar la ciudad. La ciudad actual (cuadrícula) se
mantiene como respaldo hasta que la nueva esté lista; luego se cambia con un interruptor.

---

## 3. Pipeline de datos (la herramienta)

Flujo, ejecutado **una sola vez** en build (nunca mientras se juega):

```
Overpass API → JSON crudo → osmtogeojson → GeoJSON → separar capas
  → turf.simplify → proyectar lat/lon a metros + compactar → redondear → marbella.json
```

### 3.1. Dependencias (carpeta `tools/`)
- `tools/` será un paquete **ESM** (`"type":"module"` en `tools/package.json`).
- `osmtogeojson@2.2.12` (**fijar la versión**; `latest` es una beta inestable). Es CommonJS,
  así que se carga con `createRequire`.
- `@turf/turf@7` (MIT, ESM) para operaciones geométricas (simplify, buffer, centroid,
  point-in-polygon). Alternativa: módulos sueltos `@turf/simplify`, etc.
- **No** usar `query-overpass` (abandonada). Descargar con `fetch` nativo de Node 18+.

### 3.2. Descarga (Overpass)
- Endpoint: `https://overpass-api.de/api/interpreter` (POST `application/x-www-form-urlencoded`).
- Mirrors de respaldo si hay 429/504: `overpass.private.coffee`, `maps.mail.ru/osm/tools/overpass`.
- **Cabecera `User-Agent` obligatoria** (identificando el proyecto).
- Robustez: `AbortController` (timeout), 3 reintentos con espera creciente (5s/15s/45s),
  fallback a mirror, y **fail-fast**: si la respuesta viene vacía, NO escribir (no machacar
  un `marbella.json` bueno).

### 3.3. Consulta Overpass (una sola, combinada)
Bbox englobante recomendado (orden QL = sur,oeste,norte,este):
`(36.475, -4.965, 36.522, -4.868)` — el borde sur baja a 36.475 para no recortar los diques
de Puerto Banús (lat ~36.4858).

```
[out:json][timeout:180];
(
  way["highway"](36.475,-4.965,36.522,-4.868);
  way["junction"="roundabout"](36.475,-4.965,36.522,-4.868);
  way["junction"="circular"](36.475,-4.965,36.522,-4.868);
  nwr["building"](36.475,-4.965,36.522,-4.868);
  way["natural"="coastline"](36.475,-4.965,36.522,-4.868);
  nwr["natural"="beach"](36.475,-4.965,36.522,-4.868);
  nwr["leisure"="park"](36.475,-4.965,36.522,-4.868);
  nwr["leisure"="garden"](36.475,-4.965,36.522,-4.868);
  nwr["leisure"="marina"](36.475,-4.965,36.522,-4.868);
  nwr["landuse"~"^(grass|residential|commercial|forest)$"](36.475,-4.965,36.522,-4.868);
  way["highway"="pedestrian"]["area"="yes"](36.475,-4.965,36.522,-4.868);
);
out geom;
```

Claves verificadas:
- **`out geom;` es obligatorio** (embebe las coordenadas en cada elemento). Con solo `out;`
  los "ways" no traen coordenadas y el GeoJSON sale vacío.
- **`nwr[...]`** (nodes+ways+relations) es imprescindible en `building`, `landuse`,
  `natural=beach`, `park`: las superficies grandes a menudo son relaciones multipolígono y
  con solo `way[...]` se perderían.
- Puerto Banús: **solo `leisure=marina`** (NO `amenity=marina`, que es casi inexistente).
- Rotondas: `way["highway"]` ya las incluye, pero se añaden `junction=roundabout` y
  `junction=circular` por seguridad.

### 3.4. Conversión y procesado
1. `osmtogeojson(json, { flatProperties: true })`.
2. Separar por capas (roads / buildings / roundabouts / coastline / areas) según tags.
3. `turf.simplify(f, { tolerance: 0.00002, highQuality: true, mutate: true })` **antes** de
   proyectar (tolerancia en grados). Menos agresiva en edificios (preservar esquinas), más
   en calles/costa.
4. Proyectar lat/lon → metros (sección 4) y aplicar compactación.
5. Redondear a 0,1 m (`Math.round(x*10)/10`).
6. `JSON.stringify` sin indentar (opcional: gzip).

---

## 4. Proyección y compactación

### 4.1. Proyección (plano local, 1 unidad = 1 metro)
Equirectangular centrada en la zona; error < 0,1 % para ~6–9 km (despreciable).

```
R = 6371000 ; DEG2RAD = Math.PI/180
lat0 = 36.5154 ; lon0 = -4.8858          // origen = centro de la zona
cosLat0 = cos(lat0*DEG2RAD)              // 0.80347
metrosPorGradoLat = R*DEG2RAD            // 111194.93
metrosPorGradoLon = R*DEG2RAD*cosLat0    // 89343.0

worldX =  (lon - lon0) * metrosPorGradoLon;   // Este = +X
worldZ = -(lat - lat0) * metrosPorGradoLat;   // Norte = -Z   (¡SIGNO MENOS crítico!)
```
El signo menos en Z pone el Norte hacia −Z (convención Three.js). Olvidarlo refleja el mapa
en N-S (el error más común). Centrar en el origen mantiene coordenadas pequeñas (±4000 m).

**Orden fijo y documentado:** proyectar → rotar (en v1 sin rotación) → compactar → escala.

### 4.2. Compactación estilo GTA
Para v1, **compresión radial continua** (simple): el centro queda 1:1 y solo se encoge la
periferia.
```
f(r) = r                      si r < r0     (centro fiel)
f(r) = r0 + (r - r0) * k      si r >= r0    (periferia comprimida, k ≈ 0.5)
p' = direccionUnitaria(p) * f(|p|)
```
(Más adelante se puede pasar al método por distritos "shrink-the-gap", más fiel a GTA pero
que parte las carreteras inter-distrito y obliga a reconectarlas.)

**CRÍTICO:** la compactación NO es reversible sin guardar sus parámetros → deben ir en la
cabecera GEOREF (abajo), o la costa del otro chat no encajará.

### 4.3. Cabecera de coordenadas compartidas (GEOREF)
Única fuente de verdad. Va dentro de `marbella.json` (`meta.georef`) y se entrega **tal cual**
al otro chat (playa). Ambos procesos deben usar la **misma** función `latLonToWorld`.

```json
{
  "version": 1, "R": 6371000,
  "lat0": 36.5154, "lon0": -4.8858, "cosLat0": 0.80347,
  "metersPerDegLat": 111194.93, "metersPerDegLon": 89343.0,
  "scaleGlobal": 1.0,
  "axis": { "east": "+X", "north": "-Z", "up": "+Y" },
  "rotationDeg": 0,
  "opOrder": ["project", "rotate", "compact", "scale"],
  "compaction": { "mode": "radial-continuous", "r0": 1200, "k": 0.5 }
}
```

---

## 5. Esquema de `marbella.json`

Arrays planos (no GeoJSON anidado) para carga rápida. Coordenadas en `[x, z]` metros.
`path` = línea abierta; `footprint`/`polygon` = anillo cerrado.

```json
{
  "meta": {
    "version": 1,
    "georef": { "... objeto de la sección 4.3 ..." },
    "bbox": [-4.965, 36.475, -4.868, 36.522],
    "source": "OpenStreetMap / Overpass",
    "license": "© OpenStreetMap contributors (ODbL)"
  },
  "roads":       [ { "id": 1, "kind": "primary", "lanes": 2, "oneway": false, "path": [[x,z]] } ],
  "roundabouts": [ { "id": 2, "center": [x,z], "radius": 18, "path": [[x,z]] } ],
  "buildings":   [ { "id": 3, "height": 12, "type": "apartments", "barrio": "Centro",
                     "footprint": [[x,z]], "holes": [[[x,z]]] } ],
  "coastline":   [ { "id": 4, "path": [[x,z]] } ],
  "areas":       [ { "id": 5, "kind": "beach", "barrio": "Puerto Banus", "polygon": [[x,z]] } ]
}
```

---

## 6. Construcción en Three.js (r160+)

### 6.1. Edificios (extrude)
Planta 2D → `THREE.Shape` → `THREE.ExtrudeGeometry({ depth: altura, bevelEnabled: false })`
→ `geo.rotateX(-Math.PI/2)` (tumbar al suelo, altura hacia +Y) → `geo.translate(x,0,z)`.
Patios = `shape.holes.push(path)` con sentido de giro opuesto.

### 6.2. Calles
Ensanchar la polilínea a polígono con `@turf/buffer` (ancho/2 en metros, ya proyectado) y
triangular con `THREE.ShapeGeometry` tumbado. Alternativa ligera: cinta a mano con la normal
perpendicular de cada segmento.

### 6.3. Rotondas
`THREE.RingGeometry(rInterior, rExterior)` tumbado; isleta central como `ShapeGeometry` con
hueco; bordillo opcional con `TorusGeometry`.

### 6.4. Rendimiento (lo que de verdad importa: DRAW CALLS, no triángulos)
- **NO** un `Mesh` por edificio. Objetivo < 100 draw calls/frame.
- Edificios = formas distintas → **no** sirve `InstancedMesh` (ese es para objetos idénticos:
  farolas, palmeras, coches). Para formas distintas: **`mergeGeometries`** o **`BatchedMesh`**.
- **Tiling**: dividir el mundo en celdas de 250–500 m; por celda, fusionar geometrías +
  material compartido por tipo. Mantiene el frustum culling útil.
- LOD por celda con `THREE.LOD` (detalle cerca, caja simple lejos, nada > ~2500–3000 m).
- Muy pocos materiales (asfalto, acera, edificio claro/oscuro, metal).

### 6.5. Carga del JSON
`marbella.json` en `public/` y `await fetch('/marbella.json')` (fuera del bundle, cacheable).
Procesar (extrude/merge) **una vez** al cargar. Si supera ~5–10 MB, trocear por tiles y cargar
según la cámara. Medir con `renderer.info.render.calls`.

---

## 7. Alturas y barrios

### 7.1. Altura — cascada de respaldo (asumir que ~80–90 % se estima)
1. `height` válido → **normalizar** (quitar " m", coma→punto, detectar pies) + clamp 2–60 m.
2. Si no, `building:levels * 3.2` (constante `METROS_POR_PLANTA = 3.2`).
3. Si no, **default por tipo** (`house`~6, `residential`~9, `apartments`~15, `retail`~5,
   `office`~18, `hotel`~24, `industrial`~8, `building=yes`~7…).
4. Variación pseudoaleatoria estable usando el id OSM como semilla (±15 %) para que el skyline
   no parezca cubos clonados pero sea estable entre recargas.

### 7.2. Barrios — punto en polígono (método KISS más fiable)
Dibujar a mano 5–8 polígonos de barrio (Casco Antiguo, Golden Mile, Puerto Banús, Nueva
Andalucía…). Por edificio: `centroid` + `booleanPointInPolygon` → barrio. Más fiable que los
tags de zona (que suelen ser puntos, no polígonos).

### 7.3. Estilo por barrio + tipo (3–4 familias; el barrio manda)
Casco antiguo (blanco, tejas, bajo) · Lujo/residencial (blanco moderno) ·
Hoteles/comercial (alto, cristal) · Industrial (gris/metal).

---

## 8. Costa: contrato con el otro chat (la playa)

- Se exporta la capa `coastline` (líneas en metros, **ya compactadas** con la misma GEOREF).
- **Orientación OSM** (verificada): la **tierra** queda a la **izquierda** y el **agua** a la
  **derecha** en el sentido del trazado → la playa sabe de qué lado va el mar.
- La costa viene **troceada** en varios ways encadenados → hay que **unirlos** en una línea.
- La costa **no cierra** polígono dentro del bbox → para rellenar el mar, **cerrarlo** con los
  límites del bbox.
- **El otro chat DEBE usar la GEOREF idéntica** (mismos lat0/lon0, mismo signo de Z, misma
  compactación). Entregarle: el objeto GEOREF + la función `latLonToWorld` + la capa `coastline`.

---

## 9. Riesgos y límites (honestos)
- Cobertura de altura baja → el skyline depende de la estimación (mitigado con defaults+variación).
- Valores OSM erróneos (typos/unidades) → normalizar + clamp.
- Compactación no invertible sin sus parámetros → GEOREF completa, o descuadre con la playa.
- Signo de Z / orden de operaciones → idénticos y documentados en ambos procesos.
- Rate limit Overpass → pre-bake único + reintentos + mirror.
- GeoJSON pesado → trocear por tiles + `fetch` desde `public/`.
- Geometrías OSM sucias (auto-intersección) → validar antes de extruir.
- `mergeGeometries` exige atributos homogéneos → normalizar antes.

## 10. Licencia (obligatorio desde la primera versión)
Datos OSM bajo **ODbL v1.0** → **atribución obligatoria**:
`Datos del mapa © OpenStreetMap contributors (ODbL)` con enlace a
`https://www.openstreetmap.org/copyright`, visible en carga/menú/créditos. Guardar un `NOTICE`
en el repo con: fecha de descarga, bbox, consulta Overpass exacta y nota ODbL.

## 11. Qué NO entra en v1 (YAGNI)
- Relieve del terreno (cuestas). Mundo plano.
- `building:part` (sub-volúmenes 3D detallados) y subterráneos.
- Método de compactación por distritos (se empieza con el radial continuo).
- Texturas fotográficas reales de fachadas (genéricas por barrio).
- Tráfico/peatones sobre la red real (eso es v1.10/v1.11).

## 12. Próximo paso
Tras tu visto bueno a este documento, paso a **escribir el plan de implementación**
(pasos concretos, archivos a crear, y orden de construcción) con la skill de planificación.
```
