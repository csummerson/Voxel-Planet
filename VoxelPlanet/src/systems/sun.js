import * as THREE from 'three';

export function createSun(position = new THREE.Vector3(100, 200, 100), intensity = 1.0, options = {}) {
  const group = new THREE.Group();

  const sunRadius = options.radius ?? 100;
  const geom = new THREE.SphereGeometry(sunRadius, 32, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffeeaa, emissive: 0xffffee, toneMapped: false });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(position);
  mesh.renderOrder = 999;

  const light = new THREE.DirectionalLight(0xffffff, intensity);
  light.position.copy(position);
  light.castShadow = true;

  group.add(mesh);
  group.add(light);

  return {
    group,
    light,
    mesh,
    setPosition(pos) {
      mesh.position.copy(pos);
      light.position.copy(pos);
    }
  };
}
