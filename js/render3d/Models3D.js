// PERSONAGENS 3D (low-poly), montados com formas simples e animados por código.
//
// Cada modelo lê o MESMO estado que o desenho 2D usa (posição, estado, facing,
// "calmo", piscando...). Nada no jogo muda: só a aparência no modo 3D.
//
//   Nilo · Mira · Murcho · Traça · Cristalídeo · Sopro · Eco Vazio · Vulto (personagem)
//   Os chefes continuam como "recortes" (SpriteCard): são grandes e cheios de detalhe.
//
// Unidades: 1 = 1 bloco (16 px). O modelo nasce com os pés (ou o centro) na origem,
// olhando para +x; o giro em y mostra os personagens em "três quartos" para a câmera.
// Modelo novo? Crie uma classe com group, update(obj, time, scene) e dispose(),
// e registre em MODELS (no fim do arquivo).

import * as THREE from '../vendor/three/three.module.js';
import { applyMemoryShader } from './memoryShader.js';

const PX = 1 / 16;
const TURN = 0.5; // quanto o personagem vira para a câmera (radianos)

// Base: guarda geometrias e materiais para liberar tudo depois.
class Model {
  constructor(uniforms = null) {
    this.group = new THREE.Group();
    this.uniforms = uniforms;
    this.owned = [];
  }

  mat(color, opts = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, flatShading: true, ...opts });
    if (this.uniforms && !opts.noMemory) applyMemoryShader(m, this.uniforms);
    this.owned.push(m);
    return m;
  }

  // Caixa em pixels (w, h, d), posicionada pelo centro (x, y, z) em pixels.
  box(parent, w, h, d, material, x = 0, y = 0, z = 0) {
    const g = new THREE.BoxGeometry(w * PX, h * PX, d * PX);
    this.owned.push(g);
    const m = new THREE.Mesh(g, material);
    m.position.set(x * PX, y * PX, z * PX);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    this.owned.push(geometry);
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x * PX, y * PX, z * PX);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  // Pivô (articulação) em pixels: braços e pernas giram em volta dele.
  pivot(parent, x, y, z = 0) {
    const g = new THREE.Group();
    g.position.set(x * PX, y * PX, z * PX);
    parent.add(g);
    return g;
  }

  face(facing) {
    this.group.rotation.y = facing > 0 ? -TURN : Math.PI + TURN;
  }

  place(xPx, yPx, z = 0) {
    this.group.position.set(xPx * PX, -yPx * PX, z);
  }

  dispose() {
    for (const o of this.owned) o.dispose();
  }
}

// ------------------------------------------------------------------
// NILO (e, com outra paleta, o Eco Vazio — a sombra dele)
// ------------------------------------------------------------------
const NILO_COLORS = {
  boot: '#241d38', pants: '#3d4f7a', tunic: '#2e9c8c', tunicDark: '#1f6f66', belt: '#d9b25f',
  skin: '#f4cfa6', hood: '#4a3f9a', hoodDark: '#2b255f', eye: '#1a1426', scarf: '#ff8a3d', scarfDark: '#d9622a',
};
const SHADOW_COLORS = Object.fromEntries(Object.keys(NILO_COLORS).map((k) => [k, k === 'eye' ? '#b48cff' : '#1a1028']));

