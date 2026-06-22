import * as THREE from "three";

const MAX_SPEED = 38, ACCEL = 24, BRAKE = 50, ENGINE_BRAKE = 10, MAX_REVERSE = 12, TURN = 1.7;

export function createCar([sx, sz], bound) {
  const group = new THREE.Group();
  group.position.set(sx, 0, sz);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.6, 4.2),
    new THREE.MeshStandardMaterial({ color: 0xd11f2a, roughness: 0.4, metalness: 0.35 })
  );
  body.position.y = 0.7; body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.15 })
  );
  cabin.position.set(0, 1.15, -0.2);
  group.add(cabin);

  for (const [wx, wz] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.32, 14),
      new THREE.MeshStandardMaterial({ color: 0x121212 })
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.5, wz);
    group.add(w);
  }

  let speed = 0, heading = 0;
  const pad = 200;

  function update(delta, keys) {
    if (keys.forward) speed += ACCEL * delta;
    else if (keys.back) speed -= (speed > 0.2 ? BRAKE : ACCEL * 0.7) * delta;
    else speed += (speed > 0 ? -1 : 1) * Math.min(Math.abs(speed), ENGINE_BRAKE * delta);
    speed = THREE.MathUtils.clamp(speed, -MAX_REVERSE, MAX_SPEED);

    const steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    const sf = THREE.MathUtils.clamp(Math.abs(speed) / 10, 0, 1);
    if (Math.abs(speed) > 0.3) heading += steer * TURN * sf * delta * Math.sign(speed);
    group.rotation.y = heading;

    group.position.x += Math.sin(heading) * speed * delta;
    group.position.z += Math.cos(heading) * speed * delta;
    group.position.x = THREE.MathUtils.clamp(group.position.x, bound.minX - pad, bound.maxX + pad);
    group.position.z = THREE.MathUtils.clamp(group.position.z, bound.minZ - pad, bound.maxZ + pad);
  }

  return {
    group, update,
    getHeading: () => heading,
    getSpeed: () => speed,
    slow: () => (speed *= 0.3),
    radius: 2.0,
  };
}
