// RENDERIZADOR 3D (Three.js / WebGL).
//
// Ele NÃO muda nada no jogo: lê o estado da cena de fase (Nilo, inimigos,
// câmera, memória...) a cada quadro e mostra tudo em 3D. A física, as fases,
// a história e o salvamento continuam iguais — e o modo 2D continua existindo.
//
// Peças:
//   TerrainBuilder — blocos do mapa viram terreno 3D (refeito quando a memória muda o mapa)
//   Scenery        — árvores / estalactites 3D atrás da fase
//   Models3D       — personagens 3D low-poly (Nilo, Mira, inimigos, Vulto)
//   SpriteCard     — "recortes de papel" iluminados (chefes, lanternas, pedras; e todos, se os modelos estiverem desligados)
//   memoryShader   — o mundo esquecido sem cor, dentro dos próprios materiais
//
// Coordenadas: 1 unidade = 1 bloco (16 px); x3D = x/16, y3D = -y/16; o jogo acontece em z ≈ 0.

import * as THREE from '../vendor/three/three.module.js';
import { CONFIG } from '../config.js';
import { buildTerrain } from './TerrainBuilder.js';
import { buildScenery } from './Scenery.js';
import { SpriteCard } from './SpriteCard.js';
import { createMemoryUniforms, updateMemoryUniforms } from './memoryShader.js';
import { MODELS } from './Models3D.js';

const U = CONFIG.TILE;
const FOV = 30;
// Distância da câmera para enxergar a mesma altura de mundo que o modo 2D (270 px)
const DIST = (CONFIG.HEIGHT / U / 2) / Math.tan((FOV / 2) * (Math.PI / 180));
const LIGHT_POOL = 6; // luzes reaproveitadas para cristais, lanternas, pedras... (nº fixo = sem travadas)

const THEMES = {
  bosque: {
    fog: '#1d1748', fogDensity: 0.016, hemiSky: '#7a6fd0', hemiGround: '#1a1440', hemi: 1.1,
    moon: '#c3cfff', moonI: 2.2, spores: ['#7ff5e0', '#c7a6ff'],
  },
  minas: {
    fog: '#0c1430', fogDensity: 0.026, hemiSky: '#4a6fc0', hemiGround: '#06081a', hemi: 0.8,
    moon: '#9fd8ff', moonI: 1.2, spores: ['#8fd1ff', '#ff8fe0'],
  },
  arquipelago: {
    fog: '#d89aa8', fogDensity: 0.011, hemiSky: '#ffe0c0', hemiGround: '#6a4a6a', hemi: 1.3,
    moon: '#fff0d0', moonI: 2.6, spores: ['#ffffff', '#fff3b0'],
  },
  cidade: {
    fog: '#4a3438', fogDensity: 0.02, hemiSky: '#e8b48a', hemiGround: '#2a1a20', hemi: 1.0,
    moon: '#ffd8a8', moonI: 1.8, spores: ['#e8d6c0', '#ffcf8a'],
  },
  santuario: {
    fog: '#1a1448', fogDensity: 0.014, hemiSky: '#8f8fff', hemiGround: '#1a1040', hemi: 1.2,
    moon: '#c9fff3', moonI: 2.2, spores: ['#8ff7ff', '#ff9ad5'],
  },
};

// Caixa do recorte de um chefe: cada chefe tem um tamanho, então a caixa é calculada.
const bossBox = (b) => ({ left: -30, top: -(b.h + 34), width: b.w + 60, height: b.h + 34 + 34 });