export class NiloModel extends Model {
  constructor(uniforms, { shadow = false } = {}) {
    super(shadow ? uniforms : null);
    this.shadow = shadow;
    const C = shadow ? SHADOW_COLORS : NILO_COLORS;
    const extra = shadow ? { transparent: true, opacity: 0.82, emissive: '#2e1f45', emissiveIntensity: 0.6 } : {};
    const M = {};
    for (const [k, c] of Object.entries(C)) M[k] = this.mat(c, extra);
    if (shadow) M.eye = this.mat('#b48cff', { emissive: '#b48cff', emissiveIntensity: 2, noMemory: true });

    this.body = new THREE.Group();
    this.group.add(this.body);
    const b = this.body;

    // Pernas (pivô no quadril)
    this.legs = [-2.2, 2.2].map((z) => {
      const p = this.pivot(b, 0, 5, z);
      this.box(p, 3, 4, 3, M.pants, 0, -2, 0);
      this.box(p, 3.6, 2, 3.4, M.boot, 0.4, -4.5, 0);
      return p;
    });
    // Tronco, cinto
    this.box(b, 7, 7, 7, M.tunic, 0, 8.5, 0);
    this.box(b, 7.4, 1, 7.4, M.belt, 0, 7, 0);
    this.box(b, 7.4, 1, 7.4, M.tunicDark, 0, 5.5, 0);
    // Braços (pivô no ombro)
    this.arms = [-4.6, 4.6].map((z) => {
      const p = this.pivot(b, 0, 11.5, z);
      this.box(p, 2.2, 4.5, 2.2, M.tunic, 0, -2.2, 0);
      this.box(p, 2.2, 1.2, 2.2, M.skin, 0, -5, 0);
      return p;
    });
    // Gema no peito (brilha; dourada com um fragmento guardado)
    this.gemMat = shadow ? M.eye : this.mat('#8ff7ff', { emissive: '#8ff7ff', emissiveIntensity: 1.6 });
    this.gem = this.box(b, 1.2, 2.4, 2.4, this.gemMat, 3.8, 9.5, 0);
    // Gola e cachecol
    this.box(b, 8, 2, 8, M.scarf, 0, 12.4, 0);
    this.scarf = [];
    for (let i = 0; i < 5; i++) {
      this.scarf.push(this.box(b, 2.2, 1.8, 2, i % 2 ? M.scarfDark : M.scarf, -4.5 - i * 2, 12, 0));
    }
    // Cabeça e capuz
    this.head = this.pivot(b, 0, 13.5, 0);
    const h = this.head;
    this.box(h, 7.5, 7, 7.5, M.skin, 0.3, 3.5, 0);
    this.box(h, 8.6, 2.4, 8.4, M.hood, -0.2, 7.6, 0);
    this.box(h, 3, 6.5, 8.4, M.hood, -3.2, 3.9, 0);
    this.box(h, 1.2, 1.4, 8.4, M.hoodDark, 3.4, 6.2, 0); // franja
    const tip = this.mesh(h, new THREE.ConeGeometry(1.6 * PX, 4 * PX, 4), M.hood, -5.6, 7.2, 0);
    tip.rotation.z = Math.PI / 2;
    this.eyes = [-1.6, 1.6].map((z) => this.box(h, 0.6, 1.8, 1.1, M.eye, 4.1, 4, z));
    // Borda brilhante do capuz (nível de memória 2)
    this.rimMat = shadow ? M.hoodDark : this.mat('#8ff7ff', { emissive: '#8ff7ff', emissiveIntensity: 1.4 });
    this.rim = this.box(h, 8.8, 0.6, 8.6, this.rimMat, -0.2, 8.9, 0);
    this.rim.visible = false;
    this.goldMat = this.mat('#ffd98a', { emissive: '#ffd98a', emissiveIntensity: 1.5, noMemory: true });
  }

