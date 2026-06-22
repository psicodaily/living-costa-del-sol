# -*- coding: utf-8 -*-
# ============================================================================
#  Puerto Banus  ->  DEMO "A TOPE CON TEXTURAS REALES" (atardecer + 1 edificio)
#  ----------------------------------------------------------------------------
#  QUE HACE ESTE SCRIPT (ejecutar DENTRO del editor de Unreal Engine 5.7,
#  con el plugin "Python Editor Script Plugin" activado):
#
#    Es la version "REAL" del demo. Identica en luz/encuadre a demo_real.py,
#    pero en vez de materiales PROCEDURALES (Noise) usa TEXTURAS REALES PBR
#    descargadas de Poly Haven (licencia CC0, uso comercial libre):
#       - Pared  = "White Plaster 02"     (estuco blanco-hueso mediterraneo)
#       - Tejado = "Clay Roof Tiles 02"   (teja terracota tipo espanola)
#    Cada material usa 3 mapas: Color (sRGB), Normal (DirectX) y Roughness.
#
#    1) LUZ DE CINE (afecta a TODA la escena):
#         - DirectionalLight en atardecer (sol bajo, calido, sombras suaves).
#         - PostProcessVolume global (exposicion + bloom + tinte calido).
#         - ExponentialHeightFog leve con tono de atardecer.
#         - SkyLight recapturado.
#
#    2) UN EDIFICIO A TOPE (el mas grande de entre los ~30 mas cercanos al
#       origen / centro de la darsena):
#         - Estuco REAL (texturas PBR) en el cubo del edificio.
#         - Tejado de teja REAL (texturas PBR) sobre su top.
#         - Rejilla de VENTANAS de CRISTAL reflectante en las 4 fachadas.
#       El tejado y las ventanas van a la carpeta "PuertoBanus/Demo".
#
#  FLUJO DE TEXTURAS:
#    a) Descarga (urllib) los 6 .jpg desde el repo GitHub a una carpeta temporal
#       local. Si ya estan en ue5/tex/ junto al script, se usan esas sin bajar.
#    b) Importa cada imagen a Unreal como Texture2D en /Game/PB_Tex/:
#         - Color     -> sRGB = True
#         - Normal    -> TC_Normalmap, sRGB = False   (DirectX, sin invertir)
#         - Roughness -> TC_Masks (lineal), sRGB = False
#    c) Crea M_ParedReal y M_TejaReal con nodos TextureSample (Color->BaseColor,
#       Normal->Normal, Roughness->Roughness) y un TexCoord con tiling realista.
#    d) M_CristalVentana: cristal reflectante (metallic alto, roughness baja).
#
#  ROBUSTO: cada bloque va en su propio try/except. Prints en espanol.
#  RE-EJECUTABLE: al empezar borra "PuertoBanus/Demo"; reutiliza texturas y
#  materiales si ya existen en el Content Browser.
#
#  CONTEXTO DE LA MAQUETA (lo crea ue5/import_puertobanus.py):
#    - Edificios: cubos /Engine/BasicShapes/Cube, etiqueta "PB_Edif_NNN",
#      carpeta "PuertoBanus/Blockout". Escala 3D = (ancho, fondo, alto) en
#      METROS. Base en Z=0, top en Z = alto*100 cm. Tienen rotacion (yaw).
#    - El origen (0,0) es el centro de la darsena (el agua).
# ============================================================================

import unreal
import math
import os
import tempfile

try:
    import urllib.request as _urlreq
except Exception:                       # por si acaso (no deberia pasar)
    _urlreq = None

# ------------------------------------------------------------------ AJUSTES ---
CARPETA_BLOCKOUT = "PuertoBanus/Blockout"   # donde estan los edificios grises
CARPETA_DEMO     = "PuertoBanus/Demo"       # tejado + ventanas de esta demo
CARPETA_MATS     = "/Game/Materials"        # Content Browser, sin barra final
CARPETA_TEX_UE   = "/Game/PB_Tex"           # destino de las texturas en Unreal

TAG_EDIFICIO = "PB_Edif_"   # prefijo de etiqueta de los edificios

# Mallas basicas del motor
MESH_CUBO = "/Engine/BasicShapes/Cube"

M = 100.0  # metros -> unidades Unreal (1 m = 100 cm)

# Cuantos edificios cercanos al origen consideramos para elegir el "grande"
N_CERCANOS = 30

# Nombres de los materiales de esta demo (version REAL con texturas)
NOMBRE_MAT_PARED   = "M_ParedReal"
NOMBRE_MAT_TEJA    = "M_TejaReal"
NOMBRE_MAT_CRISTAL = "M_CristalVentana"

# ------------------------------------------------------------- TEXTURAS -------
# URL cruda base del repositorio (carpeta ue5/tex/ en la rama master).
BASE_URL = ("https://raw.githubusercontent.com/psicodaily/"
            "living-costa-del-sol/master/ue5/tex/")

# Archivos de textura: (clave_logica, nombre_fichero, tipo)
#   tipo: "color" (sRGB), "normal" (DirectX), "rough" (lineal/masks)
TEXTURAS = [
    ("pared_color",  "pared_color.jpg",  "color"),
    ("pared_normal", "pared_normal.jpg", "normal"),
    ("pared_rough",  "pared_rough.jpg",  "rough"),
    ("tejado_color", "tejado_color.jpg", "color"),
    ("tejado_normal","tejado_normal.jpg","normal"),
    ("tejado_rough", "tejado_rough.jpg", "rough"),
]

