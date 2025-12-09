import * as THREE from 'three';
import { surfaceNetsMesher } from './surfaceNets.js';
import { getMaterialAt } from '../utils/worldGen.js';

export class Chunk {
  constructor({ origin = new THREE.Vector3(0,0,0), size = 16, voxelResolution = 1, getDensity = null } = {}) {
    this.origin = origin.clone();
    this.size = size;
    this.voxelResolution = voxelResolution;
    this.getDensity = getDensity;

    this.meshGroup = new THREE.Group();
    this.meshGroup.name = 'Chunk';
    this.meshGroup.position.copy(this.origin);

    this.mesh = null;
  }

  generateMesh() {
    // chunks need overlaps due to surface nets being a "dual" algorithm.
    const nx = this.size + 2;
    const ny = this.size + 2;
    const nz = this.size + 2;

    const samples = new Float32Array(nx * ny * nz);

    const idx = (x,y,z) => x + y * nx + z * nx * ny;

    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const wx = this.origin.x + x * this.voxelResolution;
          const wy = this.origin.y + y * this.voxelResolution;
          const wz = this.origin.z + z * this.voxelResolution;

          let density = 0;
          if (this.getDensity) {
            const p = new THREE.Vector3(wx, wy, wz);
            density = this.getDensity(p);
          }

          samples[idx(x,y,z)] = density;
        }
      }
    }

    const { geometry } = surfaceNetsMesher(samples, { nx, ny, nz }, { scale: this.voxelResolution });

    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.meshGroup.remove(this.mesh);
      this.mesh = null;
    }

    const posAttr = geometry.getAttribute('position');
    if (!posAttr || posAttr.count === 0) {
      return null;
    }

    const colors = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i) + this.origin.x;
      const y = posAttr.getY(i) + this.origin.y;
      const z = posAttr.getZ(i) + this.origin.z;
      const p = new THREE.Vector3(x, y, z);
      
      const color = getMaterialAt(p);
      colors[i * 3 + 0] = ((color >> 16) & 255) / 255;
      colors[i * 3 + 1] = ((color >> 8) & 255) / 255;
      colors[i * 3 + 2] = (color & 255) / 255;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    this.mesh = mesh;
    this.meshGroup.add(mesh);

    return mesh;
  }
}
