import {readFile} from 'node:fs/promises';

export const movedSections = JSON.parse(await readFile(new URL('../src/data/home-sections.json', import.meta.url), 'utf8'));

// New pages supplement, never regenerate, the frozen 14-route inventory.
export const newRoutes = [
  {route: 'sobre/', anchors: ['visao-geral', 'vtitle', 'comece', 'ctitle', 'support-title']},
  {route: 'fluxos/preparar/', anchors: ['testes-locais', 'acesso-\u00e0-produ\u00e7\u00e3o']},
  {route: 'fluxos/visao-geral/', anchors: ['term', 'sequence-title', 'jornada', 'jtitle']},
];

export const guidedRoutes = ['fluxos/', 'fluxos/preparar/', 'fluxos/autenticacao/', 'fluxos/envio-recurso/'];
export const approvedContactLabel = 'Enviar e-mail para solicitar credenciamento';