# Carpeta local junto al script (ue5/tex/) por si las texturas ya estan ahi.
try:
    _DIR_SCRIPT = os.path.dirname(os.path.abspath(__file__))
except Exception:
    _DIR_SCRIPT = ""
CARPETA_TEX_LOCAL = os.path.join(_DIR_SCRIPT, "tex") if _DIR_SCRIPT else ""

# Carpeta temporal donde caen las descargas si hay que bajarlas.
CARPETA_TEX_TMP = os.path.join(tempfile.gettempdir(), "pb_tex")

# Tiling (cuantas veces se repite la textura por metro de fachada/tejado).
# El cubo base mide 1 m; con la escala en metros, 1 unidad de UV ~ todo el lado.
# Queremos que el estuco/teja tengan tamano realista. UE TextureCoordinate
# 'tiling' multiplica las UV: valores altos = textura mas pequena (mas repe).
TILING_PARED  = 6.0    # estuco: patron fino repetido
TILING_TEJADO = 10.0   # teja: hileras visibles


# ------------------------------------------------------------- SUBSISTEMAS ---
try:
    EAS = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
except Exception as e:
    EAS = None
    print("ERROR FATAL: no se pudo obtener EditorActorSubsystem: %s" % e)


# ===========================================================================
#  UTILIDADES GENERALES
# ===========================================================================
def label_de(actor):
    """Devuelve la etiqueta legible del actor (o cadena vacia)."""
    try:
        return str(actor.get_actor_label())
    except Exception:
        return ""


def folder_de(actor):
    """Devuelve la ruta de carpeta del actor como texto (o cadena vacia)."""
    try:
        return str(actor.get_folder_path())
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


def primer_actor_de_clase(clase):
    """Devuelve el primer actor del nivel que sea instancia de 'clase'."""
    for a in todos_los_actores():
        try:
            if isinstance(a, clase):
                return a
        except Exception:
            pass
    return None


# ===========================================================================
#  PASO 0 (re-ejecutable) - BORRAR LA CARPETA "Demo" ANTERIOR
# ===========================================================================
def borrar_demo_anterior():
    """Borra los actores de 'PuertoBanus/Demo' de una ejecucion previa."""
    print("[0/7] Borrando demo anterior (carpeta %s) ..." % CARPETA_DEMO)
    n = 0
    try:
        previos = [a for a in todos_los_actores()
                   if folder_de(a) == CARPETA_DEMO]
        for a in previos:
            try:
                EAS.destroy_actor(a)
                n += 1
            except Exception as e:
                print("   AVISO: no se pudo borrar un actor previo: %s" % e)
        print("   Borrados %d actores de una ejecucion anterior." % n)
    except Exception as e:
        print("   ERROR borrando demo anterior: %s" % e)
    return n


# ===========================================================================
#  PASO 1 - DESCARGAR + IMPORTAR TEXTURAS REALES
# ===========================================================================
def _ruta_local_textura(nombre_fichero):
    """Devuelve la ruta local de la imagen, prefiriendo ue5/tex/ si existe.
    Si no esta ahi, intenta descargarla a la carpeta temporal. Devuelve la
    ruta absoluta del fichero usable, o None si no se pudo conseguir.
    """
    # 1) Primero, junto al script en ue5/tex/ (la fuente fiable ya verificada).
    if CARPETA_TEX_LOCAL:
        candidata = os.path.join(CARPETA_TEX_LOCAL, nombre_fichero)
        try:
            if os.path.isfile(candidata) and os.path.getsize(candidata) > 30000:
                return candidata
        except Exception:
            pass

    # 2) Si no, en la carpeta temporal (descarga previa de esta ejecucion).
    destino = os.path.join(CARPETA_TEX_TMP, nombre_fichero)
    try:
        if os.path.isfile(destino) and os.path.getsize(destino) > 30000:
            return destino
    except Exception:
        pass

    # 3) Descargar desde GitHub a la carpeta temporal.
    if _urlreq is None:
        print("   AVISO: urllib no disponible; no se puede descargar %s."
              % nombre_fichero)
        return None
    try:
        os.makedirs(CARPETA_TEX_TMP, exist_ok=True)
    except Exception as e:
        print("   AVISO: no se pudo crear %s: %s" % (CARPETA_TEX_TMP, e))
    url = BASE_URL + nombre_fichero
    try:
        print("   Descargando %s ..." % url)
        _urlreq.urlretrieve(url, destino)
        if os.path.isfile(destino) and os.path.getsize(destino) > 30000:
            print("   Descargada %s (%d bytes)."
                  % (nombre_fichero, os.path.getsize(destino)))
            return destino
        print("   AVISO: %s descargada pero parece invalida (tamano pequeno)."
              % nombre_fichero)
        return None
    except Exception as e:
        print("   AVISO: fallo descargando %s: %s" % (nombre_fichero, e))
        return None


def _compresion_normal():
    """Devuelve el valor de compression_settings para normal map (DirectX)."""
    try:
        return unreal.TextureCompressionSettings.TC_NORMALMAP
    except Exception:
        return None


def _compresion_masks():
    """Devuelve el valor de compression_settings para roughness (lineal)."""
    try:
        return unreal.TextureCompressionSettings.TC_MASKS
    except Exception:
        return None


