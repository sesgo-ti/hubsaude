export default {
  integrador: [
    {type: 'category', label: 'Fluxos de integração', collapsed: false,
      link: {type: 'doc', id: 'fluxos/index'},
      items: ['fluxos/autenticacao', 'fluxos/envio-recurso']},
    {type: 'category', label: 'SDKs de autenticação', collapsed: false,
      link: {type: 'doc', id: 'sdks/index'},
      items: ['sdks/autenticacao/python', 'sdks/autenticacao/java', 'sdks/autenticacao/typescript', 'sdks/autenticacao/csharp']},
    {type: 'category', label: 'Ferramentas locais', collapsed: false,
      link: {type: 'doc', id: 'ferramentas/index'},
      items: ['ferramentas/cli', 'ferramentas/validador', 'ferramentas/simulador']},
    {type: 'link', label: 'Credenciamento da instituição', href: '/gestor/'},
  ],
  gestor: [
    'gestor/index',
    {type: 'link', label: 'Jornada do integrador', href: '/#jornada'},
  ],
};
