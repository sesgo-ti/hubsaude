import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, readdir, stat} from 'node:fs/promises';
import {join, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';

const root = fileURLToPath(new URL('../build/', import.meta.url));
const origin = 'https://sesgo-ti.github.io';
const base = `${origin}/hubsaude/`;
const files = (await readdir(root, {recursive: true})).sort();
const pages = files.filter((file) => extname(file) === '.html').map((file) => {
  const path = file.split(sep).map(encodeURIComponent).join('/');
  const route = path.replace(/(^|\/)index\.html$/, '$1');
  const kind = path === '404.html' ? '404' : /^search\//.test(route) ? 'search' : 'content';
  return {file: join(root, file), url: new URL(route, base), kind};
});
const documents = new Map();

async function document(file) {
  if (!documents.has(file)) documents.set(file, load(await readFile(file, 'utf8'), {xmlMode: extname(file) === '.svg'}));
  return documents.get(file);
}

async function readDocsMetadata() {
  const directory = new URL('../.docusaurus/docusaurus-plugin-content-docs/default/', import.meta.url);
  const hint = 'Expected Docusaurus 3 document JSON with source, permalink, draft and unlisted. Run a fresh production build; if the format changed, update readDocsMetadata().';
  try {
    // The default plugin writes published docs at this level; __*.json and p/ are plugin data.
    // Drafts/excluded sources may have no JSON, so this is not an exhaustive source inventory.
    const entries = (await readdir(directory, {withFileTypes: true}))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('__'));
    assert.ok(entries.length > 0, 'No document metadata found');
    const docs = new Map();
    for (const {name} of entries) {
      const metadata = JSON.parse(await readFile(new URL(name, directory), 'utf8'));
      assert.ok(typeof metadata.source === 'string' && metadata.source.startsWith('@site/'), `${name}: invalid source`);
      assert.ok(typeof metadata.permalink === 'string' && metadata.permalink.startsWith('/hubsaude/'), `${name}: invalid permalink`);
      assert.equal(typeof metadata.draft, 'boolean', `${name}: invalid draft`);
      assert.equal(typeof metadata.unlisted, 'boolean', `${name}: invalid unlisted`);
      const url = new URL(metadata.permalink, origin);
      assert.ok(!url.search && !url.hash, `${name}: permalink must be a page URL`);
      assert.ok(!docs.has(url.href), `${name}: duplicate permalink ${url.href}`);
      docs.set(url.href, metadata);
    }
    return docs;
  } catch (cause) {
    throw new Error(`Cannot read docs metadata at ${fileURLToPath(directory)}. ${hint}\n${cause.message}`, {cause});
  }
}

async function target(url) {
  assert.ok(url.pathname.startsWith('/hubsaude/'), `Internal URL escaped baseUrl: ${url.href}`);
  const path = decodeURIComponent(url.pathname.slice('/hubsaude/'.length));
  assert.ok(!path.split('/').includes('..') && !path.includes('\\') && !path.includes('\0'), `Unsafe URL: ${url.href}`);
  let file = join(root, path);
  const info = await stat(file).catch(() => assert.fail(`Missing generated target: ${url.href}`));
  if (info.isDirectory()) file = join(file, 'index.html');
  assert.ok((await stat(file).catch(() => assert.fail(`Missing generated target: ${url.href}`))).isFile(), `Not a file: ${url.href}`);
  return file;
}

async function checkLink(value, from) {
  const url = new URL(value, from);
  if (url.origin !== origin || !['https:', 'http:'].includes(url.protocol)) return false;
  try {
    const file = await target(url);
    if (url.hash && ['.html', '.svg'].includes(extname(file))) {
      const $ = await document(file);
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok($('[id], a[name]').toArray().some((node) => $(node).attr('id') === id || $(node).attr('name') === id),
        `Missing fragment #${id}: ${url.href}`);
    }
  } catch (cause) {
    throw new Error(`${cause.message} (linked from ${from})`, {cause});
  }
  return true;
}

test('generated HTML inventory is nonempty and has unique page URLs', () => {
  assert.ok(pages.length > 0, 'No generated HTML found; run a production build first');
  assert.equal(new Set(pages.map(({url}) => url.href)).size, pages.length);
});

