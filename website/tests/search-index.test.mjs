import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mkdir, mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const packageName = '@easyops-cn/docusaurus-search-local';
const {getIndexHash} = require(`${packageName}/dist/server/server/utils/getIndexHash.js`);

async function fixture(t) {
  const siteDir = await mkdtemp(join(tmpdir(), 'hubsaude-search-index-'));
  t.after(() => rm(siteDir, {recursive: true, force: true}));
  const docsDir = join(siteDir, 'docs');
  await mkdir(docsDir);
  await writeFile(join(docsDir, 'intro.md'), '# Introduction\n\nSearchable documentation.\n');
  await writeFile(join(docsDir, 'guide.mdx'), '# Guide\n\nAnother searchable document.\n');
  await writeFile(join(siteDir, 'sidebars.js'), 'export default {guide: ["intro", "guide"]};\n');
  const siteConfigPath = join(siteDir, 'docusaurus.config.js');
  await writeFile(siteConfigPath, 'export default {baseUrl: "/hubsaude/"};\n');
  return {
    config: {
      hashed: 'filename',
      indexDocs: true,
      indexBlog: false,
      docsDir: [docsDir],
      docsRouteBasePath: [''],
      language: ['pt', 'en'],
      ignoreFiles: [/excluded/],
    },
    context: {
      siteDir,
      siteConfigPath,
      siteConfig: {
        baseUrl: '/hubsaude/',
        trailingSlash: true,
        presets: [['classic', {docs: {sidebarPath: './sidebars.js'}}]],
      },
    },
  };
}

test('unchanged search inputs produce a deterministic filename hash', async (t) => {
  const {config, context} = await fixture(t);
  const hash = getIndexHash(config, context);
  assert.match(hash, /^[a-f0-9]{8}$/);
  assert.equal(getIndexHash(config, context), hash);
  assert.equal(getIndexHash(structuredClone(config), structuredClone(context)), hash);
});

for (const file of ['docs/intro.md', 'docs/guide.mdx', 'sidebars.js', 'docusaurus.config.js']) {
  test(`changing ${file} contents invalidates the search hash`, async (t) => {
    const {config, context} = await fixture(t);
    const hash = getIndexHash(config, context);
    const path = join(context.siteDir, file);
    const original = await readFile(path);
    await writeFile(path, Buffer.concat([original, Buffer.from('\n// changed hash input\n')]));
    assert.notEqual(getIndexHash(config, context), hash);
    await writeFile(path, original);
    assert.equal(getIndexHash(config, context), hash);
  });
}

test('renaming a document invalidates the hash without changing its contents', async (t) => {
  const {config, context} = await fixture(t);
  const hash = getIndexHash(config, context);
  const original = join(config.docsDir[0], 'intro.md');
  const renamed = join(config.docsDir[0], 'renamed.md');
  await rename(original, renamed);
  assert.notEqual(getIndexHash(config, context), hash);
  await rename(renamed, original);
  assert.equal(getIndexHash(config, context), hash);
});

for (const [name, changed] of [
  ['language', {language: ['en']}],
  ['docs route base', {docsRouteBasePath: ['docs']}],
  ['regular expression filter', {ignoreFiles: [/private/i]}],
]) {
  test(`changing the ${name} option invalidates the search hash`, async (t) => {
    const {config, context} = await fixture(t);
    assert.notEqual(getIndexHash({...config, ...changed}, context), getIndexHash(config, context));
  });
}

test('resolved site metadata invalidates the hash even when config file contents are unchanged', async (t) => {
  const {config, context} = await fixture(t);
  const changed = {...context, siteConfig: {...context.siteConfig, baseUrl: '/other/'}};
  assert.notEqual(getIndexHash(config, changed), getIndexHash(config, context));
});

test('sidebars declared directly in a docs plugin also invalidate the hash', async (t) => {
  const {config, context} = await fixture(t);
  context.siteConfig.presets = [];
  context.siteConfig.plugins = [['@docusaurus/plugin-content-docs', {sidebarPath: './sidebars.js'}]];
  const hash = getIndexHash(config, context);
  await writeFile(join(context.siteDir, 'sidebars.js'), 'export default {guide: ["guide", "intro"]};\n');
  assert.notEqual(getIndexHash(config, context), hash);
});

for (const source of ['server/server/utils/buildIndex.js', 'client/client/theme/worker.js']) {
  test(`changing installed ${source} invalidates the search hash`, async (t) => {
    const {config, context} = await fixture(t);
    const hash = getIndexHash(config, context);
    const sourcePath = require.resolve(`${packageName}/dist/${source}`);
    const read = fs.readFileSync;
    let sourceReads = 0;
    // Simulate patched source bytes without modifying the installed package.
    const mockedRead = t.mock.method(fs, 'readFileSync', function (path, ...args) {
      const contents = read.call(this, path, ...args);
      if (path !== sourcePath) return contents;
      sourceReads++;
      return Buffer.concat([Buffer.from(contents), Buffer.from('\n// changed indexing code\n')]);
    });
    try {
      assert.notEqual(getIndexHash(config, context), hash);
      assert.equal(sourceReads, 1);
    } finally {
      mockedRead.mock.restore();
    }
    assert.equal(getIndexHash(config, context), hash);
  });
}
