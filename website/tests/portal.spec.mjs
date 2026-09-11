import {readFile} from 'node:fs/promises';
import {request as httpRequest} from 'node:http';
import {test as base, expect} from '@playwright/test';
import {load} from 'cheerio';
import {codePages, generatedText, originalText} from './code-fixture.mjs';

const routes = JSON.parse(await readFile(new URL('./fixtures/legacy-routes.json', import.meta.url), 'utf8'));
const languages = ['Python', 'Java', 'TypeScript', 'C#'];
const screenshots = new Map([['', 'home'], ['fluxos/autenticacao/', 'auth'], ['gestor/', 'gestor'], ['ferramentas/cli/', 'cli']]);
const groups = [
  {route: 'fluxos/autenticacao/', index: 0, id: 'fluxos-autenticacao-token'},
  {route: 'fluxos/autenticacao/', index: 1, id: 'fluxos-autenticacao-cache'},
  {route: 'fluxos/envio-recurso/', index: 0, id: 'fluxos-envio-recurso-patient'},
];

const test = base.extend({
  context: async ({context, baseURL}, use) => {
    const errors = [];
    const external = [];
    const failures = [];
    context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
    context.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    context.on('requestfailed', (request) => {
      failures.push(`${request.failure()?.errorText} ${request.url()}`);
    });
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(baseURL).origin) {
        external.push(url.href);
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    await use(context);
    expect(errors, 'Uncaught browser errors').toEqual([]);
    expect(external, 'The portal must not require outbound services, fonts or scripts').toEqual([]);
    expect(failures, 'Failed local page/asset requests').toEqual([]);
  },
});

async function visit(page, route = '') {
  const response = await page.goto(`/hubsaude/${route}`);
  expect(response.status()).toBe(200);
  await expect(page.locator('main h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function group(page, index) {
  return page.getByRole('tablist').nth(index);
}

function panel(page, index) {
  return group(page, index).locator('..').getByRole('tabpanel');
}

async function codeText(locator) {
  const $ = load(await locator.innerHTML(), null, false);
  return generatedText($, $('code')[0]);
}

function expectedGroup({route, index}) {
  return codePages.find((page) => page.route === route).snippets
    .filter(({kind}) => kind === 'template').slice(index * 4, index * 4 + 4);
}

async function select(page, index, language) {
  const tab = group(page, index).getByRole('tab', {name: language, exact: true});
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(panel(page, index)).toBeVisible();
}

for (const {route, legacy} of routes) {
  test(`canonical page has content, valid logo and no body overflow: ${route || 'home'}`, async ({page}, testInfo) => {
    await visit(page, route);
    const logo = page.locator('.navbar__brand img').first();
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', '/hubsaude/img/brasao-goias.svg');
    await expect(logo).toHaveAttribute('alt', 'Bras\u00e3o do Estado de Goi\u00e1s');
    await expect.poll(() => logo.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(overflow.body, 'Body must not scroll horizontally').toBeLessThanOrEqual(overflow.viewport + 1);
    expect(overflow.document, 'Document must not scroll horizontally').toBeLessThanOrEqual(overflow.viewport + 1);
    if (screenshots.has(route)) {
      const path = testInfo.outputPath(`${screenshots.get(route)}.png`);
      await page.screenshot({path, fullPage: true, animations: 'disabled'});
      await testInfo.attach(screenshots.get(route), {path, contentType: 'image/png'});
    }
  });

  test(`legacy URL preserves deep-link fragment: ${legacy}`, async ({page}) => {
    const fixture = routes.find((entry) => entry.legacy === legacy);
    const id = fixture.anchors.at(-1);
    await page.goto(`/hubsaude/${legacy}#${id}`);
    await expect(page).toHaveURL(new RegExp(`/hubsaude/${route}(?:index\\.html)?#${id}$`));
    await expect(page.locator(`[id="${id}"]`), `Legacy anchor #${id} must exist exactly once`).toHaveCount(1);
    await expect(page.locator('main h1')).toBeVisible();
  });
}

for (const definition of groups) {
  test(`language switching, real clipboard and reload persistence: ${definition.id}`, async ({page, context, baseURL}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: new URL(baseURL).origin});
    await visit(page, definition.route);
    const examples = expectedGroup(definition);
    for (const language of ['Java', 'Python', 'C#', 'TypeScript']) {
      await select(page, definition.index, language);
      const expected = originalText(examples[languages.indexOf(language)]);
      const current = panel(page, definition.index);
      expect(await codeText(current.locator('pre'))).toBe(expected);
      await current.locator('pre').hover();
      const copy = current.getByRole('button', {name: /copy|copiar/i});
      await copy.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(copy).toBeFocused();
      await expect(copy).toHaveCSS('outline-color', 'rgb(126, 236, 192)');
      await copy.click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
      await page.reload();
      await expect(group(page, definition.index).getByRole('tab', {name: language, exact: true})).toHaveAttribute('aria-selected', 'true');
      expect(await codeText(panel(page, definition.index).locator('pre'))).toBe(expected);
    }
  });

  test(`keyboard arrows and wraparound: ${definition.id}`, async ({page}, testInfo) => {
    await visit(page, definition.route);
    const tabs = group(page, definition.index).getByRole('tab');
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.first()).toBeFocused();
    // Home/End are optional in native Docusaurus Tabs: report, do not invent support.
    await tabs.nth(1).focus();
    await page.keyboard.press('Home');
    const home = await tabs.first().evaluate((element) => element === document.activeElement);
    await tabs.nth(1).focus();
    await page.keyboard.press('End');
    const end = await tabs.last().evaluate((element) => element === document.activeElement);
    testInfo.annotations.push({type: 'keyboard', description: `Native Home=${home}, End=${end}; unsupported keys are an accessibility gap, not asserted as available.`});
    await testInfo.attach('keyboard-support', {body: JSON.stringify({ArrowLeft: true, ArrowRight: true, Home: home, End: end}), contentType: 'application/json'});
  });
}

