// Progresso do jogador: o que está salvo e as regras de desbloqueio.
//
// Formato salvo (versão 1):
// {
//   version: 1,
//   current: { level: 'bosque', snapshot: {...} } | null,  // partida em andamento
//   levels: { bosque: { completed, bestScore, bestTime, bestCrystals, stars: [b, b, b] } },
//   abilities: ['eco'],
//   settings: { muted: false, music: true },
// }

import { Storage, SAVE_VERSION } from './Storage.js';
import { REGIONS } from '../levels/regions.js';

function emptySave() {
  return { version: SAVE_VERSION, current: null, levels: {}, abilities: [], settings: { muted: false, music: true, graphics: '3d', chars: '3d' } };
}

export class Progress {
  constructor(storage = new Storage()) {
    this.storage = storage;
    this.data = storage.load() || emptySave();
    this.lastSaveOk = true;
  }

  get canPersist() {
    return this.storage.available;
  }

  get currentRun() {
    return this.data.current;
  }

  levelInfo(id) {
    return this.data.levels[id] || { completed: false };
  }

  // A primeira região sempre está aberta; as outras abrem quando a anterior é concluída.
  isUnlocked(id) {
    const i = REGIONS.findIndex((r) => r.id === id);
    if (i <= 0) return true;
    return this.levelInfo(REGIONS[i - 1].id).completed === true;
  }

  persist() {
    this.lastSaveOk = this.storage.save(this.data);
    return this.lastSaveOk;
  }

  // Checkpoint: guarda a "foto" da partida atual.
  checkpoint(levelId, snapshot) {
    this.data.current = { level: levelId, snapshot };
    return this.persist();
  }

  addAbility(name) {
    if (!this.data.abilities.includes(name)) this.data.abilities.push(name);
  }

  // Fase concluída: atualiza recordes e encerra a partida em andamento.
  // Retorna quais recordes foram batidos.
  completeLevel(levelId, result) {
    const prev = this.levelInfo(levelId);
    const records = {
      score: !prev.completed || result.score > prev.bestScore,
      time: !prev.completed || result.time < prev.bestTime,
    };
    this.data.levels[levelId] = {
      completed: true,
      bestScore: Math.max(result.score, prev.bestScore || 0),
      bestTime: prev.completed ? Math.min(result.time, prev.bestTime) : result.time,
      bestCrystals: Math.max(result.crystals, prev.bestCrystals || 0),
      // Estrelas da Aurora: cada uma, conquistada uma vez, fica para sempre.
      stars: [0, 1, 2].map((i) => !!((prev.stars && prev.stars[i]) || (result.stars && result.stars[i]))),
    };
    this.data.current = null;
    this.persist();
    return records;
  }

  // Estrelas conquistadas em todas as regiões (até 3 por região jogável).
  totalStars() {
    return REGIONS.reduce((n, r) => n + (this.levelInfo(r.id).stars || []).filter(Boolean).length, 0);
  }

  maxStars() {
    return REGIONS.filter((r) => r.implemented).length * 3;
  }

  // Novo jogo: descarta só a partida em andamento (recordes ficam).
  clearRun() {
    this.data.current = null;
    this.persist();
  }

  // Preferências (som, música) são salvas na hora.
  saveSettings() {
    return this.persist();
  }

  // Apagar progresso: partida, recordes e regiões voltam ao zero.
  // As preferências de som são mantidas (não fazem parte do "progresso").
  eraseAll() {
    // O MESMO objeto de preferências continua em uso (o áudio guarda uma referência a ele).
    const settings = this.data.settings;
    this.storage.clear();
    this.data = emptySave();
    this.data.settings = settings;
    if (settings.muted || settings.music === false) this.persist();
  }
}
