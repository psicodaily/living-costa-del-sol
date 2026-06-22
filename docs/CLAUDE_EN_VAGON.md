# 🤖 Claude Code DENTRO de Vagon — para avanzar de forma autónoma

> **Objetivo:** instalar Claude Code en la máquina de Vagon (donde vive Unreal) para
> que Claude pueda **leer los logs, ejecutar Python contra el editor y hacer
> capturas él mismo**, y así **probar → comprobar → corregir en bucle** sin que el
> usuario tenga que pegar y mandar capturas todo el rato.

---

## PARTE 1 — Instalación (la hace el usuario en Vagon, UNA vez)

### 1. Node.js
1. En Vagon, abre **Google Chrome** y entra en **https://nodejs.org**.
2. Descarga la versión **LTS** (botón izquierdo) → ejecuta el instalador `.msi` →
   **Next / Next / Install** (deja todo por defecto).

### 2. Claude Code
1. Abre **PowerShell** (botón Inicio → escribe `powershell` → Enter).
2. Escribe y Enter:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
3. Cuando termine, escribe `claude` y Enter para arrancarlo. **Inicia sesión** con
   tu cuenta de Claude (la misma que aquí).

### 3. Activar "Ejecución remota de Python" en Unreal
Esto permite que Claude (en Vagon) mande órdenes al editor abierto.
1. En Unreal: **Edit → Project Settings**.
2. Busca **`Python`** arriba.
3. Marca **"Enable Remote Execution"** (Ejecución remota).
4. Si lo pide, reinicia el editor (rápido, ya está la caché).

### 4. Llevar el proyecto (carpeta de scripts/datos) a Vagon
La forma más limpia es **git** si tienes el repo en GitHub (clonar en Vagon). Si no,
de momento basta con **pegarle a Claude (en Vagon) el bloque de la PARTE 2** como su
primer mensaje, y él irá pidiendo/creando lo que necesite.

---

## PARTE 2 — CONTEXTO DE TRASPASO (pegar esto al Claude de Vagon)

Eres **Claude Code corriendo dentro de la máquina de Vagon**, donde está abierto
**Unreal Engine 5.7**. Continúas un proyecto ya empezado. **Responde SIEMPRE en
español de España, sencillo** (el usuario no es programador).

### Qué es el proyecto
- Juego mundo abierto estilo GTA en **Marbella** (zona **Puerto Banús** primero).
- Motor: **UE5.7**, proyecto **LivingCostaDelSol**, nivel **LvL_ThirdPerson**
  (plantilla Third Person).

### Lo que YA está hecho
1. Se **anda** por el mundo (Play + WASD).
2. **Puerto Banús importado** como maqueta gris: **109 edificios** en la carpeta del
   Outliner **`PuertoBanus/Blockout`** (`PB_Edif_000..108`) + un suelo `PB_Suelo`.
3. El **PlayerStart** está en el origen (centro de la dársena).
4. Plugin **Water activado**; hay un **`WaterBodyLake`** + **`WaterZone`** en el nivel.

### Tarea ACTUAL (terminar el agua)
- Hay que dar al `WaterBodyLake` la **forma de la dársena**.
- **Problema detectado:** al fijar los puntos del spline, Unreal da
  `LogGeomTools: Triangulation of poly failed`. **Causa:** los puntos del spline son
  de tipo **curva** por defecto y las curvas se cruzan en las esquinas cerradas.
- **Solución:** poner **todos los puntos a tipo LINEAR** (líneas rectas) tras fijarlos.
- API que YA funciona en esta build (confirmado en el log):
  `lake.get_water_spline()`, `spline.set_spline_points(pts, LOCAL, False)`,
  `spline.set_spline_point_type(i, unreal.SplinePointType.LINEAR, False)`,
  `spline.set_closed_loop(True, True)`,
  `spline.k2_synchronize_and_broadcast_data_change()`,
  `lake.get_water_body_component().on_water_body_changed(True, False)`.
