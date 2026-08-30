#!/usr/bin/env bash
# Copyright (c) 2026 SES-GO / UFG
# Todos os direitos reservados.

#
# Instalador do hubsaude-cli para Linux e macOS.
#
# Baixa o binário mais recente publicado nas GitHub Releases do repositório
# público de distribuição, verifica o checksum SHA-256 e o instala em um
# diretório do usuário (sem sudo).
#
# Uso rápido:
#   curl -fsSL https://raw.githubusercontent.com/sesgo-ti/hubsaude/main/install.sh | bash
#
# Uso local:
#   ./install.sh [--version <X.Y.Z>] [--bin-dir <DIR>] [--help]
#
# Variáveis de ambiente (todas opcionais):
#   HUBSAUDE_CLI_REPO     repositório owner/repo (padrão: sesgo-ti/hubsaude)
#   HUBSAUDE_CLI_VERSION  versão a instalar (padrão: a mais recente)
#   HUBSAUDE_CLI_BIN_DIR  diretório de instalação (padrão: ~/.local/bin)
#   GITHUB_TOKEN          token opcional, apenas para elevar o rate limit da API
#
set -euo pipefail

REPO="${HUBSAUDE_CLI_REPO:-sesgo-ti/hubsaude}"
TAG_PREFIX="hubsaude-cli-v"
BIN_NAME="hubsaude"
VERSION="${HUBSAUDE_CLI_VERSION:-}"
BIN_DIR="${HUBSAUDE_CLI_BIN_DIR:-}"
GH_API="${GITHUB_API_URL:-https://api.github.com}"
GH_DL="${GITHUB_DOWNLOAD_URL:-https://github.com}"

# ----------------------------------------------------------------------------
# Saída (mensagens vão para stderr; stdout permanece limpo)
# ----------------------------------------------------------------------------
if [[ -t 2 && -z "${NO_COLOR:-}" ]]; then
  C_RED=$'\033[31m'; C_GRN=$'\033[32m'; C_YEL=$'\033[33m'; C_BLD=$'\033[1m'; C_RST=$'\033[0m'
else
  C_RED=''; C_GRN=''; C_YEL=''; C_BLD=''; C_RST=''
fi
info() { printf '%s[i]%s %s\n'  "$C_BLD" "$C_RST" "$*" >&2; }
ok()   { printf '%s[ok]%s %s\n' "$C_GRN" "$C_RST" "$*" >&2; }
warn() { printf '%s[!]%s %s\n'  "$C_YEL" "$C_RST" "$*" >&2; }
err()  { printf '%s[x]%s %s\n'  "$C_RED" "$C_RST" "$*" >&2; }
die()  { err "$@"; exit 1; }

usage() {
  cat >&2 <<EOF
Instalador do hubsaude-cli (Linux/macOS).

USO:
  ./install.sh [opções]
  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash

OPÇÕES:
  --version <X.Y.Z>   Instala uma versão específica (padrão: a mais recente).
  --bin-dir <DIR>     Diretório de instalação (padrão: \$HOME/.local/bin).
  -h, --help          Exibe esta ajuda.

VARIÁVEIS DE AMBIENTE:
  HUBSAUDE_CLI_REPO, HUBSAUDE_CLI_VERSION, HUBSAUDE_CLI_BIN_DIR, GITHUB_TOKEN
EOF
}

# ----------------------------------------------------------------------------
# Argumentos
# ----------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)   VERSION="${2:?--version requer um valor}"; shift 2 ;;
    --version=*) VERSION="${1#*=}"; shift ;;
    --bin-dir)   BIN_DIR="${2:?--bin-dir requer um valor}"; shift 2 ;;
    --bin-dir=*) BIN_DIR="${1#*=}"; shift ;;
    -h|--help)   usage; exit 0 ;;
    *) die "argumento desconhecido: $1 (use --help)" ;;
  esac
done

# ----------------------------------------------------------------------------
# Dependências
# ----------------------------------------------------------------------------
command -v curl  >/dev/null 2>&1 || die "comando requerido ausente: curl"
command -v uname >/dev/null 2>&1 || die "comando requerido ausente: uname"
if command -v sha256sum >/dev/null 2>&1; then
  sha256() { sha256sum "$1" | awk '{print $1}'; }
elif command -v shasum >/dev/null 2>&1; then
  sha256() { shasum -a 256 "$1" | awk '{print $1}'; }
else
  die "necessário 'sha256sum' (Linux) ou 'shasum' (macOS) para verificar a integridade"
fi

# ----------------------------------------------------------------------------
# Detecção de plataforma
# ----------------------------------------------------------------------------
os_raw="$(uname -s)"
case "$os_raw" in
  Linux)  os="linux" ;;
  Darwin) os="darwin" ;;
  *) die "sistema operacional não suportado: ${os_raw} (no Windows use install.ps1)" ;;
