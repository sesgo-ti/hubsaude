import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {lerEtapas} from '../plugins/etapas-do-curso.mjs';

const pasta = fileURLToPath(new URL('../docs/curso/', import.meta.url));

test('course progress data covers every practice step of every module page', async () => {
  const modulos = await lerEtapas(pasta);
  const vistos = new Set();
  for (const arquivo of (await readdir(pasta)).filter((nome) => nome.endsWith('.mdx'))) {
    const texto = await readFile(`${pasta}${arquivo}`, 'utf8');
    const ids = [...texto.matchAll(/<Etapa\s+id="([^"]+)"/g)].map((m) => m[1]);
    if (ids.length === 0) continue;
    const slug = texto.match(/^slug:\s*(\S+)\s*$/m)[1];
    assert.deepEqual(modulos[slug]?.map((etapa) => etapa.id), ids, `${arquivo}: progress data differs from its steps`);
    for (const etapa of modulos[slug]) {
      assert.ok(etapa.titulo, `${arquivo}: step ${etapa.id} without title`);
      assert.ok(!vistos.has(etapa.id), `${etapa.id} is used by more than one step`);
      vistos.add(etapa.id);
    }
  }
});

test('every module listed on the course overview has progress data', async () => {
  const modulos = await lerEtapas(pasta);
  const indice = await readFile(`${pasta}index.mdx`, 'utf8');
  const hrefs = [...indice.matchAll(/<Modulo\s[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 0, 'the overview lists no modules');
  for (const href of hrefs) assert.ok(modulos[href]?.length > 0, `${href} has no practice steps`);
});
