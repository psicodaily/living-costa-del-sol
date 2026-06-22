# 📜 Historial de versiones — Living Costa del Sol

Cada versión queda **congelada** en la carpeta `versions/` y nunca se sobrescribe.
La carpeta raíz del proyecto contiene siempre la **versión más nueva** en desarrollo.

> **Cómo jugar una versión antigua:** desde la carpeta raíz, por ejemplo:
> `npm run play -- versions/v1.0`
> (No hace falta instalar nada: usa las dependencias de la raíz.)

---

## v2.17 — "Techo de realismo (agua con olas + barcos CC0)" *(actual)*
- 🌊 **Agua de verdad:** mar con **olas en movimiento y reflejos del cielo/sol**
  (Three.js Water) en vez de un plano liso.
- ⛵ **Veleros reales** (modelo CC0 de Quaternius) repartidos entre los yates de la
  dársena, para dar variedad.
- 💡 Sigue la **luz HDRI** + **texturas PBR** (asfalto, adoquín, plaster) de v2.16.
- ℹ️ **Demo de techo** para que juzgues en tu PC hasta dónde llega el realismo en
  navegador. Honesto: NO será GTA V (motor nativo + equipo + años); coches de marca
  (Ferrari/Lambo) no se pueden por derechos; NPCs foto-reales tampoco. Sí mucho
  mejor que colores planos.

## v2.16 — "Prueba de realismo (texturas + luz HDRI)"
- 💡 **Iluminación HDRI** (cielo real CC0): da **reflejos** en el agua y los
  cristales y **luz ambiente natural** — el mayor salto hacia el "look real".
- 🧱 **Texturas reales (PBR, CC0):** **asfalto** en la carretera, **adoquín** en el
  paseo y **grano de plaster** en las fachadas de Puerto Banús (en vez de colores
  planos).
- 🌊 **Agua reflectante** (refleja el cielo).
- ⚠️ Es una **PRUEBA** para que juzgues el salto en tu PC (con GPU real). Si
  convence, lo aplicamos a todo el juego y seguimos con más texturas/modelos.

## v2.15 — "Modelos reales CC0 (palmeras)"
- 🌴 **Palmeras reales** (modelo low-poly **CC0 de Quaternius**) en el paseo de
  Puerto Banús, en lugar de mis "conos". Se dibujan **instanciadas** (rápido aunque
  haya muchas).
- 🧩 **Sistema de modelos montado:** ahora puedo **descargar e integrar modelos
  gratis CC0** (un solo estilo low-poly coherente) y repetirlos eficientemente.
  Siguiente: barcos, coches y más mobiliario con el mismo método.

## v2.14 — "Puerto Banús fiel (fase 1)"
- 🏙️ **Distrito de Puerto Banús con identidad propia:** sus edificios se dibujan
  ahora "ricos" — **planta baja comercial** (escaparate de cristal + **toldo**
  de colores + cornisa), **alturas variadas** (2–6 plantas) y tejado de teja.
- 🌴 **Paseo con vida:** palmeras, farolas y papeleras alrededor de la dársena.
- 🗼 **Faro** en el extremo del espigón.
- 🛰️ Hecho estudiando **Google Maps** (satélite + Street View) de Puerto Banús.
- ⏳ Fase 2: fachadas con más detalle (balcones, terrazas, escalonados), locales
  y restaurantes concretos, aparcamiento, aceras y carretera con su textura.

## v2.13 — "Puerto Banús: dársena arreglada"
- 🛥️ **Yates con forma de barco** (casco largo con proa en punta + cabina), ya no
  parecen coches. Solo se colocan donde de verdad hay agua.
- 🚗 **Ya no hay coches en el agua**: la dársena se excava "por dentro" (erosión),
  así el muelle/paseo se queda en tierra y no se inundan calles ni edificios.
- 🧱 **Edificios y coches dejan de hundirse** en el agua de la marina.
- 🚧 **No se puede andar ni conducir sobre el mar** (barrera invisible en la orilla).
- 🛰️ **Novedad técnica:** ahora puedo abrir **Google Maps (satélite y Street View)**
  con mi propio navegador y ver las capturas, para recrear Puerto Banús fiel.
- ⏳ Siguiente (v2.14+): **Puerto Banús fiel** usando Google Maps (edificios con su
  altura, muelle, aparcamiento, aceras, papeleras, restaurantes).

## v2.12 — "Puerto Banús con yates y más vida"
- ⛵ **Puerto Banús con YATES:** se "excava" la dársena a nivel del mar (el mapa de
  alturas la leía como tierra de 1–4 m, por eso no había agua) y se colocan ~30
  **yates** de varios tamaños flotando en dos filas junto a un pantalán.
