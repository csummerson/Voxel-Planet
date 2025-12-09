import * as THREE from 'three';
import { SceneManager } from './src/core/sceneManager.js';
import { VoxelPlanet } from './src/world/voxelPlanet.js';
import { SolarSystem } from './src/systems/solarSystem.js';
import { setNoiseSeed } from './src/utils/noise.js';
import { updatePlanetCamera } from './src/systems/physics.js';
import { createStarbox } from './src/systems/starbox.js';
import { TerrainEditor } from './src/systems/terrainEditor.js';
import { createAtmosphere } from './src/systems/atmosphere.js';

const sceneManager = new SceneManager({
  fov: 60,
  near: 0.1,
  far: 10000,
  enableShadows: true
});

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
sceneManager.scene.add(ambient);

const starbox = createStarbox();
sceneManager.scene.add(starbox);

setNoiseSeed(Math.floor(Math.random() * 1e9));

const solar = new SolarSystem();
solar.addToScene(sceneManager.scene);

let inPlanetView = false;
let localPlanet = null;
let atmosphere = null;
let editor = null;
let localLight = null;
let localDirectionalLight = null;
let localSunMesh = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const loadingOverlay = document.createElement('div');
loadingOverlay.style.position = 'absolute';
loadingOverlay.style.left = '0';
loadingOverlay.style.top = '0';
loadingOverlay.style.right = '0';
loadingOverlay.style.bottom = '0';
loadingOverlay.style.display = 'none';
loadingOverlay.style.alignItems = 'center';
loadingOverlay.style.justifyContent = 'center';
loadingOverlay.style.background = 'rgba(0,0,0,0.5)';
loadingOverlay.style.zIndex = '9999';

const loadingBox = document.createElement('div');
loadingBox.style.width = '50%';
loadingBox.style.maxWidth = '600px';
loadingBox.style.background = '#222';
loadingBox.style.padding = '12px';
loadingBox.style.borderRadius = '6px';
loadingBox.style.color = '#fff';
loadingBox.style.fontFamily = 'sans-serif';
loadingBox.style.textAlign = 'center';

const loadingText = document.createElement('div');
loadingText.innerText = 'Loading planet...';
loadingText.style.marginBottom = '8px';

const loadingBarBg = document.createElement('div');
loadingBarBg.style.width = '100%';
loadingBarBg.style.height = '12px';
loadingBarBg.style.background = '#444';
loadingBarBg.style.borderRadius = '6px';

const loadingBar = document.createElement('div');
loadingBar.style.height = '100%';
loadingBar.style.width = '0%';
loadingBar.style.background = '#6cf';
loadingBar.style.borderRadius = '6px';

loadingBarBg.appendChild(loadingBar);
loadingBox.appendChild(loadingText);
loadingBox.appendChild(loadingBarBg);
loadingOverlay.appendChild(loadingBox);
document.body.appendChild(loadingOverlay);

function showLoading() { loadingOverlay.style.display = 'flex'; }
function hideLoading() { loadingOverlay.style.display = 'none'; }
function setLoadingProgress(f) { loadingBar.style.width = `${Math.round(f * 100)}%`; }

const hintOverlay = document.createElement('div');
hintOverlay.style.position = 'absolute';
hintOverlay.style.left = '12px';
hintOverlay.style.bottom = '12px';
hintOverlay.style.padding = '8px 12px';
hintOverlay.style.background = 'rgba(0,0,0,0.6)';
hintOverlay.style.color = '#fff';
hintOverlay.style.fontFamily = 'sans-serif';
hintOverlay.style.borderRadius = '6px';
hintOverlay.style.zIndex = '9999';
hintOverlay.style.pointerEvents = 'none';
hintOverlay.innerText = 'Click a planet to land';
document.body.appendChild(hintOverlay);

function setHint(txt) { hintOverlay.innerText = txt; }
function showHint() { hintOverlay.style.display = 'block'; }
function hideHint() { hintOverlay.style.display = 'none'; }

