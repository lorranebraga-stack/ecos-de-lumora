// Colisão entre um corpo retangular (AABB) e o mapa de blocos.
//
// Estratégia: mover em X, corrigir; depois mover em Y, corrigir.
// Separar os eixos evita o clássico bug de "grudar na parede" ou
// "subir pela quina", porque cada correção só mexe em um eixo.
//
// REGRA "SÓ O QUE FOI ALCANÇADO AGORA": cada eixo só considera os blocos que a
// borda do corpo ATRAVESSOU neste passo (ex.: caindo, só blocos cujo topo está
// abaixo de onde os pés estavam). Um bloco que o corpo já tocava antes é ignorado.
// Isso impede teletransportes: um Nilo que nasce com a cabeça encostada no teto
// não é "jogado" para cima do teto quando começa a cair (bug achado pelos testes).
//
// Um corpo precisa ter: x, y, w, h, vx, vy, onGround.
// A velocidade máxima (≈5 px por passo) é menor que um bloco (16 px),
// então o corpo nunca atravessa um bloco inteiro num só passo.

const EPS = 0.01;

export function moveAndCollide(body, level, dt) {
  body.onGround = false;

  const prevLeft = body.x;
  const prevRight = body.x + body.w;
  body.x += body.vx * dt;
  resolveX(body, level, prevLeft, prevRight);

  // Onde estavam os pés e a cabeça ANTES de mover em Y. Os pés também decidem
  // se o Nilo veio de cima de um galho (pisa) ou de baixo (atravessa).
  const prevTop = body.y;
  const prevBottom = body.y + body.h;
  body.y += body.vy * dt;
  resolveY(body, level, prevTop, prevBottom);
}

// Faixa de colunas/linhas de blocos que o corpo ocupa agora.
// O "- 0.001" impede que encostar exatamente numa borda conte como sobreposição.
function tileSpan(body, T) {
  return {
    x0: Math.floor(body.x / T),
    x1: Math.floor((body.x + body.w - 0.001) / T),
    y0: Math.floor(body.y / T),
    y1: Math.floor((body.y + body.h - 0.001) / T),
  };
}

function resolveX(body, level, prevLeft, prevRight) {
  if (body.vx === 0) return;
  const T = level.tile;
  const s = tileSpan(body, T);

  if (body.vx > 0) {
    // Indo para a direita: o primeiro bloco sólido que a borda direita alcançou.
    for (let tx = s.x0; tx <= s.x1; tx++) {
      if (tx * T < prevRight - EPS) continue; // já estava encostado/dentro antes
      for (let ty = s.y0; ty <= s.y1; ty++) {
        if (level.isSolid(tx, ty)) {
          body.x = tx * T - body.w;
          body.vx = 0;
          return;
        }
      }
    }
  } else {
    for (let tx = s.x1; tx >= s.x0; tx--) {
      if ((tx + 1) * T > prevLeft + EPS) continue;
      for (let ty = s.y0; ty <= s.y1; ty++) {
        if (level.isSolid(tx, ty)) {
          body.x = (tx + 1) * T;
          body.vx = 0;
          return;
        }
      }
    }
  }
}

function resolveY(body, level, prevTop, prevBottom) {
  if (body.vy === 0) return;
  const T = level.tile;
  const s = tileSpan(body, T);

  if (body.vy > 0) {
    // Caindo: o bloco mais alto cujo topo os pés acabaram de alcançar é o chão.
    // A mesma regra faz o galho ('=') segurar só quem vem de cima.
    for (let ty = s.y0; ty <= s.y1; ty++) {
      if (ty * T < prevBottom - EPS) continue;
      for (let tx = s.x0; tx <= s.x1; tx++) {
        if (level.isSolid(tx, ty) || level.isPlatform(tx, ty)) {
          body.y = ty * T - body.h;
          body.vy = 0;
          body.onGround = true;
          return;
        }
      }
    }
  } else {
    // Subindo: bateu a cabeça num bloco que a cabeça acabou de alcançar.
    for (let ty = s.y1; ty >= s.y0; ty--) {
      if ((ty + 1) * T > prevTop + EPS) continue;
      for (let tx = s.x0; tx <= s.x1; tx++) {
        if (level.isSolid(tx, ty)) {
          body.y = (ty + 1) * T;
          body.vy = 0;
          return;
        }
      }
    }
  }
}

// Aproxima um valor de um alvo sem passar dele. Base de aceleração e atrito.
export function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  return Math.max(value - amount, target);
}