- 🌊 Ahora la **marina se ve de agua** de verdad (antes era suelo marrón).
- 🧍 **Más vida:** más tráfico y peatones por las calles (coches 8→12, gente 14→20).
- 📍 El jugador aparece en **tierra firme** junto a la marina (ya no dentro del agua).
- ⏳ Pendiente: pasos de peatones (zebra en los cruces).

## v2.11 — "Zonas en el mapa"
- 🗂️ **Zonas/distritos en el mapa** (como GTA): cada zona tiene su **perímetro
  punteado de color** y su **nombre**: Puerto Banús, Nueva Andalucía, Golden Mile,
  Sierra Blanca, Centro, Casco Antiguo y Playa / Paseo Marítimo. Así sabes dónde
  empieza y acaba cada sitio importante.
- ⏳ Pendiente: pasos de peatones, más vida (tráfico/gente) y Puerto Banús con yates.

## v2.10 — "Marbella se ve: mar, playa y calles"
- 🌊 **¡Ya se ve el MAR!** Antes no había agua; ahora hay un mar azul al nivel
  del mar (la costa y la marina se ven de agua).
- 🛣️ **Arreglado el "todo marrón":** las **carreteras** (asfalto), **aceras**,
  **playa** y **zonas verdes** ya se ven. (El fallo real: esas superficies tenían
  la "cara" hacia abajo y el motor las descartaba; ahora se dibujan bien y, además,
  van siempre por encima del terreno para no enterrarse en las cuestas.)
- 🚥 **Líneas de carril** (discontinuas) en las vías principales: las carreteras
  parecen carreteras de verdad.
- 📍 **Empiezas en PUERTO BANÚS** (zona conocida para ir revisando el juego).
- 🚗 **Varios coches aparcados** justo al lado: acércate y pulsa **E** para coger
  el más cercano.
- ⏳ Pendiente (v2.11): **zonas** con perímetro y nombre en el mapa (Casco Antiguo,
  Puerto Banús, Colinas…), **pasos de peatones**, y más vida + Puerto Banús con yates.

## v2.9 — "Mapa con relieve, leyenda y rutas"
- ⛰️ **El mapa tiene RELIEVE:** las cuestas y montañas se ven con sombreado
  (más claro en la cara iluminada, más oscuro en la sombra), en el mapa grande
  y también en el radar de la esquina.
- 🧭 **Leyenda / índice de iconos** (como en GTA): un panel a la derecha con
  cada icono y su nombre (Hospitales, Ayuntamiento, Policía, Bomberos, Mercados,
  Iglesias, Farmacias, Bancos, Gasolineras). **Puedes pulsar** cada fila para
  **ocultar/mostrar** ese tipo en el mapa.
- 🛣️ **Nombres de calle SOBRE la carretera:** el nombre va encima de la vía,
  **girado siguiendo la calle**, y al acercar **se ajusta para no salirse** del
  tramo (si no cabe, se abrevia —"Av.", "C/", "Ctra."— o no se muestra).
- 📍 **Rutas (GPS):** abre el mapa (M) y **haz clic donde quieras ir**; se
  calcula el **camino por las calles** y se dibuja una **línea azul** en el mapa
  grande y en el **radar** de la esquina, con el destino marcado. **Clic derecho**
  o llegar al sitio la borra. (Grafo de calles que une rotondas y cruces: cubre
  el 98,7 % de la ciudad.)
- ⏳ Pendiente: rellenar zonas vacías con satélite (v2.10) y más vida + Puerto
  Banús con yates (v2.11).

## v2.8 — "Cuestas reales y mapa con sitios"
- ⛰️ **Cuestas REALES** (sin suavizar): se quitó el "apaño" de bajar el relieve al 40 %.
  La elevación vuelve a ser 100 % real, como tiene que ser.
- 🏠 **Edificios que NO se entierran ni flotan** en las cuestas: cada edificio se
  construye con un **"cimiento"** que llega hasta el punto más bajo de su base y
  sube su altura por encima del punto más alto. Así, en una cuesta, el lado de
  arriba no se hunde y el de abajo no queda en el aire. (Arreglo de verdad, no parche.)
- 🧱 **Mejor aspecto de edificios:** **tejados de teja** (terracota, estilo
  mediterráneo) y **ventanas más claras**. Menos "bloque gris".
- 🗺️ **Mapa grande mejorado:**
  - Ahora **ocupa casi toda la pantalla** y al abrirlo se ve **toda Marbella** encajada.
  - Los **nombres de calle ya no se amontonan** (solo salen al acercar el zoom y se
    evitan los solapes).
  - **Iconos de sitios importantes:** 🏥 hospital, 🏛️ ayuntamiento, 🚓 policía,
    🚒 bomberos, 🛒 mercado, ⛪ iglesia, 💊 farmacia, 🏦 banco, ⛽ gasolinera
    (con sus nombres reales). Los importantes salen también en el radar.
