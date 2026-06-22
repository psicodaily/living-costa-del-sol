# 🎮 Plan de migración a Unreal Engine 5 (UE5)

> Documento de plan. Objetivo: pasar de la versión navegador (Three.js) a **Unreal
> Engine 5** para conseguir **realismo AAA**. Se irá actualizando.

---

## 0. Por qué UE5
- **Lumen** (iluminación realista en tiempo real) y **Nanite** (detalle altísimo): calidad AAA **de salida**.
- **Assets gratis**: Quixel Megascans (en Fab), el **City Sample** (la ciudad estilo GTA de la demo *Matrix Awakens*, gratis), y muchos packs.
- **Marbella REAL y foto-real** es posible con **Cesium for Unreal** (mosaicos 3D foto-reales de Google) o con el plugin **StreetMap** (importa OpenStreetMap).

---

## 1. EL problema a resolver PRIMERO: la máquina ⚠️
UE5 **no funciona** en un PC flojo ni en un **VPS normal sin gráfica**. Necesita **GPU dedicada potente** (NVIDIA RTX recomendado), 32 GB de RAM ideal, SSD rápido y bastante disco (100+ GB).

### Opciones reales (de menos a más compromiso)
| Opción | Qué es | Coste aprox. | Pros | Contras |
|---|---|---|---|---|
| **A) PC en la nube (Shadow)** | Un Windows completo en la nube con gráfica, te conectas y va como tu PC | **~30 €/mes** | Plug-and-play, sin comprar nada, instalas UE5 normal | Cuota mensual, algo de latencia |
| **B) GPU por horas (Paperspace/AWS)** | Alquilas una máquina con GPU solo cuando trabajas | **~0,5–1 €/hora** | Pagas solo lo que usas | Más técnico de montar, hay que encender/apagar |
| **C) Mejorar tu PC** | Comprar gráfica dedicada o PC nuevo | **gasto único 400 €+** | Tuyo para siempre, sin latencia | Inversión grande de golpe |

> **Recomendación para empezar sin gastar mucho:** **Opción A (Shadow)** — es lo más parecido a "un VPS con gráfica" y lo más fácil para alguien no técnico. Si más adelante el proyecto va en serio, se valora un PC propio (C).

> Importante: un **VPS normal sin GPU NO sirve** ni para editar ni para ver el juego.

---

## 2. Cómo trabajaremos (mi papel cambia)
- **Yo NO puedo manejar el editor de Unreal por ti** (es una app de escritorio; no la "veo" ni la clico como el navegador).
- **Tú serás mis manos** en el editor y me pasarás **capturas** (igual que ahora).
- **Yo sí puedo, y mucho:**
  - Plan y arquitectura de todo.
  - **Código C++** (jugabilidad, sistemas).
  - **Scripts de Python para Unreal** (importar nuestro mapa, generar ciudad, colocar cosas en masa, hacer capturas automáticas).
  - **Guiarte paso a paso**, clic a clic.
  - Elegir y configurar **plugins y assets**.
- **La iteración será más lenta** que en el navegador (instalaciones, compilaciones, tú haciendo pasos). Hay que asumirlo.

---

## 3. Hoja de ruta por fases

### Fase 0 — Máquina lista 🖥️
Decidir y preparar dónde corre UE5 (nube Shadow / GPU por horas / PC propio). **Nada avanza sin esto.**

### Fase 1 — UE5 instalado + proyecto base
- Instalar **Epic Games Launcher** + **Unreal Engine 5** (versión estable, p. ej. 5.4/5.5).
- Crear proyecto con plantilla **Third Person** (ya trae personaje que anda).
- Comprobar que te mueves por un nivel vacío. (Yo te guío clic a clic.)

### Fase 2 — Meter MARBELLA (aquí está el realismo) 🌍
Tres vías, elegimos según resultado/rendimiento:
- **Cesium for Unreal + Google 3D Tiles (foto-real):** Marbella real fotorrealista, edificios y texturas de verdad, en streaming. *(Es lo más cercano a tus capturas. Necesita una clave de Google Maps; tiene capa gratis y luego coste por uso.)*
- **Plugin StreetMap (OSM):** importa los edificios/calles reales de OpenStreetMap como geometría propia (lo que ya teníamos, pero en UE5).
- **Nuestros datos** (`marbella.json`): un script de Python genera la ciudad desde lo que ya construimos.

### Fase 3 — Personaje + coche
- Personaje jugable (plantilla UE5 + un modelo decente de Fab).
- Coche conducible (plantilla **Vehicle** de UE5).

### Fase 4 — Detalle y vida
- Assets **Megascans/Fab** y piezas del **City Sample** (coches, edificios, props).
- Vegetación (palmeras), mobiliario, agua (UE5 trae sistema de agua), cielo y nubes (Lumen + Volumetric Clouds).
- Tráfico y NPCs (el City Sample trae multitudes y tráfico de ejemplo).

