// Liga e desliga as telas em HTML que ficam por cima do canvas
// (menu, pausa, derrota). O HUD tem seu próprio arquivo: HUD.js.

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado no index.html`);
  return el;
};

export function showMenu() {
  $('menu').classList.remove('hidden');
  showMenuPanel('menu-main');
}

export function hideMenu() {
  $('menu').classList.add('hidden');
}

// Dentro do menu, só um painel aparece por vez (principal, controles, créditos).
export function showMenuPanel(panelId) {
  document.querySelectorAll('#menu .panel').forEach((p) => {
    p.classList.toggle('hidden', p.id !== panelId);
  });
  const first = $(panelId).querySelector('button:not([disabled])');
  if (first) first.focus();
}

// Enquanto uma tela (pausa, derrota, conclusão) está aberta, os botões de toque somem.
function setOverlayOpen(open) {
  document.body.classList.toggle('overlay-open', open);
}

export function setPaused(paused) {
  $('pause').classList.toggle('hidden', !paused);
  setOverlayOpen(paused);
  if (paused) showPausePanel('pause-main');
}

// Missão da região e objetivos (com ✓ nos concluídos), mostrados na pausa.
export function setPauseMission(mission, checklist) {
  $('pause-mission').classList.toggle('hidden', !mission);
  $('pause-mission-text').textContent = mission || '';
  const list = $('pause-objectives');
  list.innerHTML = '';
  for (const o of checklist || []) {
    const li = document.createElement('li');
    li.className = o.done ? 'done' : '';
    li.textContent = `${o.done ? '✓' : '○'} ${o.text}`;
    list.append(li);
  }
}

// "★★☆" a partir de [true, true, false]
export function starText(stars) {
  return stars.map((s) => (s ? '★' : '☆')).join('');
}

// Dentro da pausa: painel principal ou controles.
export function showPausePanel(panelId) {
  document.querySelectorAll('#pause .panel').forEach((p) => {
    p.classList.toggle('hidden', p.id !== panelId);
  });
  const first = $(panelId).querySelector('button');
  if (first) first.focus();
}

// Tela de derrota, com o resumo da tentativa.
export function showDefeat(stats) {
  $('defeat-stats').textContent = `Cristais: ${stats.crystals}/${stats.total} · Pontos: ${stats.score}`;
  $('btn-retry').textContent = stats.hasCheckpoint ? 'Voltar ao último checkpoint' : 'Tentar novamente';
  $('defeat').classList.remove('hidden');
  setOverlayOpen(true);
  $('btn-retry').focus();
}

export function hideDefeat() {
  $('defeat').classList.add('hidden');
  setOverlayOpen(false);
}

// 125.4 segundos → "02:05"
export function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Tela de fase concluída.
export function showComplete(r) {
  $('complete-region').textContent = r.final ? 'Fim da jornada' : `Região ${r.region.number} concluída`;
  $('complete-name').textContent = r.region.name;
  $('complete-crystals').textContent = `${r.crystals}/${r.totalCrystals}`;
  $('complete-memories').textContent = `${r.memories}/${r.totalMemories}`;
  $('complete-time').textContent = formatTime(r.time);
  $('complete-score').textContent = String(r.score);
  $('complete-bonus').classList.toggle('hidden', !r.bonus);
  $('complete-bonus').textContent = r.bonus ? `+${r.bonus} por todos os cristais` : '';
  const st = r.stars || [true, false, false];
  const labels = ['concluir', 'todos os cristais', r.hasSecret ? 'Eco Escondido' : 'segredo'];
  $('complete-stars').textContent = `${starText(st)}  ·  ${labels.map((l, i) => `${st[i] ? '✓' : '○'} ${l}`).join(' · ')}`;
  $('complete-ending').classList.toggle('hidden', !r.ending);
  if (r.ending) {
    let text = r.ending;
    if (r.maxStars) text += ` Estrelas da Aurora: ${r.totalStars}/${r.maxStars}.`;
    if (r.maxStars && r.totalStars === r.maxStars) text += ' Todas! Lumora se lembra de cada cantinho, graças a você.';
    $('complete-ending').textContent = text;
  }
  $('record-score').classList.toggle('hidden', !r.records.score);
  $('record-time').classList.toggle('hidden', !r.records.time);
  let next = r.final ? 'Obrigado por jogar Ecos de Lumora.' : 'Esta é a última região da jornada.';
  if (r.next) {
    next = `O caminho para ${r.next.name} se abriu no Mapa de Lumora`;
    if (!r.next.implemented) next += ' (região ainda em construção)';
    next += '.';
  }
  $('complete-next').textContent = next;
  const go = $('btn-complete-next');
  const canGo = !!(r.next && r.next.implemented);
  go.classList.toggle('hidden', !canGo);
  go.dataset.region = canGo ? r.next.id : '';
  go.textContent = canGo ? `Seguir para ${r.next.name}` : '';
  $('complete').classList.remove('hidden');
  setOverlayOpen(true);
  (canGo ? go : $('btn-complete-map')).focus();
}

export function hideComplete() {
  $('complete').classList.add('hidden');
  setOverlayOpen(false);
}

// Botões em foco "roubam" Enter/Espaço. Ao entrar no jogo, tiramos o foco deles.
export function releaseFocus() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}
