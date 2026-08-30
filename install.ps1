# Copyright (c) 2026 SES-GO / UFG
# Todos os direitos reservados.

# ----------------------------------------------------------------------------
# CONTRATO DE CODIFICACAO (#3664) -- NAO REINTRODUZIR ACENTOS NEM BOM.
#
# Este arquivo e publicado para ser executado por
#   irm https://raw.githubusercontent.com/<repo>/main/install.ps1 | iex
#
# O 'irm' devolve o corpo como String e um BOM UTF-8 sobrevive como U+FEFF no
# indice 0; o parser em memoria passa a enxergar conteudo antes do bloco
# 'param' e rejeita [CmdletBinding()] com "Unexpected attribute". O carregador
# de arquivo (-File) trata o BOM e mascara o defeito -- por isso o gate e por
# bytes, nao por execucao.
#
# Invariantes verificados por scripts/install_scripts_test.go e por
# .github/scripts/verifica-encoding-instaladores.sh:
#   1. sem BOM UTF-8 (EF BB BF);
#   2. somente ASCII -- o console do Windows PowerShell 5.1 emite pela codepage
#      OEM, entao acentos viram mojibake em runtime mesmo sem BOM (#217);
#   3. fim de linha LF.
# ----------------------------------------------------------------------------

<#
.SYNOPSIS
  Instalador do hubsaude-cli para Windows.

.DESCRIPTION
  Baixa o binario mais recente publicado nas GitHub Releases do repositorio
  publico de distribuicao, verifica o checksum SHA-256 e o instala em um
  diretorio do usuario, adicionando-o ao PATH (escopo de usuario).

  Uso rapido (PowerShell):
    irm https://raw.githubusercontent.com/sesgo-ti/hubsaude/main/install.ps1 | iex

  Uso local:
    .\install.ps1 [-Version <X.Y.Z>] [-BinDir <DIR>] [-Help]

.PARAMETER Version
  Versao a instalar (padrao: a mais recente). Aceita "0.2.2", "v0.2.2" ou
  "hubsaude-cli-v0.2.2".

.PARAMETER BinDir
  Diretorio de instalacao (padrao: %LOCALAPPDATA%\Programs\hubsaude).

.NOTES
  Variaveis de ambiente opcionais: HUBSAUDE_CLI_REPO, HUBSAUDE_CLI_VERSION,
  HUBSAUDE_CLI_BIN_DIR, GITHUB_TOKEN (apenas para elevar o rate limit da API).
#>
#requires -version 5.1
[CmdletBinding()]
param(
  [string]$Version = $env:HUBSAUDE_CLI_VERSION,
  [Alias('bin-dir')]
  [string]$BinDir  = $env:HUBSAUDE_CLI_BIN_DIR,
  [switch]$Help
)

