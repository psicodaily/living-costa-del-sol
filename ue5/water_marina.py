# -*- coding: utf-8 -*-
# =============================================================================
# water_marina.py
# -----------------------------------------------------------------------------
# QUE HACE:
#   Busca en el nivel abierto de Unreal Engine 5.7 (plugin Water activado) el
#   actor WaterBodyLake ya creado y le da a su spline la forma EXACTA de la
#   darsena de Puerto Banus (poligono cerrado definido abajo). Luego reconstruye
#   el agua para que la malla se regenere con la nueva forma.
#
# COMO USARLO:
#   1) Abre el nivel en el editor de UE 5.7 con el plugin Water activado.
#   2) Ventana > Output Log (o la consola Python del editor).
#   3) Ejecuta este script:  py "ruta/al/water_marina.py"
#      (o pegalo en la consola Python del editor).
#
# RE-EJECUTABLE:
#   Es seguro ejecutarlo varias veces. Cada ejecucion reinicia el transform del
#   lago a identidad y vuelve a fijar los puntos del spline desde cero, de modo
#   que el resultado es siempre el mismo (idempotente).
#
# API PRINCIPAL (la mas fiable segun investigacion):
#   - lake.get_water_spline()                 -> WaterSplineComponent
#   - spline.set_spline_points(pts, LOCAL, False)
#   - spline.set_closed_loop(True, True)
#   - spline.k2_synchronize_and_broadcast_data_change()
#   - water_comp.on_water_body_changed(True, False)
#   Con multiples FALLBACKS defensivos envueltos en try/except por si tu build
#   expone nombres distintos.
# =============================================================================

import unreal

# -----------------------------------------------------------------------------
# DATOS: poligono de la darsena (coordenadas Unreal en cm, espacio LOCAL,
# actor en el origen). Z = 10 en todos los puntos (un lago es plano).
# NO se duplica el primer punto al final: el cierre lo hace set_closed_loop.
# -----------------------------------------------------------------------------
PUNTOS = [
    [-32626, -19428], [-37540, -11833], [-6830, 8335], [1968, 14417],
    [2601, 13429], [3480, 13993], [3199, 14490], [4886, 15614],
    [10841, 16539], [11070, 14501], [15662, 10073], [17793, 8515],
    [15672, 5724], [17331, 4400], [9403, -5682], [5471, -10430],
    [3804, -11550], [6, -16575], [-1502, -15449], [-12621, -29744],
]
Z_AGUA = 10.0


def log(msg):
    """Imprime un mensaje claro en espanol con prefijo."""
    print("[water_marina] " + str(msg))


def diagnostico(lake, spline=None):
    """Imprime un bloque de diagnostico para afinar el script si algo falla."""
    log("===== BLOQUE DE DIAGNOSTICO (pegamelo si falla) =====")
    try:
        metodos_actor = [m for m in dir(lake)
                         if "spline" in m.lower() or "water" in m.lower()]
        print("DIR ACTOR:", metodos_actor)
    except Exception as e:
        print("DIR ACTOR: no disponible ->", e)
    if spline is not None:
        try:
            metodos_spline = [m for m in dir(spline)
                              if "point" in m.lower() or "spline" in m.lower()
                              or "loop" in m.lower()]
            print("DIR SPLINE:", metodos_spline)
        except Exception as e:
            print("DIR SPLINE: no disponible ->", e)
    log("===== FIN DIAGNOSTICO =====")


# -----------------------------------------------------------------------------
# PASO 1: encontrar el actor WaterBodyLake en el nivel.
# -----------------------------------------------------------------------------
def encontrar_lago():
    """Devuelve el primer actor WaterBodyLake del nivel, o None."""
    try:
        actor_sub = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        actores = actor_sub.get_all_level_actors()
    except Exception as e:
        log("ERROR: no se pudo obtener la lista de actores del nivel -> " + str(e))
        return None

    candidatos = []
    for a in actores:
        if a is None:
            continue
        # Via 1: isinstance contra la clase del plugin Water (si existe).
        try:
            if hasattr(unreal, "WaterBodyLake") and isinstance(a, unreal.WaterBodyLake):
                candidatos.append(a)
                continue
        except Exception:
            pass
        # Via 2: por nombre de clase que empiece por "WaterBodyLake".
        try:
            nombre_clase = a.get_class().get_name()
            if nombre_clase.startswith("WaterBodyLake"):
                candidatos.append(a)
        except Exception:
            pass

    if not candidatos:
        return None
    log("Encontrados " + str(len(candidatos)) + " actor(es) WaterBodyLake. Uso el primero.")
    return candidatos[0]


