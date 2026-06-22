# 🌴 Living Costa del Sol — Documento de Visión y Hoja de Ruta

> Documento maestro del proyecto. Define **qué** queremos hacer, **hacia dónde** vamos y
> **cuál es el objetivo final**. Se irá actualizando versión a versión.

---

## 🎯 Objetivo general

Crear un videojuego de **mundo abierto estilo GTA** ambientado en **Marbella (España)**,
con un nivel de detalle que vaya acercándose progresivamente a un AAA moderno.

El juego debe ser **coherente, jugable y escalable**, y sobre todo: **se debe poder VER y
PROBAR desde el primer día**, mejorando de forma continua.

### Filosofía del proyecto
1. **Ver antes que perfeccionar.** Primero algo que funcione y se vea, aunque sea simple.
2. **Iterar versión a versión.** Cada versión añade cosas concretas y jugables.
3. **Archivos pequeños y ordenados.** Para que el proyecto crezca sin convertirse en un caos.
4. **Realismo con diversión.** Marbella reconocible, pero adaptada para que sea divertida.

### Plataforma
- **Solo PC (ordenador).** No hay versión de móvil ni consola.

---

## ⚙️ ACTUALIZACIÓN 2026 — Migración a Unreal Engine 5

> **LO MÁS IMPORTANTE DE ESTE DOCUMENTO.** La tecnología cambió. Todo lo que viene
> después de esta sección (tabla Three.js, hoja de ruta v1–v4, estado v2.17) es
> **historia del prototipo** y se conserva solo como referencia.

**Qué pasó:** el proyecto empezó como prototipo en **Three.js** (navegador) para validar la
idea rápido. Se congeló en **v2.17**. Three.js no llega al **fotorrealismo** ni a un
**producto vendible**, así que se **migró a Unreal Engine 5.7** (el mismo tipo de motor que
GTA o los juegos AAA modernos).

### Tecnología actual

| Pieza | Herramienta | Por qué |
|-------|-------------|---------|
| Motor | **Unreal Engine 5.7** | Fotorrealismo real (Nanite + Lumen), producto vendible. |
| Máquina | **Shadow** (PC en la nube) | Potencia para Unreal sin comprar un ordenador caro. |
| Construir el mundo | **Python** (en el editor) | Coloca edificios, calles, materiales automáticamente. |
| Lógica del juego | **C++** | Coche, personaje, NPCs, IA. Lo escribe Claude como texto. |
| Automatización | **Claude Code dentro de Shadow** | Escribe, ejecuta, captura, comprueba y corrige solo. |

**Cómo se trabaja:** el usuario abre Shadow + Unreal + Claude Code. A partir de ahí, Claude
trabaja en bucle autónomo (ver `docs/CLAUDE_EN_SHADOW.md`).

### Hoja de ruta actual (Unreal) — todo avanza A LA PAR por capas

> Regla de oro: **nunca** perfeccionar una zona mientras el resto sigue gris.

- **V1 — Blockout gris:** todos los edificios y calles como bloques grises a escala real.
  *(Puerto Banús ya hecho: 109 edificios.)*
- **V2 — Color base:** blanco/beige/terracota en edificios, asfalto, aceras, agua azul.
- **V3 — Vegetación y mobiliario:** palmeras, farolas, bancos, papeleras, toldos, señales.
- **V4 — Texturas y luz:** Megascans fotorrealistas + Lumen + cielo mediterráneo calibrado.
- **V5 — Detalles y vida:** coches, barcos, terrazas, iluminación nocturna, polish fino.

Y en paralelo, lo jugable: **agua de la dársena** (en curso) → **coche conducible** → **NPCs**.

---

## 🛠️ Tecnología del prototipo (HISTÓRICO — Three.js)

> ⚠️ Esto es del prototipo congelado en v2.17. **Ya no es la tecnología activa.**
> Se conserva como referencia de lo aprendido.

| Pieza | Herramienta | Por qué |
|-------|-------------|---------|
| Motor 3D | **Three.js** | Funciona en el navegador, sin instalaciones pesadas. Se ve al instante. |
| Servidor de desarrollo | **Vite** | Recarga automática: cambias código y se actualiza solo en pantalla. |
| Lenguaje | **JavaScript** | Directo, rápido de iterar. |
| Empaquetado de escritorio (futuro) | **Tauri** | Convertir el juego en un `.exe` ligero para Windows (v4). |

**Cómo se ejecutaba:** un solo comando (`npm run dev`) abría el juego en el navegador.

> **Nota sobre la ambición AAA:** un GTA real lo hacen cientos de personas durante años.
> Aquí construimos un juego de mundo abierto *de verdad* pero a una escala realista,
> priorizando que sea jugable y mejore constantemente.

---

## 🗺️ Hoja de ruta por versiones

