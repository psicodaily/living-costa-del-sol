# -*- coding: utf-8 -*-
# ============================================================================
#  Puerto Banus  ->  DEMO "REALISTA" (atardecer de cine + 1 edificio a tope)
#  ----------------------------------------------------------------------------
#  QUE HACE ESTE SCRIPT (ejecutar DENTRO del editor de Unreal Engine 5.7,
#  con el plugin "Python Editor Script Plugin" activado):
#
#    Transforma la SENSACION de la escena hacia algo realista, en dos planos:
#
#    1) LUZ DE CINE (afecta a TODA la escena):
#         - DirectionalLight en atardecer (sol bajo, color calido, sombras
#           suaves via 'source_angle').
#         - PostProcessVolume global (unbound): exposicion, bloom suave y
#           leve tinte calido.
#         - ExponentialHeightFog leve con tono de atardecer.
#         - SkyLight recapturado para que el cielo cuadre con el nuevo sol.
#
#    2) UN EDIFICIO A TOPE (el mas grande de entre los ~30 mas cercanos al
#       origen / centro de la darsena, para que sea visible y prominente):
#         - Material de ESTUCO con RELIEVE (Noise -> Normal + Roughness).
#         - TEJADO de teja con algo de relieve.
#         - REJILLA de VENTANAS de CRISTAL repartidas por sus 4 fachadas.
#       Las ventanas y el tejado van a la carpeta "PuertoBanus/Demo".
#
#  ROBUSTO: cada bloque va en su propio try/except; si una parte falla
#  (p. ej. el postproceso), el resto sigue. Prints en espanol.
#
#  RE-EJECUTABLE: al empezar borra la carpeta de actores "PuertoBanus/Demo"
#  para no duplicar tejados ni ventanas. Los materiales se reutilizan si ya
#  existen.
#
#  CONTEXTO DE LA MAQUETA (lo crea ue5/import_puertobanus.py):
#    - Edificios: cubos /Engine/BasicShapes/Cube, etiqueta "PB_Edif_NNN"
#      (000..108), carpeta "PuertoBanus/Blockout". Escala 3D =
#      (ancho, fondo, alto) en METROS (el cubo base mide 1 m => escala =
#      metros). Base apoyada en Z=0, centro en Z = alto*50 cm, TOP en
#      Z = alto*100 cm. Tienen rotacion (yaw).
#    - El origen (0,0) es el centro de la darsena (el agua).
# ============================================================================

import unreal
import math

# ------------------------------------------------------------------ AJUSTES ---
CARPETA_BLOCKOUT = "PuertoBanus/Blockout"   # donde estan los edificios grises
CARPETA_DEMO     = "PuertoBanus/Demo"       # tejado + ventanas de esta demo
CARPETA_MATS     = "/Game/Materials"        # Content Browser, sin barra final

TAG_EDIFICIO = "PB_Edif_"   # prefijo de etiqueta de los edificios

# Mallas basicas del motor
MESH_CUBO = "/Engine/BasicShapes/Cube"

M = 100.0  # metros -> unidades Unreal (1 m = 100 cm)

# Cuantos edificios cercanos al origen consideramos para elegir el "grande"
N_CERCANOS = 30

# Nombres de los materiales de esta demo
NOMBRE_MAT_ESTUCO  = "M_EstucoRelieve"
NOMBRE_MAT_CRISTAL = "M_CristalVentana"
NOMBRE_MAT_TEJA    = "M_TejaRelieve"


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
    print("[0/6] Borrando demo anterior (carpeta %s) ..." % CARPETA_DEMO)
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
#  PASO 1 - LUZ DE ATARDECER (sol + skylight)
# ===========================================================================
def luz_de_atardecer():
    """Sol bajo y calido + sombras suaves; recaptura el SkyLight."""
    print("[1/6] Configurando luz de atardecer (sol + cielo) ...")
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
        # Rotator(roll, pitch, yaw).
        try:
            sun.set_actor_rotation(unreal.Rotator(0.0, -12.0, -55.0), False)
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
                comp.set_intensity(8.0)   # ~6-10 lux: atardecer
            except Exception as e:
                print("   AVISO: no se pudo ajustar la intensidad: %s" % e)
            try:
                comp.set_light_color(unreal.LinearColor(1.0, 0.62, 0.32))
            except Exception as e:
                print("   AVISO: no se pudo ajustar el color: %s" % e)
            # Sombras suaves: tamano angular del disco solar (grados).
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

    # Asegurar que no estamos en 'game view' (para ver gizmos/iluminacion edit).
    try:
        unreal.EditorLevelLibrary.editor_set_game_view(False)
    except Exception:
        pass

    return ok