# -----------------------------------------------------------------------------
# PASO 3: poner el transform del lago a identidad.
# -----------------------------------------------------------------------------
def resetear_transform(lake):
    """Coloca el actor en el origen, sin rotacion y escala 1."""
    try:
        lake.set_actor_location(unreal.Vector(0.0, 0.0, 0.0), False, False)
    except TypeError:
        # Algunas builds aceptan solo (location) o (location, sweep, teleport).
        try:
            lake.set_actor_location(unreal.Vector(0.0, 0.0, 0.0))
        except Exception as e:
            log("AVISO: no se pudo fijar la localizacion -> " + str(e))
    except Exception as e:
        log("AVISO: no se pudo fijar la localizacion -> " + str(e))

    try:
        lake.set_actor_rotation(unreal.Rotator(0.0, 0.0, 0.0), False)
    except TypeError:
        try:
            lake.set_actor_rotation(unreal.Rotator(0.0, 0.0, 0.0))
        except Exception as e:
            log("AVISO: no se pudo fijar la rotacion -> " + str(e))
    except Exception as e:
        log("AVISO: no se pudo fijar la rotacion -> " + str(e))

    try:
        lake.set_actor_scale3d(unreal.Vector(1.0, 1.0, 1.0))
    except Exception as e:
        log("AVISO: no se pudo fijar la escala -> " + str(e))

    log("Transform del lago puesto a identidad (origen, sin rotacion, escala 1).")


# -----------------------------------------------------------------------------
# PASO 4: obtener el componente spline de forma DEFENSIVA.
# -----------------------------------------------------------------------------
def obtener_spline(lake):
    """Devuelve la WaterSplineComponent probando varias rutas conocidas."""
    # Ruta A (recomendada): metodo explicito del actor.
    try:
        s = lake.get_water_spline()
        if s is not None:
            log("Spline obtenido via lake.get_water_spline().")
            return s
    except Exception:
        pass

    # Ruta B: propiedad de editor 'water_spline'.
    try:
        s = lake.get_editor_property("water_spline")
        if s is not None:
            log("Spline obtenido via get_editor_property('water_spline').")
            return s
    except Exception:
        pass

    # Ruta C: propiedad de editor 'spline_comp'.
    try:
        s = lake.get_editor_property("spline_comp")
        if s is not None:
            log("Spline obtenido via get_editor_property('spline_comp').")
            return s
    except Exception:
        pass

    # Ruta D: atributo directo spline_comp.
    try:
        s = lake.spline_comp
        if s is not None:
            log("Spline obtenido via lake.spline_comp.")
            return s
    except Exception:
        pass

    # Ruta E: a traves del WaterBodyComponent.
    try:
        wbc = obtener_water_body_component(lake)
        if wbc is not None:
            s = wbc.get_water_spline()
            if s is not None:
                log("Spline obtenido via water_body_component.get_water_spline().")
                return s
    except Exception:
        pass

    # Ruta F: buscar componentes por clase (WaterSplineComponent).
    try:
        if hasattr(unreal, "WaterSplineComponent"):
            comps = lake.get_components_by_class(unreal.WaterSplineComponent)
            if comps and len(comps) > 0:
                log("Spline obtenido via get_components_by_class(WaterSplineComponent).")
                return comps[0]
    except Exception:
        pass

    # Ruta G: cualquier SplineComponent del actor.
    try:
        comps = lake.get_components_by_class(unreal.SplineComponent)
        if comps and len(comps) > 0:
            log("Spline obtenido via get_components_by_class(SplineComponent).")
            return comps[0]
    except Exception:
        pass

    return None


