// Cenário de fundo em 3D (atrás da fase), criado uma vez por região.
// Fica entre z = -4 e z = -24: a perspectiva da câmera dá o parallax de verdade,
// e a névoa (fog) faz os objetos mais distantes sumirem no ar.
//
// Bosque: árvores low-poly com luzinhas nas copas, chão de floresta.
// Minas:  estalactites, estalagmites, drusas de cristal e uma parede de rocha.
// Arquipélago: ilhas flutuantes com raízes penduradas e nuvens fofas.
// Cidade: prédios de tijolo com janelas acesas aqui e ali.
// Santuário: pilares antigos com anéis de luz e cristais de aurora flutuando.
// Tema novo? Crie uma função buildX(...) e escolha-a em buildScenery().

import * as THREE from '../vendor/three/three.module.js';
import { applyMemoryShader } from './memoryShader.js';

function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildScenery(level, uniforms) {
  const group = new THREE.Group();
  const disposables = [];
  const add = (obj) => {
    group.add(obj);
    if (obj.geometry) disposables.push(obj.geometry, obj.material);
    return obj;
  };
  const ctx = { level, uniforms, add, rnd: seeded(42), width: level.cols, floorY: -level.rows + 1 };
  const builders = { minas: buildMinas, arquipelago: buildArquipelago, cidade: buildCidade, santuario: buildSantuario };
  (builders[level.theme] || buildBosque)(ctx);
  return { group, dispose: () => disposables.forEach((d) => d.dispose()) };
}

const std = (uniforms, opts) => applyMemoryShader(new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95, ...opts }), uniforms);

function groundPlane({ add, width, uniforms }, y, color) {
  const geo = new THREE.PlaneGeometry(width + 120, 60);
  geo.rotateX(-Math.PI / 2);
  const mesh = add(new THREE.Mesh(geo, std(uniforms, { color })));
  mesh.position.set(width / 2, y, -3.2 - 30);
  mesh.receiveShadow = true;
}

