import * as THREE from 'three';
import { Chunk } from './chunk.js';
import { getDensityAt } from '../utils/worldGen.js';

export class VoxelPlanet {
  constructor({
    radius = 200,
    voxelResolution = 1,
    chunkSize = 32,
    shellThickness = 20, 
  } = {}) {

    this.radius = radius;
    this.voxelResolution = voxelResolution;
    this.chunkSize = chunkSize;
    this.shellThickness = shellThickness;

    this.group = new THREE.Group();
    this.group.name = 'VoxelPlanet';

    this.chunks = [];

    this.computeChunkLayout();
    this.initializeChunks();
  }

  computeChunkLayout() {
    const extent = this.radius + this.shellThickness;
    const worldMin = -extent;
    const worldMax = extent;

    const span = worldMax - worldMin;
    this.chunksPerAxis = Math.ceil(span / (this.chunkSize * this.voxelResolution));

    this.worldMin = worldMin;
    this.worldMax = worldMax;
  }

  initializeChunks() {
    const n = this.chunksPerAxis;
    this.chunks = new Array(n * n * n);

    let index = 0;

    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {

          const originX = this.worldMin + x * this.chunkSize * this.voxelResolution;
          const originY = this.worldMin + y * this.chunkSize * this.voxelResolution;
          const originZ = this.worldMin + z * this.chunkSize * this.voxelResolution;

          const origin = new THREE.Vector3(originX, originY, originZ);

          const chunk = new Chunk({
            origin,
            size: this.chunkSize,
            voxelResolution: this.voxelResolution,
            getDensity: (p) => this.samplePlanetDensity(p)
          });

          this.chunks[index++] = chunk;
          this.group.add(chunk.meshGroup);
        }
      }
    }
  }

  samplePlanetDensity(point) {
    const dist = point.length();

    if (Math.abs(dist - this.radius) > this.shellThickness) {
      return 1; // air
    }

    const base = dist - this.radius;

    const terrain = getDensityAt(point);

    return base + terrain;
  }

  generate() {
    for (const chunk of this.chunks) {
      chunk.generateMesh();
    }
  }

  getChunkAt(worldPos) {
    const x = Math.floor((worldPos.x - this.worldMin) / (this.chunkSize * this.voxelResolution));
    const y = Math.floor((worldPos.y - this.worldMin) / (this.chunkSize * this.voxelResolution));
    const z = Math.floor((worldPos.z - this.worldMin) / (this.chunkSize * this.voxelResolution));

    if (x < 0 || y < 0 || z < 0 || x >= this.chunksPerAxis || y >= this.chunksPerAxis || z >= this.chunksPerAxis) {
      return null;
    }

    const index = x * this.chunksPerAxis * this.chunksPerAxis + y * this.chunksPerAxis + z;
    return this.chunks[index];
  }
}
