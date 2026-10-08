# HubSaúde — distribuição e página do integrador

Canal de distribuição das ferramentas HubSaúde e portal de documentação
para gestores e integradores, construído com Docusaurus.

> A página encontra-se disponível em **<https://sesgo-ti.github.io/hubsaude/>**.


## Instalação do HubSaúde CLI

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/sesgo-ti/hubsaude/main/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/sesgo-ti/hubsaude/main/install.ps1 | iex
```

Os scripts selecionam a maior versão do CLI entre as releases consultadas
neste repositório, verificam o `checksums.txt` (SHA-256) e instalam sem exigir
privilégios de administrador.


### Variáveis de ambiente

| Variável | Efeito | Padrão |
|---|---|---|
| `HUBSAUDE_CLI_REPO` | repositório `owner/repo` de onde baixar | `sesgo-ti/hubsaude` |
| `HUBSAUDE_CLI_VERSION` | versão específica (ex.: `0.2.2`) | mais recente |
| `HUBSAUDE_CLI_BIN_DIR` | diretório de instalação | Linux/macOS: `~/.local/bin`; Windows: `%LOCALAPPDATA%\Programs\hubsaude` |

## Canal institucional de distribuição

Este repositório é o canal oficial dos artefatos públicos do HubSaúde:

| Artefato | Release atual |
|---|---|
| HubSaúde CLI | [`0.3.16`](https://github.com/sesgo-ti/hubsaude/releases/tag/hubsaude-cli-v0.3.16) |
| Validador UI | [`0.1.43`](https://github.com/sesgo-ti/hubsaude/releases/tag/hubsaude-validador-ui-v0.1.43) |
| Simulador | [`0.1.40`](https://github.com/sesgo-ti/hubsaude/releases/tag/hubsaude-simulador-v0.1.40) |
| FHIR Server | [`8.10.0`](https://github.com/sesgo-ti/hubsaude/releases/tag/hubsaude-fhir-server-v8.10.0) |

Instaladores, manifesto e novas releases usam exclusivamente
`sesgo-ti/hubsaude`. O canal anterior contém apenas a release-ponte
`hubsaude-cli-v0.3.16`, necessária para que instalações do CLI até `0.3.15`
alcancem esta versão; ele não recebe versões posteriores.

## Manifesto de distribuição (`release.json`)

`release.json` informa ao **HubSaúde CLI instalado no computador do integrador**
quais versões do Validador, Simulador e servidor FHIR baixar e onde encontrá-las.
Essas ferramentas vêm das releases deste repositório. O ambiente Java (JRE)
necessário para executá-las é baixado de um fornecedor externo, a Adoptium.

**Quem usa `release.json.sig` é o CLI:** ele baixa a assinatura junto do manifesto
e a verifica com uma chave pública institucional embutida no executável, antes
de interpretar o JSON. Isso permite conferir que o manifesto foi assinado por
uma chave confiável e não foi alterado. Depois, os checksums do manifesto permitem
conferir os componentes baixados. A assinatura não é uma chave privada.

O CLI consulta o par publicado na branch `main` deste repositório e mantém cache
verificado por 24 horas. Se a consulta remota falhar, pode usar um cache antigo
com assinatura válida; portanto, uma publicação pode não aparecer imediatamente
para todos os usuários. Manifestos sem assinatura válida não são aceitos pelo
resolver atual do CLI.

GitHub Pages e Docusaurus não usam esses arquivos. Os instaladores `install.sh`
e `install.ps1` verificam o próprio CLI por `checksums.txt`, não por essa assinatura.

A fonte canônica atual do manifesto e o pipeline de assinatura estão em
[`sesgo-ti/hubsaude-cli`](https://github.com/sesgo-ti/hubsaude-cli), na branch
`develop`. Este repositório recebe a cópia assinada para distribuição. Não edite
essa cópia isoladamente nem altere sua formatação depois da assinatura.

Verificação da assinatura com a chave pública institucional
(a mesma pinada no binário do CLI —
fingerprint SHA-256 `e7f3f103a13382e4baed3931a4315cf10319d68c060f967763f8f7fa5d1bf4a4`):

```bash
printf '302a300506032b6570032100' | xxd -r -p > pub.der
echo 'iAquSfKHKanLjmlFxeHfbVeAXcq8vmrIzk2IkcNkLsM=' | base64 -d >> pub.der
openssl pkey -pubin -inform DER -in pub.der -out pub.pem
base64 -d release.json.sig > release.json.sig.bin
openssl pkeyutl -verify -pubin -inkey pub.pem -rawin \
  -in release.json -sigfile release.json.sig.bin