def obtener_water_body_component(lake):
    """Devuelve el WaterBodyComponent probando varias rutas (puede ser None)."""
    try:
        wbc = lake.get_water_body_component()
        if wbc is not None:
            return wbc
    except Exception:
        pass
    try:
        wbc = lake.get_editor_property("water_body_component")
        if wbc is not None:
            return wbc
    except Exception:
        pass
    try:
        wbc = lake.water_body_component
        if wbc is not None:
            return wbc
    except Exception:
        pass
    try:
        if hasattr(unreal, "WaterBodyComponent"):
            comps = lake.get_components_by_class(unreal.WaterBodyComponent)
            if comps and len(comps) > 0:
                return comps[0]
    except Exception:
        pass
    return None


# -----------------------------------------------------------------------------
# Enum de espacio de coordenadas (LOCAL), robusto a mayusculas/minusculas.
# -----------------------------------------------------------------------------
def espacio_local():
    """Devuelve el valor del enum SplineCoordinateSpace para LOCAL."""
    try:
        return unreal.SplineCoordinateSpace.LOCAL
    except Exception:
        pass
    try:
        return unreal.SplineCoordinateSpace.Local
    except Exception:
        pass
    # Ultimo recurso: el valor entero (LOCAL == 0 en la mayoria de builds).
    return 0


# -----------------------------------------------------------------------------
# PASO 5: fijar los puntos del spline en espacio LOCAL y cerrar el bucle.
# -----------------------------------------------------------------------------
def fijar_puntos(spline):
    """Construye los Vector, los fija en LOCAL y cierra el bucle."""
    puntos = [unreal.Vector(float(x), float(y), Z_AGUA) for (x, y) in PUNTOS]
    local = espacio_local()

    # Limpiar puntos previos (defensivo; permite re-ejecucion limpia).
    try:
        spline.clear_spline_points(False)
    except Exception:
        pass

    # Fijar todos los puntos de golpe. Diferimos el recalculo (update=False).
    fijado = False
    try:
        spline.set_spline_points(puntos, local, False)
        fijado = True
        log("Puntos fijados via set_spline_points(LOCAL, update=False).")
    except Exception as e:
        log("AVISO: set_spline_points fallo -> " + str(e) + ". Pruebo punto a punto.")

    # Fallback: anadir punto a punto si el set de golpe fallo.
    if not fijado:
        try:
            spline.clear_spline_points(False)
        except Exception:
            pass
        try:
            for p in puntos:
                spline.add_spline_point(p, local, False)
            fijado = True
            log("Puntos fijados via add_spline_point (punto a punto).")
        except Exception as e:
            log("ERROR: tampoco se pudieron anadir los puntos -> " + str(e))

    if not fijado:
        return False

    # Cerrar el bucle (un lago es un contorno cerrado). Aqui SI recalculamos.
    try:
        spline.set_closed_loop(True, True)
        log("Bucle cerrado via set_closed_loop(True, update=True).")
    except Exception as e:
        log("AVISO: set_closed_loop(True, True) fallo -> " + str(e))
        # Fallbacks para cerrar el bucle.
        try:
            spline.set_closed_loop(True)
            log("Bucle cerrado via set_closed_loop(True).")
        except Exception:
            try:
                spline.set_editor_property("closed_loop", True)
                log("Bucle cerrado via set_editor_property('closed_loop', True).")
            except Exception as e2:
                log("AVISO: no se pudo cerrar el bucle -> " + str(e2))

    # Forzar un recalculo final del spline.
    try:
        spline.update_spline()
    except Exception:
        pass

    return True


