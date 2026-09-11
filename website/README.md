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

Para gerar o site e executar os testes de navegador:

```bash
npm run build
npx playwright install --with-deps chromium
npm test
```

O build gera `build/`. Os testes usam Playwright com Chromium; a configuração de
`webServer` inicia o servidor necessário, sem exigir `npm start` em outro terminal.
A instalação do navegador e das dependências de sistema é necessária na primeira
execução e quando a versão do Playwright mudar. Os testes validam o portal, não a
execução dos SDKs ou a disponibilidade de serviços externos.

## Estrutura

A organização segue o padrão Docusaurus, inspirado no
[site oficial do Docusaurus](https://github.com/facebook/docusaurus/tree/main/website)
e no [site do React Native](https://github.com/facebook/react-native-website/tree/main/website),
sem reproduzir a complexidade desses projetos:

| Caminho | Responsabilidade |
|---|---|
| `docusaurus.config.*` | URL/base do portal, tema, navegação, Prism e redirecionamentos |
| `sidebars.*` | organização da documentação |
| `docs/` | conteúdo técnico em Markdown/MDX |
| `src/pages/` | páginas React, como a página inicial |
| `src/normalize-index.js` | normalização dos índices legados antes da hidratação do roteador |
| `src/css/` | ajustes visuais sobre o tema oficial |
| `static/` | logos, imagens e outros arquivos servidos sem transformação |
| `package.json` / `package-lock.json` | scripts e dependências npm reproduzíveis |
| `tests/` | paridade de exemplos, URLs/âncoras e testes de navegador |

O escopo segue Pareto: priorizar conteúdo, navegação e componentes oficiais do
Docusaurus, com pouca customização. Os logos e a identidade verde clara são
preservados. Não há swizzling, plugins sofisticados, busca, CMS, blog, modo escuro
ou versionamento da documentação.

## Autoria

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

Use links relativos para arquivos `.mdx` dentro da documentação. Preserve os IDs
dos títulos com `## Título {#id}`. Âncoras adicionais usam `<Link id="id" />`,
importado de `@docusaurus/Link`, para participar da validação de âncoras do build.
O plugin extrai o H1 como título da página; seu ID legado fica em um `Link`
imediatamente anterior. Páginas React registram âncoras não pertencentes a títulos
com a API oficial `useBrokenLinks`. Não desative os erros de links/âncoras no build.

Inter e JetBrains Mono são distribuídas localmente por pacotes Fontsource: o portal
não depende do Google Fonts nem envia requisições para serviços externos ao abrir
uma página. O brasão SVG foi extraído sem redesenho do cabeçalho anterior; o favicon
e o ícone para dispositivos Apple também foram preservados.

## Compatibilidade

As URLs internas antigas terminadas em `.html` são preservadas por
redirecionamentos do plugin oficial `@docusaurus/plugin-client-redirects` para
as rotas atuais, exceto os caminhos `index.html`, que são arquivos reais do build.
Um módulo cliente normaliza esses índices para o diretório equivalente antes da
hidratação, preservando query string e fragmento e evitando conteúdo duplicado.
As seções também têm páginas de índice reais, com conteúdo e
navegação, em vez de depender somente de categorias da barra lateral.

Os redirecionamentos são executados no cliente e **dependem de JavaScript**;
não são respostas HTTP 301/302 do GitHub Pages. Sem JavaScript, a navegação
automática a partir dessas URLs antigas não é garantida. Em conteúdo novo,
prefira links para as rotas canônicas e preserve a base `/hubsaude/`.

## Simplificações

| Recurso anterior | Comportamento no Docusaurus |
|---|---|
| Terminais com efeito de digitação | esquema estático na home e transcrição ilustrativa na CLI |
| Canvas animado e efeitos de glow | removidos |
| Detecção automática do sistema operacional | seleção manual em `Tabs` |
| Seleção das abas no `localStorage` antigo | a preferência anterior é reiniciada uma vez na migração; as abas continuam independentes por `groupId` |
| Badges estáticos que pareciam indicar disponibilidade | removidos; nunca foram monitoramento em tempo real |
| Menu móvel personalizado | navbar móvel nativa do Docusaurus |
| Atalhos Home/End nas abas personalizadas | não adicionados ao componente oficial; navegação por setas, Enter/Espaço e Tab |

Os blocos estáticos agora também têm cópia e realce de sintaxe. A escolha de SO
passou a ser persistida, sem detecção automática. Não houve migração das preferências
armazenadas pelo componente antigo. Abas e cópia continuam exigindo JavaScript;
com ele desativado, o conteúdo principal e a aba inicial permanecem legíveis.

## Verificação visual

`npm test` verifica o HTML gerado antes de executar o Chromium em 1440 × 1000 e
390 × 844. As capturas completas de home, autenticação, gestor e CLI ficam em
`test-results/`, ignorado pelo Git. Abra os PNGs depois de mudanças visuais; a
ausência de overflow não substitui a inspeção de legibilidade e hierarquia.
Os testes não representam certificação WCAG nem cobertura de Safari/Firefox.

As fixtures congelam os 12 exemplos multilíngues, 27 blocos estáticos e as URLs/IDs
da base anterior. Ao alterar intencionalmente um exemplo, revise a fixture junto
com o conteúdo, com aprovação técnica. Não atualize expectativas apenas para
esconder diferenças. Referência histórica: commit `b14f5d9`.

## Dependências

Docusaurus é MIT; fontes e dependências conservam suas próprias licenças. O uso
da ferramenta não altera os direitos do brasão ou do conteúdo institucional.

Em 11/09/2026, `npm audit` reportou 27 alertas transitivos (19 altos e 8 moderados),
principalmente pelas cadeias de `image-size`, `serialize-javascript`, `qs` e `uuid`.
`npm audit fix` não eliminou esses alertas na resolução compatível utilizada.
Não foram usados `--force`, overrides ou versões incompatíveis para ocultá-los.

O artefato publicado é estático: não hospeda `webpack-dev-server`, Express nem os
parsers de imagens usados no build. Isso limita a exposição em produção, mas não
elimina riscos no desenvolvimento e no CI. Não exponha o servidor de desenvolvimento
na rede, revise arquivos/imagens e dependências enviados por contribuidores e não
execute código de PRs com segredos ou permissões de publicação. Acompanhe as
correções upstream e repita `npm audit`, build e testes ao atualizar o lockfile.
Os responsáveis devem avaliar esses alertas antes da publicação institucional.

## Publicação

O workflow [pages.yml](../.github/workflows/pages.yml) executa `npm ci`, build,
instalação do Chromium e `npm test`. Pull requests que alteram `website/` ou o
workflow são validados, inclusive quando a base é uma branch de funcionalidade,
mas não publicam no Pages.

Pushes na `main` nesses caminhos publicam `website/build/` somente depois de
build e testes aprovados. A execução manual também pode validar outras branches,
mas só publica quando a referência é `main`. O job de build tem apenas leitura
do conteúdo; o job de deploy depende dele e recebe apenas as permissões de Pages
e de identidade necessárias à publicação. O build tem limite de 15 minutos para
acomodar a instalação do navegador e das dependências; o deploy mantém 10 minutos.