let _savedCameraState = null;
async function enterPlanetView(planetObj) {
  if (inPlanetView) return;
  inPlanetView = true;
  solar.removeFromScene(sceneManager.scene);

  _savedCameraState = {
    position: sceneManager.camera.position.clone(),
    quaternion: sceneManager.camera.quaternion.clone()
  };

  const localRadius = Math.max(40, planetObj.radius * 18);
  localPlanet = new VoxelPlanet({
    radius: localRadius,
    voxelResolution: 2,
    chunkSize: 16,
    shellThickness: 20
  });
  sceneManager.addObject(localPlanet.group);

  if (localLight) sceneManager.scene.remove(localLight);
  localLight = new THREE.PointLight(0xfff4cc, 1.2, localRadius * 10, 2);
  localLight.position.set(localRadius * 2, localRadius * 2, localRadius * 0.5);
  localLight.castShadow = true;
  sceneManager.scene.add(localLight);

  if (localDirectionalLight) sceneManager.scene.remove(localDirectionalLight);
  localDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  localDirectionalLight.position.set(-localRadius * 2, localRadius * 3, localRadius);
  localDirectionalLight.castShadow = true;
  localDirectionalLight.shadow.camera.left = -localRadius * 2;
  localDirectionalLight.shadow.camera.right = localRadius * 2;
  localDirectionalLight.shadow.camera.top = localRadius * 2;
  localDirectionalLight.shadow.camera.bottom = -localRadius * 2;
  localDirectionalLight.shadow.camera.near = 0.5;
  localDirectionalLight.shadow.camera.far = localRadius * 10;
  localDirectionalLight.target = localPlanet.group;
  sceneManager.scene.add(localDirectionalLight);

  if (localSunMesh) sceneManager.scene.remove(localSunMesh);
  const sunGeo = new THREE.SphereGeometry(50, 32, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
  localSunMesh = new THREE.Mesh(sunGeo, sunMat);
  const sunDir = new THREE.Vector3(localDirectionalLight.position.x, localDirectionalLight.position.y, localDirectionalLight.position.z).normalize();
  localSunMesh.position.copy(sunDir.multiplyScalar(1000));
  sceneManager.scene.add(localSunMesh);

  showLoading();
  setHint('Loading planet...');
  setLoadingProgress(0);

  console.time('planet.generate');

  await localPlanet.generateAsync((p) => setLoadingProgress(p));
  console.timeEnd('planet.generate');

  hideLoading();
  atmosphere = createAtmosphere(localPlanet, localLight);
  sceneManager.addObject(atmosphere);

  editor = new TerrainEditor(sceneManager, localPlanet);

  sceneManager.camera.position.set(localPlanet.radius + 50, 0, 0);
  sceneManager.camera.lookAt(0, 0, 0);

  try {
    if (sceneManager.renderer.domElement.requestPointerLock) {
      sceneManager.renderer.domElement.requestPointerLock();
    }
  } catch (e) {}
  sceneManager.renderer.domElement.style.cursor = 'none';
  setHint('Press X to return to solar system.');
}

sceneManager.renderer.domElement.addEventListener('click', (e) => {
  if (inPlanetView) return;
  const rect = sceneManager.renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, sceneManager.camera);
  const meshes = solar.planets.map(p => p.mesh);
  const intersects = raycaster.intersectObjects(meshes, true);
  if (intersects.length > 0) {
    const hitMesh = intersects[0].object;
    const planetObj = solar.planets.find(p => p.mesh === hitMesh || hitMesh.parent === p.mesh);
    if (planetObj) enterPlanetView(planetObj);
  }
});

sceneManager.camera.position.set(0, 150, 300);
sceneManager.camera.lookAt(0, 0, 0);

const clock = new THREE.Clock();
let lastXDown = false;
function animate() {
  const dt = clock.getDelta();
  sceneManager.update(dt);

  if (!inPlanetView) {
    try {
      if (document.pointerLockElement === sceneManager.renderer.domElement) {
        document.exitPointerLock();
      }
    } catch (e) {
    }
    sceneManager.renderer.domElement.style.cursor = 'auto';
    solar.update(dt);
    const hit = solar.checkCollision(sceneManager.camera.position);
    if (hit) {
      enterPlanetView(hit.planet).catch(e => console.error('enterPlanetView failed', e));
    }
  } else {
    if (localPlanet) {
      updatePlanetCamera(sceneManager, localPlanet, dt, { keepAboveSurface: true, minAltitude: 2, speed: 20 });
      if (editor) editor.update();
      if (atmosphere) {
        const sunPos = (localDirectionalLight ? localDirectionalLight.position : (localLight ? localLight.position : solar.light.position));
        atmosphere.updateSunDirection(sunPos);
      }
    }
  }

  const xPressed = !!sceneManager.keys['KeyX'];
  if (xPressed && !lastXDown) {
    if (inPlanetView) {
      if (localPlanet) sceneManager.scene.remove(localPlanet.group);
      if (atmosphere) sceneManager.scene.remove(atmosphere);
      if (localLight) sceneManager.scene.remove(localLight);
      if (localDirectionalLight) sceneManager.scene.remove(localDirectionalLight);
      if (localSunMesh) sceneManager.scene.remove(localSunMesh);
      localPlanet = null;
      atmosphere = null;
      localLight = null;
      localDirectionalLight = null;
      localSunMesh = null;
      if (editor) editor = null;
      solar.addToScene(sceneManager.scene);
      try { if (document.pointerLockElement === sceneManager.renderer.domElement) document.exitPointerLock(); } catch(e) {}
      sceneManager.renderer.domElement.style.cursor = 'auto';
      if (_savedCameraState) {
        sceneManager.camera.position.copy(_savedCameraState.position);
        sceneManager.camera.quaternion.copy(_savedCameraState.quaternion);
        _savedCameraState = null;
      } else {
        sceneManager.camera.position.set(0, 150, 300);
        sceneManager.camera.lookAt(0, 0, 0);
      }
      inPlanetView = false;
      setHint('Click a planet to land');
    }
  }
  lastXDown = xPressed;

  starbox.position.copy(sceneManager.camera.position);

  sceneManager.render();
  requestAnimationFrame(animate);
}
animate();
