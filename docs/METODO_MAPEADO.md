# 🗺️ Método de mapeado — cómo metemos una zona REAL en el juego

> Receta **repetible** para construir cualquier sitio real (Puerto Banús hoy, otras
> zonas mañana). La idea clave: **TODO está en COORDENADAS**, así nada se pierde.

---

## 📌 REGLA: este documento es VIVO (mantenerlo siempre al día)
**Siempre que se descubra algo nuevo** sobre el mapeado (una forma mejor, una mejora,
una corrección, una lección aprendida, un truco) → **se actualiza ESTE archivo
inmediatamente.** Es la fuente de verdad del método.

### Lecciones aprendidas (se van añadiendo)
- ✅ **Vistas aéreas SIEMPRE en SATÉLITE** (`/data=!3m1!1e3`), nunca el mapa de
  carreteras: así se ven **tejados, hierba, agua (dónde empieza y sus colores),
  árboles, texturas y colores reales**.
- ✅ **Cada LOCAL icónico necesita 3 tipos de captura** (no solo el satélite):
  1. **Satélite** (`sat.png`) — para situarlo y ver tejado/entorno.
  2. **EXTERIOR a pie de calle**, **varios ángulos** (`ext-1/2/3.png`) — fachada real.
  3. **INTERIOR**: de la **galería de la ficha** (`galeria-*.png`). En Google Maps,
     al **hacer clic en la foto principal del local** se abre la **galería** con
     fotos de **interior, terraza, recepción, etc.** Se capturan esas.
- ✅ **Interiores = lo que haya en la galería** (recepción/ascensores del hotel,
  plantas/garaje del centro comercial, terraza del local…). Lo que no esté
  fotografiado, se diseña.
- ✅ **Organización:** **una sola carpeta por zona**, con subcarpetas dentro
  (`aereo/`, `calles/`, `locales/<sitio>/`). No carpetas sueltas dispersas.
- ✅ **Importar a Unreal = "maqueta gris" (blockout) primero.** Cada edificio entra
  como una **caja** rotada/escalada a su tamaño real. La rotación sale de la **caja
  orientada mínima (OBB por PCA)** del contorno → las cajas siguen la orientación
  real (las del puerto van en diagonal). Generador: `tools/ue5_make_pyimport.mjs`
  (lee el blockout JSON → escribe un `.py` autocontenido). El `.py` es
  **re-ejecutable** (borra la importación anterior por su carpeta del Outliner).
  Guía de uso: `docs/UE5_IMPORTAR_PB.md`. Luego se "viste" encima.

---

## La idea clave: todo geolocalizado 📍
- **Cada captura** de Google Maps la tomo con una URL que lleva **lat/lon** → está
  **geolocalizada** (sé el punto exacto del mapa).
- La **maqueta** (edificios) se extrae de OpenStreetMap en **coordenadas reales** (metros).
- Por eso **cruzo captura ↔ edificio por su posición**: sé qué edificio lleva qué
  "traje". **Es un sistema, no a ojo.**

---

## Paso 1 — MAQUETA (geometría real) desde OSM
- Datos OSM (formas de edificios, calles, áreas): ya en `public/marbella.json`
  (para una zona nueva se re-descarga con `tools/prebake-marbella.mjs` o una bbox).
- Extractor `tools/ue5_extract.mjs`: filtra la zona, **convierte a METROS reales**
  (deshace la deformación del mapa + proyección local) y saca un JSON:
  `{ buildings:[{footprint, height}], marina }`.
- Salida: `ue5/<zona>_blockout.json`.

## Paso 2 — REFERENCIAS (Google Maps vía navegador headless)
Abro Google Maps en URLs **geolocalizadas** y hago capturas:
- **Satélite:** `https://www.google.com/maps/@LAT,LON,<Z>m/data=!3m1!1e3`
- **Street View:** `https://www.google.com/maps?q&layer=c&cbll=LAT,LON&cbp=11,<RUMBO>,0,0,0`
- **Buscar un sitio concreto:** `https://www.google.com/maps/search/<NOMBRE>`
- Guardo cada captura con el sitio en el nombre; la **URL (lat/lon) = su geolocalización**.
- ⚠️ **Límite honesto:** los **interiores** casi no están (Street View no entra en
  sitios privados). Solo algunas fotos sueltas de las fichas de negocios.

