# PILOTO AUTOMÁTICO — Claude Code en Shadow

> **Qué es esto:** guía completa para que Claude trabaje de forma autónoma
> dentro de la máquina Shadow con Unreal Engine 5.7 abierto. El usuario
> abre Shadow, abre Unreal, abre Claude Code — y a partir de ahí Claude
> trabaja solo: escribe código, lo ejecuta, hace capturas, las mira,
> corrige, y avisa cuando termina. **El usuario no toca nada durante el proceso.**

---

## PARTE 1 — Instalación única (solo la primera vez)

### 1. Node.js en Shadow
1. Abre Chrome en Shadow → **https://nodejs.org**
2. Descarga versión **LTS** → ejecuta `.msi` → Next / Next / Install.

### 2. Claude Code en Shadow
1. Abre **PowerShell** (Inicio → `powershell` → Enter).
2. Ejecuta:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
3. Escribe `claude` → Enter → inicia sesión con la misma cuenta de Claude.

### 3. Git en Shadow (para clonar el repo)
1. Descarga Git for Windows: **https://git-scm.com** → instala con todo por defecto.
2. Clona el proyecto:
   ```
   git clone https://github.com/psicodaily/living-costa-del-sol.git
   ```

### 4. Activar Remote Execution de Python en Unreal
1. Unreal → **Edit → Project Settings** → busca `Python`.
2. Marca **"Enable Remote Execution"**.
3. Reinicia el editor si lo pide.

---

## PARTE 2 — Cómo trabaja Claude aquí (el bucle autónomo)

Una vez instalado, Claude puede:

1. **Escribir scripts Python** directamente en la carpeta del proyecto.
2. **Mandarlos al editor de Unreal** sin que el usuario haga nada, usando
   `remote_execution.py` (incluido en el motor en
   `Engine/Plugins/.../PythonScriptPlugin/Content/Python/remote_execution.py`).
3. **Leer el log de Unreal** para detectar errores:
   `<Proyecto>/Saved/Logs/LivingCostaDelSol.log`
4. **Hacer capturas de pantalla** desde Python:
   `unreal.AutomationLibrary.take_high_res_screenshot(1920, 1080, "captura")`
   → PNG en `<Proyecto>/Saved/Screenshots/`
5. **Ver las capturas** (Claude Code puede leer imágenes PNG directamente).
6. **Comparar con la referencia real** (foto de Google Maps que dio el usuario).
7. **Corregir y repetir** hasta que coincida.

```
BUCLE AUTÓNOMO:
  escribo script → ejecuto en Unreal → leo log → hago captura
  → veo captura → comparo con referencia → corrijo → repito
  → cuando coincide → aviso al usuario
```

---

## PARTE 3 — El proyecto (contexto)

- **Nombre:** Living Costa del Sol
- **Motor:** UE5.7, proyecto `LivingCostaDelSol`, nivel `LvL_ThirdPerson`
- **Género:** mundo abierto estilo GTA, ambientado en Marbella (Puerto Banús primero)
- **Plataforma:** PC
- **Repo:** https://github.com/psicodaily/living-costa-del-sol

### Lo que ya está hecho
1. ✅ Se anda por el mundo (Play + WASD)
2. ✅ Puerto Banús importado: 109 edificios grises en `PuertoBanus/Blockout` + suelo
3. ✅ PlayerStart en el origen (centro de la dársena)
4. ✅ Plugin Water instalado; hay `WaterBodyLake` + `WaterZone`
5. ✅ 288 calles reales de PB extraídas de OSM (script `ue5/dress_puertobanus.py`)

### Sistema de coordenadas (no cambiar)
- Datos OSM en metros: `x = ESTE`, `z = SUR`
- A Unreal (cm): `X = -z * 100` (norte), `Y = x * 100` (este)
- **Origen (0,0,0)** = centroide de la dársena de Puerto Banús
  (lon: -4.951074, lat: 36.487095)

---

## PARTE 4 — Fuentes de referencia visual

