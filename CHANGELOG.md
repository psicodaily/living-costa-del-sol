# 📜 Historial de versiones — GTA Marbella

Cada versión queda **congelada** en la carpeta `versions/` y nunca se sobrescribe.
La carpeta raíz del proyecto contiene siempre la **versión más nueva** en desarrollo.

> **Cómo jugar una versión antigua:** desde la carpeta raíz, por ejemplo:
> `npm run play -- versions/v1.0`
> (No hace falta instalar nada: usa las dependencias de la raíz.)

---

## v1.8 — "Día y noche" *(actual)*
- 🌇 **Ciclo día/noche**: el sol se mueve en arco, cambia el color e intensidad de
  la luz, el cielo, la niebla y la exposición. Amanece, atardece y anochece.
- 🌙 **Luna** de noche + cielo oscuro.
- 🪟 **Ventanas encendidas de noche** y **farolas** que se iluminan en los cruces.
- ✨ **Postprocesado de cine (bloom)**: brillan el sol, el agua, las ventanas y las
  farolas. Suavizado de bordes (SMAA).
- 🕐 **Reloj** del juego arriba en el centro.
- ⚙️ En el **menú de pausa** (P): control de **Hora del día** (para ver cualquier
  momento al instante) e interruptor de **Efectos** (apágalo si el PC va justo).

## v1.7 — "Coches y motos"
- 🎥 **Cámara estilo GTA de verdad**: un clic captura el ratón (cursor oculto) y a
  partir de ahí giras con total libertad y suavidad, como GTA en PC. Cámara más
  cercana y ágil.
- 🏎️ **Flota de vehículos**: deportivo, utilitario, todoterreno, furgoneta y una
  **moto** (cada uno con velocidad y manejo distintos). La moto se inclina al girar.
- 🔑 **Entra al vehículo más cercano** con **E** (ya no es un único coche).
- 🩹 **Arreglado el parpadeo** de las líneas de la calle (z-fighting) y los
  edificios se ven más nítidos a lo lejos.
- 🌊 **Olas visibles en todo el mar** (no solo en la orilla): crestas con brillo
  y algo de espuma.

## v1.6 — "Choques y controles"
- 🖱️ **Cámara sin clic**: ahora con solo mover el ratón ya giras la cámara
  (ya no hay que hacer clic para activarla).
- 🗺️ **Mini-mapa que rota contigo**: la flecha apunta siempre "hacia delante".
- 🔎 **Mapa grande**: haz **clic en el mini-mapa** (o pulsa **M**) para abrir el
  mapa de toda la ciudad. Clic / M / Esc para cerrarlo.
- 💥 **Choques de verdad**: ya **no atraviesas los edificios** (ni a pie ni en
  coche) ni la rotonda; deslizas a lo largo de las paredes.
- 🚙 **Daños del coche**: al chocar fuerte se **abolla** (barra de estado del
  coche en el HUD), la cámara **se sacude**, y si se destroza **echa humo** y casi
  no acelera.
- 🌊 **Arreglada la costa**: quitado el **parpadeo** (z-fighting) y el **verde**
  que asomaba en el mar; ahora el agua tiene **olas suaves**.

## v1.5 — "Marbella junto al mar"
- 🏖️ **Costa sur**: playa de arena y **mar con oleaje** animado que se funde con
  el horizonte (al sur de la ciudad).
- 🎯 **Recados con recompensa**: un marcador dorado luminoso aparece por la ciudad;
  llega a él (a pie o en coche) y **cobras €250**, suena un logro y aparece el
  siguiente. Primer bucle jugable. El destino se marca en el mini-mapa (punto dorado).
- ⏸️ **Menú de pausa** (tecla **P**): congela el juego, con **Reanudar**, **Reiniciar
  partida** y ajustes de **sensibilidad del ratón** y **volumen**.
- 🔊 Sonido de logro al cobrar un recado (generado por código).
- 🛠️ **Arreglada la dirección del coche** (izquierda/derecha estaban invertidas).

## v1.4 — "Estado y mini-mapa"
- 📊 **Estado central del juego**: salud y dinero en un único sitio (`gameState`),
  base para economía, recados, daños y guardado futuros.
- 💶 **HUD estilo GTA** (abajo a la izquierda): **dinero** con contador animado y
  **barra de salud** que cambia de color.
- 🗺️ **Mini-mapa tipo radar** (esquina inferior izquierda): calles alrededor del
  jugador, flecha con tu orientación y puntos de NPCs y del coche.
- 🟢 **Rotonda central** ajardinada con palmera y arbustos, como punto de referencia.
- 🚶 El jugador ahora aparece junto al coche, cerca de la rotonda.

## v1.3 — "¡A conducir!"
- 🚗 **Primer coche conducible**: acércate (sale el aviso) y pulsa **E** para
  entrar/salir. Conducción con inercia (acelera, frena, marcha atrás), giro que
  depende de la velocidad, y **ruedas que giran**.
