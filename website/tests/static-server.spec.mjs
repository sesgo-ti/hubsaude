import {request as httpRequest} from 'node:http';
import {test, expect} from '@playwright/test';

test('static server has no SPA fallback and does not expose the workspace', async ({request, baseURL}) => {
  for (const path of ['/hubsaude/not-a-real-route/', '/hubsaude/assets/missing.js', '/package.json', '/hubsaude/package.json', '/']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(await response.text()).not.toContain('<html');
  }
  expect((await request.post('/hubsaude/')).status()).toBe(405);
  const response = await request.head('/hubsaude/img/brasao-goias.svg');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/svg+xml');
  expect(await response.body()).toHaveLength(0);
  // Raw paths prevent URL/fetch normalization from erasing traversal attempts.
  const {hostname, port} = new URL(baseURL);
  for (const path of ['/hubsaude/../package.json', '/hubsaude/%2e%2e/package.json', '/hubsaude/%2e%2e%2fpackage.json', '/hubsaude/%5c..%5cpackage.json', '/hubsaude/%00', '/hubsaude/%ZZ']) {
    const status = await new Promise((resolve, reject) => {
      const req = httpRequest({hostname, port, path}, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end();
    });
    expect(status, path).toBe(400);
  }
});
