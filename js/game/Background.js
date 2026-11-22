// Céu noturno de Lumora com PARALLAX.
//
// Cada camada se move numa fração da câmera:
//   estrelas 0.05 · aurora 0.1 · morros 0.2 e 0.35 · árvores 0.55
//   (fase e Nilo = 1.0) · névoa da frente 1.25
// Quanto menor o número, mais "longe" a camada parece estar.
// As camadas são infinitas: calculadas pela posição no mundo, não guardadas.

import { CONFIG } from '../config.js';

const W = CONFIG.WIDTH;
const H = CONFIG.HEIGHT;

const PARALLAX = {
  stars: 0.05,
  aurora: 0.1,
  hillsFar: 0.2,
  hillsNear: 0.35,
  trees: 0.55,
  fog: 1.25,
};

function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Número pseudoaleatório estável para um índice (usado nas árvores infinitas).
function noise(i) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Módulo que funciona com negativos: wrap(-5, 100) = 95.
const wrap = (v, m) => ((v % m) + m) % m;

export class Background {
  // theme: 'bosque' (céu noturno com aurora) ou 'minas' (caverna de cristal)
  constructor(seed = 7, theme = 'bosque') {
    this.theme = theme;
    const rnd = seeded(seed);
    this.stars = Array.from({ length: 70 }, () => ({
      x: rnd() * W,
      y: rnd() * H * 0.55,
      phase: rnd() * Math.PI * 2,
      size: rnd() < 0.15 ? 2 : 1,
    }));
    this.spores = Array.from({ length: 26 }, () => ({
      x: rnd() * W,
      y: rnd() * H,
      speed: 4 + rnd() * 9,
      phase: rnd() * Math.PI * 2,
      sway: 4 + rnd() * 8,
      color: rnd() < 0.7 ? '#7ff5e0' : '#c7a6ff',
    }));
    if (theme === 'minas') {
      // Nas Minas, os "esporos" viram poeira de cristal, mais lenta e azulada.
      for (const s of this.spores) {
        s.speed *= 0.4;
        s.color = rnd() < 0.6 ? '#8fd1ff' : '#ff8fe0';
      }
    }
    // Cores dos "esporos" das regiões novas: pólen dourado, poeira sépia, luz de aurora.
    const SPORES = {
      arquipelago: ['#ffffff', '#fff3b0'],
      cidade: ['#e8d6c0', '#ffcf8a'],
      santuario: ['#8ff7ff', '#ff9ad5', '#ffd98a'],
    };
    if (SPORES[theme]) {
      for (const s of this.spores) s.color = SPORES[theme][Math.floor(rnd() * SPORES[theme].length)];
    }
    this.fogColor = { arquipelago: '#ffffff', cidade: '#e8d6c0', santuario: '#c9fff3' }[theme] || '#9fe9ff';
  }

  update(dt) {
    for (const s of this.spores) {
      s.y -= s.speed * dt;
      s.phase += dt;
      if (s.y < -6) s.y = H + 6;
    }
  }

  // camX/camY: posição da câmera no mundo (0, 0 no menu).
  // skyOnly = true: só o céu distante (o modo 3D põe árvores e rochas de verdade na frente).
  draw(ctx, time, camX = 0, camY = 0, skyOnly = false) {
    if (this.theme === 'minas') {
      this.drawCave(ctx, time, camX, camY, skyOnly);
      return;
    }
    if (this.theme === 'arquipelago') {
      this.drawSkyIslands(ctx, time, camX, camY, skyOnly);
      return;
    }
    if (this.theme === 'cidade') {
      this.drawCity(ctx, time, camX, camY, skyOnly);
      return;
    }
    if (this.theme === 'santuario') {
      this.drawSanctuary(ctx, time, camX, camY, skyOnly);
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b0820');
    sky.addColorStop(0.55, '#1b1446');
    sky.addColorStop(1, '#123a4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const starShift = camX * PARALLAX.stars;
    for (const s of this.stars) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.3 + s.phase));
      ctx.fillStyle = '#e9e4ff';
      ctx.fillRect(Math.floor(wrap(s.x - starShift, W)), Math.floor(s.y), s.size, s.size);
    }

