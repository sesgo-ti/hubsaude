# Portal HubSaúde

O portal usa Docusaurus e substitui as páginas HTML de `site/`. O resultado do
build é estático e publicado em <https://sesgo-ti.github.io/hubsaude/>. Este
diretório contém o portal, não a implementação dos SDKs nem dos serviços HubSaúde.
Os exemplos são documentação: não executam SDKs nem acessam serviços reais.

## Desenvolvimento

Use **Node.js 22 LTS** e npm. Execute os comandos a partir de `website/`:

```bash
npm ci
npm start
```

`npm ci` instala as versões registradas em `package-lock.json`; mantenha esse
lockfile versionado ao atualizar dependências. `npm start` inicia o servidor de
desenvolvimento com recarga automática.

Para validar as alterações:

```bash
npx playwright install --with-deps chromium
npm run check
```

Instale o Chromium na primeira execução ou quando sua versão mudar. `check` gera
um build limpo e executa os testes. Use `npm run serve` para visualizar o resultado.

Instale também as dependências de desenvolvimento no ambiente de build (`npm ci`,
sem `--omit=dev`): o patch da busca e os testes fazem parte da geração validada.
Produção recebe apenas `build/`, sem precisar instalar pacotes ou executar Node.

## Estrutura

A organização segue o padrão Docusaurus, inspirado no
[site oficial do Docusaurus](https://github.com/facebook/docusaurus/tree/main/website)
e no [site do React Native](https://github.com/facebook/react-native-website/tree/main/website),
sem reproduzir a complexidade desses projetos:

| Caminho | Responsabilidade |
|---|---|
| `docusaurus.config.*` | URL/base do portal, tema, navegação, Prism e busca |
| `sidebars.*` | organização da documentação |
| `docs/` | conteúdo técnico em Markdown/MDX |
| `src/pages/` | páginas React, como a página inicial |
| `src/css/` | ajustes visuais sobre o tema oficial |
| `static/` | logos, imagens e outros arquivos servidos sem transformação |
| `package.json` / `package-lock.json` | scripts e dependências npm reproduzíveis |
| `tests/` | sintaxe, páginas descobertas automaticamente, links e interações essenciais |
| `i18n/pt-BR/code.json` | traduções da interface de busca |
| `patches/` | correções pontuais e reproduzíveis do plugin de busca |

O escopo segue Pareto: priorizar conteúdo, navegação e componentes oficiais do
Docusaurus, com pouca customização. Os logos e a identidade verde clara são
preservados. Não há swizzling, plugins sofisticados, CMS, blog, modo escuro
ou versionamento da documentação.

## Encontrar informações

A home tem apenas duas entradas no corpo: **Credenciar minha instituição** e
**Integrar meu sistema**. Não apresenta diagramas, catálogos, a jornada detalhada
nem chamadas repetidas para começar. Navbar: gestores, desenvolvedores e uma
única busca; a marca retorna ao início. O rodapé contém suporte e identificação.

**Desenvolvedores** leva sempre a `/fluxos/`. A paginação nativa define o percurso
de leitura: introdução, preparação, autenticação e envio/conferência. O último
documento não encaminha automaticamente para um SDK. Não é um wizard nem uma
promessa de tutorial executável completo: os exemplos continuam exigindo os
materiais e a configuração do ambiente descritos na documentação.

SDKs e ferramentas ficam em **Consultar referência**, recolhido inicialmente.
Os catálogos não repetem uma lista de atalhos antes da mesma lista de produtos.
A visão de integração antes exposta na home está em `/fluxos/visao-geral/` e o
contexto institucional em `/sobre/`, sem paginação para uma etapa técnica.

**Gestores** leva ao guia único `/gestor/`, com níveis de acesso, solicitação,
certificado, contato, aprovação e acompanhamento; as capturas opcionais vêm ao final.
Não há uma lista manual de atalhos repetindo o sumário. O sumário à direita
(ou "Nesta página" no celular) identifica as seções do documento atual; a barra
lateral organiza as tarefas da trilha. Não são dois menus globais concorrentes.

Essas escolhas seguem a [organização de sidebars do Docusaurus](https://docusaurus.io/docs/sidebar)
e a distinção entre leitura guiada e consulta pontual usada na
[introdução do React Native](https://reactnative.dev/docs/getting-started).
Foram aplicadas como arquitetura de informação, sem copiar a complexidade visual
ou os componentes interativos desses sites.

### Busca local

A busca única na navbar usa `@easyops-cn/docusaurus-search-local`, um tema
comunitário MIT, não um componente oficial. A documentação oficial apresenta
[busca local](https://docusaurus.io/docs/search#using-local-search) como alternativa
para índices pequenos. Não há Algolia, conta, backend ou envio de consultas a um
serviço externo. Não foi habilitada integração com IA nem atalhos globais.

O índice em português e inglês é gerado no build e inclui os documentos, seus
títulos e seções. A home institucional não é indexada para não repetir resultados
de introdução; os guias continuam sendo a fonte das respostas. A página
`/search/?q=certificado` permite compartilhar uma consulta. Busca exige JavaScript;
a navegação por links e os guias permanecem disponíveis sem ele.

Para testar a busca, use `npm run build` e `npm run serve`, não apenas `npm start`.
Reconstrua o índice ao alterar conteúdo. O nome do JSON tem hash do conteúdo, das
opções de indexação, da configuração/sidebar e do código de indexação/worker para
evitar reutilizar um índice desatualizado. Se o sidebar passar a importar outros
arquivos, revise a invalidação: dependências transitivas não são percorridas.

O plugin 0.55.3 recebe correções direcionadas, registradas em
`patches/@easyops-cn+docusaurus-search-local+0.55.3.patch`: normalização de acentos
antes do stemming no índice e no worker, rótulos acessíveis traduzidos e landmark
`main` na página de resultados, invalidação do índice e recuperação de falhas.
A interface oferece nova tentativa após erro de carregamento e ignora respostas
atrasadas de consultas anteriores. Limpar o campo e voltar/avançar no navegador
mantêm a consulta e os resultados sincronizados.
Os textos originais e suas posições de destaque
não são normalizados, apenas os tokens de busca. `npm ci` aplica o patch com
`patch-package --error-on-fail`; não use instalação com scripts desativados para
gerar o portal. Não existe fork integral de SearchBar/SearchPage nem mutação de DOM.
Ao atualizar o plugin, revise/remova o patch conforme as correções upstream,
execute `npx docusaurus clear`, reconstrua e teste acentos, teclado e leitores de tela.

### Fonte dos gestores

O guia e as nove capturas foram incorporados de `origin/feat/portal-integrador`,
commit `c36e65f18feabd52f0489dffed7332afe7bbfaee`, sem merge da estrutura HTML antiga.
O histórico Git mantém a conferência da migração; atualizações posteriores passam
por revisão técnica e editorial, sem cópias congeladas nos testes.

As duas afirmações divergentes da antiga home não foram transferidas para os novos
documentos: o guia atualizado é a fonte para atribuição do nível pela SES-GO e
apresentação do certificado pela instituição. As regras técnicas e os exemplos
existentes foram preservados. O link de contato agora diz explicitamente
"Enviar e-mail para solicitar credenciamento", sem sugerir que abre o Ganesha.

O carrossel foi substituído por nove `Details` nativos, abertos individualmente,
inclusive sem JavaScript. As imagens da origem contêm mascaramentos e iniciais
de avatar; a preservação dos arquivos não certifica anonimização. O responsável
pelo conteúdo deve confirmar a adequação das capturas antes de publicação externa.

## Autoria

1. Crie ou edite o documento na pasta correspondente em `docs/`.
2. Adicione ao `sidebars.js` se precisar aparecer no menu. A home permanece com
   duas entradas, não um catálogo de todos os documentos.
3. Confira o conteúdo com `npm start` e valide com `npm run check`.
4. Revise o diff e o resultado visual antes de pedir aprovação para publicação.

Novas páginas são verificadas automaticamente; só altere testes ao mudar um comportamento.

Escreva a documentação em Markdown; use MDX quando precisar de componentes como
`Tabs` e `TabItem`, importados de `@theme/Tabs` e `@theme/TabItem`. Prefira os
componentes oficiais para abas, blocos de código e avisos.

Cada conjunto de abas independente deve ter um **`groupId` único no portal**.
Reutilizar o mesmo identificador sincroniza seleções entre conjuntos e páginas,
o que não é o comportamento desejado aqui. Exemplo:

```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="cli-instalacao-so" defaultValue="linux">
  <TabItem value="linux" label="Linux/macOS">
    Instruções para Linux e macOS.
  </TabItem>
  <TabItem value="windows" label="Windows">
    Instruções para Windows.
  </TabItem>
</Tabs>
```

Identifique a linguagem dos blocos de código. As gramáticas adicionais do Prism
incluem `java`, `csharp` e `powershell` em `prism.additionalLanguages` na
configuração do Docusaurus. Use esses nomes nas cercas de código correspondentes.
Não acrescente execução de código ou integração com SDKs aos exemplos.

Use links relativos para arquivos `.mdx` dentro da documentação. Escreva títulos
comuns, como `## Comandos`: o Docusaurus gera o ID `comandos` e a entrada no sumário.
Um link direto usa `cli.mdx#comandos`. Ao renomear um título, atualize os links
internos que apontam para ele e rode o build, que rejeita âncoras inexistentes.

Não adicione aliases vazios nem IDs de títulos da versão HTML anterior. A sintaxe
`{#id}` é legada e causa erros em analisadores MDX de IDEs. Se surgir uma necessidade
concreta de ID explícito, use a sintaxe MDX válida `## Título {/* #id */}`, sem
duplicar a âncora com um elemento `Link`. No conteúdo atual, IDs automáticos bastam.
Os testes também compilam cada documento como MDX, além de verificar o build.

Inter e JetBrains Mono são distribuídas localmente por pacotes Fontsource: o portal
não depende do Google Fonts nem envia requisições para serviços externos ao abrir
uma página. O brasão SVG foi extraído sem redesenho do cabeçalho anterior; o favicon
e o ícone para dispositivos Apple também foram preservados.

## Endereços

Use as rotas atuais com barra final, como `/hubsaude/ferramentas/cli/`, e as âncoras
geradas pelos títulos. Como a documentação anterior ainda não era utilizada,
não mantemos redirects `.html`, aliases de seções ou normalização cliente de
`index.html`. Os arquivos `index.html` do build são apenas a saída do gerador;
os links do portal usam as rotas canônicas de diretório.

## Simplificações

| Recurso anterior | Comportamento no Docusaurus |
|---|---|
| Terminais com efeito de digitação | esquema estático na referência de integração e transcrição ilustrativa na CLI |
| Canvas animado e efeitos de glow | removidos |
| Detecção automática do sistema operacional | seleção manual em `Tabs` |
| Seleção das abas no `localStorage` antigo | a preferência anterior é reiniciada uma vez na migração; as abas continuam independentes por `groupId` |
| Badges estáticos que pareciam indicar disponibilidade | removidos; nunca foram monitoramento em tempo real |
| Menu móvel personalizado | navbar móvel nativa do Docusaurus |
| Atalhos Home/End nas abas personalizadas | não adicionados ao componente oficial; navegação por setas, Enter/Espaço e Tab |
| Carrossel de telas do Ganesha | nove painéis expansíveis `Details`, sem navegação animada |

Os blocos estáticos agora também têm cópia e realce de sintaxe. A escolha de SO
passou a ser persistida, sem detecção automática. Não houve migração das preferências
armazenadas pelo componente antigo. Abas e cópia continuam exigindo JavaScript;
com ele desativado, o conteúdo principal e a aba inicial permanecem legíveis.

## Validação

`npm run check` verifica sintaxe, páginas, links internos e interações essenciais
em desktop/mobile. Capturas ficam em `test-results/`. A revisão humana continua
necessária: os testes não executam SDKs, verificam sites externos nem certificam acessibilidade.

## Dependências

Docusaurus é MIT; fontes e dependências conservam suas próprias licenças. O uso
da ferramenta não altera os direitos do brasão ou do conteúdo institucional.

Execute `npm audit` ao revisar dependências e avalie o relatório atual: contagens
e advisories mudam ao longo do tempo. Não use `--force` ou overrides apenas para
ocultar alertas; uma alteração incompatível precisa de revisão e testes. Um build
aprovado não constitui certificação de segurança.

O artefato publicado é estático: não hospeda `webpack-dev-server`, Express nem os
parsers de imagens usados no build. Isso limita a exposição em produção, mas não
elimina riscos no desenvolvimento e no CI. Não exponha o servidor de desenvolvimento
na rede, revise arquivos/imagens e dependências enviados por contribuidores e não
execute código de PRs com segredos ou permissões de publicação. Acompanhe as
correções upstream e repita `npm audit`, build e testes ao atualizar o lockfile.
Os responsáveis devem avaliar esses alertas antes da publicação institucional.

## Publicação

O workflow [pages.yml](../.github/workflows/pages.yml) executa `npm ci`, instalação
do Chromium e `npm run check` (build e testes). Pull requests que alteram `website/` ou o
workflow são validados, inclusive quando a base é uma branch de funcionalidade,
mas não publicam no Pages.

Pushes na `main` nesses caminhos publicam `website/build/` somente depois de
build e testes aprovados. A execução manual também pode validar outras branches,
mas só publica quando a referência é `main`. O job de build tem apenas leitura
do conteúdo; o job de deploy depende dele e recebe apenas as permissões de Pages
e de identidade necessárias à publicação. O build tem limite de 15 minutos para
acomodar a instalação do navegador e das dependências; o deploy mantém 10 minutos.

Capturas e traces ficam como artefatos do job por sete dias, inclusive quando os
testes falham. Não entram no artefato do Pages. A antiga configuração Lychee foi
retirada porque não era executada; build e testes verificam os links internos.
Disponibilidade de links externos exige uma checagem separada.

### Antes de publicar

- Revisar os alertas de dependências e a aprovação editorial das capturas do Ganesha.
- Confirmar que Pages está configurado para GitHub Actions e que o ambiente
  `github-pages` tem as regras de aprovação desejadas. O workflow não configura
  proteção de branch nem aprovadores automaticamente.
- Executar instalação limpa, build e testes antes de autorizar a integração à `main`.
- Manter como referência o commit/artefato da última publicação aprovada. Para
  rollback, republicar esse artefato ou reverter a mudança em um novo commit
  revisado; não alterar instaladores nem manifesto assinado para corrigir o portal.

Os testes locais não substituem uma execução real do workflow no GitHub nem uma
auditoria de acessibilidade. Esta branch não é publicada automaticamente.
