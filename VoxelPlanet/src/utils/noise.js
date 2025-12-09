import { makeNoise2D, makeNoise3D, makeNoise4D } from "https://jspm.dev/open-simplex-noise";

let seed = Math.floor(Math.random() * 1e9);
let noise2D = makeNoise2D(seed);
let noise3D = makeNoise3D(seed);
let noise4D = makeNoise4D(seed);

export function setNoiseSeed(newSeed) {
  seed = newSeed;
  noise2D = makeNoise2D(seed);
  noise3D = makeNoise3D(seed);
  noise4D = makeNoise4D(seed);
}

export function noise2(x, y) {
  return noise2D(x, y); 
}

export function noise3(x, y, z) {
  return noise3D(x, y, z); 
}

export function fbm3(x, y, z, octaves = 5, persistence = 0.5, lacunarity = 2.0) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
    frequency *= lacunarity;
    amplitude *= persistence;
  }

  return value;
}

export function ridged3(x, y, z) {
  const n = noise3D(x, y, z);
  return 1.0 - Math.abs(n); // 0..1
}