# ----------------------------------------------------------------------------
# Corpo do instalador.
#
# Fica encapsulado numa funcao porque, sob 'irm ... | iex', o conteudo e
# avaliado no escopo do chamador: preferencias, Set-StrictMode e auxiliares de
# nome generico (Die, Write-Info, Write-Ok, Write-Warn) vazariam para a sessao
# interativa e passariam a afetar comandos posteriores do usuario. Dentro da
# funcao, todos morrem com ela.
# ----------------------------------------------------------------------------
function Invoke-HubsaudeCliInstall {
  [CmdletBinding()]
  param(
    [string]$Version,
    [string]$BinDir,
    [switch]$Help
  )
  # Preferencias e strict mode ficam confinados a ESTA funcao. Sob 'irm | iex' o
  # conteudo e avaliado no escopo do chamador: defini-los no topo vazaria
  # Set-StrictMode e as preferencias para a sessao interativa, quebrando
  # comandos normais do usuario depois da instalacao.
  $ErrorActionPreference = 'Stop'
  Set-StrictMode -Version Latest
  $ProgressPreference = 'SilentlyContinue'  # acelera Invoke-WebRequest

  # TLS 1.2 para Windows PowerShell 5.1 (Core ja usa padroes modernos)
  try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

  $Repo      = if ($env:HUBSAUDE_CLI_REPO)     { $env:HUBSAUDE_CLI_REPO }     else { 'sesgo-ti/hubsaude' }
  $ApiBase   = if ($env:GITHUB_API_URL)        { $env:GITHUB_API_URL }        else { 'https://api.github.com' }
  $DlBase    = if ($env:GITHUB_DOWNLOAD_URL)   { $env:GITHUB_DOWNLOAD_URL }   else { 'https://github.com' }
  $TagPrefix = 'hubsaude-cli-v'
  $BinName   = 'hubsaude.exe'

  function Write-Info($m) { [Console]::Error.WriteLine("[i] $m") }
  function Write-Ok($m)   { [Console]::Error.WriteLine("[ok] $m") }
  function Write-Warn($m) { [Console]::Error.WriteLine("[!] $m") }
  # Die lanca em vez de chamar 'exit': sob 'irm | iex' um 'exit' encerraria o
  # terminal do usuario antes que ele lesse o erro. O rodape imprime a mensagem
  # e converte a excecao em 'exit 1' quando ha arquivo (-File), preservando o
  # contrato de exit code do caso S0-04.
  function Die($m)        { throw $m }

  if ($Help) {
    @"
Instalador do hubsaude-cli (Windows).

USO:
  .\install.ps1 [-Version <X.Y.Z>] [-BinDir <DIR>] [-Help]
  irm https://raw.githubusercontent.com/$Repo/main/install.ps1 | iex

PARAMETROS:
  -Version <X.Y.Z>   Instala uma versao especifica (padrao: a mais recente).
  -BinDir  <DIR>     Diretorio de instalacao (padrao: %LOCALAPPDATA%\Programs\hubsaude).
  -Help              Exibe esta ajuda.

VARIAVEIS DE AMBIENTE:
  HUBSAUDE_CLI_REPO, HUBSAUDE_CLI_VERSION, HUBSAUDE_CLI_BIN_DIR, GITHUB_TOKEN
"@ | Write-Host
    return
  }

  # ----------------------------------------------------------------------------
  # Deteccao de arquitetura
  # ----------------------------------------------------------------------------
  $archRaw = $env:PROCESSOR_ARCHITECTURE
  switch ($archRaw) {
    'AMD64' { $arch = 'amd64' }
    'ARM64' { $arch = 'arm64' }
    'x86'   { Die 'Windows 32-bit (x86) nao e suportado.' }
    default { Die "arquitetura nao suportada: $archRaw" }
  }
  $asset = "hubsaude-windows-$arch.exe"
  Write-Info "Plataforma detectada: windows/$arch (binario: $asset)"

  # Cabecalhos HTTP (autenticacao opcional, apenas para rate limit)
  $headers = @{ 'User-Agent' = 'hubsaude-cli-installer' }
  if ($env:GITHUB_TOKEN) { $headers['Authorization'] = "Bearer $($env:GITHUB_TOKEN)" }

  # ----------------------------------------------------------------------------
  # Resolucao da versao / tag
  # ----------------------------------------------------------------------------
  if ($Version) {
    if     ($Version.StartsWith($TagPrefix)) { $tag = $Version }
    elseif ($Version.StartsWith('v'))        { $tag = "$TagPrefix$($Version.Substring(1))" }
    else                                     { $tag = "$TagPrefix$Version" }
    Write-Info "Versao fixada: $tag"
  }
  else {
    Write-Info "Descobrindo a versao mais recente do CLI em $Repo..."
    # O repositorio de distribuicao hospeda releases de varios componentes;
    # filtramos estritamente pelo prefixo do CLI e escolhemos a MAIOR versao.
    # Nao confie na ordem da listagem: a API ordena por created_at (data do
    # commit alvo da tag) e releases espelhadas empatam e saem fora de
    # ordem (#1487). Sufixo nao parseavel ordena como 0.0.0.
    $releases = Invoke-RestMethod -Headers $headers -Uri "$ApiBase/repos/$Repo/releases?per_page=100"
    $match = $releases |
      Where-Object { $_.tag_name -like "$TagPrefix*" } |
      Sort-Object -Descending {
        try { [version]$_.tag_name.Substring($TagPrefix.Length) } catch { [version]'0.0.0' }
      } |
      Select-Object -First 1
    if (-not $match) { Die "nenhuma release '$TagPrefix*' encontrada em $Repo. Informe -Version." }
    $tag = $match.tag_name
  }
  $resolvedVersion = $tag.Substring($TagPrefix.Length)
  Write-Ok "Versao alvo: $resolvedVersion (tag $tag)"

  # ----------------------------------------------------------------------------
  # Download
  # ----------------------------------------------------------------------------
  if (-not $BinDir) { $BinDir = Join-Path $env:LOCALAPPDATA 'Programs\hubsaude' }
  $base = "$DlBase/$Repo/releases/download/$tag"
  $tmp  = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null

  try {
    Write-Info "Baixando $asset..."
    Invoke-WebRequest -Headers $headers -Uri "$base/$asset" -OutFile (Join-Path $tmp $asset)
    Write-Info "Baixando checksums.txt..."
    Invoke-WebRequest -Headers $headers -Uri "$base/checksums.txt" -OutFile (Join-Path $tmp 'checksums.txt')

    # --------------------------------------------------------------------------
    # Verificacao de integridade
    # --------------------------------------------------------------------------
    Write-Info "Verificando integridade (SHA-256)..."
    # Formato de cada linha: "<sha256><2 espacos>[*]<arquivo>" (modo texto/binario do sha256sum).
    $expected = $null
    foreach ($l in Get-Content (Join-Path $tmp 'checksums.txt')) {
      if ($l -match '^([0-9a-fA-F]{64})\s+\*?(.+)$' -and $matches[2].Trim() -eq $asset) {
        $expected = $matches[1].ToLower(); break
      }
    }
    if (-not $expected) { Die "checksum de $asset ausente em checksums.txt" }
    $actual = (Get-FileHash -Algorithm SHA256 -Path (Join-Path $tmp $asset)).Hash.ToLower()
    if ($expected -ne $actual) {
      Die "checksum NAO confere para ${asset}:`n       esperado: $expected`n       obtido:   $actual"
    }
    Write-Ok "Checksum verificado: $actual"

    # --------------------------------------------------------------------------
    # Instalacao
    # --------------------------------------------------------------------------
    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
    $dest = Join-Path $BinDir $BinName
    Copy-Item -Force -Path (Join-Path $tmp $asset) -Destination $dest
    Write-Ok "Instalado: $dest"
  }
  finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }

  # ----------------------------------------------------------------------------
  # PATH (escopo de usuario, persistente)
  # ----------------------------------------------------------------------------
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not $userPath) { $userPath = '' }
  if (($userPath -split ';') -notcontains $BinDir) {
    $newPath = ($userPath.TrimEnd(';') + ';' + $BinDir).TrimStart(';')
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Warn "$BinDir foi adicionado ao PATH do usuario. Reabra o terminal para usar 'hubsaude'."
  }

  # ----------------------------------------------------------------------------
  # Verificacao final (nao fatal)
  # ----------------------------------------------------------------------------
  # Observacao: a invocacao de um .exe NAO lanca excecao em exit-code != 0
  # (apenas falhas de execucao, ex.: arquivo ausente). Por isso inspecionamos
  # $LASTEXITCODE explicitamente, alem do try/catch.
  try {
    & (Join-Path $BinDir $BinName) version *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "hubsaude $resolvedVersion instalado com sucesso. Experimente: hubsaude --help"
    } else {
      Write-Warn "Binario instalado em $dest, mas 'hubsaude version' retornou codigo $LASTEXITCODE."
    }
  }
  catch {
    Write-Warn "Binario instalado em $dest, mas a verificacao de execucao falhou: $($_.Exception.Message)"
  }
}

# ----------------------------------------------------------------------------
# Contrato de erro nos dois modos de execucao.
#
#   -File / .\install.ps1 : ha arquivo ($PSCommandPath preenchido) -- converte
#                            a falha em 'exit 1', preservando o oraculo S0-04.
#   irm ... | iex          : nao ha arquivo -- 'exit' encerraria o terminal do
#                            usuario, entao a excecao e relancada.
# ----------------------------------------------------------------------------
try {
  Invoke-HubsaudeCliInstall -Version $Version -BinDir $BinDir -Help:$Help
}
catch {
  [Console]::Error.WriteLine("[x] $($_.Exception.Message)")
  if ($PSCommandPath) { exit 1 }
  throw
}
