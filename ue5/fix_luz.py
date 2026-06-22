# -*- coding: utf-8 -*-
# ============================================================================
#  RESTAURAR LUZ — deshace la oscuridad del demo (vuelve a verse la escena)
#  Re-ejecutable y seguro.
# ============================================================================
import unreal

es = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

def log(m):
    print("[fix_luz] " + str(m))

acts = es.get_all_level_actors()

# 1) Sol (DirectionalLight): angulo alto, brillante, visible, color neutro
for a in acts:
    try:
        if isinstance(a, unreal.DirectionalLight):
            r = unreal.Rotator()
            r.pitch = -45.0
            r.yaw = -30.0
            r.roll = 0.0
            try:
                a.set_actor_rotation(r, False)
            except Exception:
                a.set_actor_rotation(r)
            c = None
            try:
                c = a.get_component_by_class(unreal.DirectionalLightComponent)
            except Exception:
                try:
                    c = a.directional_light_component
                except Exception as e:
                    log("no light comp: " + str(e))
            if c is not None:
                try:
                    c.set_intensity(10.0)
                except Exception as e:
                    log("intensity: " + str(e))
                try:
                    c.set_visibility(True, True)
                except Exception:
                    try:
                        c.set_editor_property("visible", True)
                    except Exception:
                        pass
                try:
                    c.set_light_color(unreal.LinearColor(1.0, 1.0, 1.0, 1.0))
                except Exception:
                    pass
            log("Sol restaurado (alto y brillante).")
    except Exception as e:
        log("err sol: " + str(e))

# 2) PostProcess: quitar overrides de exposicion -> vuelve la auto-exposicion
for a in acts:
    try:
        if isinstance(a, unreal.PostProcessVolume):
            s = a.get_editor_property("settings")
            for prop in [
                "override_auto_exposure_method",
                "override_auto_exposure_bias",
                "override_auto_exposure_min_brightness",
                "override_auto_exposure_max_brightness",
                "override_color_gain",
                "override_white_temp",
                "override_color_gamma",
            ]:
                try:
                    s.set_editor_property(prop, False)
                except Exception:
                    pass
            try:
                s.set_editor_property("auto_exposure_bias", 1.0)
            except Exception:
                pass
            a.set_editor_property("settings", s)
            log("Exposicion del PostProcess reseteada (auto).")
    except Exception as e:
        log("err ppv: " + str(e))

# 3) SkyLight: recapturar para que haya luz ambiente
for a in acts:
    try:
        if isinstance(a, unreal.SkyLight):
            c = None
            try:
                c = a.get_component_by_class(unreal.SkyLightComponent)
            except Exception:
                try:
                    c = a.sky_light_component
                except Exception:
                    pass
            if c is not None:
                try:
                    c.set_editor_property("real_time_capture", True)
                except Exception:
                    pass
                try:
                    c.recapture_sky()
                except Exception as e:
                    log("recapture: " + str(e))
            log("SkyLight recapturada.")
    except Exception as e:
        log("err sky: " + str(e))

log("LISTO: luz restaurada. Deberias volver a ver la escena. Si sigue oscuro, avisame.")