def _configurar_textura_importada(tex, tipo):
    """Ajusta sRGB / compresion de una Texture2D recien importada segun el
    tipo: 'color' (sRGB), 'normal' (DirectX normal), 'rough' (lineal/masks).
    """
    if tex is None:
        return
    try:
        if tipo == "color":
            tex.set_editor_property("srgb", True)
        elif tipo == "normal":
            tex.set_editor_property("srgb", False)
            comp = _compresion_normal()
            if comp is not None:
                tex.set_editor_property("compression_settings", comp)
            # DirectX: NO invertimos el canal verde (los mapas son _nor_dx).
            try:
                tex.set_editor_property("flip_green_channel", False)
            except Exception:
                pass
        elif tipo == "rough":
            tex.set_editor_property("srgb", False)
            comp = _compresion_masks()
            if comp is not None:
                tex.set_editor_property("compression_settings", comp)
    except Exception as e:
        print("   AVISO: no se pudo configurar la textura (%s): %s" % (tipo, e))
    # Guardar el asset tras reconfigurar.
    try:
        unreal.EditorAssetLibrary.save_asset(tex.get_path_name())
    except Exception:
        pass


def _importar_una_textura(nombre_fichero, tipo):
    """Importa (o reutiliza) una imagen como Texture2D en /Game/PB_Tex/.
    Devuelve el asset Texture2D, o None.
    """
    nombre_asset = os.path.splitext(nombre_fichero)[0]   # sin extension
    ruta_ue = CARPETA_TEX_UE.rstrip("/") + "/" + nombre_asset

    # Reutilizar si ya existe en el Content Browser.
    try:
        if unreal.EditorAssetLibrary.does_asset_exist(ruta_ue):
            tex = unreal.EditorAssetLibrary.load_asset(ruta_ue)
            if tex is not None:
                print("   Reutilizada textura existente: %s" % nombre_asset)
                return tex
    except Exception as e:
        print("   AVISO: comprobando existencia de %s: %s" % (ruta_ue, e))

    # Conseguir el fichero local (de ue5/tex/ o descargado).
    ruta_local = _ruta_local_textura(nombre_fichero)
    if not ruta_local:
        print("   AVISO: sin fichero local para %s; no se importa."
              % nombre_fichero)
        return None

    # Asegurar carpeta destino en Unreal.
    try:
        if not unreal.EditorAssetLibrary.does_directory_exist(CARPETA_TEX_UE):
            unreal.EditorAssetLibrary.make_directory(CARPETA_TEX_UE)
    except Exception:
        pass

    # Construir la tarea de importacion.
    try:
        task = unreal.AssetImportTask()
        task.set_editor_property("filename", ruta_local)
        task.set_editor_property("destination_path", CARPETA_TEX_UE)
        task.set_editor_property("destination_name", nombre_asset)
        task.set_editor_property("automated", True)
        task.set_editor_property("save", True)
        task.set_editor_property("replace_existing", True)
    except Exception as e:
        print("   ERROR creando AssetImportTask para %s: %s"
              % (nombre_fichero, e))
        return None

    # Ejecutar la importacion.
    try:
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        asset_tools.import_asset_tasks([task])
    except Exception as e:
        print("   ERROR importando %s: %s" % (nombre_fichero, e))
        return None

    # Cargar el asset resultante.
    tex = None
    try:
        rutas = list(task.get_editor_property("imported_object_paths"))
    except Exception:
        rutas = []
    if rutas:
        try:
            tex = unreal.EditorAssetLibrary.load_asset(rutas[0])
        except Exception:
            tex = None
    if tex is None:
        try:
            tex = unreal.EditorAssetLibrary.load_asset(ruta_ue)
        except Exception:
            tex = None

    if tex is None:
        print("   AVISO: importacion de %s no devolvio asset usable."
              % nombre_fichero)
        return None

    _configurar_textura_importada(tex, tipo)
    print("   Importada textura %s (tipo=%s)." % (nombre_asset, tipo))
    return tex


def descargar_e_importar_texturas():
    """Descarga (si hace falta) e importa las 6 texturas. Devuelve dict
    {clave_logica: Texture2D}.
    """
    print("[1/7] Descargando e importando texturas reales (Poly Haven, CC0) ...")
    texturas = {}
    for clave, fichero, tipo in TEXTURAS:
        try:
            tex = _importar_una_textura(fichero, tipo)
        except Exception as e:
            print("   ERROR con la textura %s: %s" % (fichero, e))
            tex = None
        texturas[clave] = tex
    n_ok = sum(1 for v in texturas.values() if v is not None)
    print("   Texturas listas: %d de %d." % (n_ok, len(TEXTURAS)))
    return texturas


