# Instrucciones del proyecto — GTA Marbella

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

## Panel de control (progreso en segundo plano)
- Existe un panel web en `localhost` para que el usuario vea el progreso de lo que corre en segundo plano.
- Se arranca con `npm run panel` (abre `http://localhost:4756`). El código está en `tools/dashboard/`.
- **REGLA para Claude:** siempre que se lance trabajo en segundo plano (workflows, comandos largos, tareas en paralelo), **registrarlo o actualizarlo en `tools/dashboard/state.json`** para que aparezca en el panel. Estados válidos: `en-curso`, `terminado`, `pausado`, `error`. Marcar `terminado` al acabar y actualizar `updatedAt`.
- El panel también detecta automáticamente los *workflows* de Claude Code (mejor esfuerzo, leyendo el rastro del sistema), pero el `state.json` es la fuente fiable.