# ===========================================================================
#  PASO 2 - POSTPROCESO GLOBAL + NIEBLA LEVE
# ===========================================================================
def postproceso_y_niebla():
    """PostProcessVolume unbound (exposicion + bloom + tinte calido) y niebla."""
    print("[2/6] Ajustando postproceso global y niebla ...")
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

        # Modificar la struct, poner override_* en True, y reasignar settings.
        try:
            pps = ppv.settings  # unreal.PostProcessSettings
        except Exception as e:
            pps = None
            print("   AVISO: no se pudo leer ppv.settings: %s" % e)

        if pps is not None:
            ajustes = (
                # Exposicion manual (estable) un pelin oscurecida
                ("override_auto_exposure_method", True),
                ("auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL),
                ("override_auto_exposure_bias", True),
                ("auto_exposure_bias", -0.3),
                # Bloom suave
                ("override_bloom_intensity", True),
                ("bloom_intensity", 0.35),
                ("override_bloom_threshold", True),
                ("bloom_threshold", 1.2),
                # Tinte calido global
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
#  PASO 3 - ELEGIR EL EDIFICIO "ESTRELLA"
# ===========================================================================
def elegir_edificio():
    """De los ~N_CERCANOS edificios mas cercanos al origen, elige el de mayor
    superficie en planta (ancho * fondo). Devuelve el actor o None.
    """
    print("[3/6] Eligiendo el edificio estrella ...")
    edificios = [a for a in todos_los_actores()
                 if label_de(a).startswith(TAG_EDIFICIO)]
    if not edificios:
        print("   AVISO: no se encontro ningun edificio '%s*'." % TAG_EDIFICIO)
        return None

    # Distancia al origen (centro de la darsena) en planta.
    def dist_origen(a):
        try:
            loc = a.get_actor_location()
            return math.hypot(loc.x, loc.y)
        except Exception:
            return float("inf")

    # Superficie en planta (ancho * fondo), en metros^2 (escala = metros).
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
#  PASO 4 - MATERIALES (estuco con relieve, teja con relieve, cristal)
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


def crear_material_estuco():
    """Estuco crema con relieve (Noise->Normal aprox.) y roughness variable."""
    print("   - Material de estuco con relieve ...")
    mat, ya = _crear_o_cargar_material(NOMBRE_MAT_ESTUCO)
    if mat is None:
        return None
    if ya:
        print("     Reutilizado material existente: %s" % NOMBRE_MAT_ESTUCO)
        return mat

    try:
        mel = unreal.MaterialEditingLibrary

        # --- BASE COLOR: estuco crema ---
        base = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant3Vector, -600, -200)
        base.set_editor_property(
            "constant", unreal.LinearColor(0.82, 0.78, 0.70, 1.0))
        mel.connect_material_property(
            base, "", unreal.MaterialProperty.MP_BASE_COLOR)

        # --- RELIEVE / NORMAL: Noise -> escala -> componer normal aprox. ---
        texcoord = mel.create_material_expression(
            mat, unreal.MaterialExpressionTextureCoordinate, -1400, 200)

        noise_n = mel.create_material_expression(
            mat, unreal.MaterialExpressionNoise, -1100, 200)
        for prop, val in (
            ("scale", 8.0), ("quality", 3), ("levels", 4),
            ("output_min", -1.0), ("output_max", 1.0), ("turbulence", True),
        ):
            try:
                noise_n.set_editor_property(prop, val)
            except Exception as e:
                print("     AVISO: noise_n '%s' no aplicado: %s" % (prop, e))
        mel.connect_material_expressions(texcoord, "", noise_n, "Position")

        bump_strength = mel.create_material_expression(
            mat, unreal.MaterialExpressionScalarParameter, -850, 320)
        bump_strength.set_editor_property("parameter_name", "BumpStrength")
        bump_strength.set_editor_property("default_value", 0.06)
        mul_n = mel.create_material_expression(
            mat, unreal.MaterialExpressionMultiply, -650, 250)
        mel.connect_material_expressions(noise_n, "", mul_n, "A")
        mel.connect_material_expressions(bump_strength, "", mul_n, "B")

        # Componer (XY = ruido, Z = 1) y normalizar -> normal tangente aprox.
        append_xy = mel.create_material_expression(
            mat, unreal.MaterialExpressionAppendVector, -450, 250)
        mel.connect_material_expressions(mul_n, "", append_xy, "A")
        mel.connect_material_expressions(mul_n, "", append_xy, "B")
        z_one = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -450, 380)
        z_one.set_editor_property("r", 1.0)
        append_xyz = mel.create_material_expression(
            mat, unreal.MaterialExpressionAppendVector, -300, 300)
        mel.connect_material_expressions(append_xy, "", append_xyz, "A")
        mel.connect_material_expressions(z_one, "", append_xyz, "B")
        normalize = mel.create_material_expression(
            mat, unreal.MaterialExpressionNormalize, -150, 300)
        mel.connect_material_expressions(append_xyz, "", normalize, "")
        mel.connect_material_property(
            normalize, "", unreal.MaterialProperty.MP_NORMAL)

        # --- ROUGHNESS con variacion (segundo Noise + Lerp) ---
        noise_r = mel.create_material_expression(
            mat, unreal.MaterialExpressionNoise, -1100, 600)
        for prop, val in (
            ("scale", 3.0), ("levels", 3),
            ("output_min", 0.0), ("output_max", 1.0),
        ):
            try:
                noise_r.set_editor_property(prop, val)
            except Exception as e:
                print("     AVISO: noise_r '%s' no aplicado: %s" % (prop, e))
        mel.connect_material_expressions(texcoord, "", noise_r, "Position")
        rough_lo = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -700, 560)
        rough_lo.set_editor_property("r", 0.65)
        rough_hi = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -700, 660)
        rough_hi.set_editor_property("r", 0.92)
        lerp_r = mel.create_material_expression(
            mat, unreal.MaterialExpressionLinearInterpolate, -450, 600)
        mel.connect_material_expressions(rough_lo, "", lerp_r, "A")
        mel.connect_material_expressions(rough_hi, "", lerp_r, "B")
        mel.connect_material_expressions(noise_r, "", lerp_r, "Alpha")
        mel.connect_material_property(
            lerp_r, "", unreal.MaterialProperty.MP_ROUGHNESS)

        mel.recompile_material(mat)
        unreal.EditorAssetLibrary.save_asset(mat.get_path_name())
        print("     Material %s creado (relieve + roughness variable)."
              % NOMBRE_MAT_ESTUCO)
        return mat
    except Exception as e:
        print("     ERROR construyendo el grafo del estuco: %s" % e)
        # Devolvemos el material aunque el grafo este incompleto.
        try:
            unreal.EditorAssetLibrary.save_asset(mat.get_path_name())
        except Exception:
            pass
        return mat


