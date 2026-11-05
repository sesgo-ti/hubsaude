import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, readdir, access} from 'node:fs/promises';
import {extname, join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';

const site = fileURLToPath(new URL('../', import.meta.url));
const pasta = `${site}static/curso/arquivos/`;
const arquivos = (await readdir(pasta, {recursive: true, withFileTypes: true}))
  .filter((entrada) => entrada.isFile())
  .map((entrada) => relative(pasta, join(entrada.parentPath ?? entrada.path, entrada.name)).split(sep).join('/'))
  .sort();

async function blocosDeCodigo() {
  const docs = (await readdir(`${site}docs`, {recursive: true})).filter((arquivo) => /\.mdx?$/.test(arquivo));
  const blocos = new Set();
  for (const doc of docs) {
    const linhas = (await readFile(`${site}docs/${doc}`, 'utf8')).split('\n');
    for (let i = 0; i < linhas.length; i++) {
      const abertura = linhas[i].match(/^(\s*)```\w+/);
      if (!abertura) continue;
      let fim = i + 1;
      while (fim < linhas.length && !/^\s*```\s*$/.test(linhas[fim])) fim++;
      blocos.add(linhas.slice(i + 1, fim).map((linha) => linha.slice(abertura[1].length)).join('\n') + '\n');
      i = fim;
    }
  }
  return blocos;
}

async function paginas() {
  const build = `${site}build/`;
  return (await readdir(build, {recursive: true})).filter((arquivo) => extname(arquivo) === '.html').map((arquivo) => `${build}${arquivo}`);
}

test('course downloads exist', () => {
  assert.ok(arquivos.length > 0, 'static/curso/arquivos is empty');
});

test('each course download matches a code block in the docs', async () => {
  const blocos = await blocosDeCodigo();
  for (const arquivo of arquivos) {
    assert.ok(blocos.has(await readFile(`${pasta}${arquivo}`, 'utf8')), `${arquivo} differs from every code block in docs/`);
  }
});

test('download links point to existing files and are listed on the materials page', async () => {
  const listados = new Set();
  for (const pagina of await paginas()) {
    const $ = load(await readFile(pagina, 'utf8'));
    for (const elemento of $('a[data-arquivo]').toArray()) {
      const link = $(elemento);
      const arquivo = link.attr('data-arquivo');
      assert.equal(link.attr('href'), `/hubsaude/curso/arquivos/${arquivo}`, `${pagina}: unexpected href for ${arquivo}`);
      assert.ok(link.attr('download'), `${pagina}: ${arquivo} without download attribute`);
      await access(`${site}build/curso/arquivos/${arquivo}`);
      if (pagina.endsWith(`curso${sep}materiais${sep}index.html`)) listados.add(arquivo);
    }
  }
  assert.deepEqual([...listados].sort(), arquivos, 'the materials page must list every course download');
});
