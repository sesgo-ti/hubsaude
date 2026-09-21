import {test as base, expect} from '@playwright/test';

const indexPattern = /\/search-index[^/]*\.json(?:\?.*)?$/;
const retryLabel = /^(Try again|Tentar novamente)$/;
const errorMessage = /Search could not be loaded|N\u00e3o foi poss\u00edvel carregar a busca/;

const test = base.extend({
  context: async ({context}, use) => {
    const errors = [];
    context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
    context.on('console', (message) => {
      if (message.type() !== 'error') return;
      // Chromium may report the deliberately injected HTTP failure, not an application error.
      if (indexPattern.test(message.location().url) &&
          /^Failed to load resource: the server responded with a status of 503\b/.test(message.text())) return;
      errors.push(message.text());
    });
    await use(context);
    expect(errors, 'No unhandled search failures or unexpected console errors').toEqual([]);
  },
});

for (const target of ['page', 'navbar']) {
  test(`${target} retries a failed index without reloading or retaining a rejected promise`, async ({page, context}) => {
    let attempts = 0;
    await context.route(indexPattern, (route) => {
      attempts++;
      return attempts === 1
        ? route.fulfill({status: 503, contentType: 'application/json', body: '[]'})
        : route.continue();
    });
    const workers = [];
    page.on('worker', (worker) => workers.push(worker));
    await page.goto(target === 'page' ? '/hubsaude/search/?q=Python' : '/hubsaude/');
    const scope = page.locator(target === 'page' ? 'main' : '.navbar__search');
    const input = scope.locator('input');
    if (target === 'navbar') {
      await input.focus();
      await input.fill('Python');
    }
    const alert = scope.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(errorMessage);
    if (target === 'navbar') await expect(scope).toHaveAttribute('aria-busy', 'false');
    expect(attempts).toBe(1);
    await alert.getByRole('button', {name: retryLabel}).click();
    await expect(alert).toHaveCount(0);
    if (target === 'page') {
      await expect(page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first()).toBeVisible();
    } else {
      await expect(input).toHaveAttribute('aria-autocomplete', 'list');
      await expect(page.getByRole('option').filter({hasText: 'Python'}).first()).toBeVisible();
      await expect(scope).toHaveAttribute('aria-busy', 'false');
    }
    expect(attempts).toBe(2);
    expect(workers).toHaveLength(1);
  });
}

for (const target of ['page', 'navbar']) {
  for (const failure of ['script 404', 'startup timeout', 'constructor error']) {
    test(`${target} recovers from worker ${failure} without a reload`, async ({page, context}) => {
      await page.addInitScript((failure) => {
        const NativeWorker = window.Worker;
        window.__searchWorkerURLs = [];
        window.__terminatedSearchWorkers = 0;
        window.Worker = class extends NativeWorker {
          constructor(url, options) {
            window.__searchWorkerURLs.push(String(url));
            if (failure === 'constructor error' && window.__searchWorkerURLs.length === 1) {
              throw new DOMException('Worker construction blocked for regression test', 'SecurityError');
            }
            super(url, options);
          }
          terminate() {
            window.__terminatedSearchWorkers++;
            return super.terminate();
          }
        };
      }, failure);
      let workerRequests = 0;
      let indexRequests = 0;
      context.on('request', (request) => {
        if (indexPattern.test(request.url())) indexRequests++;
      });
      await context.route('**/assets/js/*.js', async (route) => {
        // Match the exact URL passed to Worker, never a page or lazy-loaded UI script.
        const isWorker = await page.evaluate((url) => window.__searchWorkerURLs.includes(url), route.request().url());
        if (!isWorker) return route.continue();
        workerRequests++;
        if (workerRequests === 1 && failure !== 'constructor error') {
          return route.fulfill({
            status: failure === 'script 404' ? 404 : 200,
            contentType: 'application/javascript',
            body: failure === 'script 404' ? 'Not found' : '// Never responds to the Comlink handshake.',
          });
        }
        return route.continue();
      });
      let navigations = 0;
      page.on('request', (request) => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++;
      });
      // An empty URL avoids a second startup attempt when hydration first reads q.
      await page.goto(target === 'page'
        ? (failure === 'constructor error' ? '/hubsaude/search/' : '/hubsaude/search/?q=Python')
        : '/hubsaude/');
      const scope = page.locator(target === 'page' ? 'main' : '.navbar__search');
      const input = scope.locator('input');
      if (target === 'navbar') {
        await input.focus();
        await input.fill('Python');
      }
      const alert = scope.getByRole('alert');
      await expect(alert).toContainText(errorMessage, {timeout: failure === 'startup timeout' ? 12000 : 5000});
      if (target === 'navbar') await expect(scope).toHaveAttribute('aria-busy', 'false');
      expect(indexRequests, 'Worker startup fails before fetching an index').toBe(0);
      expect(await page.evaluate(() => window.__terminatedSearchWorkers)).toBe(failure === 'constructor error' ? 0 : 1);
      await alert.getByRole('button', {name: retryLabel}).click();
      await expect(alert).toHaveCount(0);
      if (target === 'page') {
        if (failure === 'constructor error') await input.fill('Python');
        await expect(page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first()).toBeVisible();
      } else {
        await expect(input).toHaveAttribute('aria-autocomplete', 'list');
        await expect(page.getByRole('option').filter({hasText: 'Python'}).first()).toBeVisible();
        await expect(scope).toHaveAttribute('aria-busy', 'false');
      }
      expect(workerRequests).toBe(failure === 'constructor error' ? 1 : 2);
      expect(await page.evaluate(() => window.__searchWorkerURLs.length)).toBe(2);
      expect(indexRequests).toBe(1);
      expect(navigations).toBe(1);
    });
  }
}

