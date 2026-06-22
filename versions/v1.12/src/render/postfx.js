import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Postprocesado "de cine": bloom (resplandor en sol, agua, ventanas y farolas),
// suavizado de bordes (SMAA) y salida con tono ACES (OutputPass).
// Se puede desactivar para equipos flojos.
export function createPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55, // fuerza
    0.4, // radio
    0.85 // umbral (solo brilla lo muy luminoso)
  );
  composer.addPass(bloom);

  composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));
  composer.addPass(new OutputPass());

  let enabled = true;

  return {
    render() {
      if (enabled) composer.render();
      else renderer.render(scene, camera);
    },
    setSize(w, h) {
      composer.setSize(w, h);
    },
    setEnabled(v) {
      enabled = v;
    },
    isEnabled: () => enabled,
  };
}
