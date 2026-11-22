// Retratos dos personagens para a caixa de diálogo.
// Cada retrato é desenhado num canvas de 32×32 e ampliado pelo CSS (pixelado).
// Para trocar por arte desenhada à mão no futuro, basta substituir a função
// do personagem por um ctx.drawImage(...) com a imagem nova.

export const PORTRAIT_SIZE = 32;

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function nilo(ctx, t) {
  px(ctx, 0, 0, 32, 32, '#123a4a');
  px(ctx, 0, 24, 32, 8, '#0e2c38');
  // Capuz
  px(ctx, 6, 4, 20, 6, '#4a3f9a');
  px(ctx, 4, 8, 6, 18, '#4a3f9a');
  px(ctx, 22, 8, 5, 14, '#4a3f9a');
  px(ctx, 6, 3, 18, 1, '#2b255f');
  px(ctx, 2, 6, 4, 4, '#4a3f9a'); // ponta do capuz
  // Rosto
  px(ctx, 10, 9, 12, 14, '#f4cfa6');
  px(ctx, 10, 9, 12, 2, '#2b255f'); // franja
  px(ctx, 13, 11, 3, 1, '#2b255f');
  // Olhos (piscam)
  const blink = t % 3.2 < 0.12;
  px(ctx, 13, blink ? 15 : 14, 2, blink ? 1 : 3, '#1a1426');
  px(ctx, 18, blink ? 15 : 14, 2, blink ? 1 : 3, '#1a1426');
  if (!blink) {
    px(ctx, 13, 14, 1, 1, '#ffffff');
    px(ctx, 18, 14, 1, 1, '#ffffff');
  }
  px(ctx, 12, 18, 2, 1, '#f29a8a');
  px(ctx, 19, 18, 2, 1, '#f29a8a');
  px(ctx, 15, 20, 3, 1, '#c98a7a'); // boca
  // Cachecol
  px(ctx, 6, 23, 21, 5, '#ff8a3d');
  px(ctx, 6, 26, 21, 2, '#d9622a');
  px(ctx, 22, 27, 4, 5, '#ff8a3d');
  // Gema
  px(ctx, 14, 29, 4, 3, '#8ff7ff');
  px(ctx, 15, 29, 1, 1, '#ffffff');
}

function mira(ctx, t) {
  px(ctx, 0, 0, 32, 32, '#14123a');
  // Chama da cauda subindo atrás
  for (let i = 0; i < 6; i++) {
    const h = 4 + Math.round((Math.sin(t * 8 + i * 1.7) + 1) * 3);
    px(ctx, 2 + i * 5, 32 - h, 4, h, i % 2 ? '#5fa8ff' : '#8ff7ff');
  }
  // Orelhas
  px(ctx, 7, 4, 5, 8, '#dfe9ff');
  px(ctx, 20, 4, 5, 8, '#dfe9ff');
  px(ctx, 8, 6, 3, 5, '#9fb4ff');
  px(ctx, 21, 6, 3, 5, '#9fb4ff');
  // Cabeça
  px(ctx, 6, 11, 20, 12, '#dfe9ff');
  px(ctx, 8, 22, 16, 3, '#dfe9ff');
  px(ctx, 11, 24, 10, 3, '#f4f8ff'); // focinho
  px(ctx, 15, 24, 2, 2, '#1a1426'); // nariz
  // Olhos semicerrados: ela sempre parece saber de algo
  const blink = t % 4.1 < 0.12;
  px(ctx, 10, 16, 4, blink ? 1 : 2, '#1a1426');
  px(ctx, 18, 16, 4, blink ? 1 : 2, '#1a1426');
  if (!blink) {
    px(ctx, 12, 16, 1, 1, '#8ff7ff');
    px(ctx, 20, 16, 1, 1, '#8ff7ff');
  }
  px(ctx, 9, 15, 5, 1, '#9fb4ff'); // pálpebra
  px(ctx, 18, 15, 5, 1, '#9fb4ff');
}

function vulto(ctx, t) {
  px(ctx, 0, 0, 32, 32, '#07050f');
  // Névoa que se mexe nas bordas
  for (let i = 0; i < 8; i++) {
    const x = Math.round(4 + i * 3 + Math.sin(t * 1.3 + i) * 2);
    const h = 16 + Math.round(Math.sin(t * 0.9 + i * 2) * 4);
    px(ctx, x, 32 - h, 3, h, '#1a1428');
  }
  px(ctx, 7, 3, 18, 26, '#141022');
  // Máscara de cristal rachada
  px(ctx, 9, 7, 14, 16, '#cfe9ff');
  px(ctx, 10, 6, 12, 1, '#cfe9ff');
  px(ctx, 10, 23, 12, 2, '#a9c7e0');
  px(ctx, 15, 6, 1, 5, '#5f596b'); // rachadura
  px(ctx, 16, 11, 1, 4, '#5f596b');
  px(ctx, 15, 15, 1, 6, '#5f596b');
  // Olhos: fendas que brilham devagar
  const glow = 0.55 + 0.45 * Math.sin(t * 2);
  ctx.globalAlpha = glow;
  px(ctx, 11, 13, 4, 1, '#b48cff');
  px(ctx, 18, 13, 4, 1, '#b48cff');
  ctx.globalAlpha = 1;
}

