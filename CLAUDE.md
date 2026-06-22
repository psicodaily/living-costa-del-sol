# Instrucciones del proyecto — Living Costa del Sol

## Idioma
- **SIEMPRE responder en español** (español de España). Todas las explicaciones, comentarios y documentación de cara al usuario en español.
- El usuario no es programador experto: explicar las cosas de forma clara y sencilla, sin tecnicismos innecesarios.

## Sobre el proyecto
- Videojuego de mundo abierto estilo GTA ambientado en **Marbella, España**.
- Plataforma: **solo PC (ordenador)**.
- Tecnología elegida: **Three.js + Vite + JavaScript** (se ejecuta en el navegador, iteración instantánea). Más adelante se podrá empaquetar como `.exe` con Tauri.
- Prioridad del usuario: **VER el juego cuanto antes** y mejorarlo poco a poco, versión a versión (v1.0 → v2 → v3 → v4).
- Filosofía: empezar simple (formas básicas), lanzar algo jugable, e ir mejorando continuamente.

## Forma de trabajar
- Avanzar por versiones incrementales que el usuario pueda ejecutar y ver.
- Mantener archivos pequeños y enfocados.
- Documento de visión y hoja de ruta en `docs/GAME_VISION.md`.

## Aspecto visual de Marbella — FUENTE OFICIAL: Google Maps
- **REGLA:** para TODO el aspecto visual de Marbella (edificios, aceras, calles,
  colores, formas, locales/negocios, rotondas, fuentes, vegetación, mobiliario...)
  la referencia es **Google Maps**: **vista satélite** (formas, manzanas, alturas
  aproximadas, trazado de calles, tejados) y **Street View** (colores y materiales
  de fachadas, ventanas, aceras, señales, comercios, vegetación). Usar **capturas**
  como referencia y **comparar el resultado con Google Maps hasta que coincida**.
- **Objetivo:** que edificios, aceras, colores y formas sean **iguales a la
  realidad** tal como se ven en Google Maps. No inventar.
- **OpenStreetMap (OSM): solo como APOYO** puntual cuando Google Maps no baste
  (p. ej. geometría exacta de calles/carriles o nombres). Nunca como base visual.
- Guía visual detallada en `docs/MARBELLA_VISUAL.md` (referencia zona por zona).

## Filosofía visual — "que parezca un lugar real"
- **REGLA:** no diseñar elementos aislados, sino **cómo se ven dentro del entorno
  completo**. Evaluar siempre: materiales, iluminación, escala, movimiento,
  desgaste, reflejos, variación e interacción con el clima.
- **Filtro de cada mejora visual:** *¿esto aumenta la percepción de realidad?* Si
  no, no priorizar. Preferir **variación e imperfección natural** frente a la
  repetición y lo "perfecto"; **movimiento sutil** frente a la exageración.
- **Meta:** que el jugador no piense *"qué buenos gráficos"*, sino *"esto parece un
  lugar real"*. Detalle en la idea «Principios de realismo visual» del panel.
- **Sensación > contenido:** ante la duda entre añadir más cosas o más sensación de
  realidad (olor imaginado, temperatura, ritmo, silencio, historia del lugar),
  **elegir sensación**. Detalle en la idea «Realismo sensorial» del panel.

## Panel de control (progreso en segundo plano)
- Existe un panel web en `localhost` para que el usuario vea el progreso de lo que corre en segundo plano.
- Se arranca con `npm run panel` (abre `http://localhost:4756`). El código está en `tools/dashboard/`.
- **REGLA para Claude:** siempre que se lance trabajo en segundo plano (workflows, comandos largos, tareas en paralelo), **registrarlo o actualizarlo en `tools/dashboard/state.json`** para que aparezca en el panel. Estados válidos: `en-curso`, `terminado`, `pausado`, `error`. Marcar `terminado` al acabar y actualizar `updatedAt`.
- El panel también detecta automáticamente los *workflows* de Claude Code (mejor esfuerzo, leyendo el rastro del sistema), pero el `state.json` es la fuente fiable.