  update(p, t) {
    // Eco Vazio adormecido: só a poça de sombra (ele mesmo desenha isso no 2D)
    if (this.shadow) {
      const dormant = p.state === 'dormant';
      this.body.visible = !dormant;
      this.place(p.x + p.w / 2, p.y + p.h, 0.15);
      this.face(p.facing);
      const a = !p.alive ? Math.max(0, p.dying / 0.6) : 1;
      this.body.scale.setScalar(0.4 + 0.6 * a);
      this.animate(p.pose || 'idle', t, t);
      return;
    }
    this.place(p.x + p.w / 2, p.y + p.h, 0.2);
    this.face(p.facing);
    // Piscando (invulnerável): some em quadros alternados, como no 2D
    this.group.visible = !(p.alive && p.invuln > 0 && Math.floor(p.invuln * 16) % 2 === 0);
    // Achatar ao pousar / esticar ao pular
    let sx = 1;
    let sy = 1;
    if (p.squash > 0) {
      const k = p.squash / 0.12;
      sx = 1 + 0.22 * k;
      sy = 1 - 0.18 * k;
    } else if (p.state === 'jump') {
      sx = 0.92;
      sy = 1.08;
    }
    this.body.scale.set(sx, sy, sx);
    this.gemMat.color.set(p.charged ? '#ffd98a' : '#8ff7ff');
    this.gemMat.emissive.set(p.charged ? '#ffd98a' : '#8ff7ff');
    this.gemMat.emissiveIntensity = p.charged ? 1.6 + Math.sin(t * 6) * 0.6 : 1.2;
    this.rim.visible = p.memoryLevel >= 2;
    this.scarf.forEach((s, i) => {
      if (p.memoryLevel >= 1 && i % 2 === 0) s.material = this.goldMat;
    });
    this.animate(p.state, p.animTime, t);
  }

  animate(state, animTime, t) {
    const phase = animTime * 11;
    let legA = 0;
    let armA = 0;
    let lean = 0;
    let bob = 0;
    if (state === 'run') {
      legA = Math.sin(phase) * 0.8;
      armA = -Math.sin(phase) * 0.7;
      bob = Math.abs(Math.sin(phase)) * 0.8;
      lean = -0.12;
    } else if (state === 'jump') {
      legA = 0.6;
      armA = -2.2;
    } else if (state === 'fall') {
      legA = -0.4;
      armA = -2.6;
    } else if (state === 'hurt') {
      legA = -0.5;
      armA = -2.8;
      lean = 0.35;
    } else if (state === 'victory') {
      armA = -3;
      bob = Math.abs(Math.sin(t * 8)) * 1.5;
    } else {
      bob = Math.sin(t * 3) > 0.4 ? 0.4 : 0;
    }
    this.legs[0].rotation.z = legA;
    this.legs[1].rotation.z = -legA;
    this.arms[0].rotation.z = armA;
    this.arms[1].rotation.z = state === 'run' ? -armA : armA;
    this.body.rotation.z = lean;
    this.body.position.y = bob * PX;
    this.head.rotation.z = state === 'run' ? 0.05 : 0;
    // Cachecol: tremula para trás em movimento, cai parado
    const moving = state !== 'idle';
    this.scarf.forEach((s, i) => {
      const wave = Math.sin(t * 9 - i * 0.9) * (moving ? 1.2 : 0.5);
      const droop = moving ? (state === 'fall' ? -i * 0.8 : i * 0.25) : i * 1.1;
      s.position.y = (12 - droop + wave) * PX;
      s.position.z = Math.sin(t * 5 - i) * 0.6 * PX;
    });
    this.eyes.forEach((e) => { e.scale.y = (t % 3.5) < 0.12 ? 0.3 : 1; });
  }
}