def crear_material_teja():
    """Teja terracota con algo de relieve y roughness alta (mate)."""
    print("   - Material de teja con relieve ...")
    mat, ya = _crear_o_cargar_material(NOMBRE_MAT_TEJA)
    if mat is None:
        return None
    if ya:
        print("     Reutilizado material existente: %s" % NOMBRE_MAT_TEJA)
        return mat

    try:
        mel = unreal.MaterialEditingLibrary

        # Base color terracota.
        base = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant3Vector, -600, -100)
        base.set_editor_property(
            "constant", unreal.LinearColor(0.55, 0.25, 0.16, 1.0))
        mel.connect_material_property(
            base, "", unreal.MaterialProperty.MP_BASE_COLOR)

        # Relieve: Noise tipo "lineas de teja" -> normal aprox.
        texcoord = mel.create_material_expression(
            mat, unreal.MaterialExpressionTextureCoordinate, -1400, 200)
        noise_n = mel.create_material_expression(
            mat, unreal.MaterialExpressionNoise, -1100, 200)
        for prop, val in (
            ("scale", 16.0), ("quality", 2), ("levels", 2),
            ("output_min", -1.0), ("output_max", 1.0), ("turbulence", True),
        ):
            try:
                noise_n.set_editor_property(prop, val)
            except Exception:
                pass
        mel.connect_material_expressions(texcoord, "", noise_n, "Position")
        bump = mel.create_material_expression(
            mat, unreal.MaterialExpressionMultiply, -700, 250)
        bstr = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -900, 320)
        bstr.set_editor_property("r", 0.08)
        mel.connect_material_expressions(noise_n, "", bump, "A")
        mel.connect_material_expressions(bstr, "", bump, "B")
        append_xy = mel.create_material_expression(
            mat, unreal.MaterialExpressionAppendVector, -500, 250)
        mel.connect_material_expressions(bump, "", append_xy, "A")
        mel.connect_material_expressions(bump, "", append_xy, "B")
        z_one = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -500, 380)
        z_one.set_editor_property("r", 1.0)
        append_xyz = mel.create_material_expression(
            mat, unreal.MaterialExpressionAppendVector, -350, 300)
        mel.connect_material_expressions(append_xy, "", append_xyz, "A")
        mel.connect_material_expressions(z_one, "", append_xyz, "B")
        normalize = mel.create_material_expression(
            mat, unreal.MaterialExpressionNormalize, -180, 300)
        mel.connect_material_expressions(append_xyz, "", normalize, "")
        mel.connect_material_property(
            normalize, "", unreal.MaterialProperty.MP_NORMAL)

        # Roughness alta (teja mate).
        rough = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -600, 120)
        rough.set_editor_property("r", 0.85)
        mel.connect_material_property(
            rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

        mel.recompile_material(mat)
        unreal.EditorAssetLibrary.save_asset(mat.get_path_name())
        print("     Material %s creado (teja con relieve)." % NOMBRE_MAT_TEJA)
        return mat
    except Exception as e:
        print("     ERROR construyendo el grafo de la teja: %s" % e)
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

        # Base color oscuro (vidrio espejado azulado).
        base = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant3Vector, -600, -100)
        base.set_editor_property(
            "constant", unreal.LinearColor(0.02, 0.03, 0.05, 1.0))
        mel.connect_material_property(
            base, "", unreal.MaterialProperty.MP_BASE_COLOR)

        # Metallic alto (refleja entorno como espejo).
        metallic = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -600, 60)
        metallic.set_editor_property("r", 0.85)
        mel.connect_material_property(
            metallic, "", unreal.MaterialProperty.MP_METALLIC)

        # Roughness muy baja (reflejo nitido del cielo de atardecer).
        rough = mel.create_material_expression(
            mat, unreal.MaterialExpressionConstant, -600, 180)
        rough.set_editor_property("r", 0.05)
        mel.connect_material_property(
            rough, "", unreal.MaterialProperty.MP_ROUGHNESS)

        # Specular alto.
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


