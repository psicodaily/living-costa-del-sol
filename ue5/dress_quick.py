# -*- coding: utf-8 -*-
# ============================================================================
#  Puerto Banus  ->  "VESTIDO" rapido (aspecto mediterraneo)
#  ----------------------------------------------------------------------------
#  QUE HACE ESTE SCRIPT (ejecutar DENTRO del editor de Unreal Engine 5.7,
#  con el plugin "Python Editor Script Plugin" activado):
#
#    Coge la maqueta gris de Puerto Banus (109 edificios "PB_Edif_000..108"
#    + el suelo "PB_Suelo") y la transforma en algo con aire mediterraneo:
#
#      1) Crea materiales de color liso en /Game/PB_Mats/ (paredes blanco
#         hueso, tejas terracota, suelo arena, hoja verde, tronco marron).
#      2) Pinta cada edificio de blanco y le pone un TEJADO terracota encima.
#      3) Pinta el suelo "PB_Suelo" de color arena.
#      4) Esparce ~60 ARBOLES sencillos (tronco + copa) por el distrito,
#         evitando el agua del centro de la darsena.
#
#  ES RE-EJECUTABLE: cada vez que se lanza, primero borra lo que creo la vez
#  anterior (todo lo que dejo en la carpeta "PuertoBanus/Vestido"), asi no se
#  duplican tejados ni arboles. Tambien es ROBUSTO: cada paso va en su propio
#  try/except, de modo que si una parte falla, las demas siguen funcionando.
#
#  CONTEXTO DE LA MAQUETA (lo crea ue5/import_puertobanus.py):
#    - Edificios: cubos /Engine/BasicShapes/Cube, etiqueta "PB_Edif_NNN",
#      carpeta "PuertoBanus/Blockout". Escala = (ancho, fondo, alto) en METROS
#      (el cubo base mide 1 m => escala = metros). Base en Z=0, centro en
#      Z = alto*50 cm, TOP en Z = alto*100 cm. Tienen rotacion (yaw).
#    - Suelo: plano /Engine/BasicShapes/Plane, etiqueta "PB_Suelo".
#    - El origen (0,0) es el centro de la darsena (el agua).
# ============================================================================

import unreal
import random
import math

# ------------------------------------------------------------------ AJUSTES ---
CARPETA_BLOCKOUT = "PuertoBanus/Blockout"   # donde estan los edificios grises
CARPETA_VESTIDO  = "PuertoBanus/Vestido"    # donde dejamos tejados + arboles
CARPETA_MATS     = "/Game/PB_Mats"          # Content Browser, sin barra final

TAG_EDIFICIO = "PB_Edif_"   # prefijo de etiqueta de los edificios
TAG_SUELO    = "PB_Suelo"   # etiqueta del suelo

# Mallas basicas del motor
MESH_CUBO     = "/Engine/BasicShapes/Cube"
MESH_CILINDRO = "/Engine/BasicShapes/Cylinder"
MESH_ESFERA   = "/Engine/BasicShapes/Sphere"

# Colores (R, G, B en 0..1) y rugosidad alta para look mate mediterraneo
COLORES = {
    "M_Pared":  (0.86, 0.84, 0.78),   # blanco hueso
    "M_Teja":   (0.55, 0.25, 0.16),   # terracota
    "M_Suelo":  (0.80, 0.74, 0.60),   # beige arena
    "M_Hoja":   (0.18, 0.40, 0.16),   # verde hoja
    "M_Tronco": (0.32, 0.21, 0.12),   # marron tronco
}
RUGOSIDAD = 0.8

# Arboles
NUM_ARBOLES        = 60       # objetivo aproximado
RADIO_AGUA_CM      = 180 * 100   # no poner arboles a menos de 180 m del origen
SEP_MIN_CM         = 22 * 100    # separacion minima entre arboles (~22 m)
MARGEN_DISTRITO_CM = 40 * 100    # margen extra alrededor de los edificios

# ------------------------------------------------------------- SUBSISTEMAS ---
try:
    EAS = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
except Exception as e:
    EAS = None
    print("ERROR FATAL: no se pudo obtener EditorActorSubsystem: %s" % e)


# ===========================================================================
#  UTILIDADES
# ===========================================================================
def folder_de(actor):
    """Devuelve la ruta de carpeta del actor como texto (o cadena vacia)."""
    try:
        return str(actor.get_folder_path())
    except Exception:
        return ""


def label_de(actor):
    """Devuelve la etiqueta legible del actor (o cadena vacia)."""
    try:
        return str(actor.get_actor_label())
    except Exception:
        return ""


def todos_los_actores():
    """Lista todos los actores del nivel, con proteccion."""
    if EAS is None:
        return []
    try:
        return list(EAS.get_all_level_actors())
    except Exception as e:
        print("AVISO: no se pudieron listar los actores del nivel: %s" % e)
        return []


