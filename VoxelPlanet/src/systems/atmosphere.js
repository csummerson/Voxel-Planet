import * as THREE from 'three';

export function createAtmosphere(planet, sunLight) {
  const atmosphereRadius = planet.radius * 1.25;
  
  const atmosphereGeometry = new THREE.IcosahedronGeometry(atmosphereRadius, 32);
  
  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      sunDirection: { value: new THREE.Vector3(0, 1, 0).normalize() },
      planetCenter: { value: new THREE.Vector3(0, 0, 0) },
      atmosphereRadius: { value: atmosphereRadius }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vCameraToVertex;
      
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vNormal = normalize(normalMatrix * normal);
        vCameraToVertex = vWorldPosition - cameraPosition;
        
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vCameraToVertex;
      
      uniform vec3 sunDirection;
      uniform vec3 planetCenter;
      uniform float atmosphereRadius;
      
      void main() {
        vec3 toPoint = normalize(vWorldPosition - planetCenter);
        
        float sunFacing = dot(toPoint, sunDirection);
        
        float sunExposure = smoothstep(-0.3, 1.0, sunFacing);
        
        float edgeFade = abs(sunFacing);
        edgeFade = smoothstep(1.0, -0.2, edgeFade); 
        
        vec3 sunFacingColor = vec3(0.2, 0.5, 1.0);
        vec3 edgeColor = vec3(1.0, 0.4, 0.2);
        vec3 baseColor = mix(sunFacingColor, edgeColor, edgeFade);
        
        float sunAlpha = mix(0.0, 0.5, sunExposure);
        float edgeAlpha = edgeFade * 0.3;
        float finalAlpha = max(sunAlpha, edgeAlpha);
        
        gl_FragColor = vec4(baseColor, finalAlpha);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  atmosphere.position.set(0, 0, 0);
  
  atmosphere.material.uniforms.sunDirection.value.copy(
    (function(){
      const v = sunLight.position.clone();
      if (v.lengthSq() === 0) return new THREE.Vector3(0,1,0);
      return v.normalize();
    })()
  );
  
  atmosphere.updateSunDirection = function(sunPosition) {
    const v = sunPosition.clone();
    if (v.lengthSq() === 0) v.set(0,1,0);
    this.material.uniforms.sunDirection.value.copy(v.normalize());
  };
  
  return atmosphere;
}
