// O MUNDO ESQUECIDO em 3D.
//
// No 2D, uma máscara cinza era aplicada por cima da tela. No 3D fazemos isso
// dentro do próprio material: um trecho de código de shader (programa que roda
// na placa de vídeo) é "injetado" nos materiais do Three.js. Para cada pixel,
// ele mede a distância até os círculos de memória restaurada e, fora deles,
// mistura a cor com o cinza.
//
// Todos os materiais compartilham os mesmos "uniforms" (valores enviados à
// placa de vídeo), então atualizar as zonas uma vez por quadro vale para tudo.

import * as THREE from '../vendor/three/three.module.js';

const MAX_ZONES = 8;

export function createMemoryUniforms() {
  return {
    uZones: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Vector3()) },
    uZoneCount: { value: 0 },
    uForgotten: { value: 0.7 },
  };
}

// Atualiza as zonas a partir do MemorySystem (coordenadas em pixels → unidades 3D).
export function updateMemoryUniforms(uniforms, memory, forgotten, unit) {
  const zones = memory.zones.slice(0, MAX_ZONES);
  zones.forEach((z, i) => uniforms.uZones.value[i].set(z.x / unit, -z.y / unit, Math.max(0.001, z.r / unit)));
  uniforms.uZoneCount.value = zones.length;
  uniforms.uForgotten.value = forgotten;
}

// Aplica o efeito num material (MeshStandardMaterial, MeshBasicMaterial...).
export function applyMemoryShader(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLumWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 lumWP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lumWP = instanceMatrix * lumWP;
        #endif
        vLumWorld = (modelMatrix * lumWP).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLumWorld;
        uniform vec3 uZones[${MAX_ZONES}];
        uniform int uZoneCount;
        uniform float uForgotten;`)
      .replace('#include <dithering_fragment>', `
        float lumKeep = 0.0;
        for (int i = 0; i < ${MAX_ZONES}; i++) {
          if (i >= uZoneCount) break;
          vec3 zn = uZones[i];
          float d = distance(vLumWorld.xy, zn.xy);
          lumKeep = max(lumKeep, 1.0 - smoothstep(zn.z * 0.55, zn.z, d));
        }
        float lumGray = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(lumGray), uForgotten * (1.0 - lumKeep));
        #include <dithering_fragment>`);
  };
  material.customProgramCacheKey = () => 'lumora-memory';
  return material;
}