# -----------------------------------------------------------------------------
# PASO 6: reconstruir / actualizar el water body de forma DEFENSIVA.
# -----------------------------------------------------------------------------
def reconstruir_agua(lake, spline):
    """Sincroniza el spline del agua y dispara la reconstruccion del water body."""
    # 6.a) Sincronizar metadata del WaterSplineComponent (necesario al editar
    #      el spline por script en vez de en el editor).
    try:
        spline.k2_synchronize_and_broadcast_data_change()
        log("Metadata del water spline sincronizada (k2_synchronize_and_broadcast_data_change).")
    except Exception:
        try:
            spline.synchronize_water_properties()
            log("Metadata del water spline sincronizada (synchronize_water_properties).")
        except Exception:
            pass

    wbc = obtener_water_body_component(lake)

    # 6.b) Disparar la reconstruccion del water body.
    reconstruido = False
    if wbc is not None:
        # Firma 5.6/5.7: (shape_or_position_changed, weightmap_settings_changed).
        try:
            wbc.on_water_body_changed(True, False)
            reconstruido = True
            log("Water body reconstruido via on_water_body_changed(True, False).")
        except Exception:
            try:
                wbc.on_water_body_changed(True)
                reconstruido = True
                log("Water body reconstruido via on_water_body_changed(True).")
            except Exception:
                pass

        # Fallbacks adicionales (nombres no garantizados; van en try/except).
        for nombre, args in (
            ("update_water_body", (True,)),
            ("update_water_body", ()),
            ("update_all_affected_water_bodies", ()),
            ("update_component_visibility", ()),
        ):
            if reconstruido:
                break
            try:
                metodo = getattr(wbc, nombre, None)
                if callable(metodo):
                    metodo(*args)
                    reconstruido = True
                    log("Water body reconstruido via " + nombre + str(args) + ".")
            except Exception:
                pass

        # 6.c) Marcar como modificado y refrescar render/paquete.
        try:
            wbc.modify()
        except Exception:
            pass
        try:
            wbc.post_edit_change()
        except Exception:
            pass
        try:
            spline.mark_render_state_dirty()
        except Exception:
            pass
    else:
        log("AVISO: no se encontro WaterBodyComponent; intento refresco por el actor.")

    # 6.d) Marcar el actor y el paquete como sucios (para repintado/guardado).
    try:
        lake.modify()
    except Exception:
        pass
    try:
        lake.post_edit_change()
    except Exception:
        pass
    try:
        lake.mark_package_dirty()
    except Exception:
        pass

    # 6.e) Ultimo recurso: mover el actor 0 unidades fuerza la reconstruccion.
    if not reconstruido:
        log("AVISO: ningun metodo de reconstruccion conocido funciono; "
            "fuerzo refresco moviendo el actor 0 unidades.")
        try:
            loc = lake.get_actor_location()
            lake.set_actor_location(loc, False, False)
        except Exception:
            pass

    # Refresco del viewport (no-op seguro).
    try:
        unreal.EditorLevelLibrary.editor_set_game_view(False)
    except Exception:
        pass

    return reconstruido


# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------
def main():
    log("Iniciando moldeado de la darsena de Puerto Banus...")

    # PASO 1-2: localizar el lago.
    lake = encontrar_lago()
    if lake is None:
        log("NO se encontro ningun actor WaterBodyLake en el nivel.")
        log("Crea un Water Body Lake en el nivel (plugin Water) y vuelve a ejecutar.")
        return

    try:
        log("Lago seleccionado: " + lake.get_actor_label())
    except Exception:
        pass

    # PASO 3: reset de transform.
    resetear_transform(lake)

    # PASO 4: obtener el spline.
    spline = obtener_spline(lake)
    if spline is None:
        log("ERROR: no se pudo obtener el componente spline del lago.")
        diagnostico(lake, None)
        return

    # PASO 5: fijar puntos y cerrar bucle.
    try:
        ok = fijar_puntos(spline)
    except Exception as e:
        log("ERROR al fijar los puntos del spline -> " + str(e))
        diagnostico(lake, spline)
        return

    if not ok:
        log("ERROR: no se pudieron fijar los puntos del spline.")
        diagnostico(lake, spline)
        return

    # PASO 6: reconstruir el agua.
    try:
        reconstruir_agua(lake, spline)
    except Exception as e:
        log("AVISO: fallo en la reconstruccion del agua -> " + str(e))
        diagnostico(lake, spline)
        # No es fatal: los puntos ya estan fijados.

    log("LISTO: darsena moldeada con " + str(len(PUNTOS)) + " puntos.")


if __name__ == "__main__":
    main()
else:
    # Permite ejecutarlo tambien pegandolo directamente en la consola Python.
    main()
