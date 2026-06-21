# 🗺️ Hoja de ruta detallada — de v1.2 hasta el salto a v2.0

> Plan creado por el equipo de especialistas (mundo, vehículos, IA, gráficos, gameplay)
> tras revisar el código real del juego. Cada versión es un **paso pequeño** que deja
> algo **visible** en pantalla. Avanzamos poco a poco, sin saltos arriesgados.
>
> Explicado en lenguaje sencillo. (El detalle técnico está en el historial del proyecto.)

---

## Las próximas versiones, una a una

### 🎨 v1.2 — "La ciudad se ve bonita de verdad"
*Pura mejora visual (justo lo que más te importa ahora).*
- Mejor iluminación: los edificios blancos dejan de "quemarse" con el sol.
- Cielo con degradado y un sol con brillo más natural.
- Aceras, bordillos y pasos de cebra en las calles.
- Ventanas y texturas en los edificios (dejan de ser bloques lisos).
- *(Mejora interna invisible: el juego empieza a "recordar" dónde está cada edificio,
  necesario para los choques y el tráfico de más adelante.)*

### 🚗 v1.3 — "¡A conducir!"
- Un coche aparcado que puedes coger con la tecla **E** (y bajarte con **E**).
- Conducción con inercia: acelera, frena, marcha atrás, gira mejor cuanto más rápido vas.
- Las ruedas giran de verdad.
- Velocímetro cuando conduces.
- *(Todavía no hay choques: aquí el foco es que se conduzca a gusto.)*

### 📊 v1.4 — "Datos y mapa (estilo GTA)"
- Barra de **salud** y contador de **dinero** abajo en pantalla.
- **Mini-mapa** en una esquina con tu posición y la gente cercana.
- Líneas de carretera y una **rotonda central** para orientarte.

### 🏖️ v1.5 — "Marbella junto al mar"
- **Playa y mar** (la seña de identidad de Marbella).
- Primeros **recados**: ve a un punto marcado y **cobras dinero**. ¡El primer "juego" real!
- **Menú de pausa** (sensibilidad del ratón, volumen, reiniciar…).

### 💥 v1.6 — "Choques de verdad"
- Ya **no atraviesas** los edificios (ni a pie ni en coche).
- El coche se **abolla y se daña** al chocar, con sacudida de cámara. Sabor GTA.

### 🏎️ v1.7 — "Más coches y motos"
- Varios tipos de vehículo (deportivo, furgoneta, todoterreno), cada uno conduce distinto.
- Puedes **robar/coger cualquier** coche aparcado.
- **Scooters y motos**, muy de Marbella, más ágiles.

### 🌇 v1.8 — "Día y noche + ambiente de cine"
- **Ciclo día/noche**: el sol se mueve, de noche se encienden ventanas y farolas, y los faros.
- Efectos visuales (brillos, sombras suaves, profundidad) que lo hacen cinematográfico.

### 🌴 v1.9 — "Marbella reconocible"
- **Paseo marítimo** con palmeras, bancos y farolas.
- **Puerto Banús** con su dársena y **yates**.
- **Barrios distintos**: casco antiguo, zona de lujo con villas, hoteles turísticos.

### 🚶 v1.10 — "Gente viva"
- Los peatones andan por las **aceras** (ya no cruzan el césped ni atraviesan cosas).
- No se amontonan unos sobre otros.
- **Reaccionan a ti**: se apartan, miran, se asustan si pasas corriendo o conduciendo cerca.

### 🚦 v1.11 — "Tráfico"
- Coches conducidos por la IA circulando por las calles.
- **Semáforos** y coches que frenan unos por otros.

### 🚓 v1.12 — "Policía y nivel de búsqueda"
- Policías que **patrullan y te detectan**.
- **Estrellas** de búsqueda que suben si haces destrozos → empiezan a **perseguirte**.

### 🎵 v1.13 — "Alma: sonido, misiones y guardado"
*(Se entrega en 4 trocitos por separado.)*
- **Sonido ambiente y radio** (varias emisoras).
- Primeras **misiones con diálogos**.
- **Tiendas** donde gastar el dinero.
- **Guardar partida** (dinero, salud, posición, progreso).

---

## 🚀 ¿Cuándo saltamos a v2.0?

El primer número (de v1.x a **v2.0**) no sube por acumular versiones, sino cuando se
cumplen **a la vez** estas tres condiciones:

1. **Hace falta cambiar el "motor" por dentro** — no basta con añadir cosas: hay que
   reconstruir la base (por ejemplo, física real de verdad, mundo mucho más grande con
   afueras, o terreno con relieve en vez de plano).
2. **Los tres pilares están completos y conviven bien:** se conduce de verdad +
   la ciudad está viva (tráfico, gente, policía) + Marbella es reconocible (costa,
   Puerto Banús, barrios, día/noche).
3. **Hay un salto de escala o de calidad** que se nota muchísimo: mundo con horizonte
   y rutas largas, personajes con modelos de verdad (no de cajas), clima completo
   con lluvia, etc.

> **Regla sencilla:** si el cambio cabe como un añadido pequeño sobre lo que ya hay → es **v1.x**.
> Si para hacerlo bien hay que reconstruir la base o juntar los tres pilares a la vez → es **v2.0**.

*(Cada salto mayor se anotará con su fecha y motivo en `CHANGELOG.md`.)*
