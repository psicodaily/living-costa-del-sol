import * as THREE from "three";

// Crea un personaje simple tipo "muñeco": cuerpo, cabeza, brazos y piernas.
// Devuelve el grupo y referencias a las piernas/brazos para animar el caminar.
export function createCharacter(color = 0x2266cc) {
  const group = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({ color: 0xf0c39b, roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x33363d, roughness: 0.9 });

  // Tronco
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), shirt);
  torso.position.y = 1.55;
  torso.castShadow = true;
  group.add(torso);

  // Cabeza
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), skin);
  head.position.y = 2.45;
  head.castShadow = true;
  group.add(head);

  // Brazos (pivotan desde el hombro)
  const armGeo = new THREE.BoxGeometry(0.25, 1.0, 0.25);
  const leftArm = new THREE.Group();
  const leftArmMesh = new THREE.Mesh(armGeo, shirt);
  leftArmMesh.position.y = -0.5;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  leftArm.position.set(-0.6, 2.05, 0);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  const rightArmMesh = new THREE.Mesh(armGeo, shirt);
  rightArmMesh.position.y = -0.5;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  rightArm.position.set(0.6, 2.05, 0);
  group.add(rightArm);

  // Piernas (pivotan desde la cadera)
  const legGeo = new THREE.BoxGeometry(0.32, 1.05, 0.32);
  const leftLeg = new THREE.Group();
  const leftLegMesh = new THREE.Mesh(legGeo, pants);
  leftLegMesh.position.y = -0.52;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);
  leftLeg.position.set(-0.24, 1.0, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  const rightLegMesh = new THREE.Mesh(legGeo, pants);
  rightLegMesh.position.y = -0.52;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);
  rightLeg.position.set(0.24, 1.0, 0);
  group.add(rightLeg);

  return { group, limbs: { leftArm, rightArm, leftLeg, rightLeg } };
}

// Animación de caminar: balancea brazos y piernas según la velocidad.
export function animateWalk(limbs, walkTime, intensity) {
  const swing = Math.sin(walkTime) * 0.6 * intensity;
  limbs.leftLeg.rotation.x = swing;
  limbs.rightLeg.rotation.x = -swing;
  limbs.leftArm.rotation.x = -swing;
  limbs.rightArm.rotation.x = swing;
}
