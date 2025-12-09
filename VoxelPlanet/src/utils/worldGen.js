import { noise2, noise3 } from './noise.js';

const CONTINENT_FREQ = 0.0008;
const RIDGE_FREQ     = 0.004;
const DETAIL_FREQ    = 0.025;     
const MICRO_FREQ     = 0.08;

const CONTINENT_AMP = 45;
const RIDGE_AMP     = 18;
const DETAIL_AMP    = 8;
const MICRO_AMP     = 2;

const MATERIAL_WATER = -100;
const MATERIAL_SAND = -50;
const MATERIAL_GRASS = 0;
const MATERIAL_STONE = 50;
const MATERIAL_SNOW = 100;

function ridged(n) {
  return 1.0 - Math.abs(n);
}

export function getDensityAt(point) {
  const x = point.x;
  const y = point.y;
  const z = point.z;

  const c = noise3(x * CONTINENT_FREQ, y * CONTINENT_FREQ, z * CONTINENT_FREQ);
  const continents = c * CONTINENT_AMP;

  const r = noise3(x * RIDGE_FREQ, y * RIDGE_FREQ, z * RIDGE_FREQ);
  const ridgeShape = ridged(r) * RIDGE_AMP;

  const d = noise3(x * DETAIL_FREQ, y * DETAIL_FREQ, z * DETAIL_FREQ);
  const detail = d * DETAIL_AMP;

  const m = noise3(x * MICRO_FREQ, y * MICRO_FREQ, z * MICRO_FREQ);
  const microDetail = m * MICRO_AMP;

  const terrain = continents + ridgeShape + detail + microDetail;

  const elevation = -terrain;
  let materialOffset = 0;

  if (elevation < -8) {
    materialOffset = MATERIAL_WATER;     // deep ocean
  } else if (elevation < -2) {
    materialOffset = MATERIAL_SAND;      // beach
  } else if (elevation < 15) {
    materialOffset = MATERIAL_GRASS;     // plains
  } else if (elevation < 35) {
    materialOffset = MATERIAL_STONE;     // mountains
  } else {
    materialOffset = MATERIAL_SNOW;      // peaks
  }

  const biomeNoise = noise3(x * 0.005, y * 0.005, z * 0.005) * 5;
  materialOffset += biomeNoise;

  return terrain + materialOffset * 0.01;
}

export function getMaterialAt(point) {
  const x = point.x;
  const y = point.y;
  const z = point.z;

  const distance = Math.sqrt(x * x + y * y + z * z);

  if (distance < 20) {
    return 0x1a4d7f;  // water
  } else if (distance < 40) {
    return 0xd4af37;  // sand
  } else if (distance < 60) {
    return 0x6ba83f;  // grass
  } else if (distance < 80) {
    return 0x888888;  // stone
  } else {
    return 0xffffff;  // snow 
  }
}
