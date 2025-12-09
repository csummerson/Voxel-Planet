import * as THREE from 'three';

export function updatePlanetCamera(sceneManager, planet, delta, options = {}) {
  const camera = sceneManager.camera;
  const keys = sceneManager.keys;

  const MoveSpeed = options.moveSpeed ?? 20.0;
  const MouseSensitivity = options.mouseSensitivity ?? 0.2;

  const pos = camera.position;
  const eps = 1e-6;
  if (pos.lengthSq() < eps) {
    pos.set(0, planet ? planet.radius + 3 : 10, 0);
  }

  const up = pos.clone().normalize();
  camera.up.copy(up);

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

  if (options.keepAboveSurface && planet && planet.radius) {
    const minAltitude = options.minAltitude ?? 0.5;
    const minDist = planet.radius + minAltitude;
  }
}
