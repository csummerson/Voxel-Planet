import * as THREE from 'three';

export class SceneManager {
  constructor(options = {}) {
    this.scene = new THREE.Scene();

    const fov = options.fov ?? 75;
    const near = options.near ?? 0.1;
    const far = options.far ?? 1000;

    // camera
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      near,
      far
    );
    this.camera.position.set(0, 1.6, 5);

    // renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (!document.body.contains(this.renderer.domElement)) {
      document.body.appendChild(this.renderer.domElement);
    }

    // shadows
    if (options.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // debug cube
    if (!options.hideDebugCube) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshNormalMaterial();
      this.cube = new THREE.Mesh(geo, mat);
      this.scene.add(this.cube);
    }

    this.keys = {};
    this.mode = 'debug';
    this._lastSpaceTime = 0;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) {
        const now = performance.now();
        if (now - this._lastSpaceTime < 300) {
          this.mode = this.mode === 'debug' ? 'survival' : 'debug';
          console.log('Mode toggled to', this.mode);
          this._lastSpaceTime = 0;
        } else {
          this._lastSpaceTime = now;
        }
      }
    });
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);

    this.camPitchDeg = 0;
    this.yawRad = 0;
    this.mouseDelta = new THREE.Vector2(0, 0);

    this.renderer.domElement.addEventListener('click', () => {
      if (this.renderer.domElement.requestPointerLock) this.renderer.domElement.requestPointerLock();
    });

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement === this.renderer.domElement) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });

    window.addEventListener('resize', () => this.onWindowResize());
  }

  update(delta) {

  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(time) {
    this.renderer.render(this.scene, this.camera);
  }

  addObject(obj) {
    this.scene.add(obj);
  }
}
