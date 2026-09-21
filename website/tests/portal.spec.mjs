import {readFile} from 'node:fs/promises';
import {request as httpRequest} from 'node:http';
import {test as base, expect} from '@playwright/test';
import {load} from 'cheerio';
import {codePages, generatedText, originalText} from './code-fixture.mjs';
import {approvedContactLabel, guidedRoutes, movedSections, newRoutes} from './navigation.mjs';

const routes = JSON.parse(await readFile(new URL('./fixtures/legacy-routes.json', import.meta.url), 'utf8'));
const gestor = JSON.parse(await readFile(new URL('./fixtures/gestor-upstream.json', import.meta.url), 'utf8'));
const languages = ['Python', 'Java', 'TypeScript', 'C#'];
const screenshots = new Map([['', 'home'], ['fluxos/', 'flow'], ['fluxos/preparar/', 'prepare'], ['fluxos/visao-geral/', 'references'], ['fluxos/autenticacao/', 'auth'], ['gestor/', 'gestor'], ['ferramentas/cli/', 'cli']]);
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
  await expect(page.locator(route.startsWith('search/') ? 'h1' : 'main h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function group(page, index) {
  return page.getByRole('tablist').nth(index);
}

test('unknown and inherited home fragments never crash or redirect the page', async ({page}) => {
  for (const fragment of ['__proto__', 'constructor', 'toString', 'secao-inexistente', '%E0%A4%A']) {
    await visit(page, `?origem=${encodeURIComponent(fragment)}#${fragment}`);
    await expect(page.locator('main h1')).toHaveText('Documentação do HubSaúde');
    await expect(page.locator('main a:visible')).toHaveCount(2);
    expect(new URL(page.url()).pathname).toBe('/hubsaude/');
    expect(new URL(page.url()).hash).toBe(`#${fragment}`);
  }
});

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

for (const {route} of [...routes, ...newRoutes]) {
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
}

for (const {route, legacy, anchors} of routes) {
  test(`legacy URL preserves or explicitly relocates deep-link fragment: ${legacy}`, async ({page}) => {
    const id = anchors.at(-1);
    await page.goto(`/hubsaude/${legacy}#${id}`);
    const destination = route === '' && movedSections[id] ? movedSections[id] : `${route}#${id}`;
    await expect(page).toHaveURL(new URL(`/hubsaude/${destination}`, page.url()).href);
    const destinationId = destination.split('#')[1];
    await expect(page.locator(`[id="${destinationId}"]`), `Destination anchor #${destinationId} must exist exactly once`).toHaveCount(1);
    await expect(page.locator('main h1')).toBeVisible();
  });
}

for (const home of ['', 'index.html']) {
  for (const [id, destination] of Object.entries(movedSections)) {
    test(`moved home fragment redirects with query preserved: ${home || '/'}#${id}`, async ({page}) => {
      const query = '?utm_source=legacy&term=a%2Bb&term=sa%C3%BAde';
      await visit(page, 'gestor/');
      const previous = page.url();
      const historyLength = await page.evaluate(() => history.length);
      await page.goto(`/hubsaude/${home}${query}#${id}`);
      const expected = new URL(`/hubsaude/${destination}`, page.url());
      expected.search = query;
      await expect(page).toHaveURL(expected.href);
      await expect(page.locator(`[id="${expected.hash.slice(1)}"]`)).toHaveCount(1);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(() => history.length), 'Relocation must replace, not push, history').toBe(historyLength + 1);
      await page.goBack();
      await expect(page).toHaveURL(previous);
    });
  }
}

test('home exposes only two audience links, one navbar search and one support footer link', async ({page}, testInfo) => {
  await visit(page);
  const links = page.locator('main a[href]:visible');
  await expect(links).toHaveCount(2);
  expect(await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))).toEqual(['/hubsaude/gestor/', '/hubsaude/fluxos/']);
  await expect(page.locator('main aside:visible')).toHaveCount(0);
  await expect(page.locator('main form, main input, main [role="search"]')).toHaveCount(0);
  await expect(page.locator('.navbar__search-input')).toHaveCount(1);
  await expect(page.locator('.navbar__search-input')).toBeVisible();
  const navbar = page.locator('.navbar');
  expect(await navbar.locator('.navbar__items a[href]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))).toEqual(['/hubsaude/', '/hubsaude/gestor/', '/hubsaude/fluxos/']);
  if (testInfo.project.name === 'mobile') {
    await navbar.locator('.navbar__toggle').click();
    await expect(page.locator('.navbar-sidebar').getByRole('link', {name: 'Gestores', exact: true})).toBeVisible();
    await expect(page.locator('.navbar-sidebar').getByRole('link', {name: 'Desenvolvedores', exact: true})).toBeVisible();
    await expect(page.locator('.navbar-sidebar').getByRole('link', {name: /SDK/})).toHaveCount(0);
    await page.locator('.navbar-sidebar__close').click();
  } else {
    await expect(navbar.getByRole('link', {name: 'Gestores', exact: true})).toBeVisible();
    await expect(navbar.getByRole('link', {name: 'Desenvolvedores', exact: true})).toBeVisible();
  }
  const footer = page.locator('footer').getByRole('link');
  await expect(footer).toHaveCount(1);
  await expect(footer).toHaveText('Suporte');
  await expect(footer).toHaveAttribute('href', gestor.contact.href);
});