// ------------------------------------------------------------------
// MIRA — raposa-lanterna com a cauda em chama azul
// ------------------------------------------------------------------
export class MiraModel extends Model {
  constructor() {
    super(null);
    const fur = this.mat('#dfe9ff', { emissive: '#8fb4ff', emissiveIntensity: 0.35 });
    const dark = this.mat('#1a1426');
    const inner = this.mat('#9fb4ff');
    this.box(this.group, 9, 4.5, 5, fur, -0.5, 0, 0);
    this.legs = [[-3, -1.5], [-3, 1.5], [2.5, -1.5], [2.5, 1.5]].map(([x, z]) => this.box(this.group, 1.4, 2.5, 1.4, inner, x, -3, z));
    this.head = this.pivot(this.group, 4.5, 2.5, 0);
    this.box(this.head, 5, 5, 5, fur, 0.5, 0, 0);
    this.box(this.head, 2.5, 2, 3, this.mat('#f4f8ff', { emissive: '#ffffff', emissiveIntensity: 0.3 }), 3.6, -1, 0);
    this.box(this.head, 0.8, 0.8, 0.8, dark, 4.9, -0.6, 0);
    [-1.4, 1.4].forEach((z) => {
      this.box(this.head, 0.6, 1, 1, dark, 2.9, 0.6, z);
      const ear = this.mesh(this.head, new THREE.ConeGeometry(1.2 * PX, 3 * PX, 4), fur, 0, 3.6, z);
      ear.rotation.y = Math.PI / 4;
    });
    // Cauda e chama
    this.tail = this.pivot(this.group, -5, 1, 0);
    this.box(this.tail, 3, 2.2, 2.2, fur, -1.5, 0.5, 0);
    this.box(this.tail, 3, 2.6, 2.6, fur, -3.5, 2, 0);
    this.flameMat = this.mat('#5fa8ff', { emissive: '#5fa8ff', emissiveIntensity: 2.2 });
    this.flameCore = this.mat('#ffffff', { emissive: '#8ff7ff', emissiveIntensity: 2.5 });
    this.flames = [
      this.mesh(this.tail, new THREE.ConeGeometry(1.8 * PX, 5 * PX, 5), this.flameMat, -5.5, 5.5, 0),
      this.mesh(this.tail, new THREE.ConeGeometry(1 * PX, 3.5 * PX, 5), this.flameCore, -5.5, 5.2, 0),
    ];
  }

  update(m, t) {
    this.place(m.x, m.y + Math.sin(t * 2.5) * 2, 0.7);
    this.face(m.facing);
    this.flames.forEach((f, i) => {
      const k = 1 + Math.sin(t * (14 - i * 3) + i) * 0.18;
      f.scale.set(1, k, 1);
    });
    this.tail.rotation.z = Math.sin(t * 3) * 0.15;
    this.head.rotation.z = Math.sin(t * 1.3) * 0.08;
    this.legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 4 + i) * 0.2; });
  }
}

// ------------------------------------------------------------------
// MURCHO — bulbo seco que anda; lembrado, floresce e vira trampolim
// ------------------------------------------------------------------
export class MurchoModel extends Model {
  constructor(uniforms) {
    super(uniforms);
    this.dry = { body: this.mat('#7a6a5a'), leaf: this.mat('#8c8a6a'), root: this.mat('#4f4438') };
    this.green = { body: this.mat('#4fa86a'), leaf: this.mat('#7fe08a'), root: this.mat('#2c7a6b') };
    this.bodyMesh = this.mesh(this.group, new THREE.IcosahedronGeometry(5.5 * PX, 0), this.dry.body, 0, 6, 0);
    this.bodyMesh.scale.set(1, 0.8, 0.9);
    this.legs = [-2, 2].map((z) => this.box(this.group, 2, 2.5, 2, this.dry.root, 0, 1.2, z));
    this.leaves = [[-3, 0.6], [2.5, -0.5], [0, 0.1]].map(([x, rz]) => {
      const l = this.box(this.group, 5, 0.8, 3, this.dry.leaf, x, 11, 0);
      l.rotation.z = rz;
      return l;
    });
    this.eyeMat = this.mat('#ffcf6b', { emissive: '#ffb84a', emissiveIntensity: 1.2, noMemory: true });
    this.eyes = [-1.4, 1.4].map((z) => this.box(this.group, 0.8, 1.6, 1, this.eyeMat, 4.8, 6.5, z));
    const petal = this.mat('#ff9ad5', { emissive: '#ff9ad5', emissiveIntensity: 0.4 });
    this.flower = this.mesh(this.group, new THREE.CylinderGeometry(5 * PX, 4 * PX, 2 * PX, 8), petal, 0, 14.5, 0);
    this.flower.add(new THREE.Mesh(this.track(new THREE.CylinderGeometry(1.4 * PX, 1.4 * PX, 1 * PX, 6)), this.mat('#ffe48a', { emissive: '#ffe48a', emissiveIntensity: 0.6 })));
    this.flower.children[0].position.y = 1.4 * PX;
    this.flower.visible = false;
  }