function buildBosque(c) {
  const { add, rnd, width, uniforms } = c;
  groundPlane(c, -19.2, '#141032');

  const trees = [];
  for (let x = -30; x < width + 30; x += 2.2 + rnd() * 3.5) {
    const z = -5 - rnd() * 19;
    trees.push({ x: x + rnd(), z, h: 7 + rnd() * 9, r: 1.6 + rnd() * 1.6 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 1, 6);
  trunkGeo.translate(0, 0.5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1, 0);
  const trunks = add(new THREE.InstancedMesh(trunkGeo, std(uniforms, { color: '#1b1640' }), trees.length));
  const crowns = add(new THREE.InstancedMesh(crownGeo, std(uniforms, { color: '#2a2366', emissive: '#120e30', emissiveIntensity: 0.6 }), trees.length * 2));
  const lights = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  trees.forEach((t, i) => {
    const base = -19.2;
    m.makeScale(1 + t.r * 0.15, t.h, 1 + t.r * 0.15).setPosition(t.x, base, t.z);
    trunks.setMatrixAt(i, m);
    for (let k = 0; k < 2; k++) {
      q.setFromEuler(new THREE.Euler(rnd(), rnd() * 3, rnd()));
      const s = t.r * (k === 0 ? 1 : 0.7);
      m.compose(new THREE.Vector3(t.x + (k - 0.5) * 0.8, base + t.h + k * 1.1, t.z), q, new THREE.Vector3(s * 1.2, s, s * 1.1));
      crowns.setMatrixAt(i * 2 + k, m);
    }
    for (let k = 0; k < 5; k++) {
      lights.push([t.x + (rnd() - 0.5) * t.r * 2, base + t.h + (rnd() - 0.3) * t.r * 1.6, t.z + t.r * 0.9, rnd() < 0.6]);
    }
  });
  trunks.castShadow = true;
  crowns.castShadow = true;

  // Luzinhas nas copas: pequenas e emissivas (brilham sem precisar de luz).
  // Uma malha por cor: o brilho (emissive) é do material, não de cada instância.
  const dotGeo = new THREE.OctahedronGeometry(0.09, 0);
  for (const [color, keep] of [['#59e0c5', true], ['#c7a6ff', false]]) {
    const list = lights.filter((l) => l[3] === keep);
    const dots = add(new THREE.InstancedMesh(dotGeo, std(uniforms, { color, emissive: color, emissiveIntensity: 2 }), list.length));
    list.forEach(([x, y, z], i) => dots.setMatrixAt(i, m.makeTranslation(x, y, z)));
  }

  // Pedras e arbustos no chão ao fundo
  const rocks = [];
  for (let x = -20; x < width + 20; x += 1.5 + rnd() * 3) rocks.push([x, -19.2, -4.5 - rnd() * 16, 0.4 + rnd() * 0.9]);
  const rockMesh = add(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std(uniforms, { color: '#211a46' }), rocks.length));
  rocks.forEach(([x, y, z, s], i) => rockMesh.setMatrixAt(i, m.makeScale(s * 1.4, s, s).setPosition(x, y, z)));
  rockMesh.receiveShadow = true;
}

function buildMinas(c) {
  const { add, rnd, width, uniforms } = c;
  groundPlane(c, -19.5, '#0b1024');
  // Parede de fundo da caverna
  const wallGeo = new THREE.PlaneGeometry(width + 120, 40);
  const wall = add(new THREE.Mesh(wallGeo, std(uniforms, { color: '#0d1430' })));
  wall.position.set(width / 2, -10, -24);

  const m = new THREE.Matrix4();
  const coneGeo = new THREE.ConeGeometry(1, 1, 6);
  const spikes = [];
  for (let x = -20; x < width + 20; x += 0.8 + rnd() * 2.2) {
    const z = -4.5 - rnd() * 18;
    spikes.push({ x, z, h: 1.5 + rnd() * 5, r: 0.3 + rnd() * 0.7, down: true });
    if (rnd() < 0.6) spikes.push({ x: x + rnd(), z: z - rnd() * 2, h: 1 + rnd() * 3.5, r: 0.3 + rnd() * 0.6, down: false });
  }
  const spikeMesh = add(new THREE.InstancedMesh(coneGeo, std(uniforms, { color: '#16204a' }), spikes.length));
  spikes.forEach((s, i) => {
    if (s.down) m.makeRotationX(Math.PI).scale(new THREE.Vector3(s.r, s.h, s.r)).setPosition(s.x, 1 - s.h / 2, s.z);
    else m.makeScale(s.r, s.h, s.r).setPosition(s.x, -19.5 + s.h / 2, s.z);
    spikeMesh.setMatrixAt(i, m);
  });

  // Drusas de cristal: brilham ciano e rosa, no chão e na parede do fundo
  const crystals = [];
  for (let x = -20; x < width + 20; x += 2 + rnd() * 4) {
    const onWall = rnd() < 0.4;
    crystals.push({ x, y: onWall ? -4 - rnd() * 12 : -19.5, z: onWall ? -23.5 : -5 - rnd() * 15, pink: rnd() < 0.35, s: 0.4 + rnd() * 0.8 });
  }
  const crystalGeo = new THREE.OctahedronGeometry(1, 0);
  for (const [color, pink] of [['#8fd1ff', false], ['#ff8fe0', true]]) {
    const list = crystals.filter((cr) => cr.pink === pink);
    const mesh = add(new THREE.InstancedMesh(crystalGeo, std(uniforms, { color, emissive: color, emissiveIntensity: 1.2, roughness: 0.3 }), list.length * 3));
    let k = 0;
    for (const cr of list) {
      for (let i = 0; i < 3; i++) {
        m.makeRotationZ((i - 1) * 0.5).scale(new THREE.Vector3(cr.s * 0.35, cr.s * (1.2 + (i % 2)), cr.s * 0.35)).setPosition(cr.x + (i - 1) * cr.s * 0.4, cr.y + cr.s, cr.z);
        mesh.setMatrixAt(k++, m);
      }
    }
  }
}

function buildArquipelago(c) {
  const { add, rnd, width, uniforms } = c;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  // Ilhas: um "prato" de terra com um cone de raízes embaixo
  const islands = [];
  for (let x = -30; x < width + 30; x += 4 + rnd() * 7) {
    islands.push({ x: x + rnd() * 2, y: -4 - rnd() * 16, z: -6 - rnd() * 20, s: 0.8 + rnd() * 2.2 });
  }
  const topGeo = new THREE.CylinderGeometry(1, 0.85, 0.5, 7);
  const rootGeo = new THREE.ConeGeometry(0.85, 1.6, 7);
  rootGeo.rotateX(Math.PI);
  rootGeo.translate(0, -1.05, 0);
  const tops = add(new THREE.InstancedMesh(topGeo, std(uniforms, { color: '#7fc97f' }), islands.length));
  const roots = add(new THREE.InstancedMesh(rootGeo, std(uniforms, { color: '#8a5a72' }), islands.length));
  islands.forEach((it, i) => {
    q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0));
    m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s * 1.4, it.s, it.s));
    tops.setMatrixAt(i, m);
    roots.setMatrixAt(i, m);
  });
  tops.castShadow = true;
  // Nuvens: bolhas brancas agrupadas
  const puffs = [];
  for (let x = -30; x < width + 30; x += 3 + rnd() * 6) {
    const y = -6 - rnd() * 16;
    const z = -8 - rnd() * 18;
    const n = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) puffs.push([x + k * 0.9, y + rnd() * 0.5, z + rnd(), 0.7 + rnd() * 0.8]);
  }
  const puffMesh = add(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), std(uniforms, { color: '#ffffff', emissive: '#ffd8c0', emissiveIntensity: 0.35, roughness: 1 }), puffs.length));
  puffs.forEach(([x, y, z, sc], i) => puffMesh.setMatrixAt(i, m.makeScale(sc * 1.3, sc * 0.8, sc).setPosition(x, y, z)));
}