def crear_materiales_demo():
    """Crea/reutiliza los 3 materiales. Devuelve dict {clave: asset}."""
    print("[4/6] Creando materiales de la demo en %s ..." % CARPETA_MATS)
    mats = {}
    try:
        mats["estuco"] = crear_material_estuco()
    except Exception as e:
        print("   ERROR con el estuco: %s" % e)
        mats["estuco"] = None
    try:
        mats["teja"] = crear_material_teja()
    except Exception as e:
        print("   ERROR con la teja: %s" % e)
        mats["teja"] = None
    try:
        mats["cristal"] = crear_material_cristal()
    except Exception as e:
        print("   ERROR con el cristal: %s" % e)
        mats["cristal"] = None
    return mats


# ===========================================================================
#  PASO 5 - VESTIR EL EDIFICIO ESTRELLA (estuco + tejado + ventanas)
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


def poner_estuco(edificio, mat_estuco):
    """Pinta el edificio con el estuco con relieve."""
    print("   - Aplicando estuco con relieve al edificio ...")
    if asignar_material_actor(edificio, mat_estuco):
        print("     Estuco aplicado.")
        return True
    print("     AVISO: no se pudo aplicar el estuco.")
    return False


def poner_tejado(edificio, mat_teja):
    """Anade un tejado de teja con relieve en el TOP del edificio."""
    print("   - Anadiendo tejado de teja ...")
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
        # centro del cubo del tejado: medio cubo por encima del top
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
        print("     Tejado anadido sobre el top (Z=%.0f cm)." % top_z)
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
                        # cubo 1m -> ventana fina: X=espesor, Y=ancho, Z=alto
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
    """Aplica estuco + tejado + ventanas al edificio elegido."""
    print("[5/6] Vistiendo el edificio estrella a tope ...")
    if edificio is None:
        print("   AVISO: sin edificio estrella; se omite el vestido.")
        return 0
    poner_estuco(edificio, mats.get("estuco"))
    poner_tejado(edificio, mats.get("teja"))
    n_win = poner_ventanas(edificio, mats.get("cristal"))
    return n_win