  track(g) {
    this.owned.push(g);
    return g;
  }

  update(e, t) {
    this.place(e.x + e.w / 2, e.y + e.h, 0.1);
    this.face(e.facing);
    const calm = e.calm;
    const set = calm ? this.green : this.dry;
    this.bodyMesh.material = set.body;
    this.legs.forEach((l) => { l.material = set.root; });
    this.leaves.forEach((l, i) => {
      l.material = set.leaf;
      l.rotation.z = calm ? (i === 0 ? 0.7 : i === 1 ? -0.7 : 0) : [0.6, -0.5, 0.1][i];
    });
    this.flower.visible = calm;
    this.eyes.forEach((ey) => { ey.visible = !calm; });
    const step = Math.sin(e.time * 10) > 0 ? 1 : 0;
    this.legs[0].position.y = (1.2 + (calm ? 0 : step * 0.8)) * PX;
    this.legs[1].position.y = (1.2 + (calm ? 0 : (1 - step) * 0.8)) * PX;
    // Mola (quique) e derrota
    const k = (e.springTime || 0) / 0.25;
    let s = 1;
    if (!e.alive) s = Math.max(0.05, e.dying / 0.6);
    this.group.scale.set(s * (1 + 0.25 * k), s * (1 - 0.3 * k), s);
  }
}

// ------------------------------------------------------------------
// TRAÇA-DE-CINZA — mariposa que paira e mergulha
// ------------------------------------------------------------------
export class TracaModel extends Model {
  constructor(uniforms) {
    super(uniforms);
    this.grey = { wing: this.mat('#8a8496'), body: this.mat('#4a4456') };
    this.lilac = { wing: this.mat('#c7a6ff', { emissive: '#8a5fd0', emissiveIntensity: 0.4 }), body: this.mat('#5a4a76') };
    this.bodyMesh = this.mesh(this.group, new THREE.CylinderGeometry(1.4 * PX, 1 * PX, 8 * PX, 6), this.grey.body, 0, 0, 0);
    this.bodyMesh.rotation.z = Math.PI / 2;
    this.wings = [-1, 1].map((side) => {
      const p = this.pivot(this.group, 0, 0.5, side * 1.2);
      this.box(p, 6, 0.6, 7, this.grey.wing, 0, 0, side * 3.5);
      return p;
    });
    this.eyeMat = this.mat('#c9a37a', { emissive: '#ff8a3d', emissiveIntensity: 0.6, noMemory: true });
    [-0.8, 0.8].forEach((z) => this.box(this.group, 0.8, 0.8, 0.8, this.eyeMat, 4, 0.8, z));
    [-0.6, 0.6].forEach((z) => {
      const a = this.box(this.group, 0.4, 3, 0.4, this.grey.body, 3.5, 2.5, z);
      a.rotation.z = -0.6;
    });
  }

  update(e, t) {
    let x = e.x + e.w / 2;
    if (e.state === 'windup') x += Math.sin(e.time * 60) > 0 ? 1 : -1;
    this.place(x, e.y + e.h / 2, 0.1);
    const dx = e.state === 'dive' ? e.dvx : Math.cos(e.phase * 1.1);
    this.face(dx >= 0 ? 1 : -1);
    const set = e.calm ? this.lilac : this.grey;
    this.bodyMesh.material = set.body;
    this.wings.forEach((w) => { w.children[0].material = set.wing; });
    const diving = e.state === 'dive';
    const flap = diving ? 1.2 : Math.sin(e.time * 22) * 0.7;
    this.wings[0].rotation.x = flap;
    this.wings[1].rotation.x = -flap;
    this.eyeMat.emissiveIntensity = e.state === 'hover' ? 0.4 : 2;
    this.group.rotation.z = diving ? -0.5 : 0;
    const s = e.alive ? 1 : Math.max(0.05, e.dying / 0.6);
    this.group.scale.setScalar(s);
  }
}

