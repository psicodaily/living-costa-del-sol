import * as THREE from "three";
import { createCharacter, animateWalk } from "./character.js";

const WALK_SPEED = 9;
const RUN_SPEED = 18;
const TURN_SPEED = 12; // suavizado del giro del personaje
const BOUND = 9000; // límite amplio (cubre el mapa real de Marbella)

// El jugador: personaje controlable que se mueve relativo a la cámara.
export function createPlayer(scene) {
  const { group, limbs } = createCharacter(0x1f6fd6);
  group.position.set(0, 0, 0);
  scene.add(group);

  let walkTime = 0;
  let targetAngle = group.rotation.y;
  let hasHat = false;

  // Gorra cosmética (se compra en la tienda).
  function addHat() {
    if (hasHat) return false;
    const hat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.2, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
    );
    hat.position.y = 2.78;
    hat.castShadow = true;
    group.add(hat);
    hasHat = true;
    return true;
  }

  const move = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  function update(delta, keys, cameraYaw) {
    // Direcciones relativas a la cámara (en el plano horizontal).
    forward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    right.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    const ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const iz = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);

    move.set(0, 0, 0);
    move.addScaledVector(forward, iz);
    move.addScaledVector(right, ix);

    const moving = move.lengthSq() > 0.0001;
    const speed = keys.run ? RUN_SPEED : WALK_SPEED;

    if (moving) {
      move.normalize();
      group.position.addScaledVector(move, speed * delta);

      // El personaje gira para mirar hacia donde anda.
      targetAngle = Math.atan2(move.x, move.z);

      // Animación de caminar/correr.
      walkTime += delta * (keys.run ? 16 : 10);
      animateWalk(limbs, walkTime, 1);
    } else {
      // Vuelve a la pose de reposo suavemente.
      animateWalk(limbs, 0, 0);
    }

    // Giro suave hacia el ángulo objetivo (interpolación de ángulos).
    let diff = targetAngle - group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    group.rotation.y += diff * Math.min(1, TURN_SPEED * delta);

    // Mantener dentro de los límites del mapa.
    group.position.x = THREE.MathUtils.clamp(group.position.x, -BOUND, BOUND);
    group.position.z = THREE.MathUtils.clamp(group.position.z, -BOUND, BOUND);
  }

  return { group, update, addHat };
}
