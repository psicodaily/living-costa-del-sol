# 🎮 Cómo jugar — GTA Marbella

## Arrancar el juego (fácil) ✅

**Haz doble clic en el archivo `JUGAR.bat`** que está en la carpeta del proyecto.

- Se abrirá una ventana negra (es el "motor" del juego) y, en unos segundos,
  el navegador con el juego en `http://localhost:5173`.
- **No cierres la ventana negra** mientras juegas.

### 🔄 Muy importante: siempre verás la última versión
Mientras la ventana negra esté abierta, **tu pestaña del navegador se actualiza sola**
cada vez que se mejora el juego. No tienes que hacer nada: la página que tienes
abierta mostrará siempre la versión más nueva automáticamente.

> Si en algún momento no ves los cambios, simplemente **recarga la página** (F5).

### Alternativa (terminal)
Si prefieres, abre una terminal en la carpeta y escribe `npm run dev`.

## Controles (v1.0)

| Tecla | Acción |
|-------|--------|
| **Flechas** o **WASD** | Mover al personaje / conducir |
| **E** | Entrar / salir del coche (acércate primero) |
| **Shift** | Correr |
| **P** | Menú de pausa (ajustes, reiniciar) |
| **Ratón** (sin clic) | Girar la cámara (también mirar arriba/abajo) |
| **Clic** o **M** | Abrir / cerrar el mapa grande |
| **Rueda del ratón** | Acercar / alejar la cámara |

## ¿Qué deberías ver?

- Cielo azul con sol y un poco de niebla en la distancia.
- Calles grises formando una cuadrícula, con suelo verde.
- Edificios de colores claros (estilo mediterráneo) con tejados.
- Palmeras y árboles junto a las calles.
- Tu personaje (camiseta azul) que se mueve con las flechas.
- Varios NPCs de colores caminando por la ciudad.

## Para parar el juego

En la terminal donde está corriendo, pulsa **Ctrl + C**.

## Jugar a una versión antigua

Ninguna versión se borra: todas se guardan en la carpeta `versions/`.
Para abrir una versión concreta, desde la carpeta raíz escribe, por ejemplo:

```
npm run play -- versions/v1.0
```
