import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFile, readdir, stat} from 'node:fs/promises';
import {join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';
import {codePages, generatedText, originalText} from './code-fixture.mjs';
import {approvedContactLabel, guidedRoutes, movedSections, newRoutes} from './navigation.mjs';

const root = fileURLToPath(new URL('../build/', import.meta.url));
const origin = 'https://sesgo-ti.github.io';
const base = `${origin}/hubsaude/`;
const routes = JSON.parse(await readFile(new URL('./fixtures/legacy-routes.json', import.meta.url), 'utf8'));
const gestor = JSON.parse(await readFile(new URL('./fixtures/gestor-upstream.json', import.meta.url), 'utf8'));
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

test('three new canonical docs supplement the 14 frozen routes and expose their IDs', async () => {
  assert.equal(newRoutes.length, 3);
  const expected = [...routes, ...newRoutes].map(({route}) => new URL(route, base).href);
  assert.equal(new Set(expected).size, 17);
  const sitemap = load(await readFile(join(root, 'sitemap.xml'), 'utf8'), {xmlMode: true});
  const actual = sitemap('loc').toArray().map((node) => sitemap(node).text()).filter((url) => url !== `${base}search/`);
  assert.deepEqual(actual.sort(), expected.sort());
  for (const {route, anchors} of newRoutes) {
    const url = new URL(route, base);
    const $ = await document(await target(url));
    assert.equal($('link[rel="canonical"]').attr('href'), url.href);
    assert.equal($('main h1').length, 1);
    for (const id of anchors) assert.equal($('[id]').toArray().filter((node) => $(node).attr('id') === id).length, 1, `${route} #${id}`);
  }
});

test('home fragment source map retains every moved legacy ID plus approved additions and real fallback destinations', async () => {
  const retained = ['main', 'htitle', 'comece-aqui', 'ptitle'];
  const home = routes.find(({route}) => route === '');
  const expected = [...home.anchors.filter((id) => !retained.includes(id)), 'sequence-title', 'support-title'];
  assert.deepEqual(Object.keys(movedSections).sort(), expected.sort());
  assert.equal(movedSections.rtitle, 'fluxos/visao-geral/#jornada');
  assert.equal(movedSections['sequence-title'], 'fluxos/visao-geral/#sequence-title');
  assert.equal(movedSections['support-title'], 'sobre/#support-title');
  const $ = await document(await target(new URL('', base)));
  assert.equal($('main form').length, 0);
  for (const [id, destination] of Object.entries(movedSections)) {
    assert.match(destination, /^(?:sobre|fluxos\/visao-geral)\/#.+$/);
    const aside = $(`main aside[id="${id}"]`);
    assert.equal(aside.length, 1, `Missing fallback aside #${id}`);
    const link = aside.find('a[href]');
    assert.equal(link.length, 1);
    assert.equal(link.attr('href'), `/hubsaude/${destination}`);
    assert.ok(link.text().trim().length > 10, `Fallback #${id} needs actionable link text`);
    await checkLink(link.attr('href'), base);
  }
});

test('native pagination follows only the guided sequence, ending after resource submission', async () => {
  for (const [index, route] of guidedRoutes.entries()) {
    const $ = await document(await target(new URL(route, base)));
    for (const [direction, destination] of [['prev', guidedRoutes[index - 1]], ['next', guidedRoutes[index + 1]]]) {
      const link = $(`.pagination-nav__link--${direction}`);
      assert.equal(link.length, destination ? 1 : 0, `${route} ${direction}`);
      if (destination) assert.equal(link.attr('href'), `/hubsaude/${destination}`);
    }
  }
});

test('about and integration reference docs have no pagination links', async () => {
  for (const route of ['sobre/', 'fluxos/visao-geral/']) {
    const $ = await document(await target(new URL(route, base)));
    assert.equal($('.pagination-nav a, .pagination-nav__link').length, 0, `${route} must not extend the guided sequence`);
  }
});

test('flow overview preserves its existing heading aliases', async () => {
  const $ = await document(await target(new URL('fluxos/', base)));
  for (const id of ['autentica\u00e7\u00e3o', 'envio-de-recurso']) {
    assert.equal($('main h2[id]').toArray().filter((node) => $(node).attr('id') === id).length, 1, `fluxos/ lost heading #${id}`);
  }
});

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

test('manager preserves all upstream prose, headings, steps, levels, table, contact destination and IDs', async () => {
  const $ = await document(await target(new URL('gestor/', base)));
  const text = (node) => $(node).text().replace(/\s+/g, ' ').trim();
  const paragraphs = $('main p').toArray().map(text);
  for (const expected of [...gestor.eyebrows, ...gestor.textBlocks]) {
    assert.ok(paragraphs.includes(expected), `Missing or altered upstream prose: ${expected}`);
  }
  const headings = $('main h1, main h2, main h3').toArray().map((node) => {
    const heading = $(node).clone();
    // Docusaurus appends a permalink glyph, not upstream heading prose.
    heading.find('.hash-link').remove();
    return text(heading);
  });
  for (const heading of gestor.headings) assert.equal(headings.filter((value) => value === heading).length, 1, heading);
  for (const id of [...gestor.ids, ...gestor.slides.map(({anchor}) => anchor)]) {
    assert.equal($('[id]').toArray().filter((node) => $(node).attr('id') === id).length, 1, `Upstream ID #${id}`);
  }
  for (const id of ['níveis-de-credenciamento', 'como-funciona-o-credenciamento']) {
    assert.equal($('[id]').toArray().filter((node) => $(node).attr('id') === id).length, 1);
  }
  assert.deepEqual($('main ol').toArray().map((list) => $(list).children('li').toArray().map(text)),
    [gestor.applicationSteps, gestor.afterSendingSteps].map((steps) => steps.map(({title, description}) => `${title} ${description}`)));
  const items = $('main ul > li').toArray().map(text);
  for (const {level, description} of gestor.levels) assert.ok(items.includes(`${level} ${description}`), level);
  assert.equal($('main table').length, 1);
  assert.deepEqual($('main table thead th').toArray().map(text), gestor.table.headers);
  assert.deepEqual($('main table tbody tr').toArray().map((row) => $(row).children('td').toArray().map(text)), gestor.table.rows);
  const contact = $('main a').filter((_, node) => $(node).attr('href') === gestor.contact.href);
  assert.equal(contact.length, 1);
});

test('manager contact uses the explicitly approved navigation label, not a rewritten fixture', async () => {
  assert.equal(gestor.contact.text, 'Solicitar credenciamento \u2197');
  const $ = await document(await target(new URL('gestor/', base)));
  const contact = $('main a').filter((_, node) => $(node).attr('href') === gestor.contact.href);
  assert.equal(contact.length, 1);
  assert.equal(contact.text().replace(/\s+/g, ' ').trim(), approvedContactLabel);
});

test('all nine manager screenshots retain upstream summaries, descriptions, alt text and image SHA-256', async () => {
  const $ = await document(await target(new URL('gestor/', base)));
  const details = $('main details').toArray();
  assert.equal(gestor.slides.length, 9);
  assert.equal(details.length, gestor.slides.length);
  for (const [index, slide] of gestor.slides.entries()) {
    const detail = $(details[index]);
    assert.equal(detail.children('summary').text().replace(/\s+/g, ' ').trim(), slide.title);
    assert.ok(detail.find('p').toArray().some((node) => $(node).text().replace(/\s+/g, ' ').trim() === slide.desc), slide.title);
    const image = detail.find('img');
    assert.equal(image.length, 1);
    assert.equal(image.attr('alt'), slide.alt);
    const url = new URL(image.attr('src'), new URL('gestor/', base));
    assert.equal(url.origin, origin, `Screenshot must be local: ${url}`);
    const built = await target(url);
    const source = new URL(`../../${slide.imagePath}`, import.meta.url);
    for (const file of [source, built]) {
      assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'), slide.sha256, `Image changed: ${file}`);
    }
  }
});

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