# ===========================================================================
#  PASO 2 - LUZ DE ATARDECER (sol + skylight)   [reutilizado de demo_real.py]
# ===========================================================================
def luz_de_atardecer():
    """Sol bajo y calido + sombras suaves; recaptura el SkyLight."""
    print("[2/7] Configurando luz de atardecer (sol + cielo) ...")
    if EAS is None:
        print("   AVISO: sin EditorActorSubsystem; no se toca la luz.")
        return False

    ok = False

    # ---- DirectionalLight (el sol) ----
    try:
        sun = primer_actor_de_clase(unreal.DirectionalLight)
        if sun is None:
            sun = EAS.spawn_actor_from_class(
                unreal.DirectionalLight, unreal.Vector(0.0, 0.0, 1000.0))
            print("   No habia DirectionalLight: creado uno nuevo.")

        # Sol bajo (atardecer): pitch ~ -12 grados, yaw lateral calido.
        try:
            sun.set_actor_rotation(unreal.Rotator(0.0, -25.0, -55.0), False)
        except Exception as e:
            print("   AVISO: no se pudo rotar el sol: %s" % e)

        comp = None
        try:
            comp = sun.directional_light_component
        except Exception:
            comp = None
        if comp is None:
            try:
                comp = sun.get_component_by_class(
                    unreal.DirectionalLightComponent)
            except Exception:
                comp = None

        if comp is not None:
            try:
                comp.set_intensity(10.0)   # visible con auto-exposicion
            except Exception as e:
                print("   AVISO: no se pudo ajustar la intensidad: %s" % e)
            try:
                comp.set_light_color(unreal.LinearColor(1.0, 0.62, 0.32))
            except Exception as e:
                print("   AVISO: no se pudo ajustar el color: %s" % e)
            for prop, val in (
                ("source_angle", 1.5),
                ("use_temperature", True),
                ("temperature", 4200.0),
                ("cast_shadows", True),
                ("dynamic_shadow_distance_movable_light", 30000.0),
            ):
                try:
                    comp.set_editor_property(prop, val)
                except Exception as e:
                    print("   AVISO: prop sol '%s' no aplicada: %s" % (prop, e))
            ok = True
            print("   Sol de atardecer aplicado (bajo, calido, sombras suaves).")
        else:
            print("   AVISO: no se pudo acceder al DirectionalLightComponent.")
    except Exception as e:
        print("   ERROR configurando el sol: %s" % e)

    # ---- SkyLight (recaptura del cielo) ----
    try:
        sky = primer_actor_de_clase(unreal.SkyLight)
        if sky is None:
            sky = EAS.spawn_actor_from_class(
                unreal.SkyLight, unreal.Vector(0.0, 0.0, 1000.0))
            print("   No habia SkyLight: creado uno nuevo.")

        sky_comp = None
        try:
            sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
        except Exception:
            sky_comp = None

        if sky_comp is not None:
            try:
                sky_comp.set_editor_property("real_time_capture", True)
            except Exception as e:
                print("   AVISO: real_time_capture no aplicado: %s" % e)
            try:
                unreal.SkyLightComponent.recapture_sky(sky_comp)
                print("   SkyLight recapturado.")
            except Exception as e:
                print("   AVISO: no se pudo recapturar el SkyLight: %s" % e)
        else:
            print("   AVISO: no se pudo acceder al SkyLightComponent.")
    except Exception as e:
        print("   ERROR configurando el SkyLight: %s" % e)

    # Asegurar que no estamos en 'game view'.
    try:
        unreal.EditorLevelLibrary.editor_set_game_view(False)
    except Exception:
        pass

    return ok


# ===========================================================================
#  PASO 3 - POSTPROCESO GLOBAL + NIEBLA LEVE     [reutilizado de demo_real.py]
# ===========================================================================
def postproceso_y_niebla():
    """PostProcessVolume unbound (exposicion + bloom + tinte calido) y niebla."""
    print("[3/7] Ajustando postproceso global y niebla ...")
    if EAS is None:
        print("   AVISO: sin EditorActorSubsystem; no se toca el postproceso.")
        return False

    ok = False

    # ---- PostProcessVolume (global / unbound) ----
    try:
        ppv = primer_actor_de_clase(unreal.PostProcessVolume)
        if ppv is None:
            ppv = EAS.spawn_actor_from_class(
                unreal.PostProcessVolume, unreal.Vector(0.0, 0.0, 0.0))
            print("   No habia PostProcessVolume: creado uno nuevo.")

        try:
            ppv.set_editor_property("unbound", True)   # afecta a todo el nivel
        except Exception as e:
            print("   AVISO: 'unbound' no aplicado: %s" % e)
        try:
            ppv.set_editor_property("priority", 1.0)
        except Exception as e:
            print("   AVISO: 'priority' no aplicada: %s" % e)

        try:
            pps = ppv.settings  # unreal.PostProcessSettings
        except Exception as e:
            pps = None
            print("   AVISO: no se pudo leer ppv.settings: %s" % e)

        if pps is not None:
            ajustes = (
                ("override_auto_exposure_method", True),
                ("auto_exposure_method", unreal.AutoExposureMethod.AEM_HISTOGRAM),
                ("override_auto_exposure_bias", True),
                ("auto_exposure_bias", 1.0),
                ("override_bloom_intensity", True),
                ("bloom_intensity", 0.35),
                ("override_bloom_threshold", True),
                ("bloom_threshold", 1.2),
                ("override_color_gain", True),
                ("color_gain", unreal.Vector4(1.05, 1.0, 0.92, 1.0)),
                ("override_white_temp", True),
                ("white_temp", 5200.0),
            )
            for prop, val in ajustes:
                try:
                    pps.set_editor_property(prop, val)
                except Exception as e:
                    print("   AVISO: ajuste PP '%s' no aplicado: %s"
                          % (prop, e))
            try:
                ppv.set_editor_property("settings", pps)
                ok = True
                print("   PostProcess unbound aplicado (exposicion + bloom + "
                      "tinte calido).")
            except Exception as e:
                print("   AVISO: no se pudo reasignar 'settings': %s" % e)
    except Exception as e:
        print("   ERROR configurando el PostProcessVolume: %s" % e)

    # ---- ExponentialHeightFog leve ----
    try:
        fog = primer_actor_de_clase(unreal.ExponentialHeightFog)
        if fog is None:
            fog = EAS.spawn_actor_from_class(
                unreal.ExponentialHeightFog, unreal.Vector(0.0, 0.0, 0.0))
            print("   No habia ExponentialHeightFog: creado uno nuevo.")

        fc = None
        try:
            fc = fog.get_component_by_class(
                unreal.ExponentialHeightFogComponent)
        except Exception:
            fc = None

        if fc is not None:
            ajustes_fog = (
                ("fog_density", 0.012),       # leve
                ("fog_height_falloff", 0.2),
                ("fog_inscattering_luminance",
                 unreal.LinearColor(0.9, 0.55, 0.35)),
                ("volumetric_fog", True),
            )
            for prop, val in ajustes_fog:
                try:
                    fc.set_editor_property(prop, val)
                except Exception as e:
                    print("   AVISO: ajuste niebla '%s' no aplicado: %s"
                          % (prop, e))
            print("   Niebla leve de atardecer configurada.")
        else:
            print("   AVISO: no se pudo acceder al ExponentialHeightFogComponent.")
    except Exception as e:
        print("   ERROR configurando la niebla: %s" % e)

    return ok