- ⏳ Pendiente honesto: faltan **zonas vacías por rellenar** (aceras/carreteras/suelo
  donde OSM no tiene datos) y **más vida** (tráfico/gente, Puerto Banús con yates).

## v2.7 — "Relieve suave"
- ⛰️ **Cuestas más suaves** (relieve al 40%): los edificios ya **casi no se entierran**
  en las pendientes y todo se apoya mejor.
- 🌳 **Árboles solo en parques/jardines reales** (quitados los de las avenidas, que
  quedaban colocados sin sentido).
- 🗺️ **El mapa se abre con la tecla M** (la rueda hace zoom). El clic en el minimapa
  no funcionaba porque la cámara "captura" el ratón (estilo GTA); por eso ahora es M.

## v2.6 — "Relieve afinado y mapa"
- 🩹 **Arreglado: ya no flotan** el jugador, el coche ni los peatones. La malla del
  terreno ahora se **alinea exactamente** a las alturas, así todo se apoya bien.
- 🏠 **Edificios bien apoyados** en las cuestas (se asientan en su punto más bajo,
  ya no flotan ni quedan medio enterrados de forma rara).
- 🗺️ **Mapa grande mucho mejor**: **zoom con la rueda**, **arrastrar para moverse**,
  ahora muestra **playas, zonas verdes, edificios** y **nombres de calle** al acercar.
  Se reconoce la costa de Marbella.
- ⏳ Pendiente honesto: algunos edificios grandes se ven como bloques lisos, y hay
  zonas sin apenas calles (son huecos de los datos reales de OpenStreetMap).

## v2.5 — "Cuestas de Marbella" ⛰️
- ⛰️ **Relieve real**: descargué la **elevación real** de Marbella (terreno hasta
  ~145 m) y ahora el mundo tiene **cuestas**. El suelo, las calles, los edificios y
  los árboles siguen el terreno; el jugador y el coche **suben y bajan** las cuestas.
- 👀 **Mucha más ciudad a la vista**: como ahora vas a ~60 FPS, amplié la distancia
  de visión (niebla y recorte de 1500 → 2800). Menos zonas "vacías".

## v2.4 — "Calles con vida"
- 🚗🚶 **Tráfico y peatones por las calles REALES**: coches y gente circulan por la
  red de calles de verdad (grafo de calles), girando en los cruces. Salen en el
  mini-mapa (rojo = coches, gris = gente).
- ♻️ Solo se simula un grupo pequeño que **reaparece cerca de ti** → el mapa enorme
  va fluido.
- ⚡⚡ **Gran arreglo de rendimiento**: el postprocesado pesaba ~34 FPS (bloom a alta
  resolución + SMAA). Ahora bloom a 1/3 de resolución + antialiasing por hardware
  (MSAA) y sin SMAA → mucho más rápido manteniendo el brillo de cine.

## v2.3 — "Calles con nombre"
- 🛣️ **Nombres de calle reales**: regeneré el mapa desde OpenStreetMap incluyendo
  los nombres (1476 calles con nombre). Ahora sale un **cartel estilo GTA** abajo a
  la izquierda con la calle en la que estás (p. ej. "Calle Puerta del Mar",
  "Avenida de José Banús"…).
- ⚡ **Más rendimiento**: render a resolución nativa (pixelRatio 1) + niebla y
  recorte de edificios más cortos. (Si sigue bajo, ver nota de diagnóstico abajo.)

## v2.2 — "Rendimiento y mapa"
- 🏷️ **Renombrado a "Living Costa del Sol"** (título, HUD, pestaña).
- ⚡ **Rendimiento**: los edificios se **trocean por zonas** y solo se dibujan los
  **cercanos** (recorte por distancia + por cámara) → muchos menos triángulos por
  fotograma. Objetivo: subir de los 21 FPS.
- 🗺️ **Mapa grande** (clic en el mini-mapa o tecla **M**): muestra **toda la red de
  calles reales** de la Costa del Sol con tu posición. (Antes no hacía nada.)
- 💡 Edificios más visibles (más luz ambiente).
- ⏳ Pendiente (necesitan regenerar el mapa): **nombres de calles** y **cuestas/altura**.

## v2.1 — "Centro y rendimiento"
- 📍 **Spawn en el núcleo urbano**: apareces en la zona con más edificios (no en un
  descampado del borde). El mini-mapa muestra calles densas alrededor.
- ⚡ **Rendimiento**: edificios sin proyectar sombra (siguen recibiéndola), mapa de
  sombras 1024, bloom a media resolución, tope de píxel 1.5, niebla más corta.
  Objetivo: subir de los 24 FPS.
- 💡 Más luz ambiente para que los edificios no se vean tan oscuros.
- ⚠️ Pendiente: a ras de suelo el mapa real aún se ve **disperso** (suelo plano
  grande, edificios bajos y separados). Mejorarlo toca el render del suelo/edificios
  (terreno del otro chat) → conviene coordinar.

