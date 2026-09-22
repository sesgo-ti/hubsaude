import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderedCode} from './rendered-code.mjs';

test('Prism extraction preserves indentation, blank lines and decoded entities', () => {
  const html = '<code><span class="token-line"><span>  if (a &lt; b &amp;&amp; b &gt; 0) {</span><br></span><span class="token-line"><br></span><span class="token-line">\n</span><span class="token-line">    &quot;ok&quot;;  </span><span class="token-line">}</span></code>';
  assert.equal(renderedCode(html), '  if (a < b && b > 0) {\n\n\n    "ok";  \n}');
});

test('plain code removes only the renderer final newline, not significant whitespace', () => {
  assert.equal(renderedCode('<code>  &lt;tag&gt; &amp; &amp;lt;\n\n  end  \n\n</code>'), '  <tag> & &lt;\n\n  end  \n');
  assert.equal(renderedCode('<code>  no final newline  </code>'), '  no final newline  ');
});