### ✅ v1.0 — "Se mueve" *(versión actual: lo mínimo para VER que funciona)*
**Meta:** mover un personaje con las flechas por una ciudad básica.
- Cielo azul con sol y niebla atmosférica.
- Suelo y calles (cuadrícula sencilla).
- Edificios como bloques de colores.
- Árboles simples.
- **Personaje principal controlable con las flechas (y WASD).**
- Cámara en tercera persona que sigue al personaje.
- **Algunos NPCs caminando** por la ciudad.
- HUD mínimo (nombre de versión y controles).

> Todo con formas geométricas simples. El objetivo NO es que sea bonito,
> sino comprobar que el juego arranca, se mueve y "tiene vida".

---

### 🔜 v2.0 — "Marbella toma forma"
**Meta:** que empiece a parecerse a Marbella y se pueda conducir.
- Ciclo **día/noche** con cambios de iluminación.
- Trazado de calles inspirado en Marbella: **Puerto Banús (marina), paseo marítimo,
  casco antiguo, zona de playa, zona residencial de lujo**.
- Variedad de edificios (alturas, colores, tipos).
- **Un vehículo conducible** (entrar/salir, conducción básica).
- **Colisiones básicas** (no atravesar edificios ni coches).
- HUD mejorado (velocímetro, mini-info).
- Sonido ambiente básico.

---

### 🔮 v3.0 — "Vida y sistemas"
**Meta:** que la ciudad esté viva y tenga reglas de juego.
- **Tráfico** de vehículos con IA (rotondas, calles, semáforos).
- **Peatones con IA** (rutinas, reaccionan al jugador y al crimen).
- **Sistema policial y nivel de búsqueda** (estrellas, persecuciones, refuerzos).
- **Dinero y economía básica.**
- **Clima** (sol intenso, tormentas, eventos).
- **Radio y música** (emisoras locales ficticias).
- Entrar en algunos edificios (interiores).
- Sistema de **reputación** del jugador.

---

### 🌟 v4.0 — "Identidad AAA"
**Meta:** convertirlo en un juego con alma y mejor acabado.
- **Mejora gráfica real** (modelos, iluminación avanzada, sombras, postprocesado).
- **Misiones e historia principal** (tono satírico estilo GTA con identidad española).
- **Personajes** (protagonista, antagonistas, bandas).
- **Propiedades y negocios** (villas, clubes, inversión inmobiliaria).
- **Eventos dinámicos** (redadas, fiestas, carreras ilegales).
- **Empaquetado como `.exe`** de escritorio (Tauri).
- (Opcional) Exploración **multijugador**.

---

## 🌍 Visión a largo plazo del contenido (referencia futura)

Estas son las ideas grandes que guían el proyecto. NO se hacen ahora, pero marcan el norte.

### Mapa y mundo
- Recreación de Marbella: ciudad, costa, casco urbano, Puerto Banús, zonas residenciales,
  montaña, carreteras.
- Zonas: barrios de lujo, zonas turísticas, zonas humildes, polígonos industriales.
- Escala objetivo: mapa explorable y coherente (no hace falta clonar GTA V en km²;
  mejor un mapa más pequeño pero denso y divertido).
- Interiores accesibles en edificios clave.
- Ciclo día/noche y clima que afectan a la ciudad.

### Vehículos
- Coches de lujo, superdeportivos, scooters, furgonetas, barcos/yates.
- Física de conducción, sistema de daños, tráfico realista.
- Vehículos icónicos de Marbella (deportivos en Puerto Banús).
- Persecuciones policiales.

### NPCs y vida urbana
- Turistas, locales, policías, empresarios, criminales, "influencers".
- Rutinas diarias, densidad por zonas, reacciones al crimen.
- Comportamiento en playas, clubes, marinas y zonas de fiesta.

### IA
- IA policial (búsqueda, tácticas, refuerzos, helicópteros).
- IA de tráfico y de peatones.
- IA de bandas / crimen organizado.
- "Memoria del mundo": las acciones pasadas del jugador afectan al futuro.

### Gameplay
- Misiones principales y secundarias (contratos, carreras, robos, trabajos legales).
- Actividades: yates, golf, clubes, negocios, apuestas simuladas.
- Progreso del personaje, dinero, economía, sistema de crimen y territorios.

### Historia y tono
- Marbella moderna: crimen, dinero, corrupción, turismo de lujo.
- Tono satírico estilo GTA, con identidad española.
- Temas: turismo, desigualdad, lujo, crimen organizado.

---

## 📁 Estructura del proyecto

```
Living Costa del Sol/
├─ CLAUDE.md              # Instrucciones (idioma español, contexto)
├─ docs/
│  └─ GAME_VISION.md      # Este documento
├─ index.html            # Página que carga el juego
├─ package.json          # Dependencias y comandos
├─ vite.config.js        # Configuración del servidor de desarrollo
└─ src/
   ├─ main.js            # Punto de entrada y bucle del juego
   ├─ world/             # Cielo, suelo, calles, edificios, árboles
   ├─ player/           # Personaje, controles (flechas) y cámara
   └─ npc/              # NPCs que caminan
```