### Regla principal: Google Maps manda
| Fuente | Para qué |
|---|---|
| **Google Maps satélite** | Forma de manzanas, trazado de calles, tejados, tamaños |
| **Google Maps Street View** | Colores de fachadas, materiales, aceras, vegetación, mobiliario |
| **Google Earth 3D** | Alturas de edificios, perspectiva volumétrica de zonas |
| **OSM (OpenStreetMap)** | Solo geometría de calles y carriles cuando Maps no baste |

Google Maps es la referencia visual. OSM es solo apoyo para geometría.

### Cómo se mapea una zona antes de construirla

```
1. CAPTURA AÉREA general (satélite, vista alta):
   → ver el mapa completo, orientarse, identificar zonas

2. DIVIDIR en sub-zonas de ~500m × 500m:
   → cada sub-zona se trabaja como una unidad independiente
   → ejemplos: "dársena", "muelle de levante", "centro comercial", "playa"

3. Para cada sub-zona:
   a. Captura satelital de la sub-zona → forma de bloques y calles
   b. Capturas Street View de cada calle principal → materiales y detalles
   c. Inventario de elementos: palmeras, farolas, bancos, papeleras, toldos,
      señales, alcantarillas, contenedores, coches aparcados...

4. CONSTRUIR la sub-zona por versiones (ver abajo)
```

### Calles: OSM para geometría, Google Maps para visual
- **La geometría** (dónde va cada calle, anchos, carriles) viene de OSM data
  ya extraída en `marbella.json` → scripts `tools/ue5_extract_dress.mjs`
- **El aspecto** (qué color tiene el asfalto, qué hay en la acera, qué árboles)
  viene de Google Maps Street View → capturas de referencia
- **Google Earth** no es necesario para trazar calles — la geometría OSM es
  más precisa que trazar a mano desde una imagen satélite

---

## PARTE 5 — Sistema de versiones (cómo avanza todo a la par)

**Regla de oro: nunca perfeccionar una zona mientras el resto queda gris.
Todo avanza en capas, una versión a la vez para toda el área.**

### V1 — Geografía completa (blockout total)
*Objetivo: el mapa completo reconocible desde el aire*
- Todos los edificios como cajas grises a escala real ← ya hecho en PB
- Calles como planos grises planos a escala real ← ya hecho en PB
- Agua como plano azul plano (forma correcta)
- Suelo uniforme marrón claro
- Sin texturas, sin detalles, sin mobiliario

### V2 — Color base (todo a la vez)
*Objetivo: reconocible a pie, con los colores correctos*
- Edificios: blanco / beige / terracota según zona (basado en Street View)
- Calles: gris asfalto + líneas blancas
- Aceras: piedra clara beige
- Agua: azul con reflejos básicos
- Suelo: tierra/arena
- Aún sin texturas fotorrealistas, aún sin mobiliario

### V3 — Vegetación y mobiliario urbano
*Objetivo: la calle empieza a parecer una calle real*
- Palmeras y árboles en sus posiciones reales (de Street View)
- Farolas en las aceras
- Bancos, papeleras, contenedores
- Señales de tráfico básicas
- Toldos de bares y tiendas (color según Street View)
- Vallados, maceteros, fuentes

### V4 — Texturas fotorrealistas y luz definitiva
*Objetivo: foto confundible con la realidad*
- Megascans en todos los materiales: paredes encaladas, azulejos, asfalto desgastado
- Lumen al máximo: rebotes de luz, sombras suaves, reflejos en el agua
- Cielo mediterráneo: Sky Atmosphere + Volumetric Clouds
- Sol calibrado: latitud Marbella 36.5°N, hora del día (tarde, luz dorada)
- Variación de texturas: no todos los edificios exactamente iguales
- Desgaste: manchas, humedad, vegetación en grietas

### V5 — Detalles y polish fino
*Objetivo: perfección que el jugador nota al acercarse*
- Balcones, persianas, marcos de ventana
- Graffiti en sitios concretos (como en la realidad)
- Coches aparcados estáticos en las calles
- Terrazas de bares con sillas y mesas
- Barcos en la dársena
- Iluminación nocturna: farolas, neones, reflejos en el agua

---

## PARTE 6 — Tecnologías de UE5 disponibles

