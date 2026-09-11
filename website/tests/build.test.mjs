import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, readdir, stat} from 'node:fs/promises';
import {join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';
import {codePages, generatedText, originalText} from './code-fixture.mjs';

const root = fileURLToPath(new URL('../build/', import.meta.url));
const origin = 'https://sesgo-ti.github.io';
const base = `${origin}/hubsaude/`;
const routes = JSON.parse(await readFile(new URL('./fixtures/legacy-routes.json', import.meta.url), 'utf8'));
const documents = new Map();

async function document(file) {
  if (!documents.has(file)) documents.set(file, load(await readFile(file, 'utf8')));
  return documents.get(file);
}

async function target(url) {
  assert.ok(url.pathname.startsWith('/hubsaude/'), `Internal URL escaped baseUrl: ${url.href}`);
  const path = decodeURIComponent(url.pathname.slice('/hubsaude/'.length));
  assert.ok(!path.split('/').includes('..') && !path.includes('\\') && !path.includes('\0'), `Unsafe URL: ${url.href}`);
  let file = join(root, path);
  const info = await stat(file).catch(() => assert.fail(`Missing generated target: ${url.href}`));
  if (info.isDirectory()) file = join(file, 'index.html');
  assert.ok((await stat(file)).isFile(), `Not a file: ${url.href}`);
  return file;
}

async function checkLink(value, from, seen = new Set()) {
  const url = new URL(value, from);
  if (url.origin !== origin || !['https:', 'http:'].includes(url.protocol)) return;
  const file = await target(url);
  if (!url.hash || !['.html', '.svg'].includes(extname(file))) return;
  const $ = await document(file);
  const id = decodeURIComponent(url.hash.slice(1));
  if ($('[id], a[name]').toArray().some((node) => $(node).attr('id') === id || $(node).attr('name') === id)) return;
  const refresh = $('meta[http-equiv="refresh" i]').attr('content')?.match(/url\s*=\s*(.+)/i)?.[1];
  if (refresh && !seen.has(file)) {
    seen.add(file);
    const destination = new URL(refresh.replace(/^['"]|['"]$/g, ''), url);
    destination.hash = url.hash;
    return checkLink(destination.href, url, seen);
  }
  assert.fail(`Missing fragment #${id}: ${url.href} (linked from ${from})`);
}

test('frozen inventory contains 14 unique routes, 12 templates and 27 pre blocks', () => {
  assert.equal(routes.length, 14);
  assert.equal(new Set(routes.map(({route}) => route)).size, 14);
  const snippets = codePages.flatMap(({snippets}) => snippets);
  assert.equal(snippets.filter(({kind}) => kind === 'template').length, 12);
  assert.equal(snippets.filter(({kind}) => kind === 'pre').length, 27);
  for (const snippet of snippets) assert.ok(originalText(snippet).length);
});

test('code extraction preserves entities, indentation and blank Prism lines', () => {
  const expected = '  List<T> value;\n\n  next();';
  assert.equal(originalText({kind: 'template', html: '<template>\n  List&lt;T&gt; value;\n\n  next();\n</template>'}), expected);
  const $ = load('<pre><code><div class="token-line"><span>  List&lt;T&gt; value;</span><br></div><div class="token-line"><span></span><br></div><div class="token-line"><span>  next();</span><br></div></code></pre>');
  assert.equal(generatedText($, $('code')[0]), expected);
});

for (const {legacy, route, anchors} of routes) {
  test(`canonical page and every legacy anchor: ${legacy}`, async () => {
    const url = new URL(route, base);
    const $ = await document(await target(url));
    assert.equal($('link[rel="canonical"]').attr('href'), url.href);
    assert.equal($('main h1').length, 1);
    const legacyUrl = new URL(legacy, base);
    const legacyPage = await document(await target(legacyUrl));
    const canonical = legacyPage('link[rel="canonical"]').attr('href');
    assert.ok(canonical, `${legacy} is missing canonical metadata`);
    assert.equal(new URL(canonical, legacyUrl).href, url.href);
    const ids = new Set($('[id]').toArray().map((node) => $(node).attr('id')));
    for (const id of anchors) assert.ok(ids.has(id), `${route} lost #${id}`);
  });
}

for (const {legacy, route, snippets} of codePages) {
  test(`exact original code parity: ${legacy}`, async () => {
    const $ = await document(await target(new URL(route, base)));
    const actual = $('main pre code').toArray().map((node) => generatedText($, node));
    const expected = snippets.map(originalText);
    if (route === 'ferramentas/cli/') {
      // The new illustrative terminal and two OS installers are additions, not legacy pre blocks.
      let previous = -1;
      for (const text of expected) {
        const index = actual.indexOf(text, previous + 1);
        assert.ok(index > previous, `Original CLI example missing or altered:\n${text}`);
        previous = index;
      }
    } else assert.deepEqual(actual, expected);
  });
}

test('every generated internal link, asset and fragment resolves without network access', async () => {
  let checked = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { await walk(file); continue; }
      if (!['.html', '.css', '.svg'].includes(extname(file))) continue;
      const from = new URL(file.slice(root.length).split('/').map(encodeURIComponent).join('/'), base);
      const references = [];
      const cssReferences = (css) => {
        for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)|@import\s+["']([^"']+)["']/g)) {
          references.push(match[1] ?? match[2] ?? match[3] ?? match[4]);
        }
      };
      if (extname(file) === '.css') cssReferences(await readFile(file, 'utf8'));
      else {
        const $ = await document(file);
        $('[href], [src], [poster], [data], [xlink\\:href]').each((_, node) => {
          // Docusaurus emits a synthetic /404.html/ SEO URL, not a real route.
          // Only skip SEO links on this file; its navigation and assets still count.
          if (file === join(root, '404.html') && $(node).is('head link[rel="canonical"], head link[rel="alternate"][hreflang]')) return;
          for (const name of ['href', 'src', 'poster', 'data', 'xlink:href']) {
            const value = $(node).attr(name);
            if (value != null && (name !== 'data' || node.tagName === 'object')) references.push(value);
          }
        });
        $('[srcset], [imagesrcset]').each((_, node) => {
          const srcset = $(node).attr('srcset') ?? $(node).attr('imagesrcset');
          for (const match of srcset.matchAll(/(?:^|\s|,)((?:data:[^\s]+|[^\s,]+))(?:\s+\d+(?:\.\d+)?[wx])?/g)) references.push(match[1]);
        });
        $('[style]').each((_, node) => cssReferences($(node).attr('style')));
        $('style').each((_, node) => cssReferences($(node).text()));
      }
      for (const reference of references) {
        await checkLink(reference, from);
        checked++;
      }
    }
  }
  await walk(root);
  assert.ok(checked > 100, `Unexpectedly small link inventory: ${checked}`);
});
