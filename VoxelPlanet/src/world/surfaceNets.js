import * as THREE from 'three';

/**
 * A surfacenets isosurface extractor. 
 * This algorithm was originally made for a separate project in Godot that has been ported to Three.js
 */

const CORNER_OFFSETS = [
  [0,0,0],[1,0,0],[1,1,0],[0,1,0],
  [0,0,1],[1,0,1],[1,1,1],[0,1,1]
];

const EDGE_PAIRS = [
  [0,1],[1,2],[2,3],[3,0], 
  [4,5],[5,6],[6,7],[7,4], 
  [0,4],[1,5],[2,6],[3,7] 
];

export function surfaceNetsMesher(samples, dims, options = {}) {
  const nx = dims.nx;
  const ny = dims.ny;
  const nz = dims.nz;

  const scale = options.scale ?? 1;
  const materials = options.materials ?? null;

  const sampleIndex = (x,y,z) => x + y * nx + z * nx * ny;

  const pointCount = nx * ny * nz;
  const vertPos = new Float32Array(pointCount * 3);
  const hasVert = new Uint8Array(pointCount);

  const edgeHits = new Array(12);

  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const pi = sampleIndex(x,y,z);
        let hitCount = 0;

        for (let ei = 0; ei < EDGE_PAIRS.length; ei++) {
          const [cA, cB] = EDGE_PAIRS[ei];
          const ca = CORNER_OFFSETS[cA];
          const cb = CORNER_OFFSETS[cB];

          const ax = x + ca[0];
          const ay = y + ca[1];
          const az = z + ca[2];

          const bx = x + cb[0];
          const by = y + cb[1];
          const bz = z + cb[2];

          if (ax < 0 || ay < 0 || az < 0 || ax >= nx || ay >= ny || az >= nz) continue;
          if (bx < 0 || by < 0 || bz < 0 || bx >= nx || by >= ny || bz >= nz) continue;

          const aVal = samples[sampleIndex(ax,ay,az)];
          const bVal = samples[sampleIndex(bx,by,bz)];

          if ((aVal > 0) !== (bVal > 0)) {
            const t = aVal / (aVal - bVal);
            const vx = (ax + (bx - ax) * t);
            const vy = (ay + (by - ay) * t);
            const vz = (az + (bz - az) * t);
            edgeHits[hitCount++] = [vx, vy, vz];
          }
        }

        if (hitCount === 0) {
          vertPos[pi*3 + 0] = NaN;
          vertPos[pi*3 + 1] = NaN;
          vertPos[pi*3 + 2] = NaN;
          hasVert[pi] = 0;
        } else {
          let sx = 0, sy = 0, sz = 0;
          for (let i = 0; i < hitCount; i++) {
            const v = edgeHits[i];
            sx += v[0];
            sy += v[1];
            sz += v[2];
          }
          vertPos[pi*3 + 0] = (sx / hitCount) * scale;
          vertPos[pi*3 + 1] = (sy / hitCount) * scale;
          vertPos[pi*3 + 2] = (sz / hitCount) * scale;
          hasVert[pi] = 1;
        }
      }
    }
  }

  const positions = [];
  const normals = [];

  const materialTriangleMap = new Map();
  function pushTriangle(v0i, v1i, v2i, materialId = 0) {
    const v0x = vertPos[v0i*3 + 0], v0y = vertPos[v0i*3 + 1], v0z = vertPos[v0i*3 + 2];
    const v1x = vertPos[v1i*3 + 0], v1y = vertPos[v1i*3 + 1], v1z = vertPos[v1i*3 + 2];
    const v2x = vertPos[v2i*3 + 0], v2y = vertPos[v2i*3 + 1], v2z = vertPos[v2i*3 + 2];

    positions.push(v0x, v0y, v0z);
    positions.push(v1x, v1y, v1z);
    positions.push(v2x, v2y, v2z);

    const ux = v2x - v0x;
    const uy = v2y - v0y;
    const uz = v2z - v0z;
    const vx = v1x - v0x;
    const vy = v1y - v0y;
    const vz = v1z - v0z;

    const nxn = (uy * vz - uz * vy);
    const nyn = (uz * vx - ux * vz);
    const nzn = (ux * vy - uy * vx);

    const len = Math.hypot(nxn, nyn, nzn) || 1;
    const nnx = nxn / len;
    const nny = nyn / len;
    const nnz = nzn / len;

    normals.push(nnx, nny, nnz, nnx, nny, nnz, nnx, nny, nnz);

    const triIndex = (positions.length / 3) / 3 - 1;
    if (!materialTriangleMap.has(materialId)) {
      materialTriangleMap.set(materialId, { start: triIndex, count: 1 });
    } else {
      materialTriangleMap.get(materialId).count += 1;
    }
  }

  function addQuad(a, b, c, d, flip, matId) {
    if (flip) {
      pushTriangle(a, b, c, matId);
      pushTriangle(c, d, a, matId);
    } else {
      pushTriangle(c, b, a, matId);
      pushTriangle(a, d, c, matId);
    }
  }

  for (let z = 1; z < nz; z++) {
    for (let y = 1; y < ny; y++) {
      for (let x = 1; x < nx; x++) {
        const sIndex = sampleIndex(x,y,z);
        if (!hasVert[sIndex]) continue;

        if (x < nx - 1) {
          const aVal = samples[sampleIndex(x,y,z)];
          const bVal = samples[sampleIndex(x+1,y,z)];
          if ((aVal > 0) !== (bVal > 0)) {
            const v0 = sampleIndex(x,     y - 1, z - 1);
            const v1 = sampleIndex(x,     y - 0, z - 1);
            const v2 = sampleIndex(x,     y - 0, z - 0);
            const v3 = sampleIndex(x,     y - 1, z - 0);

            if (hasVert[v0] && hasVert[v1] && hasVert[v2] && hasVert[v3]) {
              const mat = materials ? (bVal > 0 ? materials[sampleIndex(x+1,y,z)] : materials[sampleIndex(x,y,z)]) : 0;
              addQuad(v0, v1, v2, v3, bVal > 0, mat);
            }
          }
        }

        if (y < ny - 1) {
          const aVal = samples[sampleIndex(x,y,z)];
          const bVal = samples[sampleIndex(x,y+1,z)];
          if ((aVal > 0) !== (bVal > 0)) {
            const v0 = sampleIndex(x - 1, y, z - 1);
            const v1 = sampleIndex(x - 1, y, z - 0);
            const v2 = sampleIndex(x - 0, y, z - 0);
            const v3 = sampleIndex(x - 0, y, z - 1);

            if (hasVert[v0] && hasVert[v1] && hasVert[v2] && hasVert[v3]) {
              const mat = materials ? (bVal > 0 ? materials[sampleIndex(x,y+1,z)] : materials[sampleIndex(x,y,z)]) : 0;
              addQuad(v0, v1, v2, v3, bVal > 0, mat);
            }
          }
        }

        if (z < nz - 1) {
          const aVal = samples[sampleIndex(x,y,z)];
          const bVal = samples[sampleIndex(x,y,z+1)];
          if ((aVal > 0) !== (bVal > 0)) {
            const v0 = sampleIndex(x - 1, y - 1, z);
            const v1 = sampleIndex(x - 0, y - 1, z);
            const v2 = sampleIndex(x - 0, y - 0, z);
            const v3 = sampleIndex(x - 1, y - 0, z);

            if (hasVert[v0] && hasVert[v1] && hasVert[v2] && hasVert[v3]) {
              const mat = materials ? (bVal > 0 ? materials[sampleIndex(x,y,z+1)] : materials[sampleIndex(x,y,z)]) : 0;
              addQuad(v0, v1, v2, v3, bVal > 0, mat);
            }
          }
        }
      }
    }
  }

  const posArr = new Float32Array(positions);
  const norArr = new Float32Array(normals);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(norArr, 3));

  geometry.clearGroups();
  for (const [matId, { start, count }] of materialTriangleMap.entries()) {
    const vertexStart = start * 3;
    const vertexCount = count * 3;
    geometry.addGroup(vertexStart, vertexCount, matId);
  }

  return {
    geometry,
    materialGroups: materialTriangleMap
  };
}