# ===========================================================================
#  PASO 4 - ELEGIR EL EDIFICIO "ESTRELLA"       [reutilizado de demo_real.py]
# ===========================================================================
def elegir_edificio():
    """De los ~N_CERCANOS edificios mas cercanos al origen, elige el de mayor
    superficie en planta (ancho * fondo). Devuelve el actor o None.
    """
    print("[4/7] Eligiendo el edificio estrella ...")
    edificios = [a for a in todos_los_actores()
                 if label_de(a).startswith(TAG_EDIFICIO)]
    if not edificios:
        print("   AVISO: no se encontro ningun edificio '%s*'." % TAG_EDIFICIO)
        return None

    def dist_origen(a):
        try:
            loc = a.get_actor_location()
            return math.hypot(loc.x, loc.y)
        except Exception:
            return float("inf")

    def superficie(a):
        try:
            esc = a.get_actor_scale3d()
            return abs(esc.x) * abs(esc.y)
        except Exception:
            return 0.0

    try:
        cercanos = sorted(edificios, key=dist_origen)[:N_CERCANOS]
    except Exception as e:
        print("   AVISO: no se pudo ordenar por cercania (%s); uso todos." % e)
        cercanos = edificios

    if not cercanos:
        print("   AVISO: lista de cercanos vacia.")
        return None

    estrella = max(cercanos, key=superficie)
    try:
        esc = estrella.get_actor_scale3d()
        loc = estrella.get_actor_location()
        print("   Edificio elegido: '%s'  superficie=%.0f m2  "
              "(ancho=%.1f, fondo=%.1f, alto=%.1f m)  en (%.0f, %.0f) cm"
              % (label_de(estrella), abs(esc.x) * abs(esc.y),
                 esc.x, esc.y, esc.z, loc.x, loc.y))
    except Exception:
        print("   Edificio elegido: '%s'" % label_de(estrella))
    return estrella


# ===========================================================================
#  PASO 5 - MATERIALES CON TEXTURAS REALES (pared, teja) + cristal
# ===========================================================================
def _crear_o_cargar_material(nombre):
    """Devuelve (material, ya_existia). Crea el asset vacio si no existe."""
    ruta = CARPETA_MATS.rstrip("/") + "/" + nombre
    try:
        if unreal.EditorAssetLibrary.does_asset_exist(ruta):
            mat = unreal.EditorAssetLibrary.load_asset(ruta)
            if mat is not None:
                return mat, True
    except Exception as e:
        print("   AVISO: comprobando existencia de %s: %s" % (ruta, e))

    try:
        if not unreal.EditorAssetLibrary.does_directory_exist(CARPETA_MATS):
            try:
                unreal.EditorAssetLibrary.make_directory(CARPETA_MATS)
            except Exception:
                pass
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        mat = asset_tools.create_asset(
            asset_name=nombre,
            package_path=CARPETA_MATS,
            asset_class=unreal.Material,
            factory=unreal.MaterialFactoryNew(),
        )
        return mat, False
    except Exception as e:
        print("   ERROR creando material %s: %s" % (nombre, e))
        return None, False