- **Polígono de la dársena** (coordenadas Unreal, cm, espacio LOCAL, actor en el
  origen, Z=10). Versión de 15 puntos (preferida); si fallara, hay una convexa de 8.
  - 15 pts: `[(-32626,-19428),(-37540,-11833),(-6830,8335),(1968,14417),(4886,15614),(10841,16539),(11070,14501),(15662,10073),(17793,8515),(17331,4400),(9403,-5682),(5471,-10430),(6,-16575),(-1502,-15449),(-12621,-29744)]`
  - 8 pts (convexa, traga seguro): `[(-37500,-11800),(-6800,8300),(10800,16500),(17800,8500),(17300,4400),(0,-16600),(-12600,-29700),(-32600,-19400)]`
- El script completo y robusto ya existe en el repo: `ue5/water_marina.py`
  (re-ejecutable, con muchos fallbacks). Conviene **añadirle el paso LINEAR**.

### Sistema de coordenadas (IMPORTANTE)
- Datos reales en metros: `x = ESTE`, `z = SUR`.
- A Unreal (cm): **`X = -z*100`** (norte), **`Y = x*100`** (este), `1 m = 100 uu`.
- **Origen (0,0)** = centroide de la marina (la dársena).
- Fuente de la maqueta: `ue5/puertobanus_blockout.json` (109 edificios + polígono marina).
- Generadores: `tools/ue5_extract.mjs` (datos→blockout) y `tools/ue5_make_pyimport.mjs`
  (blockout→script de import). Guía: `docs/UE5_IMPORTAR_PB.md`.

### Cómo trabajar de forma AUTÓNOMA aquí (tu ventaja)
1. **Ejecutar Python en el editor abierto** (sin que el usuario pegue nada):
   usa el cliente de Epic **`remote_execution.py`** (está dentro del motor, en
   `Engine/Plugins/.../PythonScriptPlugin/Content/Python/remote_execution.py`).
   Localízalo, escribe un pequeño cliente que abra la conexión, ejecute tu Python y
   te devuelva la salida. (Requiere "Enable Remote Execution" activado — Parte 1.3.)
2. **Leer el log de Unreal** (tus "ojos" sobre errores): archivo
   `<Proyecto>/Saved/Logs/LivingCostaDelSol.log`. Léelo tras cada acción para ver
   resultados y avisos (p. ej. `Triangulation of poly failed`).
3. **Capturas (tu "vista")**: ejecuta por remote exec el comando de consola
   `HighResShot 1920x1080` (o `unreal.AutomationLibrary.take_high_res_screenshot`),
   y luego **lee el PNG** en `<Proyecto>/Saved/Screenshots/` para VER el resultado.
4. Bucle ideal: *ejecuto Python → leo el log → hago captura → la miro → corrijo*.

### Bucle autónomo de mejora visual (cómo mejorar hasta que quede igual que la realidad)

Este es el flujo para cuando el usuario da una imagen de referencia (Google Maps
Street View, foto real de Marbella) y quiere que el juego se vea igual:

```
ENTRADA: imagen de referencia del usuario (p. ej. foto de un edificio de PB)

1. ANALIZO la imagen:
   - Colores de fachada (blanco, beige, terracota…)
   - Tipo de material (encalado, ladrillo, cristal, mármol…)
   - Proporciones (alto, ancho, número de plantas)
   - Detalles (balcones, persianas, toldos, vegetación)

2. IMPLEMENTO en Unreal:
   - Escribo el script Python con los materiales/colores detectados
   - Lo mando al editor vía remote execution (sin que el usuario haga nada)

3. CAPTURO el resultado:
   - Comando HighResShot desde Python → PNG en Saved/Screenshots/
   - Leo el PNG directamente (Claude Code ve imágenes)

4. COMPARO captura vs referencia:
   - ¿El color coincide? ¿La escala es correcta? ¿Falta detalle?

5. CORRIJO lo que no coincide:
   - Ajusto materiales, escala, iluminación…
   - Vuelvo al paso 2

6. Repito hasta que la captura sea fiel a la referencia.

SALIDA: aviso al usuario con la captura final lista.
```

**El usuario no toca nada durante el proceso.** Solo al principio:
- Abrir Shadow + Unreal
- Abrir Claude Code en Shadow
- Dar la imagen de referencia

A partir de ahí Claude trabaja solo hasta terminar.

### Pipeline de fidelidad visual (cómo queda igual que la realidad)

