import {load} from 'cheerio';

export function renderedCode(html) {
  const $ = load(html, null, false);
  const code = $('code');
  const lines = code.children('.token-line');
  if (!lines.length) return code.text().replace(/\n$/, '');
  // Prism uses spans/br for visual lines; plain .text() would join them together.
  return lines.toArray().map((line) => {
    const copy = $(line).clone();
    copy.find('br').remove();
    return copy.text().replace(/^\n$/, '');
  }).join('\n');
}