### Fase 5 — Jugabilidad
- Misiones, dinero, mapa/minimapa, sistema policial… (reusamos el DISEÑO que ya pensamos).

---

## 4. Qué se reaprovecha de lo hecho
- **Datos reales de Marbella** (OSM): edificios, calles, alturas, POIs, zonas.
- **Todo el diseño y la hoja de ruta** (GAME_VISION, ideas, sistemas pensados).
- **El conocimiento** del proyecto.
- El proyecto Three.js queda **congelado y jugable** en `versions/` como prototipo.

---

## 5. Expectativas honestas
- UE5 sube muchísimo el **techo visual** (sí puede acercarse a tus capturas, sobre todo con Cesium foto-real).
- Pero: **cuesta dinero** (máquina con GPU), **itera más lento**, y **un GTA completo sigue siendo trabajo de mucho tiempo**. El *aspecto* mejora rápido; la *jugabilidad* completa, no.
- Empezamos **pequeño y jugable** (moverte por Marbella real) y crecemos por fases.

---

## 🎨 OBJETIVO VISUAL (definido) — la brújula del proyecto
> **Puerto Banús (y Marbella) reconocible y REALISTA**: luz cálida del Mediterráneo,
> **materiales reales** (asfalto, piedra, cristal, madera, agua), **agua con reflejos
> y olas**, **palmeras/vegetación reales**, y **edificios fieles** en forma, altura,
> color y uso. Que **quien haya estado lo reconozca al instante** y que una captura
> parezca **un juego AAA moderno** (UE5 Lumen/Nanite), **no un juguete**.

- **Aspiración / techo:** capturas de **GTA V** del usuario.
- **Fidelidad:** **Google Maps** de Puerto Banús (forma, escala, negocios reales).
- **Honestidad de hardware:** en la máquina barata (T4) apuntamos a **"muy bien a
  ajustes medios"**; el ultra con multitudes pediría máquina mejor (se sube si cuaja).

### CAMINO ELEGIDO: assets propios realistas ✅
Construimos con **materiales/modelos realistas propios** (Quixel **Megascans** + **Fab**,
gratis) + **Lumen**. Es realista, **de estilo propio**, **VENDIBLE**, con control total
y **apto para juego**. (Descartado el foto-real de Google/Cesium: pesado, no vendible y
no apto para juego.)

**Qué implica en concreto:**
- **Materiales:** Megascans foto-escaneados (asfalto, adoquín, piedra, hormigón, madera, cristal).
- **Edificios:** fieles (forma/altura/color reales por Google Maps + OSM) con escaparates/toldos/terrazas; kits modulares de Fab + propios.
- **Agua:** sistema **Water** de UE5 (marina con reflejos, olas, profundidad).
- **Vegetación/props:** palmeras, farolas, papeleras, bancos, jardineras (Megascans/Fab).
- **Barcos:** yates/veleros de Fab.
- **Luz/cielo:** **Lumen** + cielo + **nubes** + luz cálida; **Nanite** donde rinda.

**Listón de calidad (cómo sabemos si va bien):**
1. ¿Se reconoce Puerto Banús (dársena, fila de edificios, espigón)?
2. ¿Los materiales parecen reales (no colores planos)?
3. ¿La luz es cálida y creíble?
4. ¿La escala es humana (puertas/ventanas/alturas creíbles)?
5. ¿Rinde bien en la T4 a ajustes medios?

## 6. Enfoque: EMPEZAR SOLO POR PUERTO BANÚS 🎯
Decisión: en vez de la Marbella entera, **construimos primero solo Puerto Banús**
(pequeño, cabe en la máquina barata, y aprendemos antes de escalar). Ya tenemos
referencias: capturas de Google Maps (satélite + Street View) y datos OSM.

### Hitos pequeños de Puerto Banús en UE5
1. **Andar en UE5** — proyecto con plantilla *Third Person*, Play, moverse.
2. **Maqueta (blockout)** — forma real (dársena, muelle, calles, edificios como
   cajas grises) a escala correcta. Script de Python que coloca las cajas desde
   nuestros datos reales.
3. **Agua + suelo** — sistema **Water** (marina + mar) y suelo del paseo.
4. **Vestirlo** — edificios de Fab/Megascans, palmeras, barcos, farolas, papeleras.
5. **Luz y cielo** — Lumen, nubes, luz cálida.
6. **Vida** — coche conducible (plantilla *Vehicle*) + algún NPC.
7. **Evaluar** y decidir cómo ampliar el mapa.

## 7. Estado / siguiente acción concreta
- **Máquina (Fase 0): RESUELTA** → Vagon (Computer "Planeta", 125 GB, con Unreal +
  Epic Games preinstalados). Pendiente: que termine de instalar el disco y conectarse.
- **Siguiente:** entrar al escritorio de Windows → **Fase 1 (proyecto + andar)** →
  luego **maqueta de Puerto Banús**. Guía clic a clic.
