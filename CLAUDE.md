# Instrucciones del proyecto — Living Costa del Sol

## Idioma
- **SIEMPRE responder en español** (español de España). Todas las explicaciones, comentarios y documentación de cara al usuario en español.
- El usuario no es programador experto: explicar las cosas de forma clara y sencilla, sin tecnicismos innecesarios.

## Sobre el proyecto
- Videojuego de mundo abierto estilo GTA ambientado en **Marbella, España** (zona **Puerto Banús** primero).
- Plataforma: **solo PC (ordenador)**.
- Objetivo: producto **fotorrealista y vendible**, lo más parecido a la realidad (Google Maps).
- **Tecnología ACTUAL: Unreal Engine 5.7** (motor nativo, fotorrealista). Se trabaja en una
  máquina en la nube (**Shadow**) con un **Claude Code dentro de Shadow** que automatiza Unreal
  (escribe scripts, los ejecuta en el editor, hace capturas, comprueba y corrige).
- **Historia (importante para no confundirse):** el proyecto empezó como **prototipo en Three.js**
  (navegador), congelado en **v2.17** (carpetas `versions/`, `src/`, `index.html`). Sirvió para
  validar la idea. Para llegar al **fotorrealismo y a un producto vendible** se **migró a
  Unreal Engine 5**. El código Three.js se conserva solo como referencia histórica; **el
  desarrollo activo es Unreal** (carpeta `ue5/` + datos en `tools/` y `public/marbella.json`).
- Prioridad del usuario: **VER el juego cuanto antes** y mejorarlo versión a versión.
- Filosofía: empezar simple (bloques grises), **todo a la par**, e ir dando realismo por capas.

## Quién es el usuario y cómo trabajar con él
- **No es programador.** Claude hace TODO: escribe el código, lo ejecuta, lo comprueba con
  capturas y lo corrige. El usuario solo ejecuta acciones puntuales muy guiadas (abrir un
  programa, pegar un comando) y da imágenes de referencia.
- Se frustra con las idas y venidas (pegar capturas, copiar y pegar). **Minimizar su trabajo
  manual.** El ideal es el bucle autónomo dentro de Shadow.
- Explicar **claro y sencillo**, sin tecnicismos. Confirmar el "porqué" cuando se decide algo.

## Forma de trabajar
- Avanzar por **versiones incrementales** que el usuario pueda ejecutar y ver.
- **Todo avanza a la par por capas** (NO perfeccionar un edificio mientras el resto es gris):
  V1 bloques grises → V2 color base → V3 vegetación/mobiliario → V4 texturas+luz → V5 detalles.
- Mantener archivos pequeños y enfocados.
- **Contexto operativo de Unreal/Shadow** (el más importante para trabajar): `docs/CLAUDE_EN_SHADOW.md`
  — el bucle autónomo, coordenadas, estado actual y próximos pasos.
- Documento de visión y hoja de ruta: `docs/GAME_VISION.md`.

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