def _material_texturizado(nombre, tex_color, tex_normal, tex_rough, tiling):
    """Crea (o reutiliza) un material PBR con 3 TextureSample conectados a
    BaseColor, Normal y Roughness, y un TexCoord con el tiling indicado.
    Devuelve el material o None.
    """
    mat, ya = _crear_o_cargar_material(nombre)
    if mat is None:
        return None
    if ya:
        print("     Reutilizado material existente: %s" % nombre)
        return mat

    if tex_color is None and tex_normal is None and tex_rough is None:
        print("     AVISO: sin texturas para %s; material quedara plano."
              % nombre)

    try:
        mel = unreal.MaterialEditingLibrary

        # TexCoord compartido con tiling realista.
        texcoord = mel.create_material_expression(
            mat, unreal.MaterialExpressionTextureCoordinate, -1100, 0)
        try:
            texcoord.set_editor_property("u_tiling", tiling)
            texcoord.set_editor_property("v_tiling", tiling)
        except Exception as e:
            print("     AVISO: tiling no aplicado en %s: %s" % (nombre, e))

        def _add_sample(tex, y, sampler_type=None):
            if tex is None:
                return None
            node = mel.create_material_expression(
                mat, unreal.MaterialExpressionTextureSample, -750, y)
            try:
                node.set_editor_property("texture", tex)
            except Exception as e:
                print("     AVISO: no se pudo asignar textura en %s: %s"
                      % (nombre, e))
            if sampler_type is not None:
                try:
                    node.set_editor_property("sampler_type", sampler_type)
                except Exception:
                    pass
            try:
                mel.connect_material_expressions(texcoord, "", node, "UVs")
            except Exception as e:
                print("     AVISO: UVs no conectadas en %s: %s" % (nombre, e))
            return node

        # --- COLOR -> BaseColor ---
        try:
            st_color = unreal.MaterialSamplerType.SAMPLERTYPE_COLOR
        except Exception:
            st_color = None
        s_color = _add_sample(tex_color, -250, st_color)
        if s_color is not None:
            mel.connect_material_property(
                s_color, "", unreal.MaterialProperty.MP_BASE_COLOR)

        # --- NORMAL -> Normal ---
        try:
            st_normal = unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL
        except Exception:
            st_normal = None
        s_normal = _add_sample(tex_normal, 100, st_normal)
        if s_normal is not None:
            mel.connect_material_property(
                s_normal, "", unreal.MaterialProperty.MP_NORMAL)

        # --- ROUGHNESS -> Roughness ---
        try:
            st_lin = unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_GRAYSCALE
        except Exception:
            st_lin = None
        s_rough = _add_sample(tex_rough, 450, st_lin)
        if s_rough is not None:
            mel.connect_material_property(
                s_rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

        mel.recompile_material(mat)
        unreal.EditorAssetLibrary.save_asset(mat.get_path_name())
        print("     Material %s creado (color+normal+rough, tiling=%.1f)."
              % (nombre, tiling))
        return mat
    except Exception as e:
        print("     ERROR construyendo el grafo de %s: %s" % (nombre, e))
        try:
            unreal.EditorAssetLibrary.save_asset(mat.get_path_name())
        except Exception:
            pass
        return mat


def crear_material_cristal():
    """Cristal de ventana: opaco, muy reflectante (refleja el cielo)."""
    print("   - Material de cristal de ventana ...")
    mat, ya = _crear_o_cargar_material(NOMBRE_MAT_CRISTAL)
    if mat is None:
        return None
    if ya:
        print("     Reutilizado material existente: %s" % NOMBRE_MAT_CRISTAL)
        return mat

    try:
        mel = unreal.MaterialEditingLibrary

        try:
            mat.set_editor_property("blend_mode", unreal.BlendMode.BLEND_OPAQUE)
            mat.set_editor_property(
                "shading_model", unreal.MaterialShadingModel.MSM_DEFAULT_LIT)
        except Exception as e:
            print("     AVISO: blend/shading no aplicados: %s" % e)

        base = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant3Vector, -600, -100)
        base.set_editor_property(
            "constant", unreal.LinearColor(0.02, 0.03, 0.05, 1.0))
        mel.connect_material_property(
            base, "", unreal.MaterialProperty.MP_BASE_COLOR)

        metallic = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -600, 60)
        metallic.set_editor_property("r", 0.85)
        mel.connect_material_property(
            metallic, "", unreal.MaterialProperty.MP_METALLIC)

        rough = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -600, 180)
        rough.set_editor_property("r", 0.05)
        mel.connect_material_property(
            rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

        spec = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -600, 300)
        spec.set_editor_property("r", 1.0)
        mel.connect_material_property(
            spec, "", unreal.MaterialProperty.MP_SPECULAR)

        mel.recompile_material(mat)
        unreal.EditorAssetLibrary.save_asset(mat.get_path_name())
        print("     Material %s creado (oscuro, reflectante)."
              % NOMBRE_MAT_CRISTAL)
        return mat
    except Exception as e:
        print("     ERROR construyendo el grafo del cristal: %s" % e)
        try:
            unreal.EditorAssetLibrary.save_asset(mat.get_path_name())
        except Exception:
            pass
        return mat


def crear_materiales_demo(texturas):
    """Crea/reutiliza los 3 materiales (pared real, teja real, cristal).
    Devuelve dict {clave: asset}.
    """
    print("[5/7] Creando materiales con texturas reales en %s ..."
          % CARPETA_MATS)
    mats = {}

    # Pared (estuco real).
    try:
        print("   - Material de pared (estuco real) ...")
        mats["pared"] = _material_texturizado(
            NOMBRE_MAT_PARED,
            texturas.get("pared_color"),
            texturas.get("pared_normal"),
            texturas.get("pared_rough"),
            TILING_PARED)
    except Exception as e:
        print("   ERROR con la pared: %s" % e)
        mats["pared"] = None

    # Teja (real).
    try:
        print("   - Material de tejado (teja real) ...")
        mats["teja"] = _material_texturizado(
            NOMBRE_MAT_TEJA,
            texturas.get("tejado_color"),
            texturas.get("tejado_normal"),
            texturas.get("tejado_rough"),
            TILING_TEJADO)
    except Exception as e:
        print("   ERROR con la teja: %s" % e)
        mats["teja"] = None

    # Cristal (procedural reflectante, igual que demo_real.py).
    try:
        mats["cristal"] = crear_material_cristal()
    except Exception as e:
        print("   ERROR con el cristal: %s" % e)
        mats["cristal"] = None

    return mats


# ===========================================================================
#  PASO 6 - VESTIR EL EDIFICIO ESTRELLA (estuco + tejado + ventanas)
# ===========================================================================
def asignar_material_actor(actor, material):
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


def poner_estuco(edificio, mat_pared):
    """Pinta el edificio con el estuco real."""
    print("   - Aplicando estuco real al edificio ...")
    if asignar_material_actor(edificio, mat_pared):
        print("     Estuco real aplicado.")
        return True
    print("     AVISO: no se pudo aplicar el estuco.")
    return False


