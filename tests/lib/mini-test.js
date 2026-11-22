// Mini framework de testes (sem instalar nada).
//
// Uso num arquivo de testes:
//   export default function (t) {
//     t.test('o Nilo pousa no chão', () => {
//       t.equal(player.y, 206);
//     });
//     t.test('teste demorado', async () => { ... }, { slow: true });
//   }
//
// Um teste PASSA se a função termina sem erro; FALHA se alguma verificação
// (ok, equal, near, between) não for atendida ou se acontecer qualquer erro.

export class AssertionError extends Error {}

function fmt(v) {
  return typeof v === 'number' ? String(Math.round(v * 100) / 100) : JSON.stringify(v);
}

export class Suite {
  constructor(name) {
    this.name = name;
    this.tests = [];
  }

  test(name, fn, { slow = false } = {}) {
    this.tests.push({ name, fn, slow });
  }

  // ---------- Verificações ----------
  ok(cond, msg = 'condição falsa') {
    if (!cond) throw new AssertionError(msg);
  }

  equal(actual, expected, msg = '') {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new AssertionError(`${msg ? msg + ': ' : ''}esperado ${e}, veio ${a}`);
  }

  near(actual, expected, tolerance, msg = '') {
    if (Math.abs(actual - expected) > tolerance) {
      throw new AssertionError(`${msg ? msg + ': ' : ''}esperado ${fmt(expected)} ± ${tolerance}, veio ${fmt(actual)}`);
    }
  }

  between(actual, min, max, msg = '') {
    if (actual < min || actual > max) {
      throw new AssertionError(`${msg ? msg + ': ' : ''}esperado entre ${min} e ${max}, veio ${fmt(actual)}`);
    }
  }

  throws(fn, msg = 'deveria ter lançado um erro') {
    try {
      fn();
    } catch {
      return;
    }
    throw new AssertionError(msg);
  }
}

// Roda as suítes e devolve os resultados. onResult é chamado a cada teste.
export async function runSuites(suites, { includeSlow, onResult }) {
  const results = [];
  for (const suite of suites) {
    for (const t of suite.tests) {
      if (t.slow && !includeSlow) {
        const r = { suite: suite.name, name: t.name, status: 'skip', ms: 0 };
        results.push(r);
        onResult(r);
        continue;
      }
      const start = performance.now();
      let status = 'pass';
      let error = null;
      try {
        await t.fn();
      } catch (err) {
        status = 'fail';
        error = err instanceof AssertionError ? err.message : `${err.name}: ${err.message}`;
        if (!(err instanceof AssertionError)) console.error(err);
      }
      const r = { suite: suite.name, name: t.name, status, error, ms: performance.now() - start };
      results.push(r);
      onResult(r);
      // Deixa a página respirar entre testes (a barra de progresso atualiza).
      await new Promise((res) => setTimeout(res, 0));
    }
  }
  return results;
}
