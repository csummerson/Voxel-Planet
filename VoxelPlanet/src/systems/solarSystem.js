import * as THREE from 'three';

export class SolarSystem {
  constructor() {
    this.group = new THREE.Group();
    this.planets = [];

    this._trailLength = 128;

    this._createSun();
    this._createPlanets();
  }

  _createSun() {
    const sunGeo = new THREE.SphereGeometry(10, 32, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(0, 0, 0);
    this.group.add(this.sun);

    const light = new THREE.PointLight(0xfff4cc, 2, 10000);
    light.position.copy(this.sun.position);
    this.light = light;
    this.group.add(light);
  }

  _createPlanets() {
    const defs = [
      { name: 'Sand Land', radius: 2, orbit: 30, period: 8, color: 0xffd738 },
      { name: 'Venus', radius: 3.5, orbit: 50, period: 12, color: 0xffcc88 }, 
      { name: 'Earth', radius: 4, orbit: 75, period: 18, color: 0x3366ff },
      { name: 'Grass', radius: 3, orbit: 95, period: 28, color: 0x88ff7d },
      { name: 'Snow', radius: 8, orbit: 140, period: 40, color: 0xffffff }
    ];

    defs.forEach((d, i) => {
      const geo = new THREE.SphereGeometry(d.radius, 16, 12);
      const mat = new THREE.MeshStandardMaterial({ color: d.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;

      const planet = {
        name: d.name,
        mesh,
        orbitRadius: d.orbit,
        radius: d.radius,
        period: d.period,
        angle: (i / defs.length) * Math.PI * 2,
        trailPositions: new Array(this._trailLength).fill(new THREE.Vector3()).map(v => v.clone())
      };

      const positions = new Float32Array(this._trailLength * 3);
      const trailGeom = new THREE.BufferGeometry();
      trailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const trailMat = new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: 0.6 });
      const line = new THREE.Line(trailGeom, trailMat);
      planet.trail = { geom: trailGeom, line };

      const pos = new THREE.Vector3();
      pos.set(d.orbit, 0, 0);
      mesh.position.copy(pos);
      planet.trailPositions[this._trailLength - 1].copy(pos);

      this.group.add(line);
      this.group.add(mesh);
      this.planets.push(planet);
    });
  }

  addToScene(scene) {
    scene.add(this.group);
  }

  removeFromScene(scene) {
    scene.remove(this.group);
  }

  update(dt) {
    for (const p of this.planets) {
      p.angle += dt * (2 * Math.PI) / Math.max(0.0001, p.period);
      const x = Math.cos(p.angle) * p.orbitRadius;
      const z = Math.sin(p.angle) * p.orbitRadius;
      p.mesh.position.set(x, 0, z);

      p.trailPositions.shift();
      p.trailPositions.push(p.mesh.position.clone());

      const arr = p.trail.geom.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < p.trailPositions.length; i++) {
        const v = p.trailPositions[i];
        arr[idx++] = v.x;
        arr[idx++] = v.y;
        arr[idx++] = v.z;
      }
      p.trail.geom.attributes.position.needsUpdate = true;
    }
    this.group.rotation.y += dt * 0.02;
  }

  checkCollision(position) {
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i];
      const dist = position.distanceTo(p.mesh.position);
      if (dist < p.radius + 2.0) {
        return { planet: p, index: i };
      }
    }
    return null;
  }
}

export default SolarSystem;
