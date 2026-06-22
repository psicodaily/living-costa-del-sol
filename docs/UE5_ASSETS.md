# 🛒 Lista de assets (gratis / CC0) para vestir Puerto Banús

> Objetivo: **assets propios/libres** (no tiles fotogramétricos de Google), para que
> el juego sea **vendible**. Todo lo de aquí es **gratis** y de **uso comercial**.
> Se va marcando lo que tengamos. Orden = por hito.

## De dónde sacamos cosas (todo gratis)
- **Fab** (la tienda de Epic, dentro de Unreal): sección **gratis** + **Quixel Megascans**
  (materiales/props fotorrealistas, **gratis** con cuenta Epic). Es la fuente principal.
- **Poly Haven** — HDRIs (cielos), materiales y modelos **CC0**.
- **Quaternius / Poly Pizza** — modelos low-poly **CC0** (para rellenar/lejos).
- **AmbientCG** — texturas/materiales **CC0**.

---

## Hito 3 — AGUA y entorno base
- [ ] **Water System** de Unreal (plugin que ya trae el motor) → la **dársena** y el mar.
- [ ] **HDRI de cielo** mediterráneo (Poly Haven, p. ej. un mediodía despejado o tarde dorada).
- [ ] Material de **arena** de playa (Megascans/AmbientCG).
- [ ] Material de **roca clara** para el **espigón** (Megascans).

## Hito 4 — VESTIR edificios y suelo
**Materiales (Megascans/AmbientCG):**
- [ ] **Pared blanca / estuco mediterráneo** (fachadas).
- [ ] **Teja terracota** (tejados).
- [ ] **Cristal oscuro** de escaparate (plantas bajas de lujo).
- [ ] **Adoquín / baldosa beige** con dibujo (paseo y aceras).
- [ ] **Asfalto** + **carril azul** (avenidas; el azul es muy de Marbella).

**Props (Fab gratis / Megascans / Quaternius):**
- [ ] **Palmeras** (las del paseo y avenidas). *(ya tenemos una en `public/models/palm.glb` del prototipo)*
- [ ] **Farolas clásicas negras** (fernandinas).
- [ ] **Toldos** de tienda + **carteles** de marca (marcas ficticias, ver `docs/NOMBRES.md`).
- [ ] **Balcones / barandillas**.
- [ ] **Bancos, papeleras, jardineras, macetones**.
- [ ] **Barandilla blanca** del muelle + **salvavidas rojos**.

## Hito 5 — LUZ y ambiente
- [ ] **Lumen** (ya viene en UE5; es activar/ajustar).
- [ ] **Sky + nubes** (sistema de cielo de UE / HDRI).
- [ ] Niebla volumétrica suave (sensación de costa).

## Hito 6 — VIDA (coches, barcos, gente)
- [ ] **Yates** amarrados (Fab/Megascans; o low-poly Quaternius para los lejanos). *(hay `public/models/sailboat.glb` del prototipo)*
- [ ] **Coches de lujo aparcados** en línea en el muelle (la imagen de Puerto Banús).
- [ ] **Peatones** (MetaHumans gratis de Epic, o multitudes simples).
- [ ] El **rinoceronte de Dalí** en su rotonda (lo modelamos nosotros: es icónico).

---

## Reglas al coger assets
1. **Comprobar licencia** = uso comercial OK (Megascans/Fab gratis y CC0 lo son).
2. **Marcas ficticias** siempre (Tom Ford → "Tom Fjord", etc. → `docs/NOMBRES.md`).
3. **Variación** > repetición (varias palmeras/farolas/tonos, no clones perfectos).
4. Lo lejano puede ser **low-poly**; el detalle, donde el jugador se acerca.
