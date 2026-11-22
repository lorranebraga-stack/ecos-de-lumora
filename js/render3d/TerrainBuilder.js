// Transforma o mapa de texto da fase em TERRENO 3D.
//
// Coordenadas: 1 unidade 3D = 1 bloco (16 px). x cresce para a direita, y para CIMA
// (por isso y3D = -linha), z aponta para a câmera.
// Cada bloco sólido vira um "tijolo" que vai de z = Z_BACK a z = Z_FRONT.
// O Nilo e os personagens ficam em z ≈ 0, em cima desses tijolos.
//
// Otimização: só criamos as faces que podem ser vistas (uma face encostada em
// outro bloco é pulada), e juntamos tudo num único objeto por material.

import * as THREE from '../vendor/three/three.module.js';
import { applyMemoryShader } from './memoryShader.js';

export const Z_BACK = -3;
export const Z_FRONT = 1;

function hash(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Acumula triângulos (posição, normal, cor) e vira uma BufferGeometry no fim.
export class QuadBuffer {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
  }

  quad(a, b, c, d, n, color) {
    for (const v of [a, b, c, a, c, d]) {
      this.pos.push(v[0], v[1], v[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.col.push(color.r, color.g, color.b);
    }
  }

  // Caixa de (x0,y0,z0) a (x1,y1,z1). faces: quais lados desenhar. colorOf(face) → THREE.Color
  box(x0, x1, y0, y1, z0, z1, faces, colorOf) {
    if (faces.front) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], colorOf('front'));
    if (faces.top) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], colorOf('top'));
    if (faces.bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], colorOf('bottom'));
    if (faces.left) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], colorOf('left'));
    if (faces.right) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], colorOf('right'));
    if (faces.back) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], colorOf('back'));
  }

  get triangles() {
    return this.pos.length / 9;
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

const ROCKISH = new Set(['#', 'X']);
const ALL = { front: true, top: true, bottom: true, left: true, right: true };

// Cor com uma leve variação por bloco (para não parecer liso demais).
function tint(base, tx, ty, amount = 0.12) {
  const k = 1 + (hash(tx, ty) - 0.5) * amount;
  return new THREE.Color(base.r * k, base.g * k, base.b * k);
}

// Monta o terreno inteiro. Devolve { group, dispose(), stats }.
export function buildTerrain(level, uniforms) {
  const pal = level.pal;
  const C = (hex) => new THREE.Color(hex);
  // A rocha do 2D é muito escura para mostrar volume em 3D: clareamos em direção
  // a um tom do próprio tema, mantendo o clima noturno.
  const rockC = C(pal.rock).lerp(C(pal.archLight), 0.38);
  const mossC = C(pal.moss);
  const mossLightC = C(pal.mossLight);
  const edgeC = C(pal.rockEdge);
  const isRock = (tx, ty) => ROCKISH.has(level.tileAt(tx, ty));
  // A passagem secreta ('H') se disfarça de rocha: o musgo só aparece onde nada "parece rocha" em cima.
  const looksRock = (tx, ty) => isRock(tx, ty) || level.tileAt(tx, ty) === 'H';

  const rock = new QuadBuffer();
  const fake = new QuadBuffer();   // parede falsa (X)
  const slabs = new QuadBuffer();  // galhos, pontes, flores lembradas
  const ghosts = new QuadBuffer(); // peças latentes (L, v)
  const gates = new QuadBuffer();  // portão do chefe (G)
  const secret = new QuadBuffer(); // passagem secreta (H): fica transparente com o Nilo dentro
  const city = new QuadBuffer();   // prédios da Cidade no estado sólido (a/b)
  const spikes = [];
  const grass = [];
  const glows = [];

  for (let ty = 0; ty < level.rows; ty++) {
    for (let tx = 0; tx < level.cols; tx++) {
      const c = level.grid[ty][tx];
      const x0 = tx;
      const x1 = tx + 1;
      const y1 = -ty;
      const y0 = -ty - 1;

      if (c === 'H') {
        const faces = {
          front: true,
          top: ty > 0 && !looksRock(tx, ty - 1),
          bottom: ty + 1 < level.rows && !looksRock(tx, ty + 1),
          left: tx > 0 && !looksRock(tx - 1, ty),
          right: tx + 1 < level.cols && !looksRock(tx + 1, ty),
        };
        const base = tint(rockC, tx, ty);
        secret.box(x0, x1, y0, y1, Z_BACK, Z_FRONT, faces, (f) => (f === 'front' ? base : base.clone().multiplyScalar(0.8)));
      } else if (c === '%') {
        slabs.box(x0 + 0.04, x1 - 0.04, y0 + 0.2, y1, -1.3, 0.8, ALL, (f) => (f === 'top' ? C(pal.crumbleTop) : tint(C(pal.crumble), tx, ty)));
        slabs.box(x0 + 0.3, x1 - 0.3, y0 - 0.05, y0 + 0.2, -0.8, 0.3, ALL, () => tint(C(pal.crumble), tx, ty, 0.3));
      } else if (c === 'a' || c === 'b') {
        const remembered = c === 'a';
        if (level.isSolid(tx, ty)) {
          const base = C(remembered ? pal.remembered : pal.forgotten);
          const light = C(remembered ? pal.rememberedLight : pal.forgottenLight);
          city.box(x0, x1, y0, y1, -2, 0.9, ALL, (f) => (f === 'top' ? light : (f === 'front' ? tint(base, tx, ty) : base.clone().multiplyScalar(0.75))));
          // Janelas na frente
          for (const wx of [0.2, 0.62]) city.box(x0 + wx, x0 + wx + 0.18, y0 + 0.35, y0 + 0.65, 0.9, 0.93, { front: true }, () => light);
        } else {
          ghosts.box(x0 + 0.05, x1 - 0.05, y0 + 0.05, y1 - 0.05, -1.6, 0.8, ALL, () => C(remembered ? pal.rememberedLight : pal.forgottenLight));
        }
      } else if (ROCKISH.has(c)) {
        const openTop = ty > 0 && !looksRock(tx, ty - 1);
        const faces = {
          top: openTop,
          bottom: ty + 1 < level.rows && !isRock(tx, ty + 1),
          left: tx > 0 && !isRock(tx - 1, ty),
          right: tx + 1 < level.cols && !isRock(tx + 1, ty),
        };
        const buf = c === 'X' ? fake : rock;
        const base = tint(rockC, tx, ty);
        const side = base.clone().multiplyScalar(0.8);
        // Frente: se o topo é aberto, uma faixa de musgo em cima
        if (openTop) {
          buf.box(x0, x1, y0, y1 - 0.25, Z_BACK, Z_FRONT, { front: true }, () => base);
          buf.box(x0, x1, y1 - 0.25, y1, Z_BACK, Z_FRONT, { front: true }, () => mossC);
        } else {
          buf.box(x0, x1, y0, y1, Z_BACK, Z_FRONT, { front: true }, () => base);
        }
        buf.box(x0, x1, y0, y1, Z_BACK, Z_FRONT, faces, (f) => {
          if (f === 'top') return tint(mossC.clone().lerp(mossLightC, 0.18), tx, ty, 0.25);
          if (f === 'bottom') return edgeC;
          return side;
        });
        // Decoração no topo aberto: grama e, às vezes, um cogumelo (ou cristal, nas Minas)
        if (openTop && c === '#' && !level.isHazard(tx, ty - 1)) {
          const n = 3 + Math.floor(hash(tx, ty + 7) * 4);
          for (let i = 0; i < n; i++) {
            grass.push([x0 + hash(tx * 3 + i, ty) * 0.9 + 0.05, y1, Z_BACK + 0.3 + hash(tx, ty * 5 + i) * (Z_FRONT - Z_BACK - 0.5), 0.6 + hash(i, tx) * 0.8]);
          }
          if (hash(tx + 13, ty) < 0.16) glows.push([x0 + 0.3 + hash(tx, 3) * 0.4, y1, Z_BACK + 0.6 + hash(5, tx) * 3, hash(tx, ty + 99)]);
        }
      } else if (c === 'B') {
        slabs.box(x0, x1, y1 - 0.375, y1, -1.6, 0.9, ALL, (f) => (f === 'top' ? C(pal.bridgeLight) : tint(C(pal.bridge), tx, ty)));
      } else if (c === '=') {
        slabs.box(x0 - 0.05, x1 + 0.05, y1 - 0.3, y1, -1.1, 0.6, ALL, (f) => (f === 'top' ? mossLightC : tint(C(pal.wood), tx, ty)));
      } else if (c === 'w') {
        slabs.box(x0, x1, y1 - 0.22, y1, -0.8, 0.7, ALL, (f) => (f === 'top' ? C(pal.pad) : tint(C(pal.pad), tx, ty).multiplyScalar(0.7)));
        slabs.box(x0 + 0.44, x0 + 0.56, y1 - 1, y1 - 0.22, -0.1, 0.02, ALL, () => mossC); // caule
        slabs.box(x0 + 0.3, x0 + 0.7, y1, y1 + 0.22, -0.2, 0.2, ALL, () => C(pal.petal)); // flor
      } else if (c === 'L') {
        ghosts.box(x0, x1, y1 - 0.375, y1, -1.6, 0.9, ALL, () => C(pal.ghost));
      } else if (c === 'v') {
        ghosts.box(x0, x1, y1 - 0.22, y1, -0.8, 0.7, ALL, () => C(pal.ghost));
      } else if (c === 'G') {
        for (let i = 0; i < 3; i++) gates.box(x0 + 0.16 + i * 0.3, x0 + 0.28 + i * 0.3, y0, y1, -0.4, 0.4, ALL, () => C(pal.gate));
      } else if (c === '^') {
        for (let i = 0; i < 3; i++) {
          for (let k = 0; k < 3; k++) spikes.push([x0 + 0.18 + i * 0.32, y0, -1.6 + k * 1.1 + (i % 2) * 0.3, 0.55 + hash(tx + i, k) * 0.35]);
        }
      }
    }
  }

  const group = new THREE.Group();
  const disposables = [];
  const add = (mesh) => {
    group.add(mesh);
    disposables.push(mesh.geometry, mesh.material);
    return mesh;
  };
  const std = (opts) => applyMemoryShader(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true, ...opts }), uniforms);

  const rockMesh = add(new THREE.Mesh(rock.build(), std({})));
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;

  const fakeMat = std({ emissive: new THREE.Color(pal.falseCrack), emissiveIntensity: 0.12 });
  const fakeMesh = add(new THREE.Mesh(fake.build(), fakeMat));
  fakeMesh.castShadow = true;
  fakeMesh.receiveShadow = true;

  const slabMesh = add(new THREE.Mesh(slabs.build(), std({ roughness: 0.7 })));
  slabMesh.castShadow = true;
  slabMesh.receiveShadow = true;

  const ghostMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.2, depthWrite: false });
  add(new THREE.Mesh(ghosts.build(), ghostMat));

  const gateMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
  add(new THREE.Mesh(gates.build(), gateMat));

  const secretMat = std({ transparent: true, opacity: 1 });
  const secretMesh = add(new THREE.Mesh(secret.build(), secretMat));
  secretMesh.receiveShadow = true;

  const cityMat = std({ roughness: 0.8, transparent: true, opacity: 1, emissive: new THREE.Color(pal.rememberedLight || '#000000'), emissiveIntensity: 0.05 });
  const cityMesh = add(new THREE.Mesh(city.build(), cityMat));
  cityMesh.castShadow = true;
  cityMesh.receiveShadow = true;

  // Espinhos: cones rosa (um único objeto "instanciado": muitos cones, uma só chamada de desenho)
  if (spikes.length) {
    const geo = new THREE.ConeGeometry(0.11, 1, 5);
    geo.translate(0, 0.5, 0);
    const mat = applyMemoryShader(new THREE.MeshStandardMaterial({
      color: pal.thorn, emissive: pal.thorn, emissiveIntensity: 0.55, roughness: 0.3, flatShading: true,
    }), uniforms);
    const mesh = add(new THREE.InstancedMesh(geo, mat, spikes.length));
    const m = new THREE.Matrix4();
    spikes.forEach(([x, y, z, h], i) => {
      m.makeScale(1, h, 1).setPosition(x, y, z);
      mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = true;
  }

  // Grama: lâminas finas e levemente tortas
  if (grass.length) {
    const geo = new THREE.BoxGeometry(0.05, 0.28, 0.05);
    geo.translate(0, 0.14, 0);
    const mat = applyMemoryShader(new THREE.MeshStandardMaterial({
      color: pal.mossLight, emissive: pal.moss, emissiveIntensity: 0.35, roughness: 1,
    }), uniforms);
    const mesh = add(new THREE.InstancedMesh(geo, mat, grass.length));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    grass.forEach(([x, y, z, s], i) => {
      e.set(0, hash(i, 1) * 3, (hash(i, 2) - 0.5) * 0.6);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, s, 1));
      mesh.setMatrixAt(i, m);
    });
  }

  // Brilhos no chão: cogumelos (Bosque) ou drusas de cristal (Minas)
  if (glows.length) {
    const crystal = level.theme === 'minas';
    const geo = crystal ? new THREE.ConeGeometry(0.1, 0.5, 5) : new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    geo.translate(0, crystal ? 0.25 : 0.18, 0);
    const mat = applyMemoryShader(new THREE.MeshStandardMaterial({
      color: pal.mushroom, emissive: pal.mushroom, emissiveIntensity: 1.1, roughness: 0.4,
    }), uniforms);
    const mesh = add(new THREE.InstancedMesh(geo, mat, glows.length * (crystal ? 3 : 1)));
    const m = new THREE.Matrix4();
    let k = 0;
    for (const [x, y, z, r] of glows) {
      if (crystal) {
        for (let i = 0; i < 3; i++) {
          m.makeRotationZ((i - 1) * 0.45).scale(new THREE.Vector3(1, 0.7 + r * 0.8, 1)).setPosition(x + (i - 1) * 0.12, y, z);
          mesh.setMatrixAt(k++, m);
        }
      } else {
        m.makeTranslation(x, y, z);
        mesh.setMatrixAt(k++, m);
      }
    }
    if (!crystal) {
      // Caules dos cogumelos
      const sgeo = new THREE.CylinderGeometry(0.03, 0.04, 0.2, 5);
      sgeo.translate(0, 0.1, 0);
      const stems = add(new THREE.InstancedMesh(sgeo, std({ vertexColors: false, color: pal.mushroomStem }), glows.length));
      glows.forEach(([x, y, z], i) => {
        m.makeTranslation(x, y, z);
        stems.setMatrixAt(i, m);
      });
    }
  }

  return {
    group,
    fakeMat,
    ghostMat,
    gateMat,
    secretMat,
    cityMat,
    stats: { rockTriangles: rock.triangles, spikes: spikes.length, grass: grass.length, glows: glows.length },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