// Caixas (em px, relativas à âncora) e âncoras dos recortes de cada tipo de objeto.
const KINDS = {
  player: { box: { left: -20, top: -34, width: 40, height: 40 }, anchor: (p) => ({ x: p.x + p.w / 2, y: p.y + p.h }), draw: (c, p, t) => p.draw(c, t), z: 0.2, glow: 0.4 },
  ground: { box: { left: -13, top: -24, width: 26, height: 28 }, anchor: (e) => ({ x: e.x + e.w / 2, y: e.y + e.h }), draw: (c, e) => e.draw(c), z: 0.1, memory: true },
  flyer: { box: { left: -12, top: -12, width: 24, height: 26 }, anchor: (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 }), draw: (c, e) => e.draw(c), z: 0.1, memory: true },
  boss: { box: bossBox, anchor: (b) => ({ x: b.x, y: b.y + b.h }), draw: (c, b) => b.draw(c, false), z: 0.1, glow: 0.4 },
  // Ataques dos chefes espalhados pela arena (raízes, raios, páginas, lascas): um recorte do tamanho da arena.
  bossfx: {
    box: ({ boss: b }) => ({ left: -16, top: -16, width: b.arena.right - b.arena.left + 32, height: b.arena.floor - b.arena.ceiling + 32 }),
    anchor: ({ boss: b }) => ({ x: b.arena.left, y: b.arena.ceiling }),
    draw: (c, { boss: b }) => b.drawEffects(c),
    z: 0.35,
    glow: 0.9,
    shadow: false,
  },
  shadow: { box: { left: -14, top: -30, width: 28, height: 34 }, anchor: (e) => ({ x: e.x + e.w / 2, y: e.y + e.h }), draw: (c, e) => e.draw(c), z: 0.15, glow: 0.25 },
  clock: { box: { left: -12, top: -44, width: 24, height: 46 }, anchor: (k) => ({ x: k.x, y: k.base }), draw: (c, k, t, scene) => k.draw(c, scene.level.cityState, k.isNear(scene.player)), z: -0.5 },
  mira: { box: { left: -18, top: -16, width: 36, height: 32 }, anchor: (m) => ({ x: m.x, y: m.y }), draw: (c, m) => m.draw(c), z: 0.7, glow: 0.7, shadow: false },
  vulto: { box: { left: -14, top: -48, width: 28, height: 52 }, anchor: (v) => ({ x: v.x, y: v.base }), draw: (c, v) => v.draw(c), z: -0.2, glow: 0.3 },
  lantern: { box: { left: -16, top: -34, width: 32, height: 36 }, anchor: (l) => ({ x: l.x, y: l.base }), draw: (c, l, t) => l.draw(c, t), z: -0.7 },
  stone: { box: { left: -12, top: -52, width: 24, height: 54 }, anchor: (s) => ({ x: s.x, y: s.base }), draw: (c, s, t, scene) => s.draw(c, t, scene.memory.held > 0 && s.isNear(scene.player)), z: -0.6 },
  shrine: { box: { left: -12, top: -36, width: 24, height: 38 }, anchor: (s) => ({ x: s.x, y: s.base }), draw: (c, s) => s.draw(c), z: -0.5 },
};

// Que tipo de recorte cada inimigo usa (voadores ficam centrados; sombras são mais altas).
function enemyKind(e) {
  const name = e.constructor.name;
  if (name === 'Traca' || name === 'Sopro') return 'flyer';
  if (name === 'EcoVazio') return 'shadow';
  return 'ground';
}

export class Renderer3D {
  static supported() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  constructor(stage) {
    this.stage = stage;
    this.enabled = true;
    this.useModels = true; // personagens 3D (false = recortes de papel)
    this.attached = null;
    this.models = new Map();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.canvas = this.renderer.domElement;
    this.canvas.id = 'game3d';
    this.canvas.classList.add('hidden');
    stage.querySelector('#game').after(this.canvas);

    this.camera = new THREE.PerspectiveCamera(FOV, CONFIG.WIDTH / CONFIG.HEIGHT, 0.5, 300);
    this.resize();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.resize()).observe(stage);

    // Céu distante: o fundo 2D (só céu) desenhado num canvas e usado como textura de fundo.
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = CONFIG.WIDTH;
    this.skyCanvas.height = CONFIG.HEIGHT;
    this.skyCtx = this.skyCanvas.getContext('2d');
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.colorSpace = THREE.SRGBColorSpace;
    this.colorCache = new Map();