test('three language groups retain independent preferences across routes and reloads', async ({page}) => {
  await visit(page, groups[0].route);
  await select(page, 0, 'Java');
  await expect(group(page, 1).getByRole('tab', {name: 'Python', exact: true})).toHaveAttribute('aria-selected', 'true');
  await select(page, 1, 'C#');
  await expect(group(page, 0).getByRole('tab', {name: 'Java', exact: true})).toHaveAttribute('aria-selected', 'true');
  await visit(page, groups[2].route);
  await expect(group(page, 0).getByRole('tab', {name: 'Python', exact: true})).toHaveAttribute('aria-selected', 'true');
  await select(page, 0, 'TypeScript');
  await visit(page, groups[0].route);
  await expect(group(page, 0).getByRole('tab', {name: 'Java', exact: true})).toHaveAttribute('aria-selected', 'true');
  await expect(group(page, 1).getByRole('tab', {name: 'C#', exact: true})).toHaveAttribute('aria-selected', 'true');
  await visit(page, groups[2].route);
  await expect(group(page, 0).getByRole('tab', {name: 'TypeScript', exact: true})).toHaveAttribute('aria-selected', 'true');
});

test('OS installers copy exact commands without terminal prompts', async ({page, context, baseURL}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: new URL(baseURL).origin});
  await visit(page, 'ferramentas/cli/');
  const commands = [
    ['Windows', 'irm https://raw.githubusercontent.com/sesgo-ti/hubsaude/main/install.ps1 | iex'],
    ['macOS e Linux', 'curl -fsSL https://raw.githubusercontent.com/sesgo-ti/hubsaude/main/install.sh | bash'],
  ];
  for (const [label, expected] of commands) {
    await select(page, 0, label);
    const current = panel(page, 0);
    expect(await codeText(current.locator('pre'))).toBe(expected);
    await current.locator('pre').hover();
    await current.getByRole('button', {name: /copy|copiar/i}).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    expect(expected).not.toMatch(/^(?:\$|>|PS>)/m);
    await page.reload();
    await expect(group(page, 0).getByRole('tab', {name: label, exact: true})).toHaveAttribute('aria-selected', 'true');
  }
});

test('mobile navigation reaches managers, developers and all SDK routes', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile drawer only');
  for (const [label, route] of [['Gestores', 'gestor/'], ['Desenvolvedores', 'fluxos/'], ['SDKs', 'sdks/']]) {
    await visit(page);
    await page.locator('.navbar__toggle').click();
    await expect(page.locator('.navbar-sidebar')).toBeVisible();
    await page.locator('.navbar-sidebar').getByRole('link', {name: label, exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/hubsaude/${route}$`));
    await expect(page.locator('main h1')).toBeVisible();
  }
  for (const language of ['java', 'python', 'csharp', 'typescript']) {
    await visit(page, 'sdks/');
    await page.locator(`main a[href="/hubsaude/sdks/autenticacao/${language}/"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/hubsaude/sdks/autenticacao/${language}/$`));
    await expect(page.locator('main pre').first()).toBeVisible();
  }
});

test('blocked localStorage does not break content or tab selection', async ({page, context}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('Storage blocked for smoke test', 'SecurityError'); }});
  });
  await visit(page, 'fluxos/autenticacao/');
  await select(page, 0, 'Java');
  await select(page, 1, 'C#');
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
  await select(page, 0, 'TypeScript');
  await visit(page, 'ferramentas/cli/');
  await select(page, 0, 'Windows');
});

test.describe('progressive enhancement', () => {
  test.use({javaScriptEnabled: false});
  for (const route of screenshots.keys()) {
    test(`initial content is visible without JavaScript: ${route || 'home'}`, async ({page}) => {
      await visit(page, route);
      await expect(page.locator('main')).toContainText('HubSa');
      if (route === 'fluxos/autenticacao/') {
        const expected = originalText(expectedGroup(groups[0])[0]);
        await expect(panel(page, 0)).toBeVisible();
        expect(await codeText(panel(page, 0).locator('pre'))).toBe(expected);
      }
      if (route === 'ferramentas/cli/') await expect(panel(page, 0)).toContainText('curl -fsSL');
      if (!route) await expect(page.locator('a[href="/hubsaude/gestor/"]').first()).toBeAttached();
    });
  }
});

test('static server has no SPA fallback and does not expose the workspace', async ({request}) => {
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
  // Send raw paths: URL/fetch normalization would erase traversal before the server sees it.
  for (const path of ['/hubsaude/../package.json', '/hubsaude/%2e%2e/package.json', '/hubsaude/%2e%2e%2fpackage.json', '/hubsaude/%5c..%5cpackage.json', '/hubsaude/%00', '/hubsaude/%ZZ']) {
    const status = await new Promise((resolve, reject) => {
      const req = httpRequest({hostname: '127.0.0.1', port: 4173, path}, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end();
    });
    expect(status, path).toBe(400);
  }
});