for (const {file, url, kind} of pages) {
  test(`canonical, main heading and unique IDs: ${url.pathname}`, async () => {
    const $ = await document(file);
    const canonical = $('link[rel="canonical"]');
    assert.equal(canonical.length, 1, `${url.href}: expected one canonical`);
    // Docusaurus gives 404.html a synthetic trailing-slash SEO URL, not a real route.
    assert.equal(canonical.attr('href'), kind === '404' ? `${url.href}/` : url.href);
    assert.equal($('main h1').length, 1, `${url.href}: expected one main heading`);
    assert.equal($('meta[http-equiv="refresh" i]').length, 0, `${url.href}: must not redirect`);
    const ids = new Set();
    for (const node of $('[id]').toArray()) {
      const id = $(node).attr('id');
      assert.ok(id && !ids.has(id), `${url.href}: empty or duplicate ID #${id}`);
      ids.add(id);
    }
    if ($('html').hasClass('docs-doc-page')) {
      for (const node of $('main img').toArray()) {
        const image = $(node);
        const alt = image.attr('alt');
        const decorative = image.attr('aria-hidden') === 'true' || image.attr('role') === 'presentation';
        assert.ok(typeof alt === 'string' && (alt.trim().length > 0 || (alt === '' && decorative)),
          `${url.href}: image needs meaningful alt text or explicit decoration: ${image.attr('src')}`);
      }
    }
  });
}

test('published docs metadata and rendered documentation correspond', async () => {
  const docs = await readDocsMetadata();
  const rendered = new Map(pages.map((page) => [page.url.href, page]));
  for (const [url, metadata] of docs) {
    if (metadata.draft) {
      assert.ok(!rendered.has(url), `Draft must not be published: ${metadata.source} (${url})`);
      continue;
    }
    assert.ok(rendered.has(url), `Published doc has no generated HTML: ${metadata.source} (${url})`);
    const $ = await document(rendered.get(url).file);
    assert.ok($('html').hasClass('docs-doc-page'), `Expected rendered documentation: ${metadata.source} (${url})`);
  }
  for (const {file, url} of pages) {
    const $ = await document(file);
    if ($('html').hasClass('docs-doc-page')) {
      assert.ok(docs.has(url.href), `Rendered doc has no metadata: ${url.href}`);
    }
  }
});

test('sitemap contains exactly eligible public generated pages', async () => {
  const docs = await readDocsMetadata();
  const expected = [];
  for (const {file, url, kind} of pages) {
    const $ = await document(file);
    const noindex = $('meta[name="robots" i], meta[property="robots" i]').toArray()
      .some((node) => /(?:^|[\s,])(noindex|none)(?:$|[\s,])/i.test($(node).attr('content') ?? ''));
    const metadata = docs.get(url.href);
    if (kind === 'content' && !noindex && !metadata?.unlisted && !metadata?.draft) expected.push(url.href);
  }
  assert.ok(expected.length > 0, 'No eligible public pages found');
  const sitemap = load(await readFile(join(root, 'sitemap.xml'), 'utf8'), {xmlMode: true});
  const actual = sitemap('urlset > url > loc').toArray().map((node) => sitemap(node).text());
  assert.deepEqual(actual.sort(), expected.sort());
});

test('every generated internal link, asset and fragment resolves without network access', async () => {
  let checked = 0;
  const pageURLs = new Map(pages.map(({file, url}) => [file, url]));
  for (const path of files) {
    const file = join(root, path);
    if (!['.html', '.css', '.svg'].includes(extname(file))) continue;
    const from = pageURLs.get(file) ?? new URL(path.split(sep).map(encodeURIComponent).join('/'), base);
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
        // Skip only synthetic 404 SEO links, never its navigation or assets.
        if (file === join(root, '404.html') && $(node).is('head link[rel="canonical"], head link[rel="alternate"][hreflang]')) return;
        for (const name of ['href', 'src', 'poster', 'data', 'xlink:href']) {
          const value = $(node).attr(name);
          if (value != null && (name !== 'data' || node.tagName === 'object')) references.push(value);
        }
      });
      $('[srcset], [imagesrcset]').each((_, node) => {
        for (const name of ['srcset', 'imagesrcset']) {
          const srcset = $(node).attr(name) ?? '';
          for (const match of srcset.matchAll(/(?:^|\s|,)((?:data:[^\s]+|[^\s,]+))(?:\s+\d+(?:\.\d+)?[wx])?/g)) references.push(match[1]);
        }
      });
      $('[style]').each((_, node) => cssReferences($(node).attr('style')));
      $('style').each((_, node) => cssReferences($(node).text()));
      $('[fill], [stroke], [filter], [clip-path], [mask], [marker-start], [marker-mid], [marker-end]').each((_, node) => {
        for (const name of ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-mid', 'marker-end']) {
          cssReferences($(node).attr(name) ?? '');
        }
      });
    }
    for (const reference of references) {
      if (await checkLink(reference, from)) checked++;
    }
  }
  assert.ok(checked > 0, 'No internal references found');
});
