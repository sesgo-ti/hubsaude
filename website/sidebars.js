export default {
  integrador: [
    {type: 'category', label: 'Começar a integração', collapsed: false,
      items: [
        {type: 'doc', id: 'fluxos/index', label: 'Comece aqui'},
        {type: 'doc', id: 'fluxos/preparar', label: '1. Preparar o ambiente'},
        {type: 'doc', id: 'fluxos/autenticacao', label: '2. Autenticar'},
        {type: 'doc', id: 'fluxos/envio-recurso', label: '3. Enviar e conferir'},
      ]},
    {type: 'category', label: 'Consultar referência', collapsed: true,
      items: [
        {type: 'doc', id: 'fluxos/visao-geral', label: 'Visão geral e requisitos'},
        {type: 'category', label: 'SDKs por linguagem',
          link: {type: 'doc', id: 'sdks/index'},
          items: ['python', 'java', 'typescript', 'csharp'].map((language, index) => ({
            type: 'doc', id: `sdks/autenticacao/${language}`, label: ['Python', 'Java', 'TypeScript', 'C#'][index],
          }))},
        {type: 'category', label: 'Ferramentas',
          link: {type: 'doc', id: 'ferramentas/index'},
          items: ['ferramentas/cli', 'ferramentas/validador', 'ferramentas/simulador']},
        'sobre',
      ]},
  ],
  gestor: [
    {type: 'doc', id: 'gestor/index', label: 'Credenciar a instituição'},
    {type: 'ref', id: 'sobre', label: 'Sobre o HubSaúde'},
  ],
};
