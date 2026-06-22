# Qué máquina elegir para desarrollar en UE5 RÁPIDO

> Guía clara y sencilla para decidir con qué ordenador (o nube) crear tu juego en
> Unreal Engine 5 sin esperar eternidades. Datos investigados en junio de 2026.
> Los precios marcados con ⚠️ son aproximados: confírmalos antes de pagar.

---

## 1. El principio clave (en una frase)

**Lo que te hace esperar (compilar shaders y código) depende del NÚMERO DE NÚCLEOS de
la CPU; la GPU solo sirve para que el juego se vea fluido; y necesitas 32-64 GB de RAM.**

Dicho aún más sencillo:

- **Muchos núcleos de CPU = compilas rápido** (esto es TU cuello de botella ahora).
- **GPU potente (RTX) = el juego y el editor van fluidos** (efectos, Lumen, Nanite).
- **RAM 32 GB mínimo, 64 GB cómodo** para que UE5 + navegador + otras apps no se atasquen.

Tu problema actual (Vagon con Tesla T4 y pocos núcleos) es de **pocos núcleos**, no de GPU.
Por eso compilar va lento. La solución es subir núcleos.

---

## 2. Tabla comparativa (las mejores de cada categoría)

| Opción | CPU núcleos | GPU | RAM | Precio (EUR/mes o compra) | Para quién |
|---|---|---|---|---|---|
| **🚐 Vagon Star** (sigues en Vagon) | 16 núcleos (EPYC) | Tesla T4 16 GB (no RTX) | 64 GB | ~2,75 €/h → ~82 €/mes (30 h) · ~165 €/mes (60 h) | Compilar rápido SIN migrar ni recompilar shaders de cero |
| **🚐 Vagon Galaxy** (tirones puntuales) | 48 núcleos (EPYC) | 4x Tesla T4 (no RTX) | 192 GB | ~8,25 €/h → ~248 €/mes (30 h) | Builds/cooking muy pesados puntuales, sin migrar |
| **☁️ Vast.ai 4090 + EPYC** (nube por horas) | 32-64 núcleos reales (elegibles) | RTX 4090 24 GB | 64-128 GB | ~0,48 €/h → **~72 €/mes** (5 h/día) | Compilar MUY rápido y barato eligiendo el host |
| **☁️ Vast.ai 5090 + EPYC** (máx. potencia nube) | hasta 96 núcleos | RTX 5090 32 GB | 96-256 GB | ~0,62 €/h → **~93 €/mes** (5 h/día) | Compilar al máximo + jugar muy fluido |
| **☁️ Azure NV36ads A10** (nube fiable, sin lotería) | 36 núcleos garantizados | NVIDIA A10 24 GB (no RTX) | 440 GB | SPOT ~0,54 €/h → ~82 €/mes ⚠️ · bajo demanda ~2,94 €/h → ~442 €/mes | Quieres fiabilidad de Microsoft y toleras cortes (SPOT) |
| **☁️ Shadow PC Power** (tarifa plana cómoda) | 8 vCores (POCOS) | Clase RTX 3070 Ti 20 GB | 28 GB | ~55 €/mes fijo | Precio fijo y simple, aceptando compilar mediocre |
| **🖥️ PC Ryzen 7 9700X** (compra gama media) | 8 núcleos / 16 hilos | RTX 5070 12 GB | 32 GB (mejor 64) | ~1.300-1.500 € (compra) | Empezar YA barato, gran salto frente a la T4 |
| **🖥️ PC Ryzen 9 9900X** (compra, punto dulce) | 12 núcleos / 24 hilos | RTX 5070 Ti 16 GB | 64 GB | ~1.900-2.300 € (compra) | Mejor equilibrio velocidad/precio para crear rápido |
| **🖥️ PC Ryzen 9 9950X** (compra gama alta) | 16 núcleos / 32 hilos | RTX 5070 Ti / 5080 | 64 GB | ~2.400-2.900 € (compra) | Compilas todo el día y el tiempo es oro |

**Descartadas para tu prioridad (pocos núcleos):**
- **Shadow PC** (incluso su tier alto: solo 8 vCores) y **Paperspace dedicado** (~8 vCPU):
  cómodos y de precio fijo, pero apenas mejoran tu velocidad de compilado.
- **RunPod** (sus pods dan 6-16 núcleos) y **Paperspace por horas** (8-16 vCPU):
  GPU buena, pero poca CPU → compilarías casi igual de lento que ahora.

> Nota sobre Vagon: en sus planes públicos, "muchos núcleos" (Star/Galaxy) llevan la
> MISMA T4 que ya tienes (no RTX), y la franja RTX (A10G, 8 núcleos) tiene pocos núcleos.
> En Vagon **no van juntos** muchos núcleos + GPU RTX en el mismo plan. El precio del
> tier RTX A10G individual no está publicado claramente (~3-4 $/h estimado ⚠️).

---

## 3. ¿Alquilar (nube) o COMPRAR? El punto de equilibrio