## v2.0 — "Marbella Real" *(SALTO MAYOR)* 🌍
- 🗺️ **El mapa REAL de Marbella** (de OpenStreetMap): ~6,8 × 3,8 km, **4807
  edificios** y **4452 calles** reales (trabajo del otro chat, integrado aquí).
- ✨ Con **mi estilo**: cielo con degradado, **ciclo día/noche**, **brillo de cine
  (bloom)**, **cámara GTA**, conducción a pie/coche con **abolladuras**, y HUD
  (FPS, reloj, velocímetro, mini-mapa de calles reales, radio).
- 💾 Guardado/carga y menú de pausa (hora, efectos, sensibilidad, volumen).
- ⏳ **Pendiente para v2.x:** llevar la IA (tráfico, peatones, policía) a las
  calles reales (ahora mismo solo está en la versión arcade de cuadrícula, v1.13).

> **Cómo se decide v2.0 (primer número):** entra un cambio estructural — el mundo
> deja de ser una cuadrícula inventada y pasa a ser **Marbella de verdad**.

## v1.13 — "Alma" *(cierra la serie v1.x)*
- 📻 **Radio** con varias emisoras (música generada por código). Cambia con **R**.
- 🎯 **Misiones con diálogos**: sigue al marcador azul de "Manolo", completa los
  pasos y **cobra** (con cuadros de diálogo en pantalla). Es repetible.
- 🛒 **Tiendas/kioscos**: acércate y pulsa **E** para **gastar dinero** (curarte o
  comprar una gorra). Marcadas en el mini-mapa (verde).
- 💾 **Guardado**: la partida se **autoguarda** y puedes guardar a mano desde el
  menú de pausa. Se **carga al arrancar**. "Partida nueva" borra el guardado.

## v1.12 — "Policía y búsqueda"
- 🚓 **Policía** identificable (uniforme azul + gorra) que **patrulla** las aceras
  y, si estás cerca sin delinquir, se **gira a vigilarte**.
- ⭐ **Nivel de búsqueda (0–3 estrellas)** en el HUD (arriba a la derecha). Sube al
  **atropellar peatones** (+grave) o **embestir coches**, y **baja sola** con el
  tiempo si dejas de delinquir (escapas).
- 🏃 Con **1+ estrellas** la policía pasa de patrullar a **perseguirte**.
- 🌴 Arreglado: el **tráfico ya no atraviesa la rotonda** central (la rodea).

## v1.11 — "Tráfico"
- 🚦 **Tráfico con IA**: coches que circulan por las calles, mantienen su carril
  (derecha), **giran en los cruces** y van por la rejilla de la ciudad.
- 🟥🟨🟩 **Semáforos** en los cruces interiores con ciclo verde/ámbar/rojo; los
  coches **paran en rojo** y arrancan en verde.
- 🛑 **Anti-atasco**: frenan detrás de otro coche y **se detienen ante ti** (a pie
  o conduciendo) si te cruzas delante.
- 💥 **Chocas con el tráfico**: son sólidos — te frenan y abollas, y el coche
  golpeado se desvía. A pie tampoco los atraviesas.
- 🚶 **Arreglado**: ahora los **peatones también son sólidos a pie** (ya no los
  atraviesas andando).

## v1.10 — "Gente viva"
- 🚶 **Peatones por las aceras**: ya no deambulan al azar ni cruzan el césped;
  caminan por el perímetro de las manzanas y giran en las esquinas.
- 🔀 **Cruzan por las esquinas**: a veces cruzan la calle a la manzana de enfrente.
- 👀 **Te perciben**: si te acercas, se **paran y te miran** (alerta); si **corres
  o conduces** cerca, **huyen asustados**.
- 🧍‍♂️🧍 **No se amontonan**: se separan suavemente entre ellos (sin fundirse).
- (Más peatones por la ciudad: 30.)

## v1.9 — "Choques realistas"
- 🚗 **Vehículos sólidos**: ya no atraviesas los coches aparcados — chocas, los
  **empujas** (se deslizan) y os **abolláis** los dos.
- 🌴 **Árboles y palmeras**: a velocidad alta **se caen** (animación) y el coche se
  abolla un poco; a baja velocidad bloquean.
- 🚶 **Atropellos**: los peatones **caen al suelo** al golpearlos y se **levantan**
  pasados unos segundos (golpecito al coche).
- 🧱 Los **edificios** siguen sin inmutarse (solo te abollas tú).
- 🚶‍♂️ A pie tampoco atraviesas coches ni árboles.
- 🕐 **Reloj estilo GTA** (arriba a la derecha) y **1 día completo = 24 minutos**
  reales (1 hora de juego = 1 minuto real).

## v1.8 — "Día y noche"
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