    for (let band = 0; band < 2; band++) {
      ctx.fillStyle = band === 0 ? '#5ef0d0' : '#b48cff';
      for (let x = 0; x < W; x += 4) {
        const wx = x + camX * PARALLAX.aurora;
        const y = 48 + band * 18 + Math.sin(wx * 0.012 + time * 0.35 + band * 2) * 14;
        ctx.globalAlpha = 0.05 + 0.04 * Math.sin(wx * 0.03 + time * 0.8 + band);
        ctx.fillRect(x, y, 4, 34);
      }
    }
    ctx.globalAlpha = 1;
    if (skyOnly) {
      this.drawHills(ctx, '#1a1640', 120, 0.011, 18, 1.7, camX * PARALLAX.hillsFar, camY * 0.1);
      return;
    }

    this.drawHills(ctx, '#1a1640', 120, 0.011, 18, 1.7, camX * PARALLAX.hillsFar, camY * 0.1);
    this.drawHills(ctx, '#120f2e', 82, 0.019, 12, 4.1, camX * PARALLAX.hillsNear, camY * 0.2);
    this.drawTrees(ctx, time, camX * PARALLAX.trees, camY * 0.35);
  }

  drawHills(ctx, color, base, freq, amp, offset, shiftX, shiftY) {
    ctx.fillStyle = color;
    for (let x = 0; x < W; x += 2) {
      const wx = x + shiftX;
      const h = base + Math.sin(wx * freq + offset) * amp + Math.sin(wx * freq * 3.7 + offset) * amp * 0.35;
      const tree = Math.floor(wx / 2) % 23 === 0 ? 14 : 0;
      const top = Math.round(H - h - tree - shiftY);
      ctx.fillRect(x, top, 2, H - top);
    }
  }

  // Árvores altas de copa luminosa, entre os morros e a fase.
  drawTrees(ctx, time, shiftX, shiftY) {
    const spacing = 70;
    const first = Math.floor(shiftX / spacing) - 1;
    const last = Math.floor((shiftX + W) / spacing) + 1;
    for (let i = first; i <= last; i++) {
      const n = noise(i);
      if (n < 0.25) continue; // algumas clareiras sem árvore
      const x = Math.round(i * spacing + n * 40 - shiftX);
      const trunkW = 6 + Math.floor(n * 6);
      const height = 110 + Math.floor(noise(i + 999) * 70);
      const top = Math.round(H - height - shiftY);

      ctx.fillStyle = '#16123a';
      ctx.fillRect(x, top, trunkW, H - top);
      ctx.fillRect(x - 3, H - 18 - shiftY, trunkW + 6, 18 + shiftY); // raízes

      // Copa: blocos sobrepostos
      const cw = 34 + Math.floor(n * 24);
      ctx.fillStyle = '#1c1748';
      ctx.fillRect(x + trunkW / 2 - cw / 2, top - 18, cw, 26);
      ctx.fillRect(x + trunkW / 2 - cw / 2 + 6, top - 28, cw - 12, 12);

      // Pontinhos de luz na copa, piscando em tempos diferentes
      for (let k = 0; k < 4; k++) {
        const lx = x + trunkW / 2 - cw / 2 + 4 + Math.floor(noise(i * 7 + k) * (cw - 8));
        const ly = top - 22 + Math.floor(noise(i * 13 + k) * 26);
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time * 1.7 + i + k));
        ctx.fillStyle = k % 2 ? '#59e0c5' : '#c7a6ff';
        ctx.fillRect(lx, ly, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Tema "minas": caverna de cristal ----------
  drawCave(ctx, time, camX, camY, skyOnly = false) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#04050c');
    g.addColorStop(0.6, '#0b1228');
    g.addColorStop(1, '#101a3a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Cristais distantes que pulsam devagar (parallax bem lento)
    const shift = camX * 0.08;
    for (let i = Math.floor(shift / 60) - 1; i <= Math.floor((shift + W) / 60) + 1; i++) {
      const n = noise(i * 3 + 11);
      if (n < 0.45) continue;
      const x = Math.round(i * 60 + n * 30 - shift);
      const y = 70 + Math.floor(noise(i + 77) * 110);
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 1.2 + i);
      ctx.fillStyle = n > 0.75 ? '#ff8fe0' : '#8fd1ff';
      ctx.fillRect(x, y - 3, 2, 7);
      ctx.fillRect(x - 1, y - 1, 4, 3);
      ctx.globalAlpha = 1;
    }
    if (skyOnly) return;

    // Estalactites (de cima) e estalagmites (de baixo), duas camadas
    this.drawSpikes(ctx, '#0d1430', camX * 0.2, camY * 0.1, 0.031, 52, false);
    this.drawSpikes(ctx, '#0d1430', camX * 0.2, camY * 0.1, 0.027, 46, true);
    this.drawSpikes(ctx, '#080c1f', camX * 0.45, camY * 0.25, 0.047, 36, false);
    this.drawSpikes(ctx, '#080c1f', camX * 0.45, camY * 0.25, 0.041, 30, true);
  }

  drawSpikes(ctx, color, shiftX, shiftY, freq, depth, fromBottom) {
    ctx.fillStyle = color;
    for (let x = 0; x < W; x += 2) {
      const wx = x + shiftX;
      const k = Math.abs(Math.sin(wx * freq)) * Math.abs(Math.sin(wx * freq * 2.3 + 1));
      const h = Math.round(depth * k * k + 6);
      if (fromBottom) ctx.fillRect(x, Math.round(H - h - shiftY * 0.3), 2, h + 40);
      else ctx.fillRect(x, Math.round(-shiftY * 0.3) - 40, 2, h + 40);
    }
  }

  // ---------- Tema "arquipelago": pôr do sol entre ilhas flutuantes ----------
  drawSkyIslands(ctx, time, camX, camY, skyOnly = false) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5a4a9a');
    g.addColorStop(0.5, '#e89aa0');
    g.addColorStop(1, '#ffd8a8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Sol baixo, quase sem parallax
    const sx = Math.round(W * 0.72 - camX * 0.02);
    ctx.fillStyle = '#fff3d6';
    ctx.globalAlpha = 0.25;
    ctx.fillRect(sx - 26, 150 - 26, 52, 52);
    ctx.globalAlpha = 0.9;
    ctx.fillRect(sx - 16, 150 - 16, 32, 32);
    ctx.fillRect(sx - 20, 150 - 10, 40, 20);
    ctx.globalAlpha = 1;
    this.drawCloudBand(ctx, time, camX * 0.06, 70, '#f8c8c0', 0.5, 31);
    if (skyOnly) {
      this.drawFarIslands(ctx, camX * 0.12, camY * 0.05, '#b87a8e', 150, 7);
      return;
    }
    this.drawFarIslands(ctx, camX * 0.12, camY * 0.05, '#b87a8e', 150, 7);
    this.drawCloudBand(ctx, time, camX * 0.25, 190, '#ffe6d0', 0.7, 17);
    this.drawFarIslands(ctx, camX * 0.4, camY * 0.2, '#8a5a72', 175, 13);
    this.drawCloudBand(ctx, time, camX * 0.6, 240, '#ffffff', 0.8, 5);
  }

  // Faixa de nuvens: blocos arredondados que derivam devagar.
  drawCloudBand(ctx, time, shift, y, color, alpha, seed) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    const spacing = 90;
    const s = shift + time * 4;
    for (let i = Math.floor(s / spacing) - 1; i <= Math.floor((s + W) / spacing) + 1; i++) {
      const n = noise(i * 7 + seed);
      if (n < 0.3) continue;
      const x = Math.round(i * spacing + n * 50 - s);
      const w = 40 + Math.floor(n * 50);
      const yy = y + Math.floor(noise(i + seed) * 24) - 12;
      ctx.fillRect(x, yy, w, 10);
      ctx.fillRect(x + 8, yy - 6, w - 20, 7);
      ctx.fillRect(x + 18, yy - 10, w - 40 > 6 ? w - 40 : 6, 5);
    }
    ctx.globalAlpha = 1;
  }

  // Ilhas distantes: um topo plano com raízes penduradas.
  drawFarIslands(ctx, shiftX, shiftY, color, baseY, seed) {
    ctx.fillStyle = color;
    const spacing = 130;
    for (let i = Math.floor(shiftX / spacing) - 1; i <= Math.floor((shiftX + W) / spacing) + 1; i++) {
      const n = noise(i * 11 + seed);
      if (n < 0.35) continue;
      const x = Math.round(i * spacing + n * 60 - shiftX);
      const w = 30 + Math.floor(n * 40);
      const y = Math.round(baseY - noise(i + seed * 3) * 80 - shiftY);
      ctx.fillRect(x, y, w, 6);
      ctx.fillRect(x + 4, y + 6, w - 8, 6);
      ctx.fillRect(x + w / 2 - 6, y + 12, 12, 6);
      ctx.fillRect(x + w / 2 - 2, y + 18, 4, 5);
    }
  }

  // ---------- Tema "cidade": entardecer sépia ----------
  drawCity(ctx, time, camX, camY, skyOnly = false) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a2030');
    g.addColorStop(0.55, '#6a4a48');
    g.addColorStop(1, '#c98a6a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Lua pálida e desbotada
    ctx.fillStyle = '#e8d6c0';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(Math.round(W * 0.2 - camX * 0.02), 40, 14, 14);
    ctx.globalAlpha = 1;
    this.drawSkyline(ctx, time, camX * 0.15, camY * 0.05, '#4a3440', 110, 21, false);
    if (skyOnly) return;
    this.drawSkyline(ctx, time, camX * 0.35, camY * 0.15, '#33242c', 80, 9, true);
    this.drawSkyline(ctx, time, camX * 0.6, camY * 0.3, '#22181e', 50, 3, true);
  }

  // Silhuetas de prédios com algumas janelas acesas (as lembranças que sobraram).
  drawSkyline(ctx, time, shiftX, shiftY, color, minH, seed, windows) {
    const spacing = 26;
    for (let i = Math.floor(shiftX / spacing) - 1; i <= Math.floor((shiftX + W) / spacing) + 1; i++) {
      const n = noise(i * 5 + seed);
      const x = Math.round(i * spacing - shiftX);
      const h = minH + Math.floor(n * 70);
      const top = Math.round(H - h - shiftY);
      ctx.fillStyle = color;
      ctx.fillRect(x, top, spacing - 2, H - top);
      if (n > 0.7) ctx.fillRect(x + 8, top - 10, 4, 10); // chaminé ou torre
      if (!windows) continue;
      for (let k = 0; k < 4; k++) {
        if (noise(i * 13 + k + seed) < 0.75) continue;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time + i + k);
        ctx.fillStyle = '#ffcf8a';
        ctx.fillRect(x + 4 + (k % 2) * 10, top + 8 + Math.floor(k / 2) * 14, 4, 5);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------- Tema "santuario": aurora intensa e pilares antigos ----------
  drawSanctuary(ctx, time, camX, camY, skyOnly = false) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0a2a');
    g.addColorStop(0.6, '#2a1a5a');
    g.addColorStop(1, '#1a4a6a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const starShift = camX * PARALLAX.stars;
    for (const s of this.stars) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.3 + s.phase));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(wrap(s.x - starShift, W)), Math.floor(s.y), s.size, s.size);
    }
    const colors = ['#5ef0d0', '#b48cff', '#ff9ad5', '#ffd98a'];
    for (let band = 0; band < 4; band++) {
      ctx.fillStyle = colors[band];
      for (let x = 0; x < W; x += 4) {
        const wx = x + camX * PARALLAX.aurora;
        const y = 30 + band * 16 + Math.sin(wx * 0.01 + time * 0.4 + band * 1.7) * 18;
        ctx.globalAlpha = 0.08 + 0.06 * Math.sin(wx * 0.025 + time * 0.9 + band);
        ctx.fillRect(x, y, 4, 44);
      }
    }
    ctx.globalAlpha = 1;
    if (skyOnly) return;
    // Pilares distantes
    const spacing = 110;
    const shift = camX * 0.3;
    for (let i = Math.floor(shift / spacing) - 1; i <= Math.floor((shift + W) / spacing) + 1; i++) {
      const n = noise(i * 3 + 41);
      if (n < 0.3) continue;
      const x = Math.round(i * spacing + n * 40 - shift);
      const h = 90 + Math.floor(n * 80);
      const top = Math.round(H - h - camY * 0.15);
      ctx.fillStyle = '#1e1a48';
      ctx.fillRect(x, top, 14, H - top);
      ctx.fillRect(x - 3, top, 20, 5);
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 1.5 + i);
      ctx.fillStyle = colors[i & 3];
      ctx.fillRect(x + 6, top + 10, 2, 8);
      ctx.globalAlpha = 1;
    }
  }

  // Na frente de tudo: esporos e uma névoa baixa que passa mais rápido que a fase.
  drawFront(ctx, time, camX = 0) {
    for (const s of this.spores) {
      const x = Math.round(s.x + Math.sin(s.phase) * s.sway);
      const y = Math.round(s.y);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.fillStyle = this.fogColor || '#9fe9ff';
    const shift = camX * PARALLAX.fog + time * 6;
    for (let x = 0; x < W; x += 3) {
      const wx = x + shift;
      const thickness = 10 + Math.sin(wx * 0.015) * 6 + Math.sin(wx * 0.041 + time * 0.5) * 4;
      ctx.globalAlpha = 0.045;
      ctx.fillRect(x, H - thickness, 3, thickness);
    }
    ctx.globalAlpha = 1;
  }
}