- 🎥 **Cámara reutilizable**: sigue al jugador o al coche; al conducir se coloca
  sola detrás del coche si sueltas el ratón.
- 🛠️ **Arreglada la cámara arriba/abajo** (estaba invertida).
- 🛣️ **Calles arregladas**: ahora son asfalto de verdad con **líneas de carril**
  (central discontinua + líneas de borde) y **pasos de cebra bien colocados**.
  (Antes las aceras tapaban el asfalto y se veía el césped como si fueran calles.)
- 📈 **Contador de FPS/rendimiento** arriba a la derecha (FPS, ms y nº de dibujos).
- ⏱️ **Velocímetro** (km/h) al conducir.

## v1.2 — "Ciudad más bonita"
- 🎨 **Render más natural**: gestión de color + tono cinematográfico (ACES), para que
  los blancos mediterráneos dejen de "quemarse" con el sol.
- ☁️ **Cielo con degradado** (azul intenso arriba, claro en el horizonte) y un
  **halo suave** alrededor del sol.
- 🛣️ **Calles con asfalto texturizado**, **aceras** de hormigón, **bordillos** y
  **pasos de cebra** en todos los cruces.
- 🏢 **Edificios con ventanas** (ya no son bloques lisos).
- 🧱 *(Interno)* La ciudad ahora "recuerda" dónde está cada edificio (datos), base
  necesaria para los choques, el tráfico y la IA de próximas versiones.

## v1.1 — "Cámara con ratón"
- 🖱️ La cámara ahora se controla con el **ratón sin mantener el clic** (Pointer Lock):
  un clic la activa y luego el ratón la gira sola, como en los juegos de verdad.
- Mirar **arriba y abajo** (no solo girar en horizontal).
- **Rueda del ratón** para acercar/alejar la cámara.
- **Esc** para liberar el ratón.
- Cartel de ayuda "Haz clic para mirar con el ratón".
- Sistema de versiones: número de versión en un único sitio (`src/version.js`),
  visible en el HUD y en la pestaña del navegador.
- Herramienta `npm run snapshot` para congelar versiones automáticamente.

## v1.0 — "Se mueve"
- Cielo azul con sol y niebla atmosférica.
- Ciudad en cuadrícula: calles, suelo verde, edificios mediterráneos con tejado.
- Palmeras y árboles junto a las calles.
- Personaje controlable con **flechas/WASD**, correr con **Shift**, animación de caminar.
- Cámara en tercera persona que sigue al personaje (giro arrastrando el ratón).
- ~25 NPCs caminando por la ciudad.

---

## Cómo funcionan los números de versión

### Regla de oro (preservación)
**Ninguna versión se borra ni se sobrescribe JAMÁS.** Cada vez que se hacen mejoras:
1. La versión anterior queda **congelada** en `versions/` (copia jugable e intacta).
2. Se crea un número nuevo y se mejora a partir de ahí.

Así siempre se puede abrir cualquier versión pasada y ver la evolución del juego.

### Menores vs. mayores
- **Versiones menores (v1.1, v1.2, v1.3…):** mejoras y añadidos **pequeños** sobre la
  misma base. Salen a menudo y tienen poco riesgo. Así ves progreso continuo.
  *Cambia el segundo número.*
- **Versiones mayores (v2.0, v3.0…):** un **salto grande**, cuando entra un **pilar
  nuevo** que cambia la experiencia del juego. *Cambia el primer número.*

### ¿Qué dispara el salto del PRIMER número? (criterios concretos)
El primer número solo sube cuando el juego deja de ser "lo de antes con mejoras" y
pasa a ser algo nuevo. Criterios fijados:

| Salto | Se activa cuando… | Tema |
|-------|-------------------|------|
| **→ v2.0** | Puedes **conducir un coche** + hay **colisiones** + **ciclo día/noche**. El juego deja de ser "pasear" y pasa a ser "recorrer la ciudad". | "Marbella toma forma" |
| **→ v3.0** | La ciudad tiene **reglas de juego vivas**: tráfico con IA + **policía y nivel de búsqueda** + **dinero/economía**. | "Vida y sistemas" |
| **→ v4.0** | Hay **historia y misiones** + lavado de cara gráfico serio + empaquetado como **.exe**. | "Identidad AAA" |

> **Regla general:** *menor* = añado cosas al mismo pilar. *Mayor* = entra un pilar
> nuevo que cambia cómo se juega.

### 🏁 Registro de saltos mayores
Aquí se anota cada vez que cambia el primer número, con la fecha y el motivo.

| Fecha | Salto | Motivo |
|-------|-------|--------|
| 2026-06-21 | inicio en **v1.0** | Primera versión jugable: mover el personaje. |
| *(pendiente)* | → v2.0 | Se anotará al cumplirse el criterio de arriba. |