```

### Publicar uma nova versão de ferramenta

Para atualizar Validador, Simulador ou servidor FHIR já suportados:

1. Publique primeiro o artefato da ferramenta por seu pipeline, como asset de
   uma release em `sesgo-ti/hubsaude`. Não substitua silenciosamente o arquivo de
   uma versão já publicada; use uma nova versão.
2. Em `sesgo-ti/hubsaude-cli`, atualize `url`, `version`, `tag` e `sha256` do
   componente na fonte canônica de `release.json`. O script
   `scripts/sync-release-manifest.sh` auxilia a atualização e a conferência.
3. Revise e integre a alteração à `develop` desse repositório.
4. Com autorização de release, crie uma nova tag `manifesto-vX.Y.Z` no commit
   integrado e publique a tag. A versão do manifesto é independente da versão
   da ferramenta e da versão do CLI.
5. Confirme o sucesso do workflow `hubsaude-manifesto-release.yml`: ele assina,
   reverifica e publica **os dois arquivos juntos** em `sesgo-ti/hubsaude@main`.
6. Verifique o par distribuído e teste a atualização pelo CLI, considerando o
   cache do manifesto. Atualize também a documentação das versões e mudanças.

Exemplo de preparação, executado no repositório **hubsaude-cli**, substituindo
`X.Y.Z` pela versão publicada:

```bash
./scripts/sync-release-manifest.sh --only validador --validador X.Y.Z
./scripts/sync-release-manifest.sh --verify --local
```

O script não assina nem publica. A publicação é realizada pelo workflow disparado
pela tag do manifesto. Publicar apenas o JAR/WAR ou editar apenas o JSON não
conclui o processo.

### Qual chave assina

| Item | Configuração do processo atual |
|---|---|
| Algoritmo | **Ed25519** |
| Conteúdo assinado | Bytes exatos de `release.json`, sem normalização |
| Formato da assinatura publicada | 64 bytes codificados em Base64, no arquivo `release.json.sig` |
| Chave privada | Chave institucional de distribuição, no formato PKCS#8 PEM |
| Secret usado pelo job de assinatura | `HUBSAUDE_MANIFEST_SIGNING_KEY` |
| Environment do job de assinatura | `manifesto-signing`, no repositório `hubsaude-cli` |
| Publicação dos arquivos | Job separado, environment `hubsaude-distribution`, com `HUBSAUDE_DIST_TOKEN` |

O workflow deriva a chave pública da privada e exige correspondência com o
conjunto aprovado (`APPROVED_PUB_KEYRING_B64`), alinhado às públicas confiadas
pelo CLI. A assinatura usa `openssl pkeyutl -sign -rawin`; a chave Ed25519
determina o algoritmo. **SHA-256 é usado nos checksums dos artefatos, não como
substituto da assinatura Ed25519 do manifesto.**

Não é a chave SSH pessoal do mantenedor, nem a chave privada do certificado
ICP-Brasil de uma instituição integradora. Também não se gera uma chave nova
a cada versão: utiliza-se a chave institucional sob custódia autorizada.
O mantenedor com permissão para disparar a release não precisa baixar ou conhecer
o valor dessa chave. Nunca publique a privada no Git, em exemplos ou nos logs.

Se o secret ainda não estiver provisionado, o responsável pela custódia deve
configurá-lo pelo processo autorizado. Não improvise outra chave: os CLIs
existentes rejeitariam sua assinatura. Rotação exige distribuir previamente uma
versão do CLI que confie na nova chave pública e coordenar a mudança do assinante.

### Adicionar uma ferramenta nova

Adicionar um novo nome ao JSON **não cria suporte automaticamente no CLI**.
O catálogo atual reconhece explicitamente Validador, Simulador e servidor FHIR.
Uma ferramenta adicional exige implementar seu esquema/descritor, comandos e
provisionamento no CLI, ampliar a sincronização do manifesto e testar o fluxo.
Depois, publique uma versão compatível do CLI, o artefato da ferramenta e o
manifesto assinado pelo processo descrito acima. Documentar uma ferramenta externa
no portal, sem distribuí-la pelo CLI, não exige alterar esse manifesto.

### Referências e limites

- [Resolver do manifesto](https://github.com/sesgo-ti/hubsaude-cli/blob/develop/internal/manifest/manifest.go)
- [Verificação e chaves públicas confiáveis](https://github.com/sesgo-ti/hubsaude-cli/blob/develop/internal/manifest/verify.go)
- [Workflow de assinatura e distribuição](https://github.com/sesgo-ti/hubsaude-cli/blob/develop/.github/workflows/hubsaude-manifesto-release.yml)
- [Instruções do mantenedor do CLI](https://github.com/sesgo-ti/hubsaude-cli/blob/develop/README.md)

Esse procedimento foi conferido no código da branch `develop` do CLI; não prova
que todas as versões antigas instaladas tenham o mesmo comportamento. O README
do CLI ainda registra pendência de provisionamento do secret no novo repositório.
Antes de uma release, confirme a configuração e as aprovações dos environments com
os responsáveis e confira uma execução bem-sucedida. Não foi verificado o valor
de nenhum secret nem executada uma publicação para produzir estas instruções.

## Conteúdo

| Caminho | Descrição |
|---|---|
| [`website/`](website/README.md) | portal Docusaurus publicado no GitHub Pages; arquitetura, desenvolvimento e autoria na documentação do portal |
| `install.sh` / `install.ps1` | instaladores do HubSaúde CLI (default `sesgo-ti/hubsaude`) |
| `release.json` / `release.json.sig` | manifesto de distribuição assinado e sincronizado pelo pipeline |
| `.github/workflows/pages.yml` | deploy do site via GitHub Actions |