for (const nextQuery of ['', 'Python']) {
  test(`a delayed index cannot restore the old query after ${nextQuery ? 'a fast edit' : 'clearing'}`, async ({page, context}) => {
    const requested = Promise.withResolvers();
    const release = Promise.withResolvers();
    await context.route(indexPattern, async (route) => {
      requested.resolve();
      await release.promise;
      await route.continue();
    });
    const workerReady = page.waitForEvent('worker');
    await page.goto('/hubsaude/search/?q=certificado');
    await requested.promise;
    const worker = await workerReady;
    // Observe real Comlink results so the assertion runs after the delayed search settles.
    await worker.evaluate(() => {
      const post = MessagePort.prototype.postMessage;
      self.__searchReplies = 0;
      MessagePort.prototype.postMessage = function (message, ...rest) {
        self.__searchReplies++;
        return post.call(this, message, ...rest);
      };
    });
    const input = page.locator('main input[name="q"]');
    try {
      await input.fill('cert');
      await input.fill(nextQuery);
      await expect(input).toHaveValue(nextQuery);
      await expect(page.locator('article')).toHaveCount(0);
    } finally {
      release.resolve();
    }
    await expect.poll(() => worker.evaluate(() => self.__searchReplies)).toBeGreaterThan(0);
    if (nextQuery) {
      await expect(page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first()).toBeVisible();
      await expect(page.locator('article').filter({hasText: /Certificado: s\u00f3 a parte/})).toHaveCount(0);
    } else {
      // Let worker messages cross the task boundary and React commit before checking absence.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(page.locator('article')).toHaveCount(0);
      await expect(page.locator('main h1')).toHaveText('Buscar na documenta\u00e7\u00e3o');
      expect(new URL(page.url()).searchParams.has('q')).toBe(false);
    }
  });
}

test('a late search reply cannot overwrite newer results or a cleared query', async ({page}) => {
  const workerReady = page.waitForEvent('worker');
  await page.goto('/hubsaude/search/?q=Python');
  await expect(page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first()).toBeVisible();
  const worker = await workerReady;
  await worker.evaluate(() => {
    const post = MessagePort.prototype.postMessage;
    self.__heldSearchReplies = [];
    MessagePort.prototype.postMessage = function (message, ...rest) {
      if (Array.isArray(message.value) && message.value.some((item) => item.tokens?.includes('certificado'))) {
        self.__heldSearchReplies.push(() => post.call(this, message, ...rest));
      } else {
        post.call(this, message, ...rest);
      }
    };
  });
  const input = page.locator('main input[name="q"]');
  for (const nextQuery of ['Python', '']) {
    await input.fill('certificado');
    await expect.poll(() => worker.evaluate(() => self.__heldSearchReplies.length)).toBe(1);
    await input.fill(nextQuery);
    if (nextQuery) await expect(page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first()).toBeVisible();
    else await expect(page.locator('article')).toHaveCount(0);
    await worker.evaluate(() => self.__heldSearchReplies.splice(0).forEach((reply) => reply()));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(input).toHaveValue(nextQuery);
    if (nextQuery) await expect(page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first()).toBeVisible();
    else await expect(page.locator('article')).toHaveCount(0);
    await expect(page.locator('article').filter({hasText: /Certificado: s\u00f3 a parte/})).toHaveCount(0);
  }
});

for (const previousQuery of ['', 'certificado']) {
  test(`back and forward synchronize the search input and results from ${previousQuery || 'an empty query'}`, async ({page}) => {
    await page.goto(`/hubsaude/search/?q=${previousQuery}`);
    const input = page.locator('main input[name="q"]');
    await expect(input).toHaveValue(previousQuery);
    const navbar = page.locator('.navbar__search-input');
    await navbar.focus();
    await expect(navbar).toHaveAttribute('aria-autocomplete', 'list');
    await navbar.fill('Python');
    await page.getByRole('link', {name: 'Ver todos os resultados', exact: true}).click();
    await expect(input).toHaveValue('Python');
    await expect(page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first()).toBeVisible();
    await page.goBack();
    await expect(input).toHaveValue(previousQuery);
    if (previousQuery) await expect(page.locator('article a[href^="/hubsaude/gestor/"]').first()).toBeVisible();
    else await expect(page.locator('article')).toHaveCount(0);
    await page.goForward();
    await expect(input).toHaveValue('Python');
    await expect(page.locator('article a[href^="/hubsaude/sdks/autenticacao/python/"]').first()).toBeVisible();
  });
}