function buildCidade(c) {
  const { add, rnd, width, uniforms } = c;
  groundPlane(c, -19.4, '#2a1e20');
  const m = new THREE.Matrix4();
  const blocks = [];
  for (let x = -30; x < width + 30; x += 1.6 + rnd() * 2.4) {
    const z = -5 - rnd() * 18;
    blocks.push({ x, z, w: 1.2 + rnd() * 1.8, h: 4 + rnd() * 12, d: 1.2 + rnd() * 1.5 });
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const builds = add(new THREE.InstancedMesh(boxGeo, std(uniforms, { color: '#4a3440' }), blocks.length));
  const roofGeo = new THREE.ConeGeometry(0.75, 0.8, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roofs = add(new THREE.InstancedMesh(roofGeo, std(uniforms, { color: '#7a3a3a' }), blocks.length));
  const windows = [];
  blocks.forEach((b, i) => {
    m.makeScale(b.w, b.h, b.d).setPosition(b.x, -19.4, b.z);
    builds.setMatrixAt(i, m);
    m.makeScale(b.w * 1.05, 1, b.d * 1.05).setPosition(b.x, -19.4 + b.h + 0.4, b.z);
    roofs.setMatrixAt(i, m);
    for (let k = 0; k < 6; k++) {
      if (rnd() < 0.7) continue;
      windows.push([b.x + (rnd() - 0.5) * b.w * 0.7, -19.4 + 1 + rnd() * (b.h - 2), b.z + b.d / 2 + 0.02]);
    }
  });
  builds.castShadow = true;
  const winGeo = new THREE.PlaneGeometry(0.28, 0.4);
  const wins = add(new THREE.InstancedMesh(winGeo, std(uniforms, { color: '#ffcf8a', emissive: '#ffb84a', emissiveIntensity: 1.6 }), Math.max(1, windows.length)));
  windows.forEach(([x, y, z], i) => wins.setMatrixAt(i, m.makeTranslation(x, y, z)));
}

function buildSantuario(c) {
  const { add, rnd, width, uniforms } = c;
  groundPlane(c, -19.4, '#14123a');
  const m = new THREE.Matrix4();
  const pillars = [];
  for (let x = -30; x < width + 30; x += 3 + rnd() * 5) pillars.push({ x, z: -5 - rnd() * 18, h: 6 + rnd() * 10 });
  const colGeo = new THREE.CylinderGeometry(0.45, 0.55, 1, 8);
  colGeo.translate(0, 0.5, 0);
  const cols = add(new THREE.InstancedMesh(colGeo, std(uniforms, { color: '#2e2a66' }), pillars.length));
  const ringGeo = new THREE.TorusGeometry(0.62, 0.08, 6, 16);
  ringGeo.rotateX(Math.PI / 2);
  const palette = ['#5ef0d0', '#b48cff', '#ff9ad5', '#ffd98a'];
  const ringLists = palette.map(() => []);
  pillars.forEach((p, i) => {
    m.makeScale(1, p.h, 1).setPosition(p.x, -19.4, p.z);
    cols.setMatrixAt(i, m);
    ringLists[i % 4].push([p.x, -19.4 + p.h * (0.4 + rnd() * 0.5), p.z]);
  });
  cols.castShadow = true;
  palette.forEach((color, k) => {
    const list = ringLists[k];
    if (!list.length) return;
    const rings = add(new THREE.InstancedMesh(ringGeo, std(uniforms, { color, emissive: color, emissiveIntensity: 1.5 }), list.length));
    list.forEach(([x, y, z], i) => rings.setMatrixAt(i, m.makeTranslation(x, y, z)));
  });
  // Cristais de aurora flutuando
  const shards = [];
  for (let x = -20; x < width + 20; x += 2 + rnd() * 4) shards.push([x, -3 - rnd() * 14, -6 - rnd() * 16, 0.3 + rnd() * 0.5, Math.floor(rnd() * 4)]);
  palette.forEach((color, k) => {
    const list = shards.filter((sh) => sh[4] === k);
    if (!list.length) return;
    const mesh = add(new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), std(uniforms, { color, emissive: color, emissiveIntensity: 1.3 }), list.length));
    list.forEach(([x, y, z, sc], i) => mesh.setMatrixAt(i, m.makeScale(sc * 0.5, sc * 1.4, sc * 0.5).setPosition(x, y, z)));
  });
}
