import * as THREE from "three";
import { CITY_HALF } from "../world/index.js";

// Fábrica genérica de vehículos (coches y motos) con física sencilla y daños.
// El "morro" apunta al +Z local. Las estadísticas vienen por `opts`.

const MAX_REVERSE = 12;
const BRAKE = 50;
const ENGINE_BRAKE = 10;
const BOUND = CITY_HALF + 30;

export function createVehicle(scene, opts = {}) {
  const {
    x = 0,
    z = 0,
    heading: heading0 = 0,
    color = 0xd11f2a,
    kind = "car",
    maxSpeed = 42,
    accel = 24,
    turn = 1.7,
    scaleW = 1,
    scaleL = 1,
  } = opts;

  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const wheels = [];
  const wheelRadius = kind === "moto" ? 0.55 : 0.5;
  const radius = kind === "moto" ? 1.1 : 2.0 * scaleW;

  if (kind === "moto") buildMoto(group, color, wheels, wheelRadius);
  else buildCar(group, color, wheels, wheelRadius, scaleW, scaleL);

  // Humo cuando está muy dañado.
  const smoke = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeSmokeTexture(),
      color: 0x555555,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  smoke.position.set(0, 1.2, 1.4);
  smoke.scale.set(2, 2, 1);
  group.add(smoke);

  scene.add(group);

  let speed = 0;
  let heading = heading0;
  let condition = 100;
  let smokeT = 0;
  group.rotation.y = heading;

  function update(delta, keys) {
    if (keys.forward) {
      speed += (condition > 0 ? accel : 0) * delta;
    } else if (keys.back) {
      if (speed > 0.2) speed -= BRAKE * delta;
      else speed -= (condition > 0 ? accel * 0.7 : 0) * delta;
    } else {
      if (speed > 0) speed = Math.max(0, speed - ENGINE_BRAKE * delta);
      else speed = Math.min(0, speed + ENGINE_BRAKE * delta);
    }
    const maxNow = condition > 0 ? maxSpeed : 6;
    speed = THREE.MathUtils.clamp(speed, -MAX_REVERSE, maxNow);

    const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    const speedFactor = THREE.MathUtils.clamp(Math.abs(speed) / 10, 0, 1);
    if (Math.abs(speed) > 0.3) {
      heading += steerInput * turn * speedFactor * delta * Math.sign(speed);
    }
    group.rotation.y = heading;
    group.rotation.z = kind === "moto" ? -steerInput * speedFactor * 0.3 : 0;

    group.position.x += Math.sin(heading) * speed * delta;
    group.position.z += Math.cos(heading) * speed * delta;
    group.position.x = THREE.MathUtils.clamp(group.position.x, -BOUND, BOUND);
    group.position.z = THREE.MathUtils.clamp(group.position.z, -BOUND, BOUND);

    const steerAngle = steerInput * 0.5;
    const roll = (speed * delta) / wheelRadius;
    for (const w of wheels) {
      if (w.front) w.steer.rotation.y = steerAngle;
      w.spin.rotation.x += roll;
    }

    if (condition < 30) {
      smokeT += delta;
      const p = smokeT % 1;
      smoke.material.opacity = (0.55 - condition / 70) * (1 - p);
      smoke.scale.setScalar(1.5 + p * 2.2);
      smoke.position.y = 1.2 + p * 1.6;
    } else {
      smoke.material.opacity = 0;
    }
  }

  function applyImpact(amount) {
    condition = Math.max(0, condition - amount);
    speed *= 0.15;
  }

  return {
    group,
    kind,
    update,
    applyImpact,
    getHeading: () => heading,
    getSpeed: () => speed,
    getCondition: () => condition,
    getRadius: () => radius,
  };
}

function addWheel(group, x, y, z, r, front, wheels) {
  const steer = new THREE.Group();
  steer.position.set(x, y, z);
  const spin = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.32, 16),
    new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.85 })
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  spin.add(tire);
  steer.add(spin);
  group.add(steer);
  wheels.push({ steer, spin, front });
}

function buildCar(group, color, wheels, r, sw, sl) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0 * sw, 0.6, 4.2 * sl),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.35 })
  );
  body.position.y = 0.7;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7 * sw, 0.6, 2.0 * sl),
    new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.15, metalness: 0.2 })
  );
  cabin.position.set(0, 1.15, -0.2 * sl);
  cabin.castShadow = true;
  group.add(cabin);

  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0x332b10, roughness: 0.3 });
  for (const sx of [-0.6 * sw, 0.6 * sw]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.12), headMat);
    head.position.set(sx, 0.72, 2.12 * sl);
    group.add(head);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0x330000 });
  for (const sx of [-0.6 * sw, 0.6 * sw]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.12), tailMat);
    tail.position.set(sx, 0.72, -2.12 * sl);
    group.add(tail);
  }

  addWheel(group, -1.0 * sw, r, 1.3 * sl, r, true, wheels);
  addWheel(group, 1.0 * sw, r, 1.3 * sl, r, true, wheels);
  addWheel(group, -1.0 * sw, r, -1.3 * sl, r, false, wheels);
  addWheel(group, 1.0 * sw, r, -1.3 * sl, r, false, wheels);
}

function buildMoto(group, color, wheels, r) {
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 2.2), bodyMat);
  body.position.y = 0.85;
  body.castShadow = true;
  group.add(body);

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.22, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.8 })
  );
  seat.position.set(0, 1.08, -0.4);
  group.add(seat);

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  bar.position.set(0, 1.2, 0.95);
  group.add(bar);

  addWheel(group, 0, r, 1.05, r, true, wheels);
  addWheel(group, 0, r, -1.05, r, false, wheels);
}

function makeSmokeTexture() {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(130,130,130,0.9)");
  g.addColorStop(1, "rgba(130,130,130,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}