# ===========================================================================
#  PASO 6 - ENCUADRAR LA CAMARA E IMPRIMIR COORDENADAS
# ===========================================================================
def encuadrar_camara(edificio):
    """Intenta encuadrar la camara del editor sobre el edificio."""
    print("[6/6] Encuadrando la camara del editor en el edificio ...")
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

    # 1) Seleccionar el edificio (asi F en el viewport lo enfoca).
    try:
        EAS.set_selected_level_actors([edificio])
        print("   Edificio seleccionado en el nivel.")
    except Exception as e:
        print("   AVISO: no se pudo seleccionar el edificio: %s" % e)

    # 2) Intentar mover la camara del viewport por API (si la version la expone).
    try:
        loc = edificio.get_actor_location()
        esc = edificio.get_actor_scale3d()
        # alejar la camara una distancia proporcional al tamano del edificio.
        diag = math.hypot(abs(esc.x) * M, abs(esc.y) * M)
        dist = max(2000.0, diag * 1.5 + abs(esc.z) * M)
        cam_loc = unreal.Vector(loc.x - dist, loc.y - dist,
                                abs(esc.z) * M * 0.8 + dist * 0.5)
        # mirar hacia el edificio (yaw/pitch aproximados)
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
            # API alternativa segun version.
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
    print("DEMO REALISTA de Puerto Banus (atardecer + 1 edificio a tope) ...")
    print("=" * 64)

    if EAS is None:
        print("ERROR FATAL: sin EditorActorSubsystem no se puede continuar.")
        return

    # 0) limpiar lo anterior (re-ejecutable)
    try:
        borrar_demo_anterior()
    except Exception as e:
        print("ERROR en el borrado previo: %s" % e)

    # 1) luz de atardecer (toda la escena)
    try:
        luz_de_atardecer()
    except Exception as e:
        print("ERROR en la luz de atardecer: %s" % e)

    # 2) postproceso + niebla (toda la escena)
    try:
        postproceso_y_niebla()
    except Exception as e:
        print("ERROR en postproceso/niebla: %s" % e)

    # 3) elegir el edificio estrella
    estrella = None
    try:
        estrella = elegir_edificio()
    except Exception as e:
        print("ERROR eligiendo el edificio: %s" % e)

    # 4) materiales de la demo
    mats = {}
    try:
        mats = crear_materiales_demo()
    except Exception as e:
        print("ERROR creando materiales: %s" % e)

    # 5) vestir el edificio estrella
    n_win = 0
    try:
        n_win = vestir_edificio_estrella(estrella, mats)
    except Exception as e:
        print("ERROR vistiendo el edificio: %s" % e)

    # 6) encuadrar camara e imprimir coordenadas
    try:
        encuadrar_camara(estrella)
    except Exception as e:
        print("ERROR encuadrando la camara: %s" % e)

    # 7) guardar el nivel (mejor esfuerzo)
    try:
        les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        les.save_current_level()
    except Exception:
        pass

    nombre_edif = label_de(estrella) if estrella is not None else "(ninguno)"
    print("=" * 64)
    print("LISTO: demo realista (edificio %s, luz de atardecer aplicada). "
          "Ventanas: %d" % (nombre_edif, n_win))
    print("=" * 64)


main()
