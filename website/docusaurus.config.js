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
        {to: '/', label: 'Início', position: 'left', activeBaseRegex: '^/hubsaude/$'},
        {type: 'docSidebar', sidebarId: 'integrador', label: 'Desenvolvedores', position: 'left'},
        {type: 'docSidebar', sidebarId: 'gestor', label: 'Gestores', position: 'left'},
        {to: '/sdks/', label: 'SDKs', position: 'right'},
        {to: '/ferramentas/', label: 'Ferramentas', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {title: 'Desenvolvedores', items: [
          {label: 'Fluxos de integração', to: '/fluxos/'},
          {label: 'SDKs de autenticação', to: '/sdks/'},
          {label: 'Ferramentas locais', to: '/ferramentas/'},
        ]},
        {title: 'Gestores', items: [
          {label: 'Credenciamento e níveis de acesso', to: '/gestor/'},
          {label: 'Suporte técnico', href: 'mailto:suporte@saude.go.gov.br'},
        ]},
        {title: 'Referências', items: [
          {label: 'Guias de Implementação FHIR', href: 'https://fhir.saude.go.gov.br'},
          {label: 'Repositório e downloads', href: 'https://github.com/sesgo-ti/hubsaude'},
        ]},
      ],
      copyright: 'Secretaria de Estado da Saúde de Goiás · HubSaúde',
    },
    prism: {theme: codeTheme, additionalLanguages: ['java', 'csharp', 'powershell', 'bash', 'json']},
    tableOfContents: {minHeadingLevel: 2, maxHeadingLevel: 3},
  },
};
