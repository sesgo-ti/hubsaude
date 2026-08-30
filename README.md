# HubSaúde — distribuição e página do integrador

Implementação da página principal do HubSaúde,
dedicada a gestores e, em especial, integradores.

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

Os scripts baixam a release mais recente deste
repositório, verificam o `checksums.txt` (SHA-256) e instalam sem exigir
privilégios de administrador.


### Variáveis de ambiente

| Variável | Efeito | Padrão |
|---|---|---|
| `HUBSAUDE_CLI_REPO` | repositório `owner/repo` de onde baixar | `sesgo-ti/hubsaude` |
| `HUBSAUDE_CLI_VERSION` | versão específica (ex.: `0.2.2`) | mais recente |
| `HUBSAUDE_CLI_BIN_DIR` | diretório de instalação | `~/.local/bin` |

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

`release.json` é sincronizado a partir da fonte canônica no monorepo do
HubSaúde. `release.json.sig` contém a assinatura **Ed25519 destacada**
(64 bytes, base64) sobre os bytes exatos do manifesto. As URLs dos
componentes apontam exclusivamente para as releases deste repositório.

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

## Conteúdo

| Caminho | Descrição |
|---|---|
| `site/index.html` | página estática publicada no GitHub Pages |
| `install.sh` / `install.ps1` | instaladores do HubSaúde CLI (default `sesgo-ti/hubsaude`) |
| `release.json` / `release.json.sig` | manifesto de distribuição assinado e sincronizado pelo pipeline |
| `.github/workflows/pages.yml` | deploy do site via GitHub Actions |
