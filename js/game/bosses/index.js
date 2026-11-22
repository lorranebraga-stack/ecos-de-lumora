// Registro dos chefes: o mapa da fase diz QUAL chefe o 'Q' representa (levelData.boss).
// CHEFE NOVO? Crie a classe em js/game/bosses/ (veja BossBase.js) e registre aqui.

import { Matriarca } from '../Boss.js';
import { RaizEsquecida } from './RaizEsquecida.js';
import { Tempestade } from './Tempestade.js';
import { Arquivista } from './Arquivista.js';
import { VultoBoss } from './VultoBoss.js';

export const BOSSES = {
  matriarca: Matriarca,
  raiz: RaizEsquecida,
  tempestade: Tempestade,
  arquivista: Arquivista,
  vulto: VultoBoss,
};

export function createBoss(type, tx, ty, T, arena) {
  const Cls = BOSSES[type || 'matriarca'];
  if (!Cls) throw new Error(`Chefe desconhecido: "${type}"`);
  return new Cls(tx, ty, T, arena);
}
