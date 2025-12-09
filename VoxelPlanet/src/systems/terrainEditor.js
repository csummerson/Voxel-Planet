import * as THREE from 'three';

export class TerrainEditor {
  constructor(sceneManager, planet) {
    this.sceneManager = sceneManager;
    this.planet = planet;
    this.raycaster = new THREE.Raycaster();
    this.raycastDistance = 30;
    this.brushRadius = 3;
    this.brushStrength = 5;
    
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    
    this.brushIndicator = this.createBrushIndicator();
    this.sceneManager.scene.add(this.brushIndicator);
  }
  
  createBrushIndicator() {
    const geometry = new THREE.SphereGeometry(this.brushRadius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.visible = false;
    return sphere;
  }
  
  update() {
    const camera = this.sceneManager.camera;
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    this.raycaster.set(camera.position, direction);
    
    const meshes = [];
    this.planet.group.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        meshes.push(obj);
      }
    });
    
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const intersection = intersects[0];
      const point = intersection.point;
      if (intersection.distance <= this.raycastDistance) {
        this.brushIndicator.position.copy(point);
        this.brushIndicator.visible = true;
      } else {
        this.brushIndicator.visible = false;
      }
    } else {
      this.brushIndicator.visible = false;
    }
  }
  
  onMouseDown(event) {
    if (document.pointerLockElement !== this.sceneManager.renderer.domElement) {
      return;
    }
    
    if (event.button !== 0 && event.button !== 2) return;
    
    const camera = this.sceneManager.camera;
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    this.raycaster.set(camera.position, direction);
    
    const meshes = [];
    this.planet.group.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        meshes.push(obj);
      }
    });
    
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const intersection = intersects[0];
      if (intersection.distance > this.raycastDistance) return;
      const hitPoint = intersection.point;
      const isAdd = event.button === 0;
      
      this.modifyTerrain(hitPoint, isAdd);
    }
  }
  
  modifyTerrain(centerPoint, isAdd) {
    const strength = isAdd ? this.brushStrength : -this.brushStrength;
    const radius = this.brushRadius;
    this.planet.modifyDensity(centerPoint, strength, radius);
  }
  
  applyModificationToChunk(chunk, centerPoint, strength, radius) {
  }
}