---

## ▶️ Cómo ejecutar el juego

1. Abrir una terminal en la carpeta del proyecto.
2. La primera vez: `npm install` (instala lo necesario).
3. Cada vez que quieras jugar: `npm run dev`.
4. Se abre el navegador con el juego. Mueve el personaje con las **flechas** o **WASD**.

---

## 📌 Estado actual
- **Versión en desarrollo:** v2.17 — "Techo de realismo (agua + barcos CC0)".
- Versiones congeladas: v1.0 … v1.13, **v2.0 … v2.17** (carpeta `versions/`).
- **v2.17:** agua con olas y reflejos (Three.js Water) + veleros CC0 + (de v2.16)
  luz HDRI y texturas PBR. Demo para evaluar el techo de realismo del navegador.
- **v2.16:** prueba de realismo en Puerto Banús — **iluminación HDRI** (reflejos +
  luz natural), **texturas PBR CC0** (asfalto, adoquín, plaster) y **agua
  reflectante**. A verificar en PC; si convence, se aplica a todo el juego.
- Aviso de alcance: el navegador (Three.js) **no llega al foto-realismo exacto de
  GTA V** (motor nativo + equipo + años), pero sí a un **semi-realista estilizado**
  muy superior a los colores planos. Estrategia: texturas + luz + modelos CC0.
- **v2.15:** sistema de modelos 3D montado — palmeras reales **CC0 (Quaternius)**
  instanciadas en Puerto Banús. Estrategia elegida: **procedural + packs CC0**
  (un estilo low-poly coherente, estilo GTA). Próximo: barcos/coches/mobiliario CC0.
- **v2.14:** distrito de Puerto Banús con edificios "ricos" (planta comercial con
  escaparate + toldo + cornisa, alturas variadas, tejado de teja), paseo con
  palmeras/farolas/papeleras y faro. Construido estudiando Google Maps.
- **v2.13:** yates con forma de barco (no coches), dársena excavada por erosión
  (sin coches/edificios/calles en el agua), barrera para no andar sobre el mar.
  Además ya puedo capturar **Google Maps (satélite + Street View)** con Playwright
  para recrear Puerto Banús fiel (v2.14+).
- **v2.12:** Puerto Banús con **yates** (dársena excavada a nivel del mar para que
  se vea agua) y **más tráfico/peatones**; el jugador aparece en tierra junto a
  la marina.
- **v2.11:** el mapa muestra **zonas/distritos** con perímetro de color y nombre
  (Puerto Banús, Nueva Andalucía, Golden Mile, Sierra Blanca, Centro, Casco
  Antiguo, Playa / Paseo Marítimo).
- **v2.10:** ya se ve el **mar**; arregladas **carreteras/aceras/playa/zonas verdes**
  (se descartaban por tener la cara hacia abajo); **líneas de carril**; el jugador
  **empieza en Puerto Banús** con **coches aparcados** para coger (tecla E).
- El mapa real incluye **nombres de calle reales** (cartel estilo GTA).
- **v2.8:** cuestas REALES; cimiento que cubre la pendiente (ni flotan ni se
  entierran); tejados terracota; mapa grande a pantalla completa con **iconos de
  sitios** reales (hospital, ayuntamiento, policía, bomberos, etc.).
- **v2.9:** el mapa tiene **relieve** (sombreado de cuestas), **leyenda/índice**
  de iconos con filtro, **nombres de calle sobre la carretera** (girados y
  ajustados al tramo) y **rutas tipo GPS** (clic en el mapa → camino por las
  calles dibujado en el mapa y en el radar).
- Pendiente: **v2.10** rellenar zonas vacías con **satélite**; **v2.11** más
  **vida** (tráfico/gente) y **Puerto Banús con yates**.
- La **v1.13** es la versión "arcade" (cuadrícula) con TODA la IA; la **v2.0** es el
  mapa REAL con mi estilo visual (la IA se irá llevando al mapa real en v2.x).
- Próximo: **v2.1+** = tráfico, peatones y policía sobre las calles reales.
- Nota: la "identidad de Marbella" (paseo marítimo, Puerto Banús, barrios) se hará
  más adelante copiando **Google Maps** (satélite + Street View) como referencia
  visual; OpenStreetMap solo como apoyo de geometría.

### Sistema de versiones
- Cada versión se **congela** en `versions/vX.Y` y nunca se sobrescribe.
- La raíz del proyecto siempre es la versión más nueva.
- **Menores (v1.1, v1.2…):** mejoras pequeñas y frecuentes sobre la misma base.
- **Mayores (v2.0, v3.0…):** salto grande cuando entra un sistema nuevo importante.
- Para congelar la versión actual: `npm run snapshot`.
- Para jugar una versión antigua: `npm run play -- versions/v1.0`.
