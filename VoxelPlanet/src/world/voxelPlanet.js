import * as THREE from 'three';
import { Chunk } from './chunk.js';
import { getDensityAt } from '../utils/worldGen.js';

export class VoxelPlanet {
  constructor({
    radius = 200,
    voxelResolution = 1,
    chunkSize = 32,
    shellThickness = 20,
    surfaceOffset = 8, 
  } = {}) {
    this.radius = radius;
    this.voxelResolution = voxelResolution;
    this.chunkSize = chunkSize;
    this.shellThickness = shellThickness;
    this.surfaceOffset = surfaceOffset;

    this.group = new THREE.Group();
    this.group.name = 'VoxelPlanet';

    this.chunks = [];

    this.densityModifications = new Map();

    this.computeChunkLayout();
    this.initializeChunks();
  }

  computeChunkLayout() {
    const extent = this.radius + this.shellThickness + (this.surfaceOffset || 0);
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
            getDensity: (p) => this.samplePlanetDensity(p),
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

    const base = dist - (this.radius + (this.surfaceOffset || 0));

    const terrain = getDensityAt(point);

    const gx = Math.round(point.x / this.voxelResolution) * this.voxelResolution;
    const gy = Math.round(point.y / this.voxelResolution) * this.voxelResolution;
    const gz = Math.round(point.z / this.voxelResolution) * this.voxelResolution;
    const key = `${gx},${gy},${gz}`;
    const modification = this.densityModifications.get(key) || 0;

    return base + terrain + modification;
  }

  modifyDensity(centerPoint, strength, radius) {
    const rSq = radius * radius;

    const minX = Math.floor((centerPoint.x - radius) / this.voxelResolution) * this.voxelResolution;
    const maxX = Math.ceil((centerPoint.x + radius) / this.voxelResolution) * this.voxelResolution;
    const minY = Math.floor((centerPoint.y - radius) / this.voxelResolution) * this.voxelResolution;
    const maxY = Math.ceil((centerPoint.y + radius) / this.voxelResolution) * this.voxelResolution;
    const minZ = Math.floor((centerPoint.z - radius) / this.voxelResolution) * this.voxelResolution;
    const maxZ = Math.ceil((centerPoint.z + radius) / this.voxelResolution) * this.voxelResolution;

    for (let x = minX; x <= maxX; x += this.voxelResolution) {
      for (let y = minY; y <= maxY; y += this.voxelResolution) {
        for (let z = minZ; z <= maxZ; z += this.voxelResolution) {
          const dx = x - centerPoint.x;
          const dy = y - centerPoint.y;
          const dz = z - centerPoint.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 <= rSq) {
            const d = Math.sqrt(d2);
            const falloff = 1 - (d / radius) ** 2;
            const key = `${x},${y},${z}`;
            const cur = this.densityModifications.get(key) || 0;
            this.densityModifications.set(key, cur + strength * falloff);
          }
        }
      }
    }

    const affected = new Set();
    for (const chunk of this.chunks) {
      const aMin = chunk.origin.clone();
      const aMax = chunk.origin.clone().add(new THREE.Vector3(this.chunkSize * this.voxelResolution, this.chunkSize * this.voxelResolution, this.chunkSize * this.voxelResolution));
      if (sphereIntersectsAABB(centerPoint, radius, aMin, aMax)) affected.add(chunk);
    }

    for (const c of affected) c.generateMesh();
  }

  generate() {
    for (const chunk of this.chunks) {
      chunk.generateMesh();
    }
  }

  async generateAsync(progressCallback = null, batchSize = 8) {
    const total = this.chunks.length;
    let processed = 0;

    for (let i = 0; i < total; i += batchSize) {
      const end = Math.min(i + batchSize, total);
      for (let j = i; j < end; j++) {
        this.chunks[j].generateMesh();
        processed++;
      }
      if (progressCallback) {
        try { progressCallback(processed / total); } catch(e) {}
      }
      await new Promise(resolve => setTimeout(resolve, 0));
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

function sphereIntersectsAABB(center, radius, aMin, aMax) {
  let dmin = 0;
  if (center.x < aMin.x) dmin += (center.x - aMin.x) ** 2;
  else if (center.x > aMax.x) dmin += (center.x - aMax.x) ** 2;
  if (center.y < aMin.y) dmin += (center.y - aMin.y) ** 2;
  else if (center.y > aMax.y) dmin += (center.y - aMax.y) ** 2;
  if (center.z < aMin.z) dmin += (center.z - aMin.z) ** 2;
  else if (center.z > aMax.z) dmin += (center.z - aMax.z) ** 2;
  return dmin <= radius * radius;
}
