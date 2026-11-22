// HUD: a faixa de informações durante a partida (HTML por cima do canvas).
// Só mexe no DOM quando um valor muda, nunca a cada quadro.

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado no index.html`);
  return el;
};

// Reinicia uma animação CSS mesmo que ela já esteja rodando.
function retrigger(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // força o navegador a "esquecer" a animação anterior
  el.classList.add(className);
}

export class HUD {
  constructor() {
    this.root = $('hud');
    this.stage = $('stage');
    this.region = $('hud-region');
    this.hint = $('hud-hint');
    this.energy = $('hud-energy');
    this.crystals = $('hud-crystals');
    this.crystalBox = $('hud-crystal-box');
    this.score = $('hud-score');
    this.fragmentBox = $('hud-fragment-box');
    this.fragments = $('hud-fragments');
    this.fragmentsFound = $('hud-fragments-found');
    this.ability = $('hud-ability');
    this.regionCard = $('region-card');
    this.regionNumber = $('region-number');
    this.regionName = $('region-name');
    this.regionSubtitle = $('region-subtitle');
    this.regionMission = $('region-mission');
    this.mission = $('hud-mission');
    this.missionText = $('hud-mission-text');
    this.toastEl = $('toast');
    this.abilityJump = $('hud-ability-jump');
    this.bossBar = $('boss-bar');
    this.bossName = $('boss-name');
    this.bossPips = $('boss-pips');
    this.last = {};
  }

  show(regionName) {
    this.region.textContent = regionName;
    this.root.classList.remove('hidden');
    document.body.classList.add('playing'); // mostra os botões de toque (no celular)
  }

  hide() {
    this.root.classList.add('hidden');
    document.body.classList.remove('playing');
    this.regionCard.classList.add('hidden');
    this.regionCard.classList.remove('show');
    this.toastEl.classList.add('hidden');
    this.stage.classList.remove('flash-damage', 'flash-memory');
  }

  setHint(text) {
    if (this.last.hint === text) return;
    this.last.hint = text;
    this.hint.textContent = text;
    retrigger(this.hint, 'fade-in');
  }

  // Energia: um losango por ponto, cheio ou vazio.
  setEnergy(current, max) {
    const key = `${current}/${max}`;
    if (this.last.energy === key) return;
    this.last.energy = key;
    this.energy.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('span');
      pip.className = i < current ? 'pip' : 'pip empty';
      this.energy.appendChild(pip);
    }
    this.energy.setAttribute('aria-label', `Energia ${current} de ${max}`);
  }

  setCrystals(count, total) {
    const key = `${count}/${total}`;
    if (this.last.crystals === key) return;
    const grew = this.last.crystals !== undefined;
    this.last.crystals = key;
    this.crystals.textContent = `${count}/${total}`;
    if (grew) retrigger(this.crystalBox, 'pop');
  }

  setScore(value) {
    if (this.last.score === value) return;
    this.last.score = value;
    this.score.textContent = String(value).padStart(5, '0');
  }

  // Fragmentos: quantos estão guardados agora (prontos para ecoar)
  // e quantos já foram encontrados do total da fase.
  setFragments(held, found, total) {
    const key = `${held}|${found}/${total}`;
    if (this.last.fragments === key) return;
    const changed = this.last.fragments !== undefined;
    this.last.fragments = key;
    this.fragments.textContent = String(held);
    this.fragmentsFound.textContent = `${found}/${total}`;
    this.fragmentBox.classList.toggle('empty', held === 0);
    if (changed) retrigger(this.fragmentBox, 'pop');
  }

  // Indicador da habilidade de ecoar:
  //   'off'   = sem fragmento · 'ready' = tem fragmento · 'near' = pode usar agora
  setAbility(state) {
    if (this.last.ability === state) return;
    this.last.ability = state;
    this.ability.className = `ability ${state}`;
  }

  // Objetivo atual (canto superior direito). Vazio = escondido.
  setMission(text) {
    if (this.last.mission === text) return;
    const changed = this.last.mission !== undefined && text;
    this.last.mission = text;
    this.missionText.textContent = text;
    this.mission.classList.toggle('hidden', !text);
    if (changed) retrigger(this.mission, 'pop');
  }

  // Cartão grande com o nome da região (e a missão), que aparece e some sozinho.
  showRegionCard(region, mission = '') {
    this.regionNumber.textContent = `Região ${region.number}`;
    this.regionName.textContent = region.name;
    this.regionSubtitle.textContent = region.subtitle || '';
    this.regionMission.textContent = mission ? `Missão: ${mission}` : '';
    this.regionCard.classList.remove('hidden');
    retrigger(this.regionCard, 'show');
  }

  // Habilidades aprendidas: cada uma tem um "chip" no HUD (escondido até aprender).
  setOwnedAbilities(abilities) {
    const key = [...abilities].sort().join(',');
    if (this.last.owned === key) return;
    this.last.owned = key;
    this.abilityJump.classList.toggle('hidden', !abilities.has('pulo-eco'));
  }

  // ---------- Barra de vida do chefe ----------
  showBoss(name, hp, max) {
    this.bossName.textContent = name;
    this.bossPips.innerHTML = '';
    for (let i = 0; i < max; i++) this.bossPips.appendChild(document.createElement('span'));
    this.bossBar.classList.remove('hidden');
    this.setBossHp(hp);
  }

  setBossHp(hp) {
    [...this.bossPips.children].forEach((pip, i) => pip.classList.toggle('lost', i >= hp));
    retrigger(this.bossBar, 'pop');
  }

  hideBoss() {
    this.bossBar.classList.add('hidden');
  }

  // Aviso curto no canto (checkpoint, salvamento).
  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    retrigger(this.toastEl, 'show');
  }

  hideRegionCard() {
    this.regionCard.classList.add('hidden');
    this.regionCard.classList.remove('show');
  }

  // Clarão vermelho nas bordas da tela ao levar dano.
  flashDamage() {
    this.stage.classList.remove('flash-memory');
    retrigger(this.stage, 'flash-damage');
  }

  // Brilho dourado ao ecoar uma memória.
  flashMemory() {
    this.stage.classList.remove('flash-damage');
    retrigger(this.stage, 'flash-memory');
  }
}
