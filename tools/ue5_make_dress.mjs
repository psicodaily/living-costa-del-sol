// ============================================================================
//  GENERADOR: ue5/dress_puertobanus.py  (script Python AUTOCONTENIDO para UE5.7)
//  ----------------------------------------------------------------------------
//  Lee ue5/puertobanus_dress.json (288 calles reales de Puerto Banus en
//  coordenadas Unreal (cm) + arboles) y ESCRIBE un script Python autocontenido
//  con esos datos EMBEBIDOS como literales Python, para que el .py funcione
//  dentro de Unreal Engine 5.7 sin depender del JSON.
//
//  Ejecutar:  node tools/ue5_make_dress.mjs
//  Salida:    ue5/dress_puertobanus.py
// ============================================================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = "ue5/puertobanus_dress.json";
const OUT = "ue5/dress_puertobanus.py";

const data = JSON.parse(readFileSync(SRC, "utf8"));
const roads = Array.isArray(data.roads) ? data.roads : [];
const trees = Array.isArray(data.trees) ? data.trees : [];

// --- serializar una calle como literal Python ------------------------------
// Cada calle -> {"pts": [(x, y), ...], "width": float, "kind": "...", "name": "..."}
function pyStr(s) {
  // string Python seguro entre comillas dobles (escapando lo imprescindible)
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function pyNum(n) {
  // numeros con como mucho 2 decimales; enteros sin .0 innecesario
  const r = Math.round(Number(n) * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}
function roadLiteral(r) {
  const pts = (r.pts || [])
    .map(([x, z]) => `(${pyNum(x)}, ${pyNum(z)})`)
    .join(", ");
  const parts = [
    `"pts": [${pts}]`,
    `"width": ${pyNum(r.width)}`,
    `"kind": ${pyStr(r.kind || "unknown")}`,
  ];
  if (r.name) parts.push(`"name": ${pyStr(r.name)}`);
  return `    {${parts.join(", ")}},`;
}
function treeLiteral(t) {
  // arbol: {"x": cm, "y": cm, "tipo": "palm"|"tree"}
  const tipo = t.tipo || t.type || (t.kind === "palm" ? "palm" : "tree");
  return `    {"x": ${pyNum(t.x)}, "y": ${pyNum(t.y)}, "tipo": ${pyStr(tipo)}},`;
}

const roadsPy = roads.map(roadLiteral).join("\n");
const treesPy = trees.map(treeLiteral).join("\n");

// --- conteos por tipo para el comentario informativo -----------------------
const byKind = {};
for (const r of roads) byKind[r.kind || "unknown"] = (byKind[r.kind || "unknown"] || 0) + 1;
const kindResumen = Object.entries(byKind)
  .sort((a, b) => b[1] - a[1])
  .map(([k, n]) => `#       ${k}: ${n}`)
  .join("\n");

const origenLon = data?.origin?.lon ?? "?";
const origenLat = data?.origin?.lat ?? "?";

// ============================================================================
//  PLANTILLA DEL SCRIPT PYTHON (autocontenido)
// ============================================================================
const py = `# -*- coding: utf-8 -*-
# ============================================================================
#  Puerto Banus  ->  "VESTIDO COMPLETO" (edificios + suelo + CALLES + arboles)
#  ----------------------------------------------------------------------------
#  GENERADO AUTOMATICAMENTE por tools/ue5_make_dress.mjs.
#  NO editar a mano: los datos de calles y arboles van EMBEBIDOS abajo como
#  literales Python, asi este .py funciona en Unreal Engine 5.7 SIN depender
#  del JSON (es autocontenido).
#
#  QUE HACE (ejecutar DENTRO del editor de UE 5.7, con el plugin
#  "Python Editor Script Plugin" activado):
#
#    0) Re-ejecutable: borra primero los actores de las carpetas
#       "PuertoBanus/Vestido" y "PuertoBanus/Calles" (lo que creo la vez
#       anterior), para no duplicar nada.
#    1) Crea (si no existen) materiales de color liso en /Game/PB_Mats/:
#       M_Pared (blanco hueso), M_Teja (terracota), M_Suelo (beige arena),
#       M_Asfalto (gris oscuro), M_Acera (beige claro), M_CarrilAzul (azul),
#       M_Hoja (verde), M_Tronco (marron). Rugosidad ~0.85.
#    2) EDIFICIOS: a cada actor cuya etiqueta empieza por "PB_Edif_" le pone
#       el material M_Pared y le anade un TEJADO terracota (cubo fino) encima.
#    3) SUELO: recolorea el actor "PB_Suelo" con M_Suelo.
#    4) CALLES (datos reales embebidos): por cada segmento de cada calle pone
#       primero una tira de ACERA (mas ancha) y encima una tira de ASFALTO; en
#       avenidas/primary/secondary anade ademas una fina tira de CARRIL AZUL
#       por el centro. Carpeta "PuertoBanus/Calles".
#    5) ARBOLES/PALMERAS (datos reales embebidos): palmera (tronco alto fino +
#       copa) o arbol (tronco corto + esfera) en cada punto. Si NO hay datos de
#       arboles, NO inventa posiciones: avisa por print de que se anadiran al
#       comparar con el satelite. Carpeta "PuertoBanus/Vestido".
#
#  ROBUSTO: cada bloque va en su propio try/except con mensajes en espanol, de
#  modo que si una parte falla, las demas siguen.
#
#  CONTEXTO DE LA MAQUETA (la crea ue5/import_puertobanus.py):
#    - Edificios: cubos /Engine/BasicShapes/Cube, etiqueta "PB_Edif_NNN",
#      carpeta "PuertoBanus/Blockout". Escala = (ancho, fondo, alto) en METROS
#      (el cubo base mide 1 m => escala = metros). Base en Z=0, centro en
#      Z = alto*50 cm, TOP en Z = alto*100 cm. Tienen rotacion (yaw).
#    - Suelo: plano /Engine/BasicShapes/Plane, etiqueta "PB_Suelo".
#    - El origen (0,0) es el centro de la darsena (el agua).
#
#  GEOREF (origen marina): lon ${origenLon}, lat ${origenLat}.
#  Unidades de los datos embebidos: cm de Unreal (1 m = 100 uu).
#
#  DATOS EMBEBIDOS: ${roads.length} calles y ${trees.length} arboles.
#  Calles por tipo:
${kindResumen || "#       (ninguna)"}
# ============================================================================

import unreal
import math

# ------------------------------------------------------------------ AJUSTES ---
CARPETA_VESTIDO = "PuertoBanus/Vestido"   # tejados + arboles
CARPETA_CALLES  = "PuertoBanus/Calles"    # aceras + asfalto + carriles
CARPETA_MATS    = "/Game/PB_Mats"         # Content Browser, sin barra final

TAG_EDIFICIO = "PB_Edif_"   # prefijo de etiqueta de los edificios
TAG_SUELO    = "PB_Suelo"   # etiqueta del suelo

# Mallas basicas del motor
MESH_CUBO     = "/Engine/BasicShapes/Cube"
MESH_CILINDRO = "/Engine/BasicShapes/Cylinder"
MESH_ESFERA   = "/Engine/BasicShapes/Sphere"

# Colores (R, G, B en 0..1, espacio lineal) y rugosidad alta (mate)
COLORES = {
    "M_Pared":      (0.86, 0.84, 0.78),   # blanco hueso
    "M_Teja":       (0.55, 0.25, 0.16),   # terracota
    "M_Suelo":      (0.80, 0.74, 0.60),   # beige arena
    "M_Asfalto":    (0.07, 0.07, 0.08),   # gris oscuro
    "M_Acera":      (0.72, 0.70, 0.64),   # beige claro
    "M_CarrilAzul": (0.06, 0.20, 0.55),   # azul carril
    "M_Hoja":       (0.18, 0.40, 0.16),   # verde hoja
    "M_Tronco":     (0.32, 0.21, 0.12),   # marron tronco
}
RUGOSIDAD = 0.85

# Tipos de via "principales" que llevan tira de carril azul por el centro
TIPOS_CON_CARRIL = (
    "primary", "primary_link",
    "secondary", "secondary_link",
    "trunk", "trunk_link",
    "motorway", "motorway_link",
    "tertiary",  # avenidas anchas de Puerto Banus
)

# Grosores y alturas (cm sobre el suelo) de las tiras de calle
GROSOR_TIRA_M = 0.12     # losa fina
ACERA_EXTRA_M = 3.0      # la acera sobresale 3 m respecto al ancho de calzada
Z_ACERA_CM    = 8.0      # la acera apoya un poco por encima del suelo
Z_ASFALTO_CM  = 15.0     # el asfalto va por encima de la acera
Z_CARRIL_CM   = 18.0     # el carril azul, por encima del asfalto
CARRIL_FRAC   = 1.0 / 3.0  # ancho del carril azul respecto al de la calzada

# ----------------------------------------------------------------------------
#  DATOS REALES EMBEBIDOS (generados desde ue5/puertobanus_dress.json)
#  Cada calle: {"pts": [(x, y) en cm, ...], "width": m, "kind": tipo, "name": ?}
# ----------------------------------------------------------------------------
CALLES = [
${roadsPy}
]

# Cada arbol: {"x": cm, "y": cm, "tipo": "palm"|"tree"}.  Vacio si no hay datos.
ARBOLES = [
${treesPy}
]

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


def cargar_malla(ruta):
    """Carga una malla del motor; None si falla."""
    try:
        return unreal.EditorAssetLibrary.load_asset(ruta)
    except Exception as e:
        print("AVISO: no se pudo cargar la malla %s: %s" % (ruta, e))
        return None


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


def spawn_mesh(mesh, carpeta, x, y, z, yaw, sx, sy, sz, label, material=None):
    """Crea un StaticMeshActor en 'carpeta', con escala, rotacion y color."""
    a = EAS.spawn_actor_from_object(mesh, unreal.Vector(x, y, z),
                                    unreal.Rotator(0.0, 0.0, yaw))
    a.set_actor_scale3d(unreal.Vector(sx, sy, sz))
    try:
        a.set_folder_path(carpeta)
    except Exception:
        pass
    try:
        a.set_actor_label(label)
    except Exception:
        pass
    if material is not None:
        asignar_material(a, material)
    return a


# ===========================================================================
#  PASO 0 (re-ejecutable) - BORRAR LO ANTERIOR
# ===========================================================================
def borrar_carpeta(carpeta):
    """Borra los actores que esten en 'carpeta' (ejecucion previa)."""
    n = 0
    try:
        previos = [a for a in todos_los_actores() if folder_de(a) == carpeta]
        for a in previos:
            try:
                EAS.destroy_actor(a)
                n += 1
            except Exception as e:
                print("   AVISO: no se pudo borrar un actor previo: %s" % e)
        print("   Borrados %d actores de '%s'." % (n, carpeta))
    except Exception as e:
        print("   ERROR borrando la carpeta '%s': %s" % (carpeta, e))
    return n


def borrar_anterior():
    """Borra lo creado por una ejecucion previa (Vestido + Calles)."""
    print("[0/5] Borrando lo anterior (re-ejecutable) ...")
    borrar_carpeta(CARPETA_VESTIDO)
    borrar_carpeta(CARPETA_CALLES)


# ===========================================================================
#  PASO 1 - MATERIALES
# ===========================================================================
def crear_material(nombre, rgb, rugosidad):
    """Crea (o reutiliza) un Material de color liso en /Game/PB_Mats/."""
    ruta = CARPETA_MATS.rstrip("/") + "/" + nombre
    try:
        if unreal.EditorAssetLibrary.does_asset_exist(ruta):
            mat = unreal.EditorAssetLibrary.load_asset(ruta)
            if mat is not None:
                print("   Reutilizado material existente: %s" % ruta)
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

        # Color base (VectorParameter -> editable luego en instancias)
        color_node = mel.create_material_expression(
            mat, unreal.MaterialExpressionVectorParameter, -350, 0)
        color_node.set_editor_property("parameter_name", "BaseColor")
        color_node.set_editor_property(
            "default_value", unreal.LinearColor(rgb[0], rgb[1], rgb[2], 1.0))
        mel.connect_material_property(
            color_node, "", unreal.MaterialProperty.MP_BASE_COLOR)

        # Rugosidad (escalar) -> aspecto mate
        try:
            rough_node = mel.create_material_expression(
                mat, unreal.MaterialExpressionScalarParameter, -350, 200)
            rough_node.set_editor_property("parameter_name", "Roughness")
            rough_node.set_editor_property("default_value", rugosidad)
            mel.connect_material_property(
                rough_node, "", unreal.MaterialProperty.MP_ROUGHNESS)
        except Exception as e:
            print("   AVISO: sin rugosidad en %s: %s" % (nombre, e))

        mel.recompile_material(mat)
        unreal.EditorAssetLibrary.save_asset(ruta)
        print("   Material creado: %s" % ruta)
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
#  PASO 2 - EDIFICIOS: pintar de blanco + tejado terracota
# ===========================================================================
def vestir_edificios(mat_pared, mat_teja):
    """Pinta cada edificio de blanco y le anade un tejado terracota encima."""
    print("[2/5] Pintando edificios y poniendo tejados ...")
    edificios = [a for a in todos_los_actores()
                 if label_de(a).startswith(TAG_EDIFICIO)]
    if not edificios:
        print("   AVISO: no se encontro ningun edificio '%s*'." % TAG_EDIFICIO)
        return 0

    cubo = cargar_malla(MESH_CUBO)

    procesados = 0
    for a in edificios:
        try:
            # 2a) pared blanco hueso
            asignar_material(a, mat_pared)

            # 2b) tejado: cubo fino terracota en el TOP del edificio
            if cubo is None or mat_teja is None:
                procesados += 1
                continue
            try:
                loc = a.get_actor_location()
                esc = a.get_actor_scale3d()    # (ancho, fondo, alto) en m
                rot = a.get_actor_rotation()   # misma rotacion (yaw)
                alto_m = esc.z
                top_z = alto_m * 100.0         # TOP en cm (base en Z=0)
                tejado_z = top_z + 30.0        # 30 cm por encima del top
                spawn_mesh(
                    cubo, CARPETA_VESTIDO,
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
    return procesados


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
#  PASO 4 - CALLES (aceras + asfalto + carriles)
# ===========================================================================
def spawn_tira(cubo, p1, p2, ancho_m, grosor_m, z_cm, mat, etiqueta):
    """Coloca una tira (losa fina) entre p1 y p2 (cm).

    p1, p2: (x, y) en cm. ancho_m, grosor_m: en metros. z_cm: altura del
    centro de la losa (cm). El cubo base mide 100 uu = 1 m, asi que la escala
    numerica equivale a METROS.
    """
    x1, y1 = p1
    x2, y2 = p2
    dx = x2 - x1
    dy = y2 - y1
    dist_cm = math.hypot(dx, dy)
    if dist_cm < 1.0:
        return None  # puntos casi coincidentes: no hay segmento
    cx = (x1 + x2) * 0.5
    cy = (y1 + y2) * 0.5
    yaw = math.degrees(math.atan2(dy, dx))
    largo_m = dist_cm / 100.0
    return spawn_mesh(
        cubo, CARPETA_CALLES,
        cx, cy, z_cm,
        yaw,
        largo_m, ancho_m, grosor_m,
        etiqueta, mat,
    )


def construir_calles(mat_asfalto, mat_acera, mat_carril):
    """Recorre CALLES y coloca acera + asfalto (+ carril azul si procede)."""
    print("[4/5] Construyendo calles (acera + asfalto + carriles) ...")
    if not CALLES:
        print("   AVISO: no hay calles embebidas.")
        return 0

    cubo = cargar_malla(MESH_CUBO)
    if cubo is None:
        print("   AVISO: sin cubo no se pueden construir calles.")
        return 0

    n_seg = 0
    idx = 0
    for calle in CALLES:
        try:
            pts = calle.get("pts", [])
            if len(pts) < 2:
                continue
            ancho = float(calle.get("width", 6.0))
            kind = calle.get("kind", "unknown")
            con_carril = kind in TIPOS_CON_CARRIL

            for i in range(len(pts) - 1):
                p1 = pts[i]
                p2 = pts[i + 1]
                try:
                    # 1) ACERA primero (mas ancha, mas baja)
                    spawn_tira(
                        cubo, p1, p2,
                        ancho + ACERA_EXTRA_M, GROSOR_TIRA_M, Z_ACERA_CM,
                        mat_acera, "PB_Acera_%05d" % idx)
                    # 2) ASFALTO encima
                    spawn_tira(
                        cubo, p1, p2,
                        ancho, GROSOR_TIRA_M, Z_ASFALTO_CM,
                        mat_asfalto, "PB_Asfalto_%05d" % idx)
                    # 3) CARRIL azul por el centro (solo vias principales)
                    if con_carril and mat_carril is not None:
                        spawn_tira(
                            cubo, p1, p2,
                            max(1.0, ancho * CARRIL_FRAC), GROSOR_TIRA_M,
                            Z_CARRIL_CM, mat_carril,
                            "PB_Carril_%05d" % idx)
                    n_seg += 1
                    idx += 1
                except Exception as e:
                    print("   AVISO: segmento fallido en calle %d: %s" % (idx, e))
        except Exception as e:
            print("   AVISO: calle fallida: %s" % e)

    print("   Segmentos de calle colocados: %d (de %d calles)."
          % (n_seg, len(CALLES)))
    return n_seg


# ===========================================================================
#  PASO 5 - ARBOLES / PALMERAS
# ===========================================================================
def plantar_palmera(cilindro, esfera, x, y, mat_tronco, mat_hoja, idx):
    """Palmera: tronco alto y fino (cilindro) + copa achatada (esfera)."""
    tronco_alto_m = 7.0
    tronco_diam_m = 0.35
    copa_diam_m = 4.0
    spawn_mesh(
        cilindro, CARPETA_VESTIDO,
        x, y, tronco_alto_m * 50.0,         # centro a media altura -> base en 0
        0.0,
        tronco_diam_m, tronco_diam_m, tronco_alto_m,
        "PB_PalmTronco_%04d" % idx, mat_tronco)
    spawn_mesh(
        esfera, CARPETA_VESTIDO,
        x, y, tronco_alto_m * 100.0,        # copa en lo alto del tronco
        0.0,
        copa_diam_m, copa_diam_m, copa_diam_m * 0.4,  # achatada en Z (penacho)
        "PB_PalmCopa_%04d" % idx, mat_hoja)


def plantar_arbol(cilindro, esfera, x, y, mat_tronco, mat_hoja, idx):
    """Arbol: tronco corto (cilindro) + copa esferica."""
    tronco_alto_m = 3.0
    tronco_diam_m = 0.4
    copa_diam_m = 3.0
    spawn_mesh(
        cilindro, CARPETA_VESTIDO,
        x, y, tronco_alto_m * 50.0,
        0.0,
        tronco_diam_m, tronco_diam_m, tronco_alto_m,
        "PB_ArbolTronco_%04d" % idx, mat_tronco)
    z_copa = tronco_alto_m * 100.0 + (copa_diam_m * 100.0) * 0.35
    spawn_mesh(
        esfera, CARPETA_VESTIDO,
        x, y, z_copa,
        0.0,
        copa_diam_m, copa_diam_m, copa_diam_m,
        "PB_ArbolCopa_%04d" % idx, mat_hoja)


def plantar_arboles(mat_tronco, mat_hoja):
    """Coloca arboles/palmeras en los puntos EMBEBIDOS. No inventa posiciones."""
    print("[5/5] Plantando arboles/palmeras ...")
    if not ARBOLES:
        print("   AVISO: no hay datos de arboles/palmeras puntuales en los "
              "datos (marbella.json no trae arboles individuales).")
        print("   No se inventan posiciones aleatorias. Se anadiran mas "
              "adelante comparando con la vista satelite de Google Maps.")
        return 0

    cilindro = cargar_malla(MESH_CILINDRO)
    esfera = cargar_malla(MESH_ESFERA)
    if cilindro is None or esfera is None:
        print("   AVISO: faltan mallas (cilindro/esfera); no se plantan.")
        return 0

    n = 0
    for t in ARBOLES:
        try:
            x = float(t.get("x"))
            y = float(t.get("y"))
            tipo = str(t.get("tipo", "tree")).lower()
            if tipo == "palm":
                plantar_palmera(cilindro, esfera, x, y, mat_tronco, mat_hoja, n)
            else:
                plantar_arbol(cilindro, esfera, x, y, mat_tronco, mat_hoja, n)
            n += 1
        except Exception as e:
            print("   AVISO: arbol/palmera fallido: %s" % e)

    print("   Arboles/palmeras plantados: %d" % n)
    return n


# ===========================================================================
#  ORQUESTACION
# ===========================================================================
def main():
    print("=" * 64)
    print("VISTIENDO Puerto Banus COMPLETO (edificios + suelo + calles + arboles)")
    print("=" * 64)

    if EAS is None:
        print("ERROR FATAL: sin EditorActorSubsystem no se puede continuar.")
        return

    # 0) limpiar lo anterior (re-ejecutable)
    try:
        borrar_anterior()
    except Exception as e:
        print("ERROR en el borrado previo: %s" % e)

    # 1) materiales
    try:
        mats = crear_materiales()
    except Exception as e:
        print("ERROR creando materiales: %s" % e)
        mats = {}
    mat_pared   = mats.get("M_Pared")
    mat_teja    = mats.get("M_Teja")
    mat_suelo   = mats.get("M_Suelo")
    mat_asfalto = mats.get("M_Asfalto")
    mat_acera   = mats.get("M_Acera")
    mat_carril  = mats.get("M_CarrilAzul")
    mat_hoja    = mats.get("M_Hoja")
    mat_tronco  = mats.get("M_Tronco")

    # 2) edificios + tejados
    try:
        n_edif = vestir_edificios(mat_pared, mat_teja)
    except Exception as e:
        print("ERROR vistiendo edificios: %s" % e)
        n_edif = 0

    # 3) suelo
    try:
        vestir_suelo(mat_suelo)
    except Exception as e:
        print("ERROR recoloreando el suelo: %s" % e)

    # 4) calles
    try:
        n_calles = construir_calles(mat_asfalto, mat_acera, mat_carril)
    except Exception as e:
        print("ERROR construyendo calles: %s" % e)
        n_calles = 0

    # 5) arboles
    try:
        n_arb = plantar_arboles(mat_tronco, mat_hoja)
    except Exception as e:
        print("ERROR plantando arboles: %s" % e)
        n_arb = 0

    # guardar el nivel (mejor esfuerzo)
    try:
        les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        les.save_current_level()
    except Exception:
        pass

    print("=" * 64)
    print("LISTO: Puerto Banus vestido (edificios %d, calles %d, arboles %d)"
          % (n_edif, n_calles, n_arb))
    print("=" * 64)


main()
`;

mkdirSync("ue5", { recursive: true });
writeFileSync(OUT, py);

// --- informe ---
const kb = (Buffer.byteLength(py, "utf8") / 1024).toFixed(1);
console.log("Generado:", OUT);
console.log("  calles embebidas:", roads.length);
console.log("  arboles embebidos:", trees.length);
console.log("  por tipo:", JSON.stringify(byKind));
console.log("  tamano .py:", kb, "KB");
