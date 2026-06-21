import * as THREE from "three";
import { CITY_HALF } from "../world/index.js";

// Coche conducible con física sencilla (sin colisiones todavía, llegan en v1.6).
// El morro del coche apunta a su +Z local.

const MAX_SPEED = 42; // m/s hacia delante (~150 km/h)
const MAX_REVERSE = 12;
const ACCEL = 24;
const BRAKE = 50;
const ENGINE_BRAKE = 10; // frenado al soltar el acelerador
const TURN_RATE = 1.7; // giro máximo (rad/s) a velocidad alta
const WHEEL_RADIUS = 0.5;
const BOUND = CITY_HALF + 30;

export function createCar(scene, x = 0, z = 16, color = 0xd11f2a) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Carrocería deportiva.
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.6, 4.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.35 })
  );
  body.position.y = 0.7;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Cabina con cristales oscuros.
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.15, metalness: 0.2 })
  );
  cabin.position.set(0, 1.15, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Faros delanteros (+Z).
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff4d0,
    emissive: 0x332b10,
    roughness: 0.3,
  });
  for (const sx of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.12), headMat);
    head.position.set(sx, 0.72, 2.12);
    group.add(head);
  }

  // Pilotos traseros (-Z).
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0x330000 });
  for (const sx of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.12), tailMat);
    tail.position.set(sx, 0.72, -2.12);
    group.add(tail);
  }

  // Ruedas (pivote de dirección -> pivote de giro -> neumático).
  const wheels = [];
  const wheelDefs = [
    { x: -1.0, z: 1.3, front: true },
    { x: 1.0, z: 1.3, front: true },
    { x: -1.0, z: -1.3, front: false },
    { x: 1.0, z: -1.3, front: false },
  ];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.85 });
  for (const def of wheelDefs) {
    const steer = new THREE.Group();
    steer.position.set(def.x, WHEEL_RADIUS, def.z);
    const spin = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.35, 16),
      tireMat
    );
    tire.rotation.z = Math.PI / 2; // eje del neumático a lo ancho del coche
    tire.castShadow = true;
    spin.add(tire);
    steer.add(spin);
    group.add(steer);
    wheels.push({ steer, spin, front: def.front });
  }

  scene.add(group);

  let speed = 0;
  let heading = 0;
  group.rotation.y = heading;

  function update(delta, keys) {
    // Acelerador / freno / marcha atrás.
    if (keys.forward) {
      speed += ACCEL * delta;
    } else if (keys.back) {
      if (speed > 0.2) speed -= BRAKE * delta;
      else speed -= ACCEL * 0.7 * delta;
    } else {
      if (speed > 0) speed = Math.max(0, speed - ENGINE_BRAKE * delta);
      else speed = Math.min(0, speed + ENGINE_BRAKE * delta);
    }
    speed = THREE.MathUtils.clamp(speed, -MAX_REVERSE, MAX_SPEED);

    // Dirección: izquierda gira a la izquierda; más efectiva con velocidad.
    const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    const speedFactor = THREE.MathUtils.clamp(Math.abs(speed) / 10, 0, 1);
    if (Math.abs(speed) > 0.3) {
      heading += steerInput * TURN_RATE * speedFactor * delta * Math.sign(speed);
    }
    group.rotation.y = heading;

    // Avance en la dirección del morro.
    group.position.x += Math.sin(heading) * speed * delta;
    group.position.z += Math.cos(heading) * speed * delta;
    group.position.x = THREE.MathUtils.clamp(group.position.x, -BOUND, BOUND);
    group.position.z = THREE.MathUtils.clamp(group.position.z, -BOUND, BOUND);

    // Ruedas: delanteras giran con la dirección; todas ruedan con la velocidad.
    const steerAngle = steerInput * 0.5;
    const roll = (speed * delta) / WHEEL_RADIUS;
    for (const w of wheels) {
      if (w.front) w.steer.rotation.y = steerAngle;
      w.spin.rotation.x += roll;
    }
  }

  return {
    group,
    update,
    getHeading: () => heading,
    getSpeed: () => speed,
  };
}