def asignar_material(actor, material):
    """Asigna 'material' al slot 0 del StaticMeshComponent del actor."""
    if material is None:
        return False
    try:
        smc = actor.get_component_by_class(unreal.StaticMeshComponent)
        if smc is None:
            return False
        smc.set_material(0, material)
        return True
    except Exception as e:
        print("   AVISO: no se pudo pintar '%s': %s" % (label_de(actor), e))
        return False


def spawn_mesh(mesh, x, y, z, yaw, sx, sy, sz, label, material=None):
    """Crea un StaticMeshActor en la carpeta de Vestido, con escala y color."""
    a = EAS.spawn_actor_from_object(mesh, unreal.Vector(x, y, z),
                                    unreal.Rotator(0.0, 0.0, yaw))
    a.set_actor_scale3d(unreal.Vector(sx, sy, sz))
    a.set_folder_path(CARPETA_VESTIDO)
    try:
        a.set_actor_label(label)
    except Exception:
        pass
    if material is not None:
        asignar_material(a, material)
    return a


# ===========================================================================
#  PASO 1 - MATERIALES
# ===========================================================================
def crear_material(nombre, rgb, rugosidad):
    """Crea (o reutiliza) un Material de color liso en /Game/PB_Mats/.

    Devuelve el asset Material, o None si fallo.
    """
    ruta_completa = CARPETA_MATS.rstrip("/") + "/" + nombre
    try:
        # Reutilizar si ya existe (re-ejecutable, no duplica assets)
        if unreal.EditorAssetLibrary.does_asset_exist(ruta_completa):
            mat = unreal.EditorAssetLibrary.load_asset(ruta_completa)
            if mat is not None:
                print("   Reutilizado material existente: %s" % ruta_completa)
                return mat

        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        mat = asset_tools.create_asset(
            asset_name=nombre,
            package_path=CARPETA_MATS,
            asset_class=unreal.Material,
            factory=unreal.MaterialFactoryNew(),
        )
        if mat is None:
            print("   AVISO: create_asset devolvio None para %s" % nombre)
            return None

        mel = unreal.MaterialEditingLibrary

        # Nodo de color base (VectorParameter -> editable luego en instancias)
        color_node = mel.create_material_expression(
            mat, unreal.MaterialExpressionVectorParameter, -350, 0)
        color_node.set_editor_property("parameter_name", "BaseColor")
        color_node.set_editor_property(
            "default_value",
            unreal.LinearColor(rgb[0], rgb[1], rgb[2], 1.0))
        mel.connect_material_property(
            color_node, "", unreal.MaterialProperty.MP_BASE_COLOR)

        # Nodo de rugosidad (escalar) -> aspecto mate
        try:
            rough_node = mel.create_material_expression(
                mat, unreal.MaterialExpressionScalarParameter, -350, 200)
            rough_node.set_editor_property("parameter_name", "Roughness")
            rough_node.set_editor_property("default_value", rugosidad)
            mel.connect_material_property(
                rough_node, "", unreal.MaterialProperty.MP_ROUGHNESS)
        except Exception as e:
            print("   AVISO: no se pudo anadir rugosidad a %s: %s" % (nombre, e))

        mel.recompile_material(mat)
        unreal.EditorAssetLibrary.save_asset(ruta_completa)
        print("   Material creado: %s" % ruta_completa)
        return mat
    except Exception as e:
        print("   ERROR creando material %s: %s" % (nombre, e))
        return None


def crear_materiales():
    """Crea/reutiliza todos los materiales. Devuelve dict {nombre: asset}."""
    mats = {}
    print("[1/5] Creando materiales en %s ..." % CARPETA_MATS)
    try:
        if not unreal.EditorAssetLibrary.does_directory_exist(CARPETA_MATS):
            try:
                unreal.EditorAssetLibrary.make_directory(CARPETA_MATS)
            except Exception:
                pass
        for nombre, rgb in COLORES.items():
            mats[nombre] = crear_material(nombre, rgb, RUGOSIDAD)
    except Exception as e:
        print("   ERROR en bloque de materiales: %s" % e)
    return mats


# ===========================================================================
#  PASO 0 (re-ejecutable) - BORRAR LO ANTERIOR
# ===========================================================================
def borrar_vestido_anterior():
    """Borra los actores de la carpeta de Vestido de una ejecucion previa."""
    print("[0/5] Borrando 'vestido' anterior (carpeta %s) ..." % CARPETA_VESTIDO)
    n = 0
    try:
        previos = [a for a in todos_los_actores()
                   if folder_de(a) == CARPETA_VESTIDO]
        for a in previos:
            try:
                EAS.destroy_actor(a)
                n += 1
            except Exception as e:
                print("   AVISO: no se pudo borrar un actor previo: %s" % e)
        print("   Borrados %d actores de una ejecucion anterior." % n)
    except Exception as e:
        print("   ERROR borrando vestido anterior: %s" % e)
    return n