    // QUALIDADE AUTOMÁTICA: mede os quadros por segundo e, se o computador
    // não aguentar, reduz a resolução e depois as sombras. Nível 0 = máxima.
    this.quality = 0;
    this.perf = { frames: 0, since: performance.now() };
  }

  setQuality(level) {
    this.quality = level;
    this.renderer.shadowMap.enabled = level < 2;
    if (this.moon) {
      this.moon.castShadow = level < 2;
      this.moon.shadow.mapSize.set(level === 0 ? 2048 : 1024, level === 0 ? 2048 : 1024);
      if (this.moon.shadow.map) {
        this.moon.shadow.map.dispose();
        this.moon.shadow.map = null;
      }
    }
    this.resize();
    console.info(`Gráficos 3D: qualidade ajustada para o nível ${level} (0 = máxima).`);
  }

  measure() {
    const p = this.perf;
    p.frames++;
    const elapsed = performance.now() - p.since;
    if (elapsed < 3000) return;
    if (elapsed > 6000 || document.hidden) {
      // A aba ficou escondida (o navegador para de desenhar): não é lentidão, ignora.
      p.frames = 0;
      p.since = performance.now();
      return;
    }
    const fps = (p.frames * 1000) / elapsed;
    p.frames = 0;
    p.since = performance.now();
    if (fps < 40 && this.quality < 2) this.setQuality(this.quality + 1);
  }

  resize() {
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    if (!w || !h) return;
    const maxRatio = [1.5, 1, 0.75][this.quality || 0];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  color(hex) {
    let c = this.colorCache.get(hex);
    if (!c) {
      c = new THREE.Color(hex);
      this.colorCache.set(hex, c);
    }
    return c;
  }

  // ---------- Montagem da região ----------

  attach(scene) {
    this.detach();
    this.attached = scene;
    const level = scene.level;
    const theme = THEMES[level.theme] || THEMES.bosque;
    this.theme = theme;
    this.uniforms = createMemoryUniforms();
    this.disposables = [];
    this.cards = new Map();

    const s = new THREE.Scene();
    this.scene3d = s;
    s.background = this.skyTexture;
    s.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);

    // Luzes: céu/chão (ambiente), lua (com sombras), Nilo, Mira e um "banco" de luzes reaproveitáveis.
    s.add(new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemi));
    const moon = new THREE.DirectionalLight(theme.moon, theme.moonI);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -20, right: 20, top: 14, bottom: -14, near: 1, far: 70 });
    moon.shadow.bias = -0.0004;
    moon.shadow.normalBias = 0.03;
    s.add(moon, moon.target);
    this.moon = moon;

    this.niloLight = new THREE.PointLight('#8ff7ff', 6, 8, 2);
    this.miraLight = new THREE.PointLight('#8fd1ff', 5, 7, 2);
    s.add(this.niloLight, this.miraLight);
    this.pool = Array.from({ length: LIGHT_POOL }, () => {
      const l = new THREE.PointLight('#ffffff', 0, 7, 2);
      s.add(l);
      return l;
    });

    // Terreno e cenário
    this.scenery = buildScenery(level, this.uniforms);
    s.add(this.scenery.group);
    this.buildTerrainNow();

    this.buildCollectibles(scene);
    this.buildExit(level);
    this.buildShards();
    this.buildParticles();
    this.buildSpores(level);

    this.canvas.classList.remove('hidden');
    this.perf = { frames: 0, since: performance.now() };
    if (this.quality > 0) this.setQuality(this.quality); // mantém o nível já descoberto
    this.resize();
  }

  buildTerrainNow() {
    const level = this.attached.level;
    if (this.terrain) {
      this.scene3d.remove(this.terrain.group);
      this.terrain.dispose();
    }
    this.terrain = buildTerrain(level, this.uniforms);
    this.scene3d.add(this.terrain.group);
    this.terrainVersion = level.version || 0;
    this.lastBuild = performance.now();
  }

  track(obj) {
    if (obj.geometry) this.disposables.push(obj.geometry);
    if (obj.material) this.disposables.push(obj.material);
    return obj;
  }

  // Cristais e fragmentos viram joias 3D de verdade (não recortes).
  buildCollectibles(scene) {
    const crystalGeo = new THREE.OctahedronGeometry(0.26, 0);
    crystalGeo.scale(1, 1.5, 1);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: '#59e0c5', emissive: '#2ad1c0', emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1, flatShading: true,
    });
    this.disposables.push(crystalGeo, crystalMat);
    this.crystalMeshes = scene.collectibles.crystals.map((c) => {
      const m = new THREE.Mesh(crystalGeo, crystalMat);
      m.position.set(c.x / U, -c.y / U, 0.2);
      m.castShadow = true;
      this.scene3d.add(m);
      return m;
    });

    const fragGeo = new THREE.IcosahedronGeometry(0.3, 0);
    const fragMat = new THREE.MeshStandardMaterial({
      color: '#ffd98a', emissive: '#ffb84a', emissiveIntensity: 1.2, roughness: 0.25, metalness: 0.3, flatShading: true,
    });
    const sparkGeo = new THREE.OctahedronGeometry(0.06, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.disposables.push(fragGeo, fragMat, sparkGeo, sparkMat);
    // Eco Escondido: uma estrela dourada de 4 pontas
    const starGeo = new THREE.OctahedronGeometry(0.42, 0);
    starGeo.scale(1, 1.3, 0.45);
    const starMat = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffe9b0', emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.4, flatShading: true });
    this.disposables.push(starGeo, starMat);
    this.secretMeshes = (scene.secrets || []).map((sc) => {
      const g = new THREE.Group();
      const a = new THREE.Mesh(starGeo, starMat);
      const b = new THREE.Mesh(starGeo, starMat);
      b.rotation.z = Math.PI / 2;
      g.add(a, b);
      g.position.set(sc.x / U, -sc.y / U, 0.2);
      this.scene3d.add(g);
      return g;
    });

    this.fragMeshes = scene.memory.fragments.map((f) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(fragGeo, fragMat));
      for (let i = 0; i < 3; i++) g.add(new THREE.Mesh(sparkGeo, sparkMat));
      g.position.set(f.x / U, -f.y / U, 0.2);
      this.scene3d.add(g);
      return g;
    });
  }

  // Arco de saída: dois pilares, uma verga e um portal de luz.
  buildExit(level) {
    const e = level.exit;
    this.exitGroup = null;
    if (!e) return;
    const g = new THREE.Group();
    const left = e.x / U;
    const right = (e.x + e.w) / U;
    const top = -e.y / U;
    const bottom = -(e.y + e.h) / U;
    const h = top - bottom + 0.4;
    const stoneMat = this.track(new THREE.MeshStandardMaterial({ color: level.pal.arch, roughness: 0.8, flatShading: true }));
    const pillarGeo = this.track(new THREE.BoxGeometry(0.4, h, 1));
    for (const x of [left - 0.2, right + 0.2]) {
      const p = new THREE.Mesh(pillarGeo, stoneMat);
      p.position.set(x, bottom + h / 2, -0.2);
      p.castShadow = true;
      g.add(p);
    }
    const lintel = new THREE.Mesh(this.track(new THREE.BoxGeometry(right - left + 1.2, 0.5, 1.1)), stoneMat);
    lintel.position.set((left + right) / 2, top + 0.45, -0.2);
    lintel.castShadow = true;
    g.add(lintel);
    this.portalMat = this.track(new THREE.MeshBasicMaterial({ color: level.pal.rune, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    const portal = new THREE.Mesh(this.track(new THREE.PlaneGeometry(right - left, top - bottom)), this.portalMat);
    portal.position.set((left + right) / 2, (top + bottom) / 2, -0.2);
    g.add(portal);
    this.exitGroup = g;
    this.scene3d.add(g);
  }

  // Cristais do chefe: coluna de aviso + cristal caindo (8 de cada, reaproveitados).
  buildShards() {
    const warnGeo = this.track(new THREE.BoxGeometry(0.5, 1, 0.5));
    warnGeo.translate(0, -0.5, 0);
    this.warnMat = this.track(new THREE.MeshBasicMaterial({ color: '#ff8fe0', transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
    const spikeGeo = this.track(new THREE.ConeGeometry(0.2, 0.8, 6));
    spikeGeo.rotateX(Math.PI);
    const spikeMat = this.track(new THREE.MeshStandardMaterial({ color: '#8fd1ff', emissive: '#8fd1ff', emissiveIntensity: 0.9, roughness: 0.2, flatShading: true }));
    this.shardPool = Array.from({ length: 8 }, () => {
      const warn = new THREE.Mesh(warnGeo, this.warnMat);
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.castShadow = true;
      warn.visible = false;
      spike.visible = false;
      this.scene3d.add(warn, spike);
      return { warn, spike };
    });
  }

  buildParticles() {
    const MAX = 1500;
    this.particleMax = MAX;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    const mat = new THREE.PointsMaterial({
      size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.particlePoints = this.track(new THREE.Points(geo, mat));
    this.particlePoints.frustumCulled = false;
    this.scene3d.add(this.particlePoints);
  }

  // Esporos (ou poeira de cristal) flutuando em toda a profundidade da cena.
  buildSpores(level) {
    const N = 420;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const seeds = [];
    for (let i = 0; i < N; i++) {
      seeds.push({ x: Math.random() * level.cols, y: -Math.random() * level.rows, z: -10 + Math.random() * 13, s: 0.2 + Math.random() * 0.5, p: Math.random() * 6 });
      const c = this.color(this.theme.spores[i % 3 === 0 ? 1 : 0]);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    this.spores = this.track(new THREE.Points(geo, mat));
    this.spores.frustumCulled = false;
    this.sporeSeeds = seeds;
    this.scene3d.add(this.spores);
  }

  detach() {
    if (!this.attached) return;
    for (const card of this.cards.values()) card.dispose();
    this.cards.clear();
    for (const m of this.models.values()) m.dispose();
    this.models.clear();
    if (this.terrain) this.terrain.dispose();
    if (this.scenery) this.scenery.dispose();
    for (const d of this.disposables) d.dispose();
    this.terrain = null;
    this.scenery = null;
    this.scene3d = null;
    this.attached = null;
    this.canvas.classList.add('hidden');
  }

  // ---------- Recortes ----------

  cardFor(obj, kindName) {
    let card = this.cards.get(obj);
    if (!card) {
      const k = KINDS[kindName];
      card = new SpriteCard({
        box: typeof k.box === 'function' ? k.box(obj) : k.box, anchor: k.anchor, draw: k.draw, z: k.z, unit: U,
        uniforms: k.memory ? this.uniforms : null, glow: k.glow ?? 0.45, shadow: k.shadow !== false,
      });
      this.cards.set(obj, card);
      this.scene3d.add(card.mesh);
    }
    return card;
  }

  // ---------- Desenho de cada quadro ----------

  render(scene) {
    const t = scene.time;
    const view = scene.camera.view;
    const level = scene.level;
    const cx = (view.x + CONFIG.WIDTH / 2) / U;
    const cy = -(view.y + CONFIG.HEIGHT / 2) / U;

    // O mapa mudou (memória, portão)? Refaz o terreno (no máximo 10 vezes por segundo).
    if ((level.version || 0) !== this.terrainVersion && performance.now() - this.lastBuild > 100) this.buildTerrainNow();

    updateMemoryUniforms(this.uniforms, scene.memory, CONFIG.MEMORY.FORGOTTEN, U);
    this.terrain.ghostMat.opacity = 0.14 + 0.1 * Math.sin(t * 2.5);
    this.terrain.fakeMat.emissiveIntensity = 0.06 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.5));
    // Passagem secreta: transparente com o Nilo dentro. Prédios piscam antes da cidade trocar.
    this.terrain.secretMat.opacity = scene.insideSecret && scene.insideSecret(scene.player) ? 0.3 : 1;
    this.terrain.cityMat.opacity = level.toggleWarn > 0 && Math.sin(t * 30) > 0 ? 0.35 : 1;

    // Câmera: mesma posição da câmera 2D, vista de frente e um pouco de cima.
    this.camera.position.set(cx, cy + 3.4, DIST);
    this.camera.lookAt(cx, cy + 0.6, 0);

    // Céu (com a mesma perda de cor do mundo esquecido)
    scene.bg.draw(this.skyCtx, t, view.x, view.y, true);
    scene.memory.drawForgetting(this.skyCtx, view);
    this.skyTexture.needsUpdate = true;

    // A lua acompanha a câmera para as sombras ficarem sempre nítidas perto do Nilo.
    this.moon.position.set(cx - 9, cy + 16, 14);
    this.moon.target.position.set(cx, cy, 0);

    this.syncCards(scene, cx, t);
    this.syncCollectibles(scene, t);
    this.syncSecrets(scene, t);
    this.syncExit(level, t);
    this.syncShards(scene);
    this.syncParticles(scene);
    this.syncSpores(t, cx, cy);
    this.syncLights(scene, cx, cy, t);

    this.renderer.render(this.scene3d, this.camera);
    this.measure();
  }

  // Liga/desliga os personagens 3D (os recortes e modelos atuais são refeitos no próximo quadro).
  setUseModels(on) {
    this.useModels = on;
    if (!this.scene3d) return;
    for (const [obj, card] of this.cards) { this.scene3d.remove(card.mesh); card.dispose(); this.cards.delete(obj); }
    for (const [obj, m] of this.models) { this.scene3d.remove(m.group); m.dispose(); this.models.delete(obj); }
  }

  modelFor(obj) {
    let m = this.models.get(obj);
    if (!m) {
      m = MODELS[obj.constructor.name](this.uniforms);
      this.models.set(obj, m);
      this.scene3d.add(m.group);
    }
    return m;
  }

  syncCards(scene, cx, t) {
    const visible = new Set();
    const use = (obj, kind) => {
      if (!obj) return;
      if (this.useModels && MODELS[obj.constructor.name] && kind !== 'boss') {
        const m = this.modelFor(obj);
        const a = KINDS[kind].anchor(obj);
        const near = Math.abs(a.x / U - cx) < 24;
        m.group.visible = near;
        if (near) m.update(obj, t, scene);
        visible.add(obj);
        return;
      }
      const card = this.cardFor(obj, kind);
      const a = KINDS[kind].anchor(obj);
      const near = Math.abs(a.x / U - cx) < 24;
      card.mesh.visible = near;
      if (near) card.update(obj, t, scene);
      visible.add(obj);
    };
    use(scene.player, 'player');
    for (const e of scene.enemies) use(e, enemyKind(e));
    if (scene.boss) {
      use(scene.boss, 'boss');
      // Efeitos da arena (menos a Matriarca, cujos cristais já são objetos 3D)
      if (scene.boss.effects3d !== 'shards' && scene.bossFight && !scene.boss.defeated) {
        use(scene.boss.fx || (scene.boss.fx = { boss: scene.boss }), 'bossfx');
      }
    }
    for (const k of scene.clocks || []) use(k, 'clock');
    if (scene.mira) use(scene.mira, 'mira');
    if (scene.vulto && scene.vulto.alpha > 0) use(scene.vulto, 'vulto');
    for (const l of scene.lanterns) use(l, 'lantern');
    for (const st of scene.memory.stones) use(st, 'stone');
    for (const sh of scene.shrines) use(sh, 'shrine');

    // Objetos que sumiram (inimigos derrotados): libera o recorte ou o modelo.
    for (const [obj, card] of this.cards) {
      if (!visible.has(obj)) {
        this.scene3d.remove(card.mesh);
        card.dispose();
        this.cards.delete(obj);
      }
    }
    for (const [obj, m] of this.models) {
      if (!visible.has(obj)) {
        this.scene3d.remove(m.group);
        m.dispose();
        this.models.delete(obj);
      }
    }
  }

  syncCollectibles(scene, t) {
    scene.collectibles.crystals.forEach((c, i) => {
      const m = this.crystalMeshes[i];
      m.visible = !c.collected;
      m.rotation.y = t * 1.6 + i;
      m.position.y = -c.y / U + Math.sin(t * 3 + i) * 0.08;
    });
    scene.memory.fragments.forEach((f, i) => {
      const g = this.fragMeshes[i];
      g.visible = !f.collected;
      g.children[0].rotation.set(t * 0.7, t * 1.3, 0);
      g.position.y = -f.y / U + Math.sin(t * 2) * 0.12;
      for (let k = 1; k <= 3; k++) {
        const a = t * 2.5 + (k * Math.PI * 2) / 3;
        g.children[k].position.set(Math.cos(a) * 0.55, Math.sin(a * 0.5) * 0.15, Math.sin(a) * 0.55);
      }
    });
  }

  syncSecrets(scene, t) {
    (scene.secrets || []).forEach((sc, i) => {
      const g = this.secretMeshes[i];
      if (!g) return;
      g.visible = !sc.collected;
      g.rotation.y = t * 1.8;
      g.position.y = -sc.y / U + Math.sin(t * 2.2) * 0.12;
    });
  }

  syncExit(level, t) {
    if (!this.exitGroup) return;
    this.exitGroup.visible = !level.exitHidden;
    this.portalMat.opacity = 0.18 + 0.12 * Math.sin(t * 2);
  }

  syncShards(scene) {
    const boss = scene.boss;
    // Só a Matriarca usa os cristais 3D; os outros chefes desenham os ataques no recorte "bossfx".
    const shards = boss && boss.effects3d === 'shards' ? boss.shards : [];
    this.warnMat.opacity = 0.12 + 0.12 * (Math.sin((boss ? boss.time : 0) * 18) > 0 ? 1 : 0.4);
    this.shardPool.forEach((p, i) => {
      const s = shards[i];
      p.warn.visible = !!s && s.state === 'warn';
      p.spike.visible = !!s && s.state === 'fall';
      if (!s) return;
      const a = boss.arena;
      if (p.warn.visible) {
        p.warn.position.set(s.x / U, -a.ceiling / U, 0);
        p.warn.scale.set(1, (a.floor - a.ceiling) / U, 1);
      } else {
        p.spike.position.set(s.x / U, -(s.y + 6) / U, 0);
      }
    });
  }

  syncParticles(scene) {
    const list = scene.particles.list;
    const n = Math.min(list.length, this.particleMax);
    const geo = this.particlePoints.geometry;
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;
    for (let i = 0; i < n; i++) {
      const p = list[i];
      pos[i * 3] = p.x / U;
      pos[i * 3 + 1] = -p.y / U;
      pos[i * 3 + 2] = 0.6;
      const c = this.color(p.color);
      const k = Math.min(1, p.life / (p.maxLife * 0.5));
      col[i * 3] = c.r * k;
      col[i * 3 + 1] = c.g * k;
      col[i * 3 + 2] = c.b * k;
    }
    geo.setDrawRange(0, n);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  syncSpores(t, cx, cy) {
    const pos = this.spores.geometry.attributes.position.array;
    this.sporeSeeds.forEach((s, i) => {
      // Dá a volta em torno da câmera: sempre há esporos à vista, em qualquer ponto da fase.
      const x = cx + ((((s.x - cx + 20) % 40) + 40) % 40) - 20 + Math.sin(t * 0.7 + s.p) * 0.3;
      const y = cy + (((((s.y + t * s.s) - cy + 12) % 24) + 24) % 24) - 12;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = s.z;
    });
    this.spores.geometry.attributes.position.needsUpdate = true;
  }

  // Luzes: a gema do Nilo, a chama da Mira e as fontes de luz mais próximas da câmera.
  syncLights(scene, cx, cy, t) {
    const p = scene.player;
    // A luz da gema fica um pouco à frente do Nilo: ilumina o chão em volta sem "estourar" o desenho dele.
    this.niloLight.position.set((p.x + p.w / 2) / U, -(p.y + 10) / U, 1.8);
    this.niloLight.color.set(p.charged ? '#ffd98a' : '#8ff7ff');
    this.niloLight.intensity = (p.charged ? 6 : 4) + p.memoryLevel;
    if (scene.mira) {
      this.miraLight.position.set(scene.mira.x / U, -scene.mira.y / U, 1.2);
      this.miraLight.intensity = 5 + Math.sin(t * 9) * 0.6;
    } else {
      this.miraLight.intensity = 0;
    }

    const cand = [];
    const push = (x, y, color, intensity) => cand.push({ x: x / U, y: -y / U, color, intensity });
    for (const c of scene.collectibles.crystals) if (!c.collected) push(c.x, c.y, '#59e0c5', 3);
    for (const f of scene.memory.fragments) if (!f.collected) push(f.x, f.y, '#ffc86a', 7);
    for (const l of scene.lanterns) if (l.lit) push(l.x + 3, l.base - 20, '#59e0c5', 8);
    for (const s of scene.memory.stones) push(s.x, s.base - 16, s.active ? '#8ff7ff' : '#b8b0c4', s.active ? 8 : 2);
    for (const s of scene.shrines) if (!s.taken) push(s.x, s.base - 22, '#ffd98a', 7);
    for (const sc of scene.secrets || []) if (!sc.collected) push(sc.x, sc.y, '#ffe9b0', 6);
    for (const k of scene.clocks || []) push(k.x, k.base - 32, scene.level.cityState === 0 ? '#ffcf8a' : '#a8a8b8', 5);
    if (scene.boss && scene.boss.vulnerable) push(scene.boss.x + 18, scene.boss.y, '#ff8fe0', 12);
    if (scene.level.exit && !scene.level.exitHidden) {
      const e = scene.level.exit;
      push(e.x + e.w / 2, e.y + e.h / 2, '#8ff7ff', 9);
    }
    for (const c of cand) c.d = Math.hypot(c.x - cx, c.y - cy);
    cand.sort((a, b) => a.d - b.d);
    this.pool.forEach((light, i) => {
      const c = cand[i];
      if (!c || c.d > 22) {
        light.intensity = 0;
        return;
      }
      light.position.set(c.x, c.y, 1);
      light.color.set(c.color);
      light.intensity = c.intensity;
    });
  }
}
