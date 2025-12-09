import * as THREE from 'three';

export function updatePlanetCamera(sceneManager, planet, delta, options = {}) {
  const camera = sceneManager.camera;
  const keys = sceneManager.keys;

  const MoveSpeed = options.moveSpeed ?? options.speed ?? 20.0;
  const MouseSensitivity = options.mouseSensitivity ?? 0.2;
  const Gravity = options.gravity ?? 30.0;
  const JumpImpulse = options.jumpImpulse ?? 30.0;
  const GroundFriction = options.groundFriction ?? 8.0;
  const GroundProbeDistance = options.groundProbeDistance ?? 5.0;

  const pos = camera.position;
  const eps = 1e-6;
  if (pos.lengthSq() < eps) {
    pos.set(0, planet ? planet.radius + 3 : 10, 0);
  }

  const up = pos.clone().normalize();
  camera.up.copy(up);

  if (!sceneManager.playerVelocity) sceneManager.playerVelocity = new THREE.Vector3(0,0,0);
  if (typeof sceneManager._spaceHeldPreviously !== 'boolean') sceneManager._spaceHeldPreviously = false;

  if (typeof sceneManager.camPitchDeg !== 'number') sceneManager.camPitchDeg = 0;
  if (typeof sceneManager.camYawDeg !== 'number') sceneManager.camYawDeg = 0;
  if (!sceneManager.mouseDelta) sceneManager.mouseDelta = new THREE.Vector2(0, 0);
  if (!sceneManager.lastUp) sceneManager.lastUp = up.clone();
  if (!sceneManager.localForward) sceneManager.localForward = new THREE.Vector3(0, 0, 1);

  const md = sceneManager.mouseDelta;
  sceneManager.camPitchDeg -= md.y * MouseSensitivity;
  sceneManager.camYawDeg -= md.x * MouseSensitivity;
  
  sceneManager.camPitchDeg = Math.max(-89, Math.min(89, sceneManager.camPitchDeg));
  
  sceneManager.camYawDeg = sceneManager.camYawDeg % 360;

  sceneManager.mouseDelta.set(0, 0);

  const upChange = new THREE.Vector3().subVectors(up, sceneManager.lastUp).length();
  if (upChange > 0.01) {
    const lastUp = sceneManager.lastUp;
    const oldPlaneNormal = lastUp.clone();
    const newPlaneNormal = up.clone();
    
    let projectedForward = sceneManager.localForward.clone();
    const dotOld = projectedForward.dot(oldPlaneNormal);
    projectedForward.addScaledVector(oldPlaneNormal, -dotOld);
    
    const dotNew = projectedForward.dot(newPlaneNormal);
    projectedForward.addScaledVector(newPlaneNormal, -dotNew);
    
    if (projectedForward.lengthSq() > 0.1) {
      sceneManager.localForward = projectedForward.normalize();
    }
    sceneManager.lastUp.copy(up);
  }

  const right = new THREE.Vector3().crossVectors(up, sceneManager.localForward).normalize();
  const forward = new THREE.Vector3().crossVectors(right, up).normalize();
  
  sceneManager.localForward.copy(forward);

  const yawRad = THREE.MathUtils.degToRad(sceneManager.camYawDeg);
  const qYaw = new THREE.Quaternion().setFromAxisAngle(up, yawRad);
  const yawedForward = forward.clone().applyQuaternion(qYaw).normalize();
  
  const yawedRight = new THREE.Vector3().crossVectors(yawedForward, up).normalize();

  const pitchRad = THREE.MathUtils.degToRad(sceneManager.camPitchDeg);
  const qPitch = new THREE.Quaternion().setFromAxisAngle(yawedRight, pitchRad);
  const lookDir = yawedForward.clone().applyQuaternion(qPitch).normalize();

  const target = pos.clone().addScaledVector(lookDir, 10);
  camera.lookAt(target);
  const speed = MoveSpeed * (delta || 0.016);

  if (sceneManager.mode === 'debug') {
    if (keys['KeyW'] || keys['ArrowUp']) {
      pos.addScaledVector(yawedForward, speed);
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
      pos.addScaledVector(yawedForward, -speed);
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
      pos.addScaledVector(yawedRight, -speed);
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
      pos.addScaledVector(yawedRight, speed);
    }
    if (keys['Space']) {
      pos.addScaledVector(up, speed);
    }
    if (keys['ShiftLeft']) {
      pos.addScaledVector(up, -speed);
    }
  } else {
    const v = sceneManager.playerVelocity;
    const accel = new THREE.Vector3(0,0,0);
    if (keys['KeyW'] || keys['ArrowUp']) accel.add(yawedForward);
    if (keys['KeyS'] || keys['ArrowDown']) accel.addScaledVector(yawedForward, -1);
    if (keys['KeyA'] || keys['ArrowLeft']) accel.addScaledVector(yawedRight, -1);
    if (keys['KeyD'] || keys['ArrowRight']) accel.add(yawedRight);
    if (accel.lengthSq() > 0) accel.normalize().multiplyScalar(MoveSpeed * 2.0);

    const gravityAcc = up.clone().multiplyScalar(-Gravity);
    v.addScaledVector(accel, delta || 0.016);
    v.addScaledVector(gravityAcc, delta || 0.016);

    pos.addScaledVector(v, delta || 0.016);

    let grounded = false;
    let groundPoint = null;
    let groundNormal = null;
    if (planet) {
      const meshes = [];
      planet.group.traverse((obj) => { if (obj.isMesh) meshes.push(obj); });

      const raycaster = new THREE.Raycaster();
      const down = up.clone().negate();
      raycaster.set(pos, down);
      raycaster.near = 0.001;
      raycaster.far = GroundProbeDistance;
      let hits = raycaster.intersectObjects(meshes, true);
      let hit = hits.length ? hits[0] : null;
      if (!hit) {
        const upDir = up.clone();
        raycaster.set(pos, upDir);
        hits = raycaster.intersectObjects(meshes, true);
        hit = hits.length ? hits[0] : null;
      }

      if (hit) {
        grounded = true;
        groundPoint = hit.point.clone();
        if (hit.face) {
          const nm = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
          groundNormal = hit.face.normal.clone().applyMatrix3(nm).normalize();
        } else {
          groundNormal = up.clone();
        }
      }
    }

    const minAltitude = options.minAltitude ?? 0.5;
    if (grounded && groundPoint && groundNormal) {
      const toGround = groundPoint.clone().sub(pos);
      const distToGround = toGround.length();
      if (distToGround < minAltitude) {
        pos.copy(groundPoint).addScaledVector(groundNormal, minAltitude + 1e-3);
      }

      const normalVel = groundNormal.clone().multiplyScalar(v.dot(groundNormal));
      v.sub(normalVel);

      const tangential = v.clone();
      const tangentialSpeed = tangential.length();
      if (tangentialSpeed > 0) {
        const frictionFactor = Math.max(0, 1 - GroundFriction * (delta || 0.016));
        v.multiplyScalar(frictionFactor);
      }

      const spaceNow = !!keys['Space'];
      if (spaceNow && !sceneManager._spaceHeldPreviously) {
        v.addScaledVector(groundNormal, JumpImpulse);
      }
      sceneManager._spaceHeldPreviously = spaceNow;
    } else {
      sceneManager._spaceHeldPreviously = !!keys['Space'];
    }

    sceneManager.playerVelocity.multiplyScalar(0.995);
  }

  if (options.keepAboveSurface && planet && planet.radius) {
    const minAltitude = options.minAltitude ?? 0.5;
    if (pos.length() < minAltitude) pos.setLength(minAltitude);
  }
}