# ===========================================================================
#  PASO 2 - EDIFICIOS: pintar de blanco + tejado terracota
# ===========================================================================
def vestir_edificios(mat_pared, mat_teja):
    """Pinta cada edificio de blanco y le anade un tejado terracota encima.

    Devuelve (num_edificios_procesados, lista_localizaciones_xy).
    Las localizaciones sirven luego para calcular los limites del distrito.
    """
    print("[2/5] Pintando edificios y poniendo tejados ...")
    edificios = [a for a in todos_los_actores()
                 if label_de(a).startswith(TAG_EDIFICIO)]
    if not edificios:
        print("   AVISO: no se encontro ningun edificio '%s*'." % TAG_EDIFICIO)
        return 0, []

    cubo = None
    try:
        cubo = unreal.EditorAssetLibrary.load_asset(MESH_CUBO)
    except Exception as e:
        print("   AVISO: no se pudo cargar el cubo para tejados: %s" % e)

    procesados = 0
    localizaciones = []
    for a in edificios:
        try:
            loc = a.get_actor_location()
            localizaciones.append((loc.x, loc.y))

            # 2a) pintar pared de blanco hueso
            asignar_material(a, mat_pared)

            # 2b) tejado: cubo fino terracota en el TOP del edificio
            if cubo is None or mat_teja is None:
                procesados += 1
                continue
            try:
                esc = a.get_actor_scale3d()        # (ancho, fondo, alto) en m
                rot = a.get_actor_rotation()        # misma rotacion (yaw)
                alto_m = esc.z
                top_z = alto_m * 100.0              # TOP en cm (base en Z=0)
                # cubo de 0.6 m de alto, centro 30 cm por encima del top
                tejado_z = top_z + 30.0
                spawn_mesh(
                    cubo,
                    loc.x, loc.y, tejado_z,
                    rot.yaw,
                    esc.x * 1.06, esc.y * 1.06, 0.6,
                    "PB_Tejado_%03d" % procesados,
                    mat_teja,
                )
            except Exception as e:
                print("   AVISO: tejado fallido en '%s': %s" % (label_de(a), e))

            procesados += 1
        except Exception as e:
            print("   AVISO: edificio fallido '%s': %s" % (label_de(a), e))

    print("   Edificios procesados: %d" % procesados)
    return procesados, localizaciones


# ===========================================================================
#  PASO 3 - SUELO arena
# ===========================================================================
def vestir_suelo(mat_suelo):
    """Recolorea el actor 'PB_Suelo' con el material de arena."""
    print("[3/5] Recoloreando el suelo ...")
    try:
        suelos = [a for a in todos_los_actores() if label_de(a) == TAG_SUELO]
        if not suelos:
            print("   AVISO: no se encontro el actor '%s'." % TAG_SUELO)
            return False
        ok = False
        for s in suelos:
            if asignar_material(s, mat_suelo):
                ok = True
        if ok:
            print("   Suelo recoloreado de arena.")
        return ok
    except Exception as e:
        print("   ERROR recoloreando el suelo: %s" % e)
        return False


# ===========================================================================
#  PASO 4 - ARBOLES
# ===========================================================================
def limites_distrito(localizaciones):
    """Calcula (min_x, max_x, min_y, max_y) en cm a partir de los edificios."""
    xs = [p[0] for p in localizaciones]
    ys = [p[1] for p in localizaciones]
    return (min(xs) - MARGEN_DISTRITO_CM, max(xs) + MARGEN_DISTRITO_CM,
            min(ys) - MARGEN_DISTRITO_CM, max(ys) + MARGEN_DISTRITO_CM)


def plantar_arbol(cilindro, esfera, mat_tronco, mat_hoja, x, y, indice):
    """Crea un arbol sencillo: tronco (cilindro) + copa (esfera)."""
    # Tronco: cilindro ~0.5 m de diametro x 4 m de alto.
    # El cilindro base mide 1 m (centro en Z=0.5 m), asi que con escala
    # (0.5, 0.5, 4) ocupa de Z=0 a Z=4 m con centro en Z=2 m.
    tronco_alto_m = 4.0
    spawn_mesh(
        cilindro,
        x, y, tronco_alto_m * 50.0,        # centro a 2 m
        0.0,
        0.5, 0.5, tronco_alto_m,
        "PB_ArbolTronco_%03d" % indice,
        mat_tronco,
    )
    # Copa: esfera ~3.5 m de diametro, posada sobre el tronco.
    # La esfera base mide 1 m de diametro (radio 0.5 m), escala 3.5 => 3.5 m.
    copa_diam_m = 3.5
    copa_z = (tronco_alto_m * 100.0) - 50.0 + (copa_diam_m * 100.0) / 2.0
    spawn_mesh(
        esfera,
        x, y, copa_z,
        0.0,
        copa_diam_m, copa_diam_m, copa_diam_m,
        "PB_ArbolCopa_%03d" % indice,
        mat_hoja,
    )


