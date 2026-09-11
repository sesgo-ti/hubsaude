(function () {
  'use strict';

  function storageKey(el) {
    var idx = Array.prototype.indexOf.call(
      document.querySelectorAll('hs-code-tabs'), el
    );
    return 'hs-code-tabs:' + location.pathname + ':' + idx;
  }

  function build(el) {
    var templates = Array.prototype.slice.call(el.querySelectorAll('template'));
    if (templates.length === 0) return;

    var tabs = document.createElement('div');
    tabs.className = 'hsct-tabs';
    tabs.setAttribute('role', 'tablist');

    var panel = document.createElement('pre');
    panel.className = 'hsct-panel';
    var code = document.createElement('code');
    panel.appendChild(code);

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'hsct-copy';
    copyBtn.textContent = 'Copiar';

    var key = storageKey(el);
    var stored = null;
    try { stored = localStorage.getItem(key); } catch (e) {}

    var buttons = templates.map(function (tpl, i) {
      var lang = tpl.getAttribute('data-lang') || ('lang-' + i);
      var label = tpl.getAttribute('data-label') || lang;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.dataset.lang = lang;
      btn.textContent = label;
      btn.addEventListener('click', function () { select(lang); });
      tabs.appendChild(btn);
      return btn;
    });

    function select(lang) {
      var tpl = templates.filter(function (t, idx) {
        var dataLang = t.getAttribute('data-lang');
        return (dataLang || '') === lang || (!dataLang && lang === ('lang-' + idx));
      })[0] || templates[0];
      code.textContent = tpl.content.textContent.replace(/^\n/, '').replace(/\n$/, '');
      buttons.forEach(function (b) {
        var selectedLang = tpl.getAttribute('data-lang') || '';
        var on = b.dataset.lang === selectedLang ||
                 (!tpl.getAttribute('data-lang') && b.dataset.lang === ('lang-' + templates.indexOf(tpl)));
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      try { localStorage.setItem(key, tpl.getAttribute('data-lang') || ''); } catch (e) {}
    }

    var initialLang = stored && templates.some(function (t) {
      return t.getAttribute('data-lang') === stored;
    }) ? stored : (templates[0].getAttribute('data-lang') || '');

    var copyTimer;
    copyBtn.addEventListener('click', function () {
      var text = code.textContent;
      function done() {
        copyBtn.classList.add('is-done');
        copyBtn.textContent = 'Copiado!';
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () {
          copyBtn.classList.remove('is-done');
          copyBtn.textContent = 'Copiar';
        }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done);
      }
    });

    el.innerHTML = '';
    el.appendChild(tabs);
    var panelWrap = document.createElement('div');
    panelWrap.className = 'hsct-panel-wrap';
    panelWrap.appendChild(panel);
    panelWrap.appendChild(copyBtn);
    el.appendChild(panelWrap);

    select(initialLang);
  }

  customElements.define('hs-code-tabs', class extends HTMLElement {
    connectedCallback() { build(this); }
  });
})();