**Edificios**
- **Nanite** — millones de polígonos sin coste de rendimiento
- **Materiales PBR** — rugosidad, reflejo, humedad físicamente correctos
- **Megascans** — texturas fotorrealistas gratis de Epic (paredes encaladas, azulejos, asfalto, madera, mármol)

**Luz y cielo**
- **Lumen** — iluminación global en tiempo real: rebotes, sombras suaves, look cinematográfico
- **Sky Atmosphere + Volumetric Clouds** — cielo mediterráneo con neblina y azul de la Costa del Sol
- **Sun Position Plugin** — sol en posición exacta según latitud (36.5°N) y hora del día

**Agua**
- **Water Plugin** (ya instalado) — agua con olas, reflejos, interacción física

**Vegetación**
- **Foliage System** — palmeras, pinos, arbustos con movimiento de viento
- UE5 incluye palmeras en su biblioteca base

**Rendimiento**
- **World Partition** — carga solo lo cercano al jugador (esencial para mapa grande)
- **LOD automático** — edificios lejanos se simplifican solos

---

## PARTE 7 — Pipeline de fidelidad visual

Para cuando el usuario da una foto de referencia y quiere que el juego sea igual:

```
Google Maps Street View (foto de referencia)
        ↓
Analizo la foto:
  colores de fachada, tipo de material, proporciones,
  detalles (balcones, toldos, vegetación, mobiliario)
        ↓
Busco en Megascans la textura más parecida
  (biblioteca gratuita de Epic, escaneada del mundo real)
        ↓
Creo el material en Unreal:
  textura + rugosidad + color + brillo ajustados a la foto
        ↓
Aplico Lumen:
  iluminación mediterránea (latitud 36.5°N, tarde)
        ↓
Captura in-game → comparo con la foto de referencia → corrijo
        ↓
Repito hasta que coincida
```

---

## PARTE 8 — Estado actual y próximos pasos

### Tarea pendiente: terminar el agua (Hito 3)
- El `WaterBodyLake` necesita la forma real de la dársena.
- **Bug conocido:** `LogGeomTools: Triangulation of poly failed`
- **Causa:** puntos de spline en modo curva → se cruzan en esquinas cerradas
- **Solución:** añadir `set_spline_point_type(i, unreal.SplinePointType.LINEAR, False)`
  para cada punto tras fijarlos.
- Script listo: `ue5/water_marina.py` (solo añadir el paso LINEAR)
- Polígono de 15 puntos (LOCAL, cm):
  `[(-32626,-19428),(-37540,-11833),(-6830,8335),(1968,14417),(4886,15614),
  (10841,16539),(11070,14501),(15662,10073),(17793,8515),(17331,4400),
  (9403,-5682),(5471,-10430),(6,-16575),(-1502,-15449),(-12621,-29744)]`
- Alternativa convexa de 8 puntos si falla:
  `[(-37500,-11800),(-6800,8300),(10800,16500),(17800,8500),(17300,4400),
  (0,-16600),(-12600,-29700),(-32600,-19400)]`

### Hoja de ruta de hitos
1. ✅ Andar por el mundo
2. ✅ Maqueta gris de Puerto Banús (109 edificios)
3. 🚧 Agua de la dársena (bug LINEAR pendiente)
4. ⏳ V2: color base en todo Puerto Banús
5. ⏳ V3: vegetación + mobiliario urbano
6. ⏳ V4: texturas Megascans + Lumen definitivo
7. ⏳ Coche conducible + NPCs peatones

### Lo primero que hacer al arrancar en Shadow
1. Confirmar remote execution funcionando (ejecutar un Python de prueba).
2. Arreglar el agua (añadir LINEAR, comprobar con captura).
3. Avanzar al siguiente hito de la hoja de ruta.

---

## Convenciones del proyecto
- **Idioma:** español de España, sencillo (el usuario no es programador)
- **Visual oficial:** Google Maps satélite + Street View. OSM solo de apoyo.
- **Nombres:** lugares reales, marcas ficticias (Tom Ford → Tom Fjord, etc.)
- **Panel de progreso:** anotar trabajo en `tools/dashboard/state.json`
- **Archivos:** pequeños y enfocados, máximo ~400 líneas
- **Assets:** `docs/UE5_ASSETS.md` — lista de recursos gratis organizados por hito
