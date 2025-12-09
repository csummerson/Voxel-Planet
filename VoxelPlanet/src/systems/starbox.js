import * as THREE from 'three';

export function createStarbox() {
  const starboxSize = 5000;
  
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#ffffff';
  const starCount = 2000;
  
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 1.5;
    const brightness = Math.random();
    
    ctx.globalAlpha = brightness;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.globalAlpha = 1.0;
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    fog: false
  });
  
  const geometry = new THREE.SphereGeometry(starboxSize, 32, 32);
  const starbox = new THREE.Mesh(geometry, material);
  
  return starbox;
}
