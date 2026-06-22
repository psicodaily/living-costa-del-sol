# 🏗️ Hito 2 — Meter Puerto Banús en Unreal (maqueta gris)

> Esto se hace **después del Hito 1** (cuando ya puedes andar con WASD).
> Mete los **109 edificios** de Puerto Banús como **cajas grises a escala real**
> (lo que en los estudios llaman *blockout* o "maqueta gris"). Luego, encima de
> esa maqueta, iremos "vistiendo" cada edificio.

El script ya está hecho: **`ue5/import_puertobanus.py`** (6.6 KB). Sale de los datos
reales de OpenStreetMap, así que **las posiciones y tamaños son los de verdad**.

---

## Paso A — Activar Python en Unreal (solo la 1ª vez)
1. Menú **Edit → Plugins**.
2. Busca **"Python"** y activa **"Python Editor Script Plugin"**.
3. Busca **"Editor Scripting"** y activa **"Editor Scripting Utilities"** (si no lo está).
4. Te pedirá **reiniciar** el editor → reinicia. (Esto NO vuelve a compilar todos
   los shaders; arranca rápido.)

## Paso B — Llevar el archivo a la máquina de Vagon
El archivo está en tu PC, en `ue5/import_puertobanus.py`. Hay que pasarlo a Vagon.
La forma más sencilla y segura:
1. En tu PC, abre `ue5/import_puertobanus.py` y **copia todo** el texto.
2. En **Vagon**, abre el **Bloc de notas** (Notepad).
3. **Pega** el texto.
4. **Archivo → Guardar como…**, en *Tipo* elige **"Todos los archivos"**, y guárdalo como
   **`import_puertobanus.py`** (por ejemplo en el Escritorio de Vagon).
   ⚠️ Que NO se llame `import_puertobanus.py.txt`.

> (Si Vagon tiene subida de archivos en su panel, también vale arrastrarlo. Pero el
> copia-pega siempre funciona.)

## Paso C — Ejecutarlo dentro de Unreal
1. Abajo del editor, abre el **Output Log** (botón *Output Log* o menú *Window → Output Log*).
2. Verás abajo una **caja de comando** con un desplegable que pone **"Cmd"**.
   Cámbialo a **"Python"**.
3. Escribe la **ruta del archivo** y pulsa Enter, por ejemplo:
   ```
   C:/Users/<tu_usuario>/Desktop/import_puertobanus.py
   ```
   (usa barras `/`). 
   - *Alternativa:* deja el desplegable en **"Cmd"** y escribe:
     `py "C:/Users/<tu_usuario>/Desktop/import_puertobanus.py"`

## Paso D — ¡Mirar!
- Aparecerán **109 cajas grises** = los edificios de Puerto Banús, a escala real.
- En el **Outliner** (derecha) saldrá una carpeta **`PuertoBanus/Blockout`** con todo.
- El **centro (0,0)** es la **dársena** (donde irá el agua); el personaje aparece por ahí.
- Pulsa **▶ Play** y **anda entre los edificios**. 🎉

## Re-ejecutar / corregir
- Si lo lanzas otra vez, **borra la maqueta anterior** y la vuelve a crear (no duplica).
- Si cambiamos los datos, yo regenero el `.py` con `node tools/ue5_make_pyimport.mjs`
  y repites el Paso B-C.

---

## ¿Qué es esto técnicamente? (curiosidad)
- Cada edificio se mete como una **caja** (`/Engine/BasicShapes/Cube`) **rotada y
  escalada** a su tamaño real. La rotación sale de calcular la **caja orientada
  mínima** (PCA) del contorno real del edificio → así las cajas siguen la
  orientación de verdad (las del puerto van en diagonal, no en cuadrícula).
- El **suelo** es un plano grande de 4 km.
- El **agua** y el "vestido" de los edificios vienen en los Hitos 3-4.
