// "Recorte de papel" iluminado: transforma o desenho 2D de um objeto do jogo
// (o mesmo draw() do modo clássico) numa placa dentro do mundo 3D.
//
// A cada quadro, o objeto se desenha num pequeno canvas; esse canvas vira a
// textura de um plano. O plano recebe luz das luzes do mundo e projeta uma
// sombra com o formato exato do desenho (graças ao alphaTest no material de sombra).
//
// Na Etapa B do 3D, cada personagem pode trocar o recorte por um modelo 3D,
// sem mudar mais nada no jogo.

import * as THREE from '../vendor/three/three.module.js';
import { applyMemoryShader } from './memoryShader.js';

export class SpriteCard {
  // box: { left, top, width, height } em pixels, relativo ao ponto de âncora
  // anchor(obj) → { x, y } em pixels no mundo
  // draw(ctx, obj, time) → desenha o objeto em coordenadas do mundo
  constructor({ box, anchor, draw, z = 0, unit, uniforms = null, glow = 0.45, shadow = true }) {
    this.box = box;
    this.anchor = anchor;
    this.drawFn = draw;
    this.unit = unit;

    this.canvas = document.createElement('canvas');
    this.canvas.width = box.width;
    this.canvas.height = box.height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter; // pixels nítidos, sem borrão
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: this.texture,
      emissiveMap: this.texture,
      emissive: 0xffffff,
      emissiveIntensity: glow, // um pouco de luz própria: o personagem nunca some no escuro
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 1,
    });
    if (uniforms) applyMemoryShader(mat, uniforms);

    const geo = new THREE.PlaneGeometry(box.width / unit, box.height / unit);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.z = z;
    if (shadow) {
      this.mesh.castShadow = true;
      this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking, map: this.texture, alphaTest: 0.35,
      });
    }
  }

  update(obj, time, scene) {
    const a = this.anchor(obj);
    const b = this.box;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, b.width, b.height);
    // Desloca o desenho para que a âncora caia no lugar certo dentro do canvas
    ctx.setTransform(1, 0, 0, 1, Math.round(-(a.x + b.left)), Math.round(-(a.y + b.top)));
    ctx.globalAlpha = 1;
    this.drawFn(ctx, obj, time, scene);
    this.texture.needsUpdate = true;
    const u = this.unit;
    this.mesh.position.x = (a.x + b.left + b.width / 2) / u;
    this.mesh.position.y = -(a.y + b.top + b.height / 2) / u;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    if (this.mesh.customDepthMaterial) this.mesh.customDepthMaterial.dispose();
    this.texture.dispose();
  }
}