```
Google Maps Street View (foto de referencia)
        ↓
Analizo la foto:
  colores, materiales, proporciones, detalles
        ↓
Busco en Megascans la textura más parecida
  (biblioteca gratuita de Epic, fotos reales escaneadas)
        ↓
Creo el material en Unreal:
  textura + rugosidad + color + brillo ajustados
        ↓
Aplico Lumen:
  iluminación global automática, luz mediterránea real
  (latitud Marbella 36.5°N + hora del día)
        ↓
Captura in-game → comparo con la foto → corrijo
        ↓
Repito hasta que coincida
```

**Tecnologías de UE5 que se usan en este pipeline:**
- **Nanite** — detalle máximo en edificios sin coste de rendimiento
- **Lumen** — luz global en tiempo real, rebotes, sombras suaves
- **Megascans** — texturas fotorrealistas gratis (paredes encaladas, azulejos, asfalto…)
- **Sky Atmosphere** — cielo mediterráneo con la neblina y el azul de la Costa del Sol
- **Sun Position Plugin** — sol en la posición exacta de Marbella según hora y fecha
- **Water Plugin** — agua con olas y reflejos (ya instalado)
- **Foliage System** — palmeras y vegetación con viento
- **World Partition** — carga solo lo cercano al jugador (esencial para mapa grande)

### Tecnologías de UE5 por categoría

**Edificios (aspecto visual)**
- **Nanite** — permite millones de polígonos sin que el juego vaya lento. Los edificios tienen todo el detalle que quieras sin sacrificar rendimiento.
- **Materiales de Unreal** — sistema muy potente: rugosidad real en las paredes, reflejo del sol, humedad si llueve. Todo físicamente correcto.
- **Megascans** (biblioteca gratuita de Epic) — miles de texturas fotorrealistas escaneadas del mundo real: paredes encaladas, azulejos, asfalto, madera, mármol. Primera fuente para texturas de Marbella.

**Luz y cielo**
- **Lumen** — iluminación global en tiempo real. La luz del sol rebota en los edificios, entra por las ventanas, crea sombras suaves. Es lo que hace que UE5 se vea cinematográfico.
- **Sky Atmosphere + Volumetric Clouds** — cielo mediterráneo real con la neblina y el azul típico de la Costa del Sol.
- **Sun Position Plugin** — se introduce la latitud de Marbella (36.5°N) y la hora del día, y el sol queda exactamente donde estaría en la realidad.

**Agua**
- **Water Plugin** (ya instalado) — agua con olas, reflejos, interacción con barcos o el jugador.

**Vegetación**
- **Foliage System** — palmeras, pinos, plantas con movimiento de viento. UE5 incluye palmeras en su biblioteca base.

**Rendimiento**
- **World Partition** — divide el mundo en trozos, solo carga lo que está cerca del jugador. Esencial para un mapa del tamaño de Marbella.
- **Level of Detail (LOD) automático** — los edificios lejanos se simplifican solos para que vaya fluido sin perder calidad de cerca.

### Convenciones del proyecto (respétalas)
- **Español de España, sencillo.** Explica como a alguien no técnico.
- Aspecto visual de Marbella: **fuente oficial = Google Maps** (satélite + Street
  View). OSM solo de apoyo. Detalle en `docs/MARBELLA_VISUAL.md`.
- **Nombres:** lugares reales, marcas ficticias (`docs/NOMBRES.md`: Tom Ford→Tom Fjord…).
- **Panel de progreso:** apunta el trabajo en segundo plano en
  `tools/dashboard/state.json` (estados: en-curso/terminado/pausado/error).
- Mantén **archivos pequeños** y enfocados.

### Hoja de ruta (Hitos de Puerto Banús)
1. ✅ Andar · 2. ✅ Maqueta gris · **3. 🚧 Agua (en curso)** · 4. Vestir edificios
(blanco + tejado terracota, materiales) · 5. Luz/cielo mediterráneo · 6. Coche + NPCs.
Lista de assets gratis: `docs/UE5_ASSETS.md`.

### Lo primero que deberías hacer
1. Confirmar que puedes **ejecutar Python en el editor** (remote exec) y **leer el log**.
2. **Arreglar el agua** (poner los puntos a LINEAR) y **comprobarlo con una captura**.
3. Enseñar el resultado al usuario y seguir con el Hito 4 (vestir).
