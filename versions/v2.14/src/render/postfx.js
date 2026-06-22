import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Postprocesado LIGERO: bloom barato (a 1/3 de resolución) + antialiasing por
// hardware (MSAA). Antes el bloom a alta resolución + SMAA costaba ~34 FPS;
// esta versión da el brillo de cine pero mucho más rápida.
export function createPostFX(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: 4, // MSAA: bordes suaves casi gratis
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));

  const third = (n) => Math.max(1, Math.floor(n / 3));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(third(window.innerWidth), third(window.innerHeight)),
    0.5, // fuerza
    0.3, // radio
    0.9 // umbral (solo lo muy brillante)
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let enabled = true;

  return {
    render() {
      if (enabled) composer.render();
      else renderer.render(scene, camera);
    },
    setSize(w, h) {
      composer.setSize(w, h);
      bloom.setSize(third(w), third(h));
    },
    setEnabled(v) {
      enabled = v;
    },
    isEnabled: () => enabled,
  };
}