def esparcir_arboles(localizaciones, mat_tronco, mat_hoja):
    """Reparte ~NUM_ARBOLES arboles por el distrito, evitando el agua."""
    print("[4/5] Plantando arboles ...")
    if not localizaciones:
        print("   AVISO: sin edificios de referencia, no se plantan arboles.")
        return 0

    cilindro = esfera = None
    try:
        cilindro = unreal.EditorAssetLibrary.load_asset(MESH_CILINDRO)
        esfera = unreal.EditorAssetLibrary.load_asset(MESH_ESFERA)
    except Exception as e:
        print("   AVISO: no se pudieron cargar mallas de arbol: %s" % e)
    if cilindro is None or esfera is None:
        print("   AVISO: faltan mallas (cilindro/esfera); no se plantan arboles.")
        return 0

    min_x, max_x, min_y, max_y = limites_distrito(localizaciones)

    # Rejilla con algo de aleatoriedad: calculamos un paso para cubrir el area
    # con ~NUM_ARBOLES candidatos, y luego filtramos por agua/separacion.
    try:
        random.seed(42)  # reproducible entre ejecuciones
    except Exception:
        pass

    ancho = max(max_x - min_x, 1.0)
    fondo = max(max_y - min_y, 1.0)
    # numero de columnas/filas proporcional a la forma del distrito
    cols = max(1, int(round(math.sqrt(NUM_ARBOLES * ancho / fondo))))
    filas = max(1, int(round(NUM_ARBOLES / cols)))
    paso_x = ancho / cols
    paso_y = fondo / filas

    colocados = []   # posiciones aceptadas (para respetar separacion minima)
    indice = 0
    for i in range(cols):
        for j in range(filas):
            if indice >= NUM_ARBOLES:
                break
            # centro de la celda + desplazamiento aleatorio (hasta ~40% celda)
            cx = min_x + (i + 0.5) * paso_x
            cy = min_y + (j + 0.5) * paso_y
            try:
                cx += random.uniform(-0.4, 0.4) * paso_x
                cy += random.uniform(-0.4, 0.4) * paso_y
            except Exception:
                pass

            # evitar el agua: no plantar cerca del origen (darsena)
            if math.hypot(cx, cy) < RADIO_AGUA_CM:
                continue

            # respetar separacion minima con los ya colocados
            demasiado_cerca = False
            for (px, py) in colocados:
                if math.hypot(cx - px, cy - py) < SEP_MIN_CM:
                    demasiado_cerca = True
                    break
            if demasiado_cerca:
                continue

            try:
                plantar_arbol(cilindro, esfera, mat_tronco, mat_hoja,
                              cx, cy, indice)
                colocados.append((cx, cy))
                indice += 1
            except Exception as e:
                print("   AVISO: arbol %d fallido: %s" % (indice, e))

    print("   Arboles plantados: %d" % len(colocados))
    return len(colocados)


# ===========================================================================
#  ORQUESTACION
# ===========================================================================
def main():
    print("=" * 64)
    print("VISTIENDO Puerto Banus (look mediterraneo) ...")
    print("=" * 64)

    if EAS is None:
        print("ERROR FATAL: sin EditorActorSubsystem no se puede continuar.")
        return

    # 0) limpiar lo anterior (re-ejecutable)
    borrar_vestido_anterior()

    # 1) materiales
    mats = crear_materiales()
    mat_pared  = mats.get("M_Pared")
    mat_teja   = mats.get("M_Teja")
    mat_suelo  = mats.get("M_Suelo")
    mat_hoja   = mats.get("M_Hoja")
    mat_tronco = mats.get("M_Tronco")

    # 2) edificios + tejados
    n_edif, localizaciones = vestir_edificios(mat_pared, mat_teja)

    # 3) suelo
    vestir_suelo(mat_suelo)

    # 4) arboles
    n_arb = esparcir_arboles(localizaciones, mat_tronco, mat_hoja)

    # 5) guardar el nivel (mejor esfuerzo)
    try:
        les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        les.save_current_level()
    except Exception:
        pass

    print("=" * 64)
    print("LISTO: Puerto Banus vestido (edificios %d, arboles %d)"
          % (n_edif, n_arb))
    print("=" * 64)


main()