def poner_tejado(edificio, mat_teja):
    """Anade un tejado de teja real en el TOP del edificio."""
    print("   - Anadiendo tejado de teja real ...")
    try:
        cubo = unreal.EditorAssetLibrary.load_asset(MESH_CUBO)
    except Exception as e:
        print("     AVISO: no se pudo cargar el cubo del tejado: %s" % e)
        return False
    if cubo is None:
        print("     AVISO: cubo no disponible; sin tejado.")
        return False

    try:
        loc = edificio.get_actor_location()
        esc = edificio.get_actor_scale3d()     # (ancho, fondo, alto) en m
        rot = edificio.get_actor_rotation()    # misma rotacion (yaw)
        alto_m = esc.z
        top_z = alto_m * M                     # TOP en cm (base en Z=0)
        tejado_alto_m = 0.7
        tejado_z = top_z + (tejado_alto_m * M) / 2.0

        tej = EAS.spawn_actor_from_object(
            cubo, unreal.Vector(loc.x, loc.y, tejado_z),
            unreal.Rotator(0.0, 0.0, rot.yaw))
        tej.set_actor_scale3d(
            unreal.Vector(esc.x * 1.06, esc.y * 1.06, tejado_alto_m))
        tej.set_folder_path(CARPETA_DEMO)
        try:
            tej.set_actor_label("Demo_Tejado")
        except Exception:
            pass
        if mat_teja is not None:
            asignar_material_actor(tej, mat_teja)
        print("     Tejado real anadido sobre el top (Z=%.0f cm)." % top_z)
        return True
    except Exception as e:
        print("     AVISO: tejado fallido: %s" % e)
        return False


