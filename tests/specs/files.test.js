// Arquivos: nada no projeto aponta para um arquivo que não existe.
export default function (t) {
  t.test('todo arquivo local citado no index.html existe', async () => {
    const html = await (await fetch('../index.html')).text();
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
      .filter((u) => !/^(https?:|#|data:|mailto:)/.test(u));
    t.ok(refs.length > 0, 'nenhuma referência encontrada');
    for (const ref of refs) {
      const res = await fetch(`../${ref}`);
      t.ok(res.ok, `index.html cita "${ref}", que não existe (HTTP ${res.status})`);
    }
  });

  t.test('todo import entre módulos aponta para um arquivo que existe', async () => {
    const pending = ['js/main.js'];
    const visited = new Set();
    while (pending.length) {
      const file = pending.pop();
      if (visited.has(file)) continue;
      visited.add(file);
      const res = await fetch(`../${file}`);
      t.ok(res.ok, `módulo "${file}" não existe`);
      const src = await res.text();
      for (const m of src.matchAll(/import\s[^'"]*['"](\.[^'"]+)['"]/g)) {
        const next = new URL(m[1], `http://x/${file}`).pathname.slice(1);
        pending.push(next);
      }
    }
    t.ok(visited.size > 15, `só ${visited.size} módulos encontrados`);
  });

  t.test('nenhum elemento com id é exigido pelo código sem existir no index.html', async () => {
    const html = await (await fetch('../index.html')).text();
    const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    const files = ['js/main.js', 'js/ui/HUD.js', 'js/ui/Screens.js', 'js/ui/DialogBox.js', 'js/ui/Menu.js'];
    for (const f of files) {
      const src = await (await fetch(`../${f}`)).text();
      for (const m of src.matchAll(/(?:\$|getElementById)\('([a-z0-9-]+)'\)/g)) {
        t.ok(ids.has(m[1]), `${f} usa #${m[1]}, que não existe no index.html`);
      }
    }
  });
}
