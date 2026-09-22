import {test as base, expect} from '@playwright/test';
import {guidedRoutes, supportHref} from './navigation.mjs';
import {renderedCode} from './rendered-code.mjs';

const test = base.extend({
  context: async ({context, baseURL}, use) => {
    const errors = [];
    const external = [];
    const failures = [];
    context.on('page', (page) => {
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('worker', (worker) => {
        const url = new URL(worker.url());
        if (url.origin !== new URL(baseURL).origin) external.push(`Worker: ${url.href}`);
      });
    });
    context.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
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

async function select(page, index, language) {
  const tab = group(page, index).getByRole('tab', {name: language, exact: true});
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(panel(page, index)).toBeVisible();
}

async function copyCurrentCode(page, current) {
  const pre = current.locator('pre');
  const expected = renderedCode(await pre.innerHTML());
  expect(expected.trim()).not.toBe('');
  await pre.hover();
  const copy = current.getByRole('button', {name: /copy|copiar/i});
  await copy.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(copy).toBeFocused();
  await expect(copy).toHaveCSS('outline-color', 'rgb(126, 236, 192)');
  await copy.click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  return expected;
}

async function screenshot(page, testInfo, name) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({path, fullPage: true, animations: 'disabled'});
  await testInfo.attach(name, {path, contentType: 'image/png'});
}

async function openManagerDetail(page) {
  const detail = page.locator('main details').filter({has: page.locator('img')}).first();
  await expect(detail).not.toHaveAttribute('open');
  await detail.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(detail).toHaveAttribute('open');
  const image = detail.locator('img').first();
  await expect(image).toHaveAttribute('alt', /\S/);
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  return detail;
}

test('home entries, brand, support and navbar work, including the 360px layout', async ({page}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  if (mobile) await page.setViewportSize({width: 360, height: 844});
  await visit(page);
  const brand = page.locator('.navbar__brand').first();
  const logo = brand.locator('img');
  await expect(logo).toHaveAttribute('src', '/hubsaude/img/brasao-goias.svg');
  await expect(logo).toHaveAttribute('alt', 'Bras\u00e3o do Estado de Goi\u00e1s');
  await expect.poll(() => logo.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  const search = page.locator('.navbar__search-input');
  await expect(search).toBeVisible();
  await expect(search).toHaveAccessibleName(/buscar|pesquisar/i);
  await expect(page.locator('footer').getByRole('link', {name: /^Suporte/})).toHaveAttribute('href', supportHref);
  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (mobile) {
    const brandBox = await brand.boundingBox();
    const searchBox = await search.boundingBox();
    expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(searchBox.x);
    expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(360);
  }
  await screenshot(page, testInfo, 'home');
  for (const route of ['gestor/', 'fluxos/']) {
    await expect(page.locator('main a[href]:visible')).toHaveCount(2);
    await page.locator(`main a[href="/hubsaude/${route}"]`).click();
    await expect(page).toHaveURL(new URL(`/hubsaude/${route}`, page.url()).href);
    await expect(page.locator('main h1')).toBeVisible();
    if (route === 'gestor/') await expect(page.locator(`main a[href="${supportHref}"]`).first()).toBeVisible();
    await brand.click();
    await expect(page).toHaveURL(new URL('/hubsaude/', page.url()).href);
  }
  for (const route of ['gestor/', 'fluxos/']) {
    if (mobile) await page.locator('.navbar__toggle').click();
    const nav = page.locator(mobile ? '.navbar-sidebar' : '.navbar__items');
    await nav.locator(`a[href="/hubsaude/${route}"]`).click();
    await expect(page).toHaveURL(new URL(`/hubsaude/${route}`, page.url()).href);
    await expect(page.locator('main h1')).toBeVisible();
    await brand.click();
  }
});

test('native guided pagination follows the approved order and terminates in both directions', async ({page}) => {
  await visit(page, guidedRoutes[0]);
  await expect(page.locator('.pagination-nav__link--prev')).toHaveCount(0);
  for (const [direction, routes] of [['next', guidedRoutes.slice(1)], ['prev', guidedRoutes.slice(0, -1).reverse()]]) {
    for (const route of routes) {
      const link = page.locator(`.pagination-nav__link--${direction}`);
      await expect(link).toHaveAttribute('href', `/hubsaude/${route}`);
      await link.click();
      await expect(page).toHaveURL(new URL(`/hubsaude/${route}`, page.url()).href);
      await expect(page.locator('main h1')).toBeVisible();
    }
    await expect(page.locator(`.pagination-nav__link--${direction}`)).toHaveCount(0);
  }
});

test('reference category opens with the keyboard and reaches a representative SDK', async ({page}, testInfo) => {
  await visit(page, 'fluxos/');
  const mobile = testInfo.project.name === 'mobile';
  if (mobile) await page.locator('.navbar__toggle').click();
  const sidebar = page.locator(mobile ? '.navbar-sidebar' : '.theme-doc-sidebar-container');
  const reference = sidebar.getByRole('button', {name: 'Consultar refer\u00eancia', exact: true});
  await expect(reference).toHaveAttribute('aria-expanded', 'false');
  const sdk = sidebar.getByRole('link', {name: 'SDKs por linguagem', exact: true});
  await expect(sdk).not.toBeVisible();
  await reference.focus();
  await page.keyboard.press('Enter');
  await expect(reference).toHaveAttribute('aria-expanded', 'true');
  await sdk.click();
  await expect(page).toHaveURL(/\/hubsaude\/sdks\/$/);
  await page.locator('main a[href="/hubsaude/sdks/autenticacao/python/"]').first().click();
  await expect(page).toHaveURL(/\/hubsaude\/sdks\/autenticacao\/python\/$/);
  await expect(page.locator('main pre').first()).toBeVisible();
});

test('two language groups support keyboard selection, current-code copy and independent persistence', async ({page, context, baseURL}, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: new URL(baseURL).origin});
  await visit(page, 'fluxos/autenticacao/');
  const secondChoice = await group(page, 1).locator('[aria-selected="true"]').textContent();
  const tabs = group(page, 0).getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  const firstChoice = await tabs.nth(1).textContent();
  await expect(group(page, 1).locator('[aria-selected="true"]')).toHaveText(secondChoice);
  await copyCurrentCode(page, panel(page, 0));
  await select(page, 1, 'C#');
  await expect(group(page, 0).locator('[aria-selected="true"]')).toHaveText(firstChoice);
  await copyCurrentCode(page, panel(page, 1));
  await page.reload();
  await expect(group(page, 0).locator('[aria-selected="true"]')).toHaveText(firstChoice);
  await expect(group(page, 1).getByRole('tab', {name: 'C#', exact: true})).toHaveAttribute('aria-selected', 'true');
  await screenshot(page, testInfo, 'auth');
});

test('OS tabs copy the current installer commands without terminal prompts', async ({page, context, baseURL}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: new URL(baseURL).origin});
  await visit(page, 'ferramentas/cli/');
  for (const label of ['Windows', 'macOS e Linux']) {
    await select(page, 0, label);
    const command = await copyCurrentCode(page, panel(page, 0));
    expect(command).not.toMatch(/^\s*(?:\$|>|PS(?:\s+[^>\n]*)?>)\s*/m);
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

test('a manager detail opens and closes with the keyboard and loads its accessible image', async ({page}, testInfo) => {
  await visit(page, 'gestor/');
  const detail = await openManagerDetail(page);
  await screenshot(page, testInfo, 'gestor');
  await detail.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(detail).not.toHaveAttribute('open');
});

test('real search handles Portuguese accents, result anchors, empty input and no results', async ({page, context, baseURL}, testInfo) => {
  const workerReady = page.waitForEvent('worker');
  const indexReady = context.waitForEvent('response', (response) => /\/search-index[^/]*\.json$/.test(new URL(response.url()).pathname));
  await visit(page);
  const navbar = page.locator('.navbar__search-input');
  await navbar.click();
  await expect(navbar).toHaveAttribute('aria-autocomplete', 'list');
  await navbar.fill('autentica\u00e7\u00e3o');
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.getByRole('link', {name: 'Ver todos os resultados', exact: true}).click();
  expect(new URL((await workerReady).url()).origin).toBe(new URL(baseURL).origin);
  expect((await indexReady).status()).toBe(200);
  const input = page.locator('main input[name="q"]');
  await expect(input).toHaveAccessibleName(/buscar|pesquisar/i);
  for (const query of ['autentica\u00e7\u00e3o', 'autenticacao']) {
    await input.fill(query);
    await expect(page.locator('main h1')).toContainText(query);
    await expect(page.locator('article a[href^="/hubsaude/"]').first()).toBeVisible();
  }
  const result = page.locator('article a[href^="/hubsaude/"][href*="#"]').first();
  await expect(result).toBeVisible();
  const destination = new URL(await result.getAttribute('href'), page.url());
  await screenshot(page, testInfo, 'search');
  await result.click();
  await expect(page).toHaveURL(destination.href);
  await expect(page.locator('main h1')).toBeVisible();
  const anchor = page.locator(`[id=${JSON.stringify(decodeURIComponent(destination.hash.slice(1)))}]`);
  await expect(anchor).toBeInViewport();
  await visit(page, 'search/');
  await expect(input).toHaveValue('');
  await expect(page.locator('article')).toHaveCount(0);
  await input.fill('zzzxqvnenhumresultado987654');
  await expect(page.getByText(/Nenhum resultado encontrado/)).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await input.fill('');
  await expect(page.getByText(/Nenhum resultado encontrado/)).toHaveCount(0);
  await expect(page.locator('article')).toHaveCount(0);
  await navbar.click();
  await expect(navbar).toHaveAttribute('aria-autocomplete', 'list');
  await navbar.fill('zzzxqvnenhumresultado987654');
  await expect(page.getByText(/Nenhum resultado\./)).toBeVisible();
});

test.describe('progressive enhancement', () => {
  test.use({javaScriptEnabled: false});
  test('home, authentication and manager initial content remains usable without JavaScript', async ({page}) => {
    await visit(page);
    await expect(page.locator('main a[href]:visible')).toHaveCount(2);
    const gestor = page.locator('main a[href="/hubsaude/gestor/"]');
    await expect(page.locator('main a[href="/hubsaude/fluxos/"]')).toBeVisible();
    await gestor.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/hubsaude\/gestor\/$/);
    await expect(page.locator('main h1')).toBeVisible();
    await openManagerDetail(page);
    await visit(page, 'fluxos/autenticacao/');
    await expect(panel(page, 0)).toBeVisible();
    expect(renderedCode(await panel(page, 0).locator('pre').innerHTML()).trim()).not.toBe('');
  });
});

test('mobile search retries a failed worker without a page reload', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Desktop exercises the full resilience suite');
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let attempts = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        if (++attempts === 1) throw new DOMException('Worker blocked for retry smoke', 'SecurityError');
        super(...args);
      }
    };
  });
  let navigations = 0;
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++;
  });
  await visit(page);
  const input = page.locator('.navbar__search-input');
  await input.focus();
  await input.fill('Python');
  const alert = page.locator('.navbar__search').getByRole('alert');
  await expect(alert).toBeVisible();
  await alert.getByRole('button', {name: 'Tentar novamente', exact: true}).click();
  await expect(alert).toHaveCount(0);
  await expect(input).toHaveAttribute('aria-autocomplete', 'list');
  await expect(page.getByRole('option').first()).toBeVisible();
  expect(navigations).toBe(1);
});