def poner_ventanas(edificio, mat_cristal):
    """Rejilla de ventanas de cristal sobre las 4 fachadas del edificio-cubo."""
    print("   - Anadiendo rejilla de ventanas de cristal ...")
    try:
        cube_mesh = unreal.EditorAssetLibrary.load_asset(
            MESH_CUBO + ".Cube")
        if cube_mesh is None:
            cube_mesh = unreal.EditorAssetLibrary.load_asset(MESH_CUBO)
    except Exception as e:
        print("     AVISO: no se pudo cargar el cubo de ventanas: %s" % e)
        return 0
    if cube_mesh is None:
        print("     AVISO: cubo no disponible; sin ventanas.")
        return 0

    try:
        loc = edificio.get_actor_location()
        esc = edificio.get_actor_scale3d()     # metros
        rot = edificio.get_actor_rotation()
        building_loc = unreal.Vector(loc.x, loc.y, 0.0)  # Z base = 0
        ancho_m, fondo_m, alto_m = abs(esc.x), abs(esc.y), abs(esc.z)
        yaw_deg = rot.yaw
    except Exception as e:
        print("     AVISO: no se pudieron leer transform del edificio: %s" % e)
        return 0

    ancho = ancho_m * M
    fondo = fondo_m * M
    alto = alto_m * M

    # Parametros de ventana (en cm).
    win_w, win_h = 1.6 * M, 1.4 * M     # tamano de cada ventana
    margen = 1.2 * M                    # separacion entre ventanas
    espesor = 0.08 * M                  # grosor del cristal
    salida = 0.05 * M                   # cuanto sobresale de la fachada

    yaw = math.radians(yaw_deg)
    cos_y, sin_y = math.cos(yaw), math.sin(yaw)

    def rot_xy(x, y):
        return (x * cos_y - y * sin_y, x * sin_y + y * cos_y)

    def n_cols_para(largo):
        return max(1, int((largo - margen) // (win_w + margen)))

    n_alto = max(1, int((alto - margen) // (win_h + margen)))

    # 4 fachadas: (nombre, normal local (nx,ny), eje horizontal local (hx,hy),
    #              largo horizontal de la fachada, profundidad hacia la normal)
    fachadas = [
        ("pX", (1, 0), (0, 1), fondo, ancho),
        ("nX", (-1, 0), (0, 1), fondo, ancho),
        ("pY", (0, 1), (1, 0), ancho, fondo),
        ("nY", (0, -1), (1, 0), ancho, fondo),
    ]

    spawned = 0
    for nombre, (nx, ny), (hx, hy), largo_h, prof in fachadas:
        try:
            n_cols = n_cols_para(largo_h)
            half_normal = prof / 2.0 + salida
            paso_h = (win_w + margen)
            paso_v = (win_h + margen)
            total_h = n_cols * paso_h - margen
            total_v = n_alto * paso_v - margen
            start_h = -total_h / 2.0 + win_w / 2.0
            start_v = (alto - total_v) / 2.0 + win_h / 2.0

            face_yaw = math.degrees(math.atan2(ny, nx)) + yaw_deg

            for c in range(n_cols):
                for f in range(n_alto):
                    try:
                        off_h = start_h + c * paso_h
                        lx = nx * half_normal + hx * off_h
                        ly = ny * half_normal + hy * off_h
                        wx, wy = rot_xy(lx, ly)
                        z = start_v + f * paso_v
                        pos = unreal.Vector(building_loc.x + wx,
                                            building_loc.y + wy, z)
                        rotv = unreal.Rotator(0.0, 0.0, face_yaw)

                        win = EAS.spawn_actor_from_object(cube_mesh, pos, rotv)
                        win.set_actor_scale3d(unreal.Vector(
                            espesor / M, win_w / M, win_h / M))
                        win.set_folder_path(CARPETA_DEMO)
                        try:
                            win.set_actor_label(
                                "Demo_Win_%s_%d_%d" % (nombre, c, f))
                        except Exception:
                            pass
                        if mat_cristal is not None:
                            sm = None
                            try:
                                sm = win.static_mesh_component
                            except Exception:
                                sm = win.get_component_by_class(
                                    unreal.StaticMeshComponent)
                            if sm is not None:
                                try:
                                    sm.set_material(0, mat_cristal)
                                except Exception:
                                    pass
                        spawned += 1
                    except Exception as e:
                        print("     AVISO: ventana fallida en %s: %s"
                              % (nombre, e))
        except Exception as e:
            print("     AVISO: fachada %s fallida: %s" % (nombre, e))

    print("     Ventanas spawneadas: %d" % spawned)
    return spawned


def vestir_edificio_estrella(edificio, mats):
    """Aplica estuco real + tejado real + ventanas al edificio elegido."""
    print("[6/7] Vistiendo el edificio estrella a tope (texturas reales) ...")
    if edificio is None:
        print("   AVISO: sin edificio estrella; se omite el vestido.")
        return 0
    poner_estuco(edificio, mats.get("pared"))
    poner_tejado(edificio, mats.get("teja"))
    n_win = poner_ventanas(edificio, mats.get("cristal"))
    return n_win


# ===========================================================================
#  PASO 7 - ENCUADRAR LA CAMARA E IMPRIMIR COORDENADAS
# ===========================================================================
def encuadrar_camara(edificio):
    """Intenta encuadrar la camara del editor sobre el edificio."""
    print("[7/7] Encuadrando la camara del editor en el edificio ...")
    if edificio is None:
        print("   AVISO: sin edificio; no se encuadra.")
        return

    try:
        loc = edificio.get_actor_location()
        esc = edificio.get_actor_scale3d()
        print("   Coordenadas del edificio (cm): X=%.0f  Y=%.0f  Z(base)=0  "
              "(top Z=%.0f)" % (loc.x, loc.y, esc.z * M))
        print("   Pulsa F en el viewport con el edificio seleccionado para ir.")
    except Exception as e:
        print("   AVISO: no se pudieron leer las coordenadas: %s" % e)

    try:
        EAS.set_selected_level_actors([edificio])
        print("   Edificio seleccionado en el nivel.")
    except Exception as e:
        print("   AVISO: no se pudo seleccionar el edificio: %s" % e)

    try:
        loc = edificio.get_actor_location()
        esc = edificio.get_actor_scale3d()
        diag = math.hypot(abs(esc.x) * M, abs(esc.y) * M)
        dist = max(2000.0, diag * 1.5 + abs(esc.z) * M)
        cam_loc = unreal.Vector(loc.x - dist, loc.y - dist,
                                abs(esc.z) * M * 0.8 + dist * 0.5)
        dx = loc.x - cam_loc.x
        dy = loc.y - cam_loc.y
        dz = (abs(esc.z) * M * 0.5) - cam_loc.z
        yaw = math.degrees(math.atan2(dy, dx))
        pitch = math.degrees(math.atan2(dz, math.hypot(dx, dy)))
        cam_rot = unreal.Rotator(0.0, pitch, yaw)
        try:
            unreal.EditorLevelLibrary.set_level_viewport_camera_info(
                cam_loc, cam_rot)
            print("   Camara del viewport reposicionada hacia el edificio.")
        except Exception as e:
            try:
                ues = unreal.get_editor_subsystem(
                    unreal.UnrealEditorSubsystem)
                ues.set_level_viewport_camera_info(cam_loc, cam_rot)
                print("   Camara del viewport reposicionada (UnrealEditorSubsystem).")
            except Exception as e2:
                print("   AVISO: no se pudo reposicionar la camara por API "
                      "(%s / %s). Usa F en el viewport." % (e, e2))
    except Exception as e:
        print("   AVISO: encuadre por API no disponible: %s" % e)


# ===========================================================================
#  ORQUESTACION
# ===========================================================================
def main():
    print("=" * 64)
    print("DEMO REALISTA CON TEXTURAS de Puerto Banus (atardecer + edificio) ...")
    print("=" * 64)

    if EAS is None:
        print("ERROR FATAL: sin EditorActorSubsystem no se puede continuar.")
        return

    # 0) limpiar lo anterior (re-ejecutable)
    try:
        borrar_demo_anterior()
    except Exception as e:
        print("ERROR en el borrado previo: %s" % e)

    # 1) descargar + importar texturas reales
    texturas = {}
    try:
        texturas = descargar_e_importar_texturas()
    except Exception as e:
        print("ERROR con las texturas: %s" % e)

    # 2) luz de atardecer (toda la escena)
    try:
        luz_de_atardecer()
    except Exception as e:
        print("ERROR en la luz de atardecer: %s" % e)

    # 3) postproceso + niebla (toda la escena)
    try:
        postproceso_y_niebla()
    except Exception as e:
        print("ERROR en postproceso/niebla: %s" % e)

    # 4) elegir el edificio estrella
    estrella = None
    try:
        estrella = elegir_edificio()
    except Exception as e:
        print("ERROR eligiendo el edificio: %s" % e)

    # 5) materiales con texturas reales
    mats = {}
    try:
        mats = crear_materiales_demo(texturas)
    except Exception as e:
        print("ERROR creando materiales: %s" % e)

    # 6) vestir el edificio estrella
    n_win = 0
    try:
        n_win = vestir_edificio_estrella(estrella, mats)
    except Exception as e:
        print("ERROR vistiendo el edificio: %s" % e)

    # 7) encuadrar camara e imprimir coordenadas
    try:
        encuadrar_camara(estrella)
    except Exception as e:
        print("ERROR encuadrando la camara: %s" % e)

    # guardar el nivel (mejor esfuerzo)
    try:
        les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        les.save_current_level()
    except Exception:
        pass

    nombre_edif = label_de(estrella) if estrella is not None else "(ninguno)"
    print("=" * 64)
    print("LISTO: demo realista CON TEXTURAS (edificio %s). Ventanas: %d"
          % (nombre_edif, n_win))
    print("=" * 64)


main()
