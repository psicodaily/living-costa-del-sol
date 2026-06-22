# 📸 Puerto Banús — Dossier visual (referencias reales)

> Notas sacadas de Google Maps (satélite + Street View) para construir Puerto Banús
> **fiel y reconocible** en UE5. Capturas guardadas en `tools/gmaps/pb/`.
> Objetivo: que quien haya estado **lo reconozca al instante**.

---

## 1. Edificios del frente (Muelle Ribera) — lo más icónico
- **Blancos**, de **2–3 plantas**, con **tejado de teja (terracota)**.
- En **línea continua** mirando al agua (no bloques sueltos).
- **Planta baja = comercio de lujo / restaurantes:** escaparates de **cristal oscuro**,
  **toldos**, y **cartel de marca** (vistos: Tom Ford y otras boutiques de lujo).
- **Plantas altas = apartamentos** con **balcones** y **barandillas**.
- Detrás del frente: **casco denso** mediterráneo, también con tejado de teja.

## 2. El paseo (entre los edificios y el agua)
- Suelo **claro** (baldosa/adoquín).
- **Palmeras** repartidas.
- **Farolas clásicas negras** (estilo fernandino).
- **Columnas/paneles de publicidad**.
- **Barandilla blanca** al borde del agua + **salvavidas rojos**.

## 3. Coches y barcos
- **Coches de LUJO aparcados en línea** a lo largo del muelle (la imagen de Puerto Banús).
- **Yates amarrados pegados al muelle** (popa hacia el paseo) + **pantalanes en espiga**
  llenos de yates de todos los tamaños.

## 4. Playa (oeste) y entorno
- **Playa de Puerto Banús** con **club de playa / chiringuito** (sombrillas, tumbonas).
- **Piscina de hotel** cerca.

## 5. Espigón y faro
- **Espigón largo de roca clara** que protege la dársena.
- **Faro** en la punta (referencia para el modelo del faro).

## 5b. Layout general (visión de pájaro)
- **Dársena** con pantalanes en espiga, protegida por un **espigón en "L"**; la
  **entrada** a la dársena está al **sureste** (hueco en el espigón).
- **Casco denso** de tejado de teja al norte/oeste de la dársena.
- **Playa** al oeste; un **segundo puerto/dársena** más pequeño al suroeste.

## 5c. DOS "looks" distintos (importante)
Puerto Banús no es uniforme; tiene dos ambientes:
- **(A) Frente del muelle (lujo):** edificios BAJOS (2-3 plantas), blancos, teja,
  con **tiendas de lujo/restaurantes** abajo. (sección 1)
- **(B) Bulevar / zona residencial (Av. de Julio Iglesias):** **bloques de
  apartamentos GRANDES** (4-5 plantas), blancos, con **balcones**; **avenida ancha
  con palmeras**, **rotondas**, mucha vegetación.

## 5d. Calles y aceras (detalle para clavar el "aire")
- **Carriles pintados de AZUL** (carril bici/bus) con marcas blancas — muy
  característico de las avenidas de Puerto Banús/Marbella.
- **Aceras de baldosa beige con dibujo** (patrón), anchas.
- **Farolas negras clásicas** (fernandinas) por todas partes.
- **Palmeras** alineadas en avenidas y paseo.

## 5e. Landmarks / hitos reconocibles (a clavar)
Cada uno con satélite + ficha en `tools/gmaps/puerto-banus/locales/<sitio>/`:
- 🦏 **Rinoceronte de Dalí** ("Vestido con Puntillas") en su **rotonda**, junto a la
  entrada → el "muñeco emblemático". (`locales/rinoceronte/`)
- 🏬 **El Corte Inglés** + **parking** (~36.4909, -4.9528). (`locales/corte-ingles/`)
- 🍔 **McDonald's** cerca de la entrada (~36.4888, -4.9522). (`locales/mcdonalds/`)
- 🏨 **Hotel Benabola** en el muelle. (`locales/benabola/`)
- 🚧 **Entrada al puerto** con **barrera** y rotondas + zona de **atracciones**.

## 5f. INTERIORES ICÓNICOS a hacer entrables (lista corta — DECIDIDO) 🔑
Solo estos por ahora (reduce muchísimo el trabajo). Interior = a partir de las
**fotos de la ficha de Google** (lo que haya) + diseño nuestro para el resto:
1. 🍕 **Pizzería** de la cola — probablemente **Pizzería Picasso** *(confirmar)*.
2. 🏨 **Hotel Benabola** — entrada + **ascensor** + **terraza superior** (icónica).
3. 👔 **Tom Ford** (→ "Tom Fjord").
4. ⌚ **Rolex** (→ "Volex").
5. 🏬 **El Corte Inglés**.
6. 🍔 **McDonald's**.
7. 🎉 **Local de fiesta de la entrada** (junto a la barrera, a la derecha hacia el puerto) — *identificar nombre*.

> El resto de locales: solo **exterior** (fachada). Interiores, solo esta lista.
> Cada local icónico → `locales/<sitio>/` (satélite + ficha con fotos).

## 6. Paleta y ambiente
- **Blanco** (fachadas) + **terracota** (tejados) + **azul** (agua) + **verde** (palmeras)
  + toques **dorados/lujo**.
- **Luz cálida** mediterránea (hora dorada / mediodía soleado).

---

## Capturas guardadas — estructura ORDENADA
Todo en **una sola carpeta**: `tools/gmaps/puerto-banus/`
```
puerto-banus/
  aereo/    → SATÉLITE de cada zona (tejados, agua, hierba, árboles, colores reales)
            (overview, restaurantes, entrada, bulevar, playasduque, este, tiendas, faro, curvos…)
  calles/   → Street View, barrido de calles (calle-1..24, paseo, bulevar, entrada, playa)
  locales/  → cada local icónico, con su SATÉLITE (sat.png) + FICHA con fotos de interior (ficha.png):
              corte-ingles · mcdonalds · benabola · tom-ford · rolex · pizzeria · club-entrada
```
> Las **aéreas son SIEMPRE satélite** (se ven texturas/colores reales). Los
> **interiores** salen de las **fotos de la ficha** de cada local (lo que haya).
> Pendiente puntual: satélite de El Corte Inglés (la ficha sí está; cojo el satélite).