// ------------------------------------------------------------------
// CRISTALÍDEO — tatu de cristal: cúpula, rola, racha
// ------------------------------------------------------------------
export class CristalideoModel extends Model {
  constructor(uniforms) {
    super(uniforms);
    this.shell = this.mat('#2a3f7a');
    this.shellCalm = this.mat('#2c7a9b');
    this.plate = this.mat('#8fd1ff', { emissive: '#8fd1ff', emissiveIntensity: 0.8 });
    this.walk = new THREE.Group();
    this.group.add(this.walk);
    this.dome = this.mesh(this.walk, new THREE.SphereGeometry(7 * PX, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), this.shell, 0, 2, 0);
    this.dome.scale.set(1, 1.15, 0.85);
    this.plates = [[-3, 9, 0], [0.5, 10.5, 0], [4, 8.5, 0]].map(([x, y, z]) => {
      const m = this.mesh(this.walk, new THREE.OctahedronGeometry(1.8 * PX, 0), this.plate, x, y, z);
      m.scale.set(0.7, 1.6, 0.7);
      return m;
    });
    this.headMesh = this.box(this.walk, 3, 4, 3.5, this.mat('#3a5fa0'), 7.5, 3.5, 0);
    this.eye = this.box(this.walk, 0.8, 0.8, 0.8, this.mat('#ff8fe0', { emissive: '#ff8fe0', emissiveIntensity: 1.5, noMemory: true }), 9, 4.5, 1.2);
    this.legs = [-4, 4].map((x) => this.box(this.walk, 2.4, 2, 5, this.mat('#1a2550'), x, 1, 0));
    this.crack = this.mat('#ff8fe0', { emissive: '#ff8fe0', emissiveIntensity: 2, noMemory: true });
    this.cracks = [[-2, 7, 3.2], [2, 8, 3.4]].map(([x, y, z]) => this.box(this.walk, 0.8, 3.5, 0.5, this.crack, x, y, z));
    this.stars = [0, 1, 2].map(() => this.mesh(this.group, new THREE.OctahedronGeometry(0.9 * PX, 0), this.mat('#ffd98a', { emissive: '#ffd98a', emissiveIntensity: 2, noMemory: true }), 0, 16, 0));
    this.ball = this.mesh(this.group, new THREE.IcosahedronGeometry(6 * PX, 1), this.shell, 0, 6, 0);
    this.band = this.box(this.ball, 1.6, 12.5, 12.5, this.plate, 0, 0, 0);
    this.band.position.set(0, 0, 0);
  }

  update(e, t) {
    this.place(e.x + e.w / 2, e.y + e.h, 0.1);
    this.face(e.facing);
    const rolling = e.state === 'roll';
    this.walk.visible = !rolling;
    this.ball.visible = rolling;
    const shell = e.calm ? this.shellCalm : this.shell;
    this.dome.material = shell;
    this.ball.material = shell;
    if (rolling) this.ball.rotation.z = -e.spin / 6 * (e.facing > 0 ? 1 : -1);
    const curl = e.state === 'windup';
    this.walk.scale.y = curl ? 0.8 : 1;
    this.walk.position.x = curl ? (Math.sin(e.time * 50) > 0 ? 1 : -1) * PX : 0;
    this.headMesh.visible = !curl;
    this.legs.forEach((l) => { l.visible = !curl; });
    const cracked = e.state === 'cracked';
    this.cracks.forEach((c) => { c.visible = cracked; });
    this.stars.forEach((s, i) => {
      s.visible = cracked;
      const a = e.time * 6 + i * 2.1;
      s.position.set(Math.cos(a) * 6 * PX, 17 * PX, Math.sin(a) * 4 * PX);
    });
    const s = e.alive ? 1 : Math.max(0.05, e.dying / 0.6);
    this.group.scale.setScalar(s);
  }
}

