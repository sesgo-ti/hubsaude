import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';

export const codePages = JSON.parse(await readFile(new URL('./fixtures/legacy-code.json', import.meta.url), 'utf8'));

export function originalText({kind, html}) {
  const $ = load(html, null, false);
  if (kind === 'pre') return $('pre').text();
  // parse5 stores template children in a document fragment, not ordinary children.
  return load($('template').html(), null, false).root().text().replace(/^\n/, '').replace(/\n$/, '');
}

export function generatedText($, element) {
  const code = $(element);
  const lines = code.children('.token-line');
  if (!lines.length) return code.text().replace(/\n$/, '');
  // Prism renders visual lines as spans/br, which .text() would concatenate.
  return lines.toArray().map((line) => {
    const copy = $(line).clone();
    copy.find('br').remove();
    return copy.text().replace(/^\n$/, '');
  }).join('\n');
}
