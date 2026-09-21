import {themes} from 'prism-react-renderer';

const codeTheme = {
  ...themes.vsDark,
  plain: {color: '#e3f5ec', backgroundColor: '#102b20'},
};

export default {
  title: 'HubSaúde',
  tagline: 'Integração em saúde para gestores e desenvolvedores de Goiás',
  url: 'https://sesgo-ti.github.io',
  baseUrl: '/hubsaude/',
  trailingSlash: true,
  favicon: 'img/favicon.svg',
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  clientModules: ['./src/normalize-index.js'],
  i18n: {defaultLocale: 'pt-BR', locales: ['pt-BR']},
  headTags: [
    {tagName: 'link', attributes: {rel: 'apple-touch-icon', href: '/hubsaude/img/favicon-180.png'}},
  ],
  presets: [
    ['classic', {
      docs: {routeBasePath: '/', sidebarPath: './sidebars.js'},
      blog: false,
      theme: {customCss: './src/css/custom.css'},
      sitemap: {changefreq: null, priority: null},
    }],
  ],
  themes: [
    ['@easyops-cn/docusaurus-search-local', {
      hashed: 'filename',
      language: ['pt', 'en'],
      docsRouteBasePath: '/',
      indexBlog: false,
      indexPages: false,
      explicitSearchResultPath: true,
      searchResultContextMaxLength: 100,
      searchBarShortcut: false,
      searchBarShortcutHint: false,
    }],
  ],
  plugins: [
    ['@docusaurus/plugin-client-redirects', {
      redirects: [
        'fluxos/autenticacao',
        'fluxos/envio-recurso',
        'sdks/autenticacao/python',
        'sdks/autenticacao/java',
        'sdks/autenticacao/typescript',
        'sdks/autenticacao/csharp',
        'ferramentas/cli',
        'ferramentas/validador',
        'ferramentas/simulador',
      ].map((path) => ({from: `/${path}.html`, to: `/${path}/`})),
    }],
  ],
  themeConfig: {
    colorMode: {defaultMode: 'light', disableSwitch: true, respectPrefersColorScheme: false},
    announcementBar: {
      id: 'institucional',
      content: 'Secretaria de Estado da Saúde de Goiás · Plataforma de interoperabilidade em saúde',
      backgroundColor: '#10301f',
      textColor: '#ffffff',
      isCloseable: false,
    },
    navbar: {
      title: 'HubSaúde',
      logo: {alt: 'Brasão do Estado de Goiás', src: 'img/brasao-goias.svg', width: 36, height: 48},
      items: [
        {type: 'docSidebar', sidebarId: 'gestor', label: 'Gestores', position: 'left'},
        {type: 'docSidebar', sidebarId: 'integrador', label: 'Desenvolvedores', position: 'left'},
        {type: 'search', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {label: 'Suporte', href: 'mailto:suporte@saude.go.gov.br'},
      ],
      copyright: 'Secretaria de Estado da Saúde de Goiás · HubSaúde',
    },
    prism: {theme: codeTheme, additionalLanguages: ['java', 'csharp', 'powershell', 'bash', 'json']},
    tableOfContents: {minHeadingLevel: 2, maxHeadingLevel: 3},
  },
};