// ------------------------------------------------------------------
// SOPRO — nuvenzinha que incha e sopra
// ------------------------------------------------------------------
export class SoproModel extends Model {
  constructor(uniforms) {
    super(uniforms);
    this.white = this.mat('#d8d0e8', { emissive: '#a8a0c0', emissiveIntensity: 0.25 });
    this.warm = this.mat('#ffffff', { emissive: '#ffe0b0', emissiveIntensity: 0.4 });
    this.puffs = [[0, 0, 0, 6], [-5, -1, 1, 4.5], [5, -0.5, -1, 4.5], [-1, 4, 0, 4]].map(([x, y, z, r]) => this.mesh(this.group, new THREE.IcosahedronGeometry(r * PX, 1), this.white, x, y, z));
    const dark = this.mat('#4a3045', { noMemory: true });
    this.eyes = [-1.8, 1.8].map((z) => this.box(this.group, 0.8, 1.8, 1, dark, 5.6, 1, z));
    this.mouth = this.box(this.group, 1, 1.6, 1.6, dark, 6.2, -2, 0);
  }

  update(e, t) {
    this.place(e.x + e.w / 2, e.y + e.h / 2, 0.1);
    this.face(e.facing);
    const mat = e.calm ? this.warm : this.white;
    this.puffs.forEach((p) => { p.material = mat; });
    let swell = 1;
    if (e.state === 'inhale') swell = 1 + (1 - e.timer / 0.65) * 0.3;
    const k = (e.springTime || 0) / 0.25;
    const s = e.alive ? 1 : Math.max(0.05, e.dying / 0.6);
    this.group.scale.set(s * swell * (1 + 0.2 * k), s * swell * (1 - 0.3 * k), s * swell);
    this.mouth.visible = e.state === 'blow' || e.state === 'inhale';
    this.mouth.scale.setScalar(e.state === 'blow' ? 1.4 : 0.7);
  }
}

// ------------------------------------------------------------------
// VULTO (personagem que aparece e some) — névoa alta com máscara de cristal
// ------------------------------------------------------------------
export class VultoModel extends Model {
  constructor() {
    super(null);
    this.mist = this.mat('#141022', { transparent: true, opacity: 1, emissive: '#2a2040', emissiveIntensity: 0.6 });
    this.maskMat = this.mat('#cfe9ff', { transparent: true, opacity: 1, emissive: '#cfe9ff', emissiveIntensity: 0.35 });
    this.eyeMat = this.mat('#b48cff', { transparent: true, opacity: 1, emissive: '#b48cff', emissiveIntensity: 2.4 });
    this.cloak = this.mesh(this.group, new THREE.ConeGeometry(8 * PX, 30 * PX, 7, 1, true), this.mist, 0, 15, 0);
    this.box(this.group, 16, 4, 8, this.mist, 0, 27, 0);
    this.mask = this.box(this.group, 2, 8, 7, this.maskMat, 3.5, 33, 0);
    [-1.6, 1.6].forEach((z) => this.box(this.group, 0.6, 1, 1.8, this.eyeMat, 4.6, 34, z));
    this.box(this.group, 0.8, 4, 0.6, this.mat('#5f596b', { transparent: true }), 4.6, 32, 0.4);
  }

  update(v, t) {
    this.place(v.x, v.base, -0.2);
    this.face(-1);
    for (const m of [this.mist, this.maskMat, this.eyeMat]) m.opacity = v.alpha;
    this.group.visible = v.alpha > 0.01;
    this.cloak.scale.x = 1 + Math.sin(t * 2) * 0.06;
    this.eyeMat.emissiveIntensity = 1.6 + Math.sin(t * 2) * 0.8;
  }
}

// Que modelo cada coisa usa (pelo nome da classe do objeto do jogo).
export const MODELS = {
  Player: (u) => new NiloModel(u),
  Mira: () => new MiraModel(),
  Murcho: (u) => new MurchoModel(u),
  Traca: (u) => new TracaModel(u),
  Cristalideo: (u) => new CristalideoModel(u),
  Sopro: (u) => new SoproModel(u),
  EcoVazio: (u) => new NiloModel(u, { shadow: true }),
  Vulto: () => new VultoModel(),
};