for (const width of [360, 390]) {
  test(`mobile home at ${width}px has no overflow or brand/search overlap`, async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile layout only');
    await page.setViewportSize({width, height: 844});
    await visit(page);
    const brand = page.locator('.navbar__brand').first();
    const search = page.locator('.navbar__search-input');
    await expect(brand).toBeVisible();
    await expect(search).toBeVisible();
    const brandBox = await brand.boundingBox();
    const searchBox = await search.boundingBox();
    expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(searchBox.x);
    expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(width);
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
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

test('mobile navbar navigation reaches both audiences without an SDK shortcut', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile drawer only');
  for (const [label, route] of [['Gestores', 'gestor/'], ['Desenvolvedores', 'fluxos/']]) {
    await visit(page);
    await page.locator('.navbar__toggle').click();
    await expect(page.locator('.navbar-sidebar')).toBeVisible();
    await page.locator('.navbar-sidebar').getByRole('link', {name: label, exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/hubsaude/${route}$`));
    await expect(page.locator('main h1')).toBeVisible();
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

test('home navbar search uses all results from the real worker index and opens the exact manager heading', async ({page, context, baseURL}, testInfo) => {
  const workerReady = page.waitForEvent('worker');
  // Context events include dedicated-worker fetches; never replace the real index with a response fixture.
  const indexReady = context.waitForEvent('response', (response) => /\/search-index[^/]*\.json$/.test(new URL(response.url()).pathname));
  await visit(page);
  const input = page.locator('.navbar__search-input');
  await expect(input).toHaveCount(1);
  await input.click();
  await expect(input).toHaveAttribute('aria-autocomplete', 'list');
  await input.fill('certificado');
  const all = page.getByRole('link', {name: 'Ver todos os resultados', exact: true});
  await expect(all).toBeVisible();
  await expect(page.locator('[role="option"]').first()).toBeVisible();
  await all.click();
  await expect(page).toHaveURL(/\/hubsaude\/search\/\?q=certificado$/);
  const worker = await workerReady;
  expect(new URL(worker.url()).origin).toBe(new URL(baseURL).origin);
  const index = await indexReady;
  expect(index.status()).toBe(200);
  expect(new URL(index.url()).pathname).toMatch(/^\/hubsaude\/search-index/);
  await expect(page.locator('article a[href^="/hubsaude/gestor/"]').first()).toBeVisible();
  await expect(page.locator('article a[href^="/hubsaude/fluxos/autenticacao/"]').first()).toBeVisible();
  const path = testInfo.outputPath('search-page.png');
  await page.screenshot({path, fullPage: true, animations: 'disabled'});
  await testInfo.attach('search-page', {path, contentType: 'image/png'});
  const result = page.locator('article').getByRole('link', {name: 'Certificado: s\u00f3 a parte p\u00fablica, nunca a chave privada', exact: true}).first();
  const destination = new URL(await result.getAttribute('href'), page.url());
  expect(destination.pathname).toBe('/hubsaude/gestor/');
  expect(decodeURIComponent(destination.hash)).toBe('#certificado-s\u00f3-a-parte-p\u00fablica-nunca-a-chave-privada');
  await result.click();
  await expect(page).toHaveURL(destination.href);
  await expect(page.locator('main h1')).toHaveText('A jornada do gestor (credenciamento)');
  // The heading's accessible name also includes Docusaurus's "Link direto" permalink.
  const heading = page.locator('main').getByRole('heading', {name: /^Certificado: s\u00f3 a parte p\u00fablica, nunca a chave privada/});
  await expect(heading).toHaveAttribute('id', decodeURIComponent(destination.hash.slice(1)));
  await expect(heading).toBeInViewport();
});

test('navbar search from a document opens the menu and finds the Python SDK', async ({page}, testInfo) => {
  await visit(page, 'fluxos/autenticacao/');
  const input = page.locator('.navbar__search-input');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('placeholder', 'Buscar na documenta\u00e7\u00e3o');
  await input.click();
  await expect(input).toHaveAttribute('aria-autocomplete', 'list');
  await input.fill('Python');
  const all = page.getByRole('link', {name: 'Ver todos os resultados', exact: true});
  await expect(all).toBeVisible();
  await expect(page.locator('[role="option"]').filter({hasText: 'Python'}).first()).toBeVisible();
  const path = testInfo.outputPath('search-menu.png');
  await page.screenshot({path, animations: 'disabled'});
  await testInfo.attach('search-menu', {path, contentType: 'image/png'});
  await all.click();
  await expect(page).toHaveURL(/\/hubsaude\/search\/\?q=Python$/);
  const sdk = page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first();
  await expect(sdk).toBeVisible();
  await sdk.click();
  await expect(page).toHaveURL(/\/hubsaude\/sdks\/autenticacao\/python\/(?:[?#].*)?$/);
  await expect(page.locator('main h1')).toContainText('Python');
});

test('Portuguese accented and unaccented search both find manager documentation', async ({page}) => {
  for (const query of ['solicita\u00e7\u00e3o', 'solicitacao']) {
    await visit(page, `search/?q=${encodeURIComponent(query)}`);
    await expect(page.locator('input[name="q"]')).toHaveValue(query);
    await expect(page.locator('h1')).toHaveText(`Resultados para "${query}"`);
    await expect(page.locator('article a[href^="/hubsaude/gestor/"]').first(), query).toBeVisible();
    await expect(page.getByText(/\d+ resultados? encontrad/)).toBeVisible();
  }
});

test('empty and zero-result searches offer useful Portuguese text and accessible inputs', async ({page}) => {
  await visit(page, 'search/?q=');
  const input = page.locator('input[name="q"]');
  await expect(page.locator('h1')).toHaveText('Buscar na documenta\u00e7\u00e3o');
  await expect(input).toHaveValue('');
  await expect.soft(page.getByRole('main'), 'Search needs a main landmark for assistive navigation').toHaveCount(1);
  await expect.soft(input, 'The search page accessible name must be Portuguese').toHaveAccessibleName(/buscar|pesquisar/i);
  await expect(page.locator('article')).toHaveCount(0);
  await input.fill('zzzxqvnenhumresultado987654');
  await expect(page.getByText('Nenhum resultado encontrado. Tente outro termo ou navegue pelos guias de gestores e desenvolvedores.', {exact: true})).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await input.fill('');
  await expect(page.locator('h1')).toHaveText('Buscar na documenta\u00e7\u00e3o');
  await expect(page.getByText('Nenhum resultado encontrado.', {exact: false})).toHaveCount(0);
  const navbar = page.locator('.navbar__search-input');
  await expect.soft(navbar, 'The navbar search accessible name must be Portuguese').toHaveAccessibleName(/buscar|pesquisar/i);
  await navbar.click();
  await expect(navbar).toHaveAttribute('aria-autocomplete', 'list');
  await navbar.fill('zzzxqvnenhumresultado987654');
  await expect(page.getByText('Nenhum resultado. Tente outro termo, como certificado, token ou Python.', {exact: true})).toBeVisible();
});

test('all nine manager Details expand with the keyboard and load accessible screenshots', async ({page}, testInfo) => {
  await visit(page, 'gestor/');
  await expect(page.locator('main details')).toHaveCount(9);
  for (const [index, slide] of gestor.slides.entries()) {
    const detail = page.locator('main details').nth(index);
    const summary = detail.locator('summary');
    await expect(summary).toHaveText(slide.title);
    await expect(detail).not.toHaveAttribute('open');
    await summary.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(summary).toBeFocused();
    await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
    await expect(detail).toHaveAttribute('open');
    await expect(detail.getByText(slide.desc, {exact: true})).toBeVisible();
    const image = detail.getByRole('img', {name: slide.alt, exact: true});
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  const path = testInfo.outputPath('gestor-expanded.png');
  await page.screenshot({path, fullPage: true, animations: 'disabled'});
  await testInfo.attach('gestor-expanded', {path, contentType: 'image/png'});
  const summary = page.locator('main details').last().locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main details').last()).not.toHaveAttribute('open');
});

test('the two home audience paths reach manager and developer documentation', async ({page}) => {
  for (const [label, to] of [['Credenciar minha institui\u00e7\u00e3o', 'gestor/'], ['Integrar meu sistema', 'fluxos/']]) {
    await visit(page);
    const link = page.locator('main').getByRole('link', {name: label, exact: true});
    await expect(link).toHaveAttribute('href', `/hubsaude/${to}`);
    await link.click();
    await expect(page).toHaveURL(new URL(`/hubsaude/${to}`, page.url()).href);
    await expect(page.locator('main h1')).toBeVisible();
    if (to === 'gestor/') {
      await expect(page.locator('main').getByRole('link', {name: approvedContactLabel, exact: true})).toHaveAttribute('href', gestor.contact.href);
    }
  }
});

test('guided native pagination goes prepare, authenticate, send and stops, with a working return path', async ({page}) => {
  await visit(page, guidedRoutes[0]);
  await expect(page.locator('.pagination-nav__link--prev')).toHaveCount(0);
  for (const route of guidedRoutes.slice(1)) {
    const next = page.locator('.pagination-nav__link--next');
    await expect(next).toHaveAttribute('href', `/hubsaude/${route}`);
    await next.click();
    await expect(page).toHaveURL(new URL(`/hubsaude/${route}`, page.url()).href);
    await expect(page.locator('main h1')).toBeVisible();
  }
  await expect(page.locator('.pagination-nav__link--next')).toHaveCount(0);
  for (const route of guidedRoutes.slice(0, -1).reverse()) {
    const previous = page.locator('.pagination-nav__link--prev');
    await expect(previous).toHaveAttribute('href', `/hubsaude/${route}`);
    await previous.click();
    await expect(page).toHaveURL(new URL(`/hubsaude/${route}`, page.url()).href);
    await expect(page.locator('main h1')).toBeVisible();
  }
  await expect(page.locator('.pagination-nav__link--prev')).toHaveCount(0);
});

test('collapsed sidebar reference category is keyboard accessible and reaches all SDKs', async ({page}, testInfo) => {
  await visit(page, 'fluxos/');
  if (testInfo.project.name === 'mobile') await page.locator('.navbar__toggle').click();
  const sidebar = page.locator(testInfo.project.name === 'mobile' ? '.navbar-sidebar' : '.theme-doc-sidebar-container');
  const reference = sidebar.getByRole('button', {name: 'Consultar refer\u00eancia', exact: true});
  await expect(reference).toBeVisible();
  await expect(reference).toHaveAttribute('aria-expanded', 'false');
  const sdk = sidebar.getByRole('link', {name: 'SDKs por linguagem', exact: true});
  await expect(sdk).not.toBeVisible();
  await reference.focus();
  await page.keyboard.press('Enter');
  await expect(reference).toHaveAttribute('aria-expanded', 'true');
  await expect(sdk).toBeVisible();
  await sdk.click();
  await expect(page).toHaveURL(/\/hubsaude\/sdks\/$/);
  await expect(page.locator('main h1')).toBeVisible();
  for (const language of ['java', 'python', 'csharp', 'typescript']) {
    if (language !== 'java') await visit(page, 'sdks/');
    await page.locator(`main a[href="/hubsaude/sdks/autenticacao/${language}/"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/hubsaude/sdks/autenticacao/${language}/$`));
    await expect(page.locator('main pre').first()).toBeVisible();
  }
});

test.describe('progressive enhancement', () => {
  test.use({javaScriptEnabled: false});
  for (const home of ['', 'index.html']) {
    test(`untargeted home keeps exactly two visible body links without JavaScript: ${home || '/'}`, async ({page}) => {
      await visit(page, home);
      await expect(page.locator('main a[href]:visible')).toHaveCount(2);
      await expect(page.locator('main aside:visible')).toHaveCount(0);
      await expect(page.locator('main form')).toHaveCount(0);
    });
    for (const [id, destination] of Object.entries(movedSections)) {
      test(`direct moved fragment has a working no-JS fallback link: ${home || '/'}#${id}`, async ({page}) => {
        await visit(page, `${home}?from=no-js#${id}`);
        await expect(page).toHaveURL(new URL(`/hubsaude/${home}?from=no-js#${id}`, page.url()).href);
        const aside = page.locator(`main aside[id="${id}"]`);
        await expect(aside).toBeVisible();
        await expect(page.locator('main aside:visible')).toHaveCount(1);
        await expect(page.locator('main a[href]:visible')).toHaveCount(3);
        const link = aside.getByRole('link', {name: 'Continuar a leitura no novo endere\u00e7o', exact: true});
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', `/hubsaude/${destination}`);
        await link.focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new URL(`/hubsaude/${destination}`, page.url()).href);
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator(`[id="${destination.split('#')[1]}"]`)).toHaveCount(1);
      });
    }
  }
  test('all nine manager screenshots remain keyboard accessible without JavaScript', async ({page}, testInfo) => {
    await visit(page, 'gestor/');
    await expect(page.locator('main details')).toHaveCount(9);
    for (const [index, slide] of gestor.slides.entries()) {
      const detail = page.locator('main details').nth(index);
      const summary = detail.locator('summary');
      await expect(summary).toHaveText(slide.title);
      await summary.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(summary).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(detail).toHaveAttribute('open');
      await expect(detail.getByText(slide.desc, {exact: true})).toBeVisible();
      const image = detail.getByRole('img', {name: slide.alt, exact: true});
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    const path = testInfo.outputPath('gestor-no-js-expanded.png');
    await page.screenshot({path, fullPage: true, animations: 'disabled'});
    await testInfo.attach('gestor-no-js-expanded', {path, contentType: 'image/png'});
  });
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