function matriarca(ctx, t) {
  px(ctx, 0, 0, 32, 32, '#0b1228');
  // Cristais nas costas
  px(ctx, 20, 0, 5, 14, '#8fd1ff');
  px(ctx, 26, 4, 4, 10, '#ff8fe0');
  px(ctx, 3, 3, 4, 10, '#ff8fe0');
  px(ctx, 21, 0, 2, 3, '#ffffff');
  // Cabeça de pedra
  px(ctx, 4, 10, 24, 22, '#2a2148');
  px(ctx, 6, 8, 20, 2, '#2a2148');
  px(ctx, 7, 14, 18, 12, '#3a3266');
  // Olhos que brilham devagar
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 2);
  px(ctx, 10, 18, 4, 2, '#ff8fe0');
  px(ctx, 18, 18, 4, 2, '#ff8fe0');
  ctx.globalAlpha = 1;
  px(ctx, 13, 23, 6, 1, '#140f26'); // boca
}

function raiz(ctx, t) {
  px(ctx, 0, 0, 32, 32, '#141032');
  // Copa seca
  px(ctx, 2, 0, 28, 8, '#6b6650');
  px(ctx, 6, 7, 20, 3, '#6b6650');
  // Tronco com rosto
  px(ctx, 5, 9, 22, 23, '#5a5060');
  px(ctx, 8, 12, 2, 18, '#3a3444');
  px(ctx, 22, 14, 2, 16, '#3a3444');
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 1.5);
  px(ctx, 10, 16, 4, 3, '#ffb84a');
  px(ctx, 18, 16, 4, 3, '#ffb84a');
  ctx.globalAlpha = 1;
  px(ctx, 12, 24, 8, 2, '#3a3444');
  // Botão de flor fechado no topo
  px(ctx, 14, 1, 4, 4, '#8a6a5a');
}

function tempestade(ctx, t) {
  px(ctx, 0, 0, 32, 32, '#2a2040');
  // Nuvem
  px(ctx, 2, 8, 28, 16, '#4a4466');
  px(ctx, 6, 3, 12, 8, '#4a4466');
  px(ctx, 16, 1, 12, 9, '#4a4466');
  px(ctx, 2, 22, 28, 3, '#2a2640');
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3);
  px(ctx, 9, 13, 4, 3, '#fff3b0');
  px(ctx, 19, 13, 4, 3, '#fff3b0');
  ctx.globalAlpha = 1;
  // Raio pequeno
  if (Math.sin(t * 5) > 0.6) {
    px(ctx, 14, 25, 2, 3, '#ffffff');
    px(ctx, 12, 28, 2, 4, '#ffffff');
  }
  // Chuva
  ctx.fillStyle = '#8fd1ff';
  for (let i = 0; i < 6; i++) ctx.fillRect(4 + i * 5, 26 + Math.round((t * 20 + i * 3) % 6), 1, 2);
}

function arquivista(ctx, t) {
  px(ctx, 0, 0, 32, 32, '#2a2030');
  // Luminária-cabeça
  px(ctx, 4, 2, 24, 4, '#2e231c');
  px(ctx, 6, 6, 20, 16, '#8a7a6a');
  // Óculos
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 2);
  px(ctx, 8, 11, 6, 5, '#ffcf8a');
  px(ctx, 18, 11, 6, 5, '#ffcf8a');
  ctx.globalAlpha = 1;
  px(ctx, 14, 12, 4, 1, '#2e231c');
  px(ctx, 12, 19, 8, 1, '#2e231c');
  // Gola de casaco com gavetas
  px(ctx, 4, 22, 24, 10, '#4a3a40');
  px(ctx, 8, 26, 16, 1, '#2e231c');
  px(ctx, 15, 28, 2, 2, '#c99a78');
}

const DRAWERS = { nilo, mira, vulto, matriarca, raiz, tempestade, arquivista };

// Desenha o retrato de "who". Retorna false se o personagem não tem retrato (narrador).
export function drawPortrait(ctx, who, time) {
  const draw = DRAWERS[who];
  if (!draw) return false;
  ctx.clearRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
  draw(ctx, time);
  return true;
}
