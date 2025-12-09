// main.js
import * as THREE from 'three';
import { SceneManager } from './src/core/sceneManager.js';
import { VoxelPlanet } from './src/world/voxelPlanet.js';
import { setNoiseSeed } from './src/utils/noise.js';
import { AmbientLight, DirectionalLight } from 'three';
import { updatePlanetCamera } from './src/systems/physics.js';
import { createStarbox } from './src/systems/starbox.js';
import { TerrainEditor } from './src/systems/terrainEditor.js';
import { createAtmosphere } from './src/systems/atmosphere.js';
import { createSun } from './src/systems/sun.js';

const sceneManager = new SceneManager({
  fov: 60,
  near: 0.1,
  far: 10000,
  enableShadows: true
});

// Ambient lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
sceneManager.scene.add(ambient);

const sun = createSun(new THREE.Vector3(1000, 2000, 1000), 1.0);
sceneManager.addObject(sun.group);

const starbox = createStarbox();
sceneManager.scene.add(starbox);

setNoiseSeed(Math.floor(Math.random() * 1e9));

// Planet maker!
const planet = new VoxelPlanet({
  radius: 80,
  voxelResolution: 2,
  chunkSize: 16,
  shellThickness: 20
});

sceneManager.addObject(planet.group);

const atmosphere = createAtmosphere(planet, sun.light);
sceneManager.addObject(atmosphere);

console.time('planet.generate');
planet.generate();
console.timeEnd('planet.generate');

// Create terrain editor
const editor = new TerrainEditor(sceneManager, planet);

sceneManager.camera.position.set(planet.radius + 50, 0, 0);
sceneManager.camera.lookAt(0,0,0);

const clock = new THREE.Clock();
function animate() {
  const dt = clock.getDelta();
  sceneManager.update(dt);
  updatePlanetCamera(sceneManager, planet, dt, { keepAboveSurface: true, minAltitude: 2, speed: 20 });
    // Update terrain editor (raycast and show brush)
    editor.update();
  
  // Update atmosphere sun direction
  atmosphere.updateSunDirection(sun.light.position);
  
  starbox.position.copy(sceneManager.camera.position);
  
  sceneManager.render();
  requestAnimationFrame(animate);
}
animate();
