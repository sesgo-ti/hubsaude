import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import test from 'node:test';
import {compile} from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

const docs = new URL('../docs/', import.meta.url);
const files = (await readdir(docs, {recursive: true})).filter((file) => /\.mdx?$/.test(file)).sort();

test('MDX source inventory is not empty', () => {
  assert.ok(files.length > 0);
});

for (const file of files) {
  test(`documentation compiles as standard MDX: ${file}`, async () => {
    const source = await readFile(new URL(file, docs), 'utf8');
    // Keep sources portable: no Docusaurus-only heading syntax or placeholder aliases.
    assert.doesNotMatch(source, /^\s*#{1,6}\s+.*\{#[^}]+\}/m, 'Headings must use automatic slugs');
    assert.doesNotMatch(source, /<Link\b[^>]*\bid\s*=/, 'Do not add placeholder Link IDs');
    // Frontmatter is metadata, not JSX; GFM retains tables and other docs syntax.
    await compile({value: source, path: file}, {remarkPlugins: [remarkFrontmatter, remarkGfm]});
  });
}