esac
arch_raw="$(uname -m)"
case "$arch_raw" in
  x86_64|amd64)  arch="amd64" ;;
  aarch64|arm64) arch="arm64" ;;
  *) die "arquitetura não suportada: ${arch_raw}" ;;
esac
asset="${BIN_NAME}-${os}-${arch}"
info "Plataforma detectada: ${os}/${arch} (binário: ${asset})"

# Cabeçalho de autenticação opcional (apenas para rate limit da API).
# Em Bash 3 (macOS runner), expandir array vazia com `set -u` aborta o script;
# o helper abaixo evita essa expansão quando não há token.
curl_auth() {
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    curl -H "Authorization: Bearer ${GITHUB_TOKEN}" "$@"
  else
    curl "$@"
  fi
}

# ----------------------------------------------------------------------------
# Resolução da versão / tag
# ----------------------------------------------------------------------------
if [[ -n "$VERSION" ]]; then
  case "$VERSION" in
    ${TAG_PREFIX}*) tag="$VERSION" ;;
    v*)             tag="${TAG_PREFIX}${VERSION#v}" ;;
    *)              tag="${TAG_PREFIX}${VERSION}" ;;
  esac
  info "Versão fixada: ${tag}"
else
  info "Descobrindo a versão mais recente do CLI em ${REPO}..."
  # O repositório de distribuição hospeda releases de vários componentes;
  # filtramos estritamente pelo prefixo do CLI e escolhemos a MAIOR versão.
  # Não confie na ordem da listagem: a API ordena por created_at (data do
  # commit alvo da tag, não a da publicação) e releases espelhadas que
  # compartilham o commit alvo empatam e saem fora de ordem (#1487).
  # Ordenação numérica por MAJOR.MINOR.PATCH (portável, sem GNU sort -V).
  version="$(curl_auth -fsSL "${GH_API}/repos/${REPO}/releases?per_page=100" \
    | grep -o "\"tag_name\"[[:space:]]*:[[:space:]]*\"${TAG_PREFIX}[^\"]*\"" \
    | sed -E "s/.*\"${TAG_PREFIX}([^\"]*)\".*/\1/" \
    | sort -t . -k1,1n -k2,2n -k3,3n \
    | tail -n1 || true)"
  [[ -n "$version" ]] || die "nenhuma release '${TAG_PREFIX}*' encontrada em ${REPO}. Informe --version."
  tag="${TAG_PREFIX}${version}"
fi
version="${tag#"$TAG_PREFIX"}"
ok "Versão alvo: ${version} (tag ${tag})"

# ----------------------------------------------------------------------------
# Download
# ----------------------------------------------------------------------------
[[ -n "$BIN_DIR" ]] || BIN_DIR="${HOME}/.local/bin"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
base="${GH_DL}/${REPO}/releases/download/${tag}"

info "Baixando ${asset}..."
curl_auth -fSL --progress-bar "${base}/${asset}" -o "${tmp}/${asset}" \
  || die "falha ao baixar ${asset} (a release ${tag} contém o binário desta plataforma?)"
info "Baixando checksums.txt..."
curl_auth -fsSL "${base}/checksums.txt" -o "${tmp}/checksums.txt" \
  || die "falha ao baixar checksums.txt da release ${tag}"

# ----------------------------------------------------------------------------
# Verificação de integridade
# ----------------------------------------------------------------------------
info "Verificando integridade (SHA-256)..."
expected="$(awk -v a="$asset" '$2==a {print $1; exit}' "${tmp}/checksums.txt")"
[[ -n "$expected" ]] || die "checksum de ${asset} ausente em checksums.txt"
actual="$(sha256 "${tmp}/${asset}")"
if [[ "$expected" != "$actual" ]]; then
  die "checksum NÃO confere para ${asset}:
       esperado: ${expected}
       obtido:   ${actual}"
fi
ok "Checksum verificado: ${actual}"

# ----------------------------------------------------------------------------
# Instalação
# ----------------------------------------------------------------------------
mkdir -p "$BIN_DIR"
dest="${BIN_DIR}/${BIN_NAME}"
if command -v install >/dev/null 2>&1; then
  install -m 0755 "${tmp}/${asset}" "$dest"
else
  cp "${tmp}/${asset}" "$dest" && chmod 0755 "$dest"
fi
ok "Instalado: ${dest}"

# Aviso de PATH
case ":${PATH}:" in
  *":${BIN_DIR}:"*) : ;;
  *)
    warn "${BIN_DIR} não está no seu PATH. Adicione ao arquivo de inicialização do shell:"
    printf '      export PATH="%s:$PATH"\n' "$BIN_DIR" >&2
    ;;
esac

# Verificação final (não fatal)
if "$dest" version >/dev/null 2>&1 || "$dest" --version >/dev/null 2>&1; then
  ok "hubsaude ${version} instalado com sucesso. Experimente: ${BIN_NAME} --help"
else
  warn "Binário instalado em ${dest}, mas a verificação de execução não retornou sucesso."
fi
