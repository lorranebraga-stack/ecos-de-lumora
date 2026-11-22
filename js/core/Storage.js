// Armazenamento seguro do progresso.
//
// O localStorage pode falhar: navegação anônima, armazenamento cheio,
// site bloqueado, ou até não existir. Este módulo NUNCA deixa um erro
// escapar para o jogo: se não der para salvar, ele guarda em memória
// (vale até fechar a aba) e informa que o salvamento está indisponível.

const KEY = 'ecos-de-lumora/save';
export const SAVE_VERSION = 1;

function testLocalStorage() {
  try {
    const probe = '__lumora_test__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export class Storage {
  // key: chave no localStorage (os testes usam outra, para não tocar no seu save)
  constructor(key = KEY) {
    this.key = key;
    this.available = testLocalStorage();
    this.memoryCopy = null; // reserva em memória, sempre atualizada
  }

  load() {
    if (!this.available) return this.memoryCopy;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== SAVE_VERSION) {
        console.warn('Salvamento de outra versão do jogo foi ignorado.');
        return null;
      }
      this.memoryCopy = data;
      return data;
    } catch (err) {
      console.warn('Salvamento corrompido foi ignorado:', err);
      return null;
    }
  }

  // Retorna true se gravou no navegador, false se ficou só na memória.
  save(data) {
    this.memoryCopy = JSON.parse(JSON.stringify(data));
    if (!this.available) return false;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (err) {
      console.warn('Não foi possível salvar no navegador:', err);
      return false;
    }
  }

  clear() {
    this.memoryCopy = null;
    if (!this.available) return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // Nada a fazer: o progresso em memória já foi apagado.
    }
  }
}