## Paso 3 — CRUCE captura ↔ maqueta
- Como **ambos están en coordenadas reales**, sé qué captura corresponde a qué
  edificio. Al **"vestir"**, cada edificio recibe material/uso según su zona/captura.

## Paso 4 — ORGANIZACIÓN (dónde queda todo)
- `ue5/<zona>_blockout.json` → geometría (cajas) de la zona.
- `docs/<ZONA>_REF.md` → dossier visual + notas (p. ej. `PUERTO_BANUS_REF.md`).
- `docs/NOMBRES.md` → biblia de nombres ficticios (marcas).
- **Capturas: UNA carpeta por zona** con subcarpetas:
  ```
  tools/gmaps/<zona>/
    aereo/      → satélite de cada zona
    calles/     → Street View (barrido de calles)
    locales/
      <sitio>/  → cada local icónico (satélite + ficha con fotos de interior)
  ```

---

## RECETA para una ZONA NUEVA (futuro) ♻️
1. (Si hace falta) re-descargar OSM de esa zona.
2. Ejecutar el **extractor** → `ue5/<zona>_blockout.json`.
3. **Barrido de Google Maps** (satélite + Street View + landmarks) → dossier de la zona.
4. **Script de Python en UE5** importa el blockout → aparecen las cajas a escala.
5. **Vestir** con assets/materiales según el dossier.
6. Apuntar **nombres ficticios** de las marcas en `NOMBRES.md`.

> Con esto, **cualquier sitio nuevo** se hace igual: datos reales (coords) → maqueta →
> referencias geolocalizadas → vestir. Reproducible y sin perderse.

---

## 🧩 Escaneo sistemático de una ZONA GRANDE (método de REJILLA)
Para zonas grandes (p. ej. **Nueva Andalucía**), no vale capturar "a lo loco".
Se divide en una **rejilla de celdas** y se cubre celda a celda. Así **no se olvida nada**.

**Pasos:**
1. **Límite real** de la zona → del **OSM** (su polígono/bbox), no a ojo de la línea roja.
2. **Rejilla automática:** dividir en celdas regulares (p. ej. **250–400 m**). Se numeran
   (fila-columna: `A1, A2…` o `c01, c02…`). Cada celda tiene su **centro (coords)**.
3. **Por cada celda:**
   - **1 satélite** (cenital de la celda).
   - **Street View guiado por las CALLES reales** (sacadas de OSM): se recorre cada
     calle de la celda cada ~60–100 m, mirando a ambos lados. (Así se cubren TODAS
     las calles, nada se salta.)
   - **Notas (plantilla):** estilo de casas, alturas, **ancho de carretera**, nº de
     carriles, **aparcamiento**, **contenedores/papeleras**, **árboles**, farolas,
     muros/vallas, comercios.
4. **MANIFIESTO (checklist):** un archivo con **TODAS las celdas** y su estado
   (satélite ✓ · calles ✓ · notas ✓) → se ve de un vistazo qué falta. **No se olvida nada.**
5. **Organización:** `tools/gmaps/<zona>/celda-XX/{aereo.png, calles/*.png, notas.md}`.
6. **Automatizado:** un **script** que, dada la zona, genera la rejilla + captura todo
   (satélite + calles desde OSM) + crea el **manifiesto**. Tú dices "escanea \<zona\>"
   y lo hace solo y exhaustivo.

> ⚠️ Honesto: una zona grande a fondo = **cientos de capturas** → se hace **cuando
> toque construir esa zona**, a **densidad sensata** (no cada 10 m). Y recordar:
> **capturar es barato; construirlo es lo caro** (mucho tiempo).

> ✅ **VALIDADO en Puerto Banús** como prueba: rejilla **3×4 = 12 celdas** de ~300 m,
> satélite por celda en `puerto-banus/rejilla/<celda>/aereo.png` + `MANIFIESTO.md`
> con la tabla de seguimiento. Funciona; falta densificar calles+notas por celda.
