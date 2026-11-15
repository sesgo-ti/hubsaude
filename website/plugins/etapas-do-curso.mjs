import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';

const atributo = (tag, nome) => tag.match(new RegExp(`\\s${nome}="([^"]*)"`))?.[1];

export async function lerEtapas(pasta) {
  const modulos = {};
  for (const arquivo of (await readdir(pasta)).filter((nome) => nome.endsWith('.mdx')).sort()) {
    const texto = await readFile(join(pasta, arquivo), 'utf8');
    const slug = texto.match(/^slug:\s*(\S+)\s*$/m)?.[1];
    const etapas = [...texto.matchAll(/<Etapa\s[^>]*>/g)].map(([tag]) => ({id: atributo(tag, 'id'), titulo: atributo(tag, 'titulo')}));
    if (slug && etapas.length > 0) modulos[slug] = etapas;
  }
  return modulos;
}

export default function etapasDoCurso(context) {
  const pasta = join(context.siteDir, 'docs', 'curso');
  return {
    name: 'etapas-do-curso',
    getPathsToWatch() {
      return [join(pasta, '*.mdx')];
    },
    async loadContent() {
      return {modulos: await lerEtapas(pasta)};
    },
    async contentLoaded({content, actions}) {
      actions.setGlobalData(content);
    },
  };
}