Asumimos un uso serio: **~5 h/día** (~150 h/mes). Para igualar la potencia de compilado
de un PC de 16 núcleos en la nube de Vagon necesitas el plan **Star (~2,75 €/h)**.

Comparativa con un uso de ~4 h/día laborables (~80 h/mes) en Vagon Star = **~220 €/mes**:

| PC que compras | Coste | Se paga solo en… |
|---|---|---|
| Gama media (9700X, ~1.400 €) | 1.400 € | **~6-7 meses** |
| Gama media-alta (9900X, ~2.100 €) | 2.100 € | **~9-10 meses** |
| Gama alta (9950X, ~2.600 €) | 2.600 € | **~12 meses** |

Si trabajas más (8 h/día, ~160 h/mes ≈ **440 €/mes** en Star), **todos se amortizan en la
mitad de tiempo** (el 9900X en ~5 meses).

Y ojo: si te quedas en el plan barato de Vagon (tipo Planet, ~1 $/h, ~73 €/mes) parece
más barato cada mes, **pero es justo el plan lento que te frustra**: pagarías por seguir
compilando despacio.

**Conclusión de valor:** un PC propio se paga solo entre **~6 y ~12 meses** frente a un
uso serio de la nube, y a partir de ahí **"creas gratis"**, más rápido, sin latencia y sin
depender de internet. La nube solo gana si tu uso es esporádico (pocas horas al mes).

---

## 4. Recomendación final (priorizando CREAR MUY RÁPIDO)

### 🥇 Opción recomendada: **Vast.ai — RTX 4090 + EPYC de 32-64 núcleos (~72 €/mes)**

¿Por qué esta?

1. **Resuelve tu problema de raíz:** es el único sitio donde puedes exigir **32, 64 o 96
   núcleos REALES** junto a una RTX 4090/5090. Muchos núcleos = la compilación de shaders
   cae en picado (UE5 escala casi en línea con los núcleos: pasar de 8 a 16 recorta el
   tiempo un 40-60 %, y 32-64 núcleos mucho más).
2. **Barato:** ~72 €/mes con 5 h/día, facturación por segundo (apagas y dejas de pagar).
3. **También juegas fluido:** la RTX 4090 (24 GB) sobra para probar tu juego. Y cumples
   los 32-64 GB de RAM de sobra.

**Truco al alquilar en Vast.ai:** en el buscador filtra por *CPU cores* (pide ≥32) y por
*RAM* (≥32-64 GB), comprueba que los núcleos ASIGNADOS A TI sean altos (no solo los del
servidor), y elige un host con buena red y disco NVMe. Activa la máquina solo cuando
trabajes. (Aviso: es hardware de terceros, la fiabilidad varía entre hosts; los precios de
mercado fluctúan, confírmalos antes ⚠️).

### Alternativas según lo que valores más

- **Si quieres máxima fiabilidad sin "lotería de hosts":** Azure NV36ads A10 en **SPOT
  (~82 €/mes ⚠️)** — 36 núcleos garantizados de Microsoft, asumiendo cortes ocasionales.
  No lo uses bajo demanda (sería ~442 €/mes).
- **Si prefieres tarifa plana simple y aceptas compilar mediocre:** Shadow Power (~55 €/mes).
- **Si vas en serio a largo plazo y puedes invertir:** COMPRA un **PC Ryzen 9 9900X (12
  núcleos) + RTX 5070 Ti + 64 GB (~1.900-2.300 €)**. Es el punto dulce: se amortiza en
  ~9-10 meses (o ~5 si trabajas muchas horas) y luego creas gratis, rapidísimo y sin internet.

### Recordatorio importante sobre cambiar de máquina

Cambiar de entorno (de Vagon a Vast.ai, a Azure o a un PC nuevo) solo te cuesta **UNA
recompilación de shaders, una sola vez**. Después ya tienes la caché en la máquina nueva y
vuelves a la velocidad normal. No es una penalización recurrente: es un único rato de espera
a cambio de compilar muchísimo más rápido para siempre. (La única forma de evitar incluso
eso es quedarte en Vagon subiendo a Star, porque conservas tu caché de shaders ya compilada;
pero pagas el peaje de seguir con la GPU T4 y precios por hora más altos.)

---

### Avisos generales

- Conversión USD→EUR ~0,92 (junio 2026); las cifras en EUR son aproximadas y dependen del
  cambio y tu región.
- Los costes mensuales de las opciones por hora asumen que **apagas la máquina** fuera del
  horario de trabajo (no 24/7). Si la dejas encendida, se disparan.
- Los PCs montados (precios España, junio 2026) incluyen placa AM5, SSD NVMe, fuente, caja,
  refrigeración y Windows; pide presupuesto cerrado (PcComponentes, Coolmod, Neobyte). Las
  RTX 50 (5070 Ti/5080) están caras por escasez de memoria GDDR7.
- En la nube por horas, el **disco es persistente** aunque apagues la máquina: conservas tu
  proyecto y solo pagas CPU/GPU mientras trabajas (puede haber un pequeño coste de
  almacenamiento aparte).
