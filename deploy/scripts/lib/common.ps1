function Write-AicInfo([string] $Message) {
    Write-Host "[INFO] $Message"
}

function Write-AicOk([string] $Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-AicWarn([string] $Message) {
    Write-Warning $Message
}

function Stop-AicWithError([string] $Message) {
    Write-Error $Message
    exit 1
}

$Script:AicScriptsDir = Split-Path -Parent $PSScriptRoot
$Script:AicRepoRoot = (Resolve-Path (Join-Path $Script:AicScriptsDir '../..')).Path

function Get-AicInstallDir {
    if ($env:INSTALL_DIR) {
        return $env:INSTALL_DIR
    }

    $envFile = Join-Path $Script:AicScriptsDir '.env'
    if (Test-Path $envFile) {
        $line = Select-String -Path $envFile -Pattern '^INSTALL_DIR=' | Select-Object -Last 1
        if ($line -and $line.Line -match '^INSTALL_DIR=(.+)$') {
            $value = $Matches[1].Trim()
            if ($value) {
                return $value
            }
        }
    }

    return $Script:AicRepoRoot
}

function Test-AicPrerequisites {
    foreach ($cmd in @('docker', 'git')) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            Stop-AicWithError "Comando obrigatório não encontrado: $cmd"
        }
    }

    docker compose version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Stop-AicWithError 'Docker Compose v2 não encontrado.'
    }
}

function New-AicRandomHex([int] $Bytes = 32) {
    $buffer = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    return ([BitConverter]::ToString($buffer) -replace '-', '').ToLower()
}

function Set-AicEnvValue {
    param(
        [Parameter(Mandatory)]
        [string] $FilePath,
        [Parameter(Mandatory)]
        [string] $Key,
        [Parameter(Mandatory)]
        [string] $Value
    )

    $lines = @()
    $found = $false
    if (Test-Path $FilePath) {
        foreach ($line in Get-Content -Path $FilePath) {
            if ($line -like "$Key=*") {
                $lines += "$Key=$Value"
                $found = $true
            }
            else {
                $lines += $line
            }
        }
    }

    if (-not $found) {
        $lines += "$Key=$Value"
    }

    Set-Content -Path $FilePath -Value $lines -Encoding UTF8
}

function Import-AicEnvFile {
    param([Parameter(Mandatory)] [string] $FilePath)

    if (-not (Test-Path $FilePath)) {
        return
    }

    foreach ($line in Get-Content -Path $FilePath) {
        if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        if ($line -match '^([^=]+)=(.*)$') {
            Set-Item -Path "env:$($Matches[1])" -Value $Matches[2]
        }
    }
}

function Get-AicEnvFilePath {
    param([Parameter(Mandatory)] [string] $InstallDir)

    $envFile = Join-Path $InstallDir 'deploy/.env'
    $exampleFile = Join-Path $InstallDir 'deploy/.env.example'

    if (-not (Test-Path $envFile)) {
        if (-not (Test-Path $exampleFile)) {
            Stop-AicWithError "Arquivo de exemplo não encontrado: $exampleFile"
        }
        Copy-Item -Path $exampleFile -Destination $envFile
        Write-AicInfo "Criado $envFile a partir do exemplo."
    }

    return $envFile
}

function Invoke-AicCompose {
    param(
        [Parameter(Mandatory)]
        [string] $InstallDir,
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]] $Args
    )

    $envFile = Join-Path $InstallDir 'deploy/.env'
    $prevBuildkit = $env:DOCKER_BUILDKIT
    $prevCliBuild = $env:COMPOSE_DOCKER_CLI_BUILD
    $prevParallel = $env:COMPOSE_PARALLEL_LIMIT
    $env:DOCKER_BUILDKIT = '1'
    $env:COMPOSE_DOCKER_CLI_BUILD = '1'
    $env:COMPOSE_PARALLEL_LIMIT = '1'
    try {
        & docker compose --project-directory $InstallDir --env-file $envFile @Args
        if ($LASTEXITCODE -ne 0) {
            Stop-AicWithError "docker compose falhou: $($Args -join ' ')"
        }
    }
    finally {
        if ($null -ne $prevBuildkit) { $env:DOCKER_BUILDKIT = $prevBuildkit } else { Remove-Item Env:DOCKER_BUILDKIT -ErrorAction SilentlyContinue }
        if ($null -ne $prevCliBuild) { $env:COMPOSE_DOCKER_CLI_BUILD = $prevCliBuild } else { Remove-Item Env:COMPOSE_DOCKER_CLI_BUILD -ErrorAction SilentlyContinue }
        if ($null -ne $prevParallel) { $env:COMPOSE_PARALLEL_LIMIT = $prevParallel } else { Remove-Item Env:COMPOSE_PARALLEL_LIMIT -ErrorAction SilentlyContinue }
    }
}

function Get-AicGitHubRepoSlug {
    $url = if ($env:GIT_REPO_URL) { $env:GIT_REPO_URL } else { 'https://github.com/francissantiago/AIC_APP.git' }
    $url = $url -replace '\.git$', ''
    return ($url -replace '.*github.com/', '')
}

function Initialize-AicAppConfig {
    param([Parameter(Mandatory)] [string] $InstallDir)

    $configFile = Join-Path $InstallDir 'deploy/app-config.json'
    $exampleFile = Join-Path $InstallDir 'deploy/app-config.example.json'

    if (-not (Test-Path $configFile)) {
        if (-not (Test-Path $exampleFile)) {
            Stop-AicWithError "Arquivo de exemplo não encontrado: $exampleFile"
        }
        Copy-Item -Path $exampleFile -Destination $configFile
        Write-AicInfo "Criado $configFile a partir do exemplo."
    }
}

function Invoke-AicDownloadReleaseArtifacts {
    param([Parameter(Mandatory)] [string] $InstallDir)

    $slug = Get-AicGitHubRepoSlug
    Write-AicInfo "Buscando GitHub Release latest em $slug ..."

    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$slug/releases/latest"
    }
    catch {
        Write-AicWarn 'Não foi possível consultar releases do GitHub.'
        return $false
    }

    $backendAsset = $release.assets | Where-Object { $_.name -like 'aic-backend-*.tar.gz' } | Select-Object -First 1
    $frontendAsset = $release.assets | Where-Object { $_.name -like 'aic-frontend-*.tar.gz' } | Select-Object -First 1

    if (-not $backendAsset -or -not $frontendAsset) {
        Write-AicWarn 'Release latest não contém artefatos aic-backend / aic-frontend.'
        return $false
    }

    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("aic-release-" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

    try {
        Write-AicInfo "Baixando backend: $($backendAsset.name)"
        Invoke-WebRequest -Uri $backendAsset.browser_download_url -OutFile (Join-Path $tempDir 'backend.tar.gz')
        Write-AicInfo "Baixando frontend: $($frontendAsset.name)"
        Invoke-WebRequest -Uri $frontendAsset.browser_download_url -OutFile (Join-Path $tempDir 'frontend.tar.gz')

        New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'backend') | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'frontend/dist/aic-app-frontend') | Out-Null

        tar -xzf (Join-Path $tempDir 'backend.tar.gz') -C (Join-Path $InstallDir 'backend')
        tar -xzf (Join-Path $tempDir 'frontend.tar.gz') -C (Join-Path $InstallDir 'frontend/dist/aic-app-frontend')

        if (-not (Test-Path (Join-Path $InstallDir 'backend/dist/main.js'))) {
            Write-AicWarn 'backend/dist/main.js ausente após extração da release.'
            return $false
        }
        if (-not (Test-Path (Join-Path $InstallDir 'frontend/dist/aic-app-frontend/browser/index.html'))) {
            Write-AicWarn 'frontend/dist/aic-app-frontend/browser/index.html ausente após extração da release.'
            return $false
        }

        Write-AicOk 'Artefatos da release extraídos.'
        return $true
    }
    finally {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Test-AicHostNode {
    return [bool](Get-Command node -ErrorAction SilentlyContinue) -and [bool](Get-Command npm -ErrorAction SilentlyContinue)
}

function Invoke-AicHostAppBuild {
    param([Parameter(Mandatory)] [string] $InstallDir)

    $prevNodeOptions = $env:NODE_OPTIONS
    $env:NODE_OPTIONS = '--max-old-space-size=4096'
    try {
        Write-AicInfo 'Compilando backend no host...'
        Push-Location (Join-Path $InstallDir 'backend')
        try {
            & npm ci
            if ($LASTEXITCODE -ne 0) { Stop-AicWithError 'npm ci falhou no backend.' }
            & npm run build
            if ($LASTEXITCODE -ne 0) { Stop-AicWithError 'npm run build falhou no backend.' }
        }
        finally {
            Pop-Location
        }

        Write-AicInfo 'Compilando frontend no host...'
        Push-Location (Join-Path $InstallDir 'frontend')
        try {
            & npm ci --ignore-scripts
            if ($LASTEXITCODE -ne 0) { Stop-AicWithError 'npm ci falhou no frontend.' }
            & npm run build
            if ($LASTEXITCODE -ne 0) { Stop-AicWithError 'npm run build falhou no frontend.' }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        if ($null -ne $prevNodeOptions) { $env:NODE_OPTIONS = $prevNodeOptions } else { Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue }
    }

    if (-not (Test-Path (Join-Path $InstallDir 'backend/dist/main.js'))) {
        Stop-AicWithError 'backend/dist/main.js não encontrado após o build no host.'
    }
    if (-not (Test-Path (Join-Path $InstallDir 'frontend/dist/aic-app-frontend/browser/index.html'))) {
        Stop-AicWithError 'frontend/dist/aic-app-frontend/browser/index.html não encontrado após o build no host.'
    }

    Write-AicOk 'Compilação no host concluída.'
}

function Invoke-AicComposeBuildAndUp {
    param(
        [Parameter(Mandatory)]
        [string] $InstallDir,
        [switch] $Pull
    )

    Import-AicEnvFile -FilePath (Join-Path $InstallDir 'deploy/.env')
    Initialize-AicAppConfig -InstallDir $InstallDir

    $useRelease = if ($env:AIC_USE_RELEASE) { $env:AIC_USE_RELEASE } else { '1' }
    $fromSource = if ($env:AIC_BUILD_FROM_SOURCE) { $env:AIC_BUILD_FROM_SOURCE } else { '0' }
    if ($fromSource -eq '1') {
        $useRelease = '0'
    }

    if ($useRelease -eq '1' -and (Invoke-AicDownloadReleaseArtifacts -InstallDir $InstallDir)) {
        $env:AIC_BACKEND_DOCKERFILE = 'backend/Dockerfile'
        $env:AIC_FRONTEND_DOCKERFILE = 'frontend/Dockerfile'
    }
    elseif (Test-AicHostNode) {
        Write-AicInfo 'Node detectado no host — compilando fora do Docker (estável no Windows/Docker Desktop).'
        Invoke-AicHostAppBuild -InstallDir $InstallDir
        $env:AIC_BACKEND_DOCKERFILE = 'backend/Dockerfile'
        $env:AIC_FRONTEND_DOCKERFILE = 'frontend/Dockerfile'
    }
    else {
        Write-AicWarn 'Node não encontrado no host — compilação dentro do Docker (exige ~6 GB de RAM no Docker Desktop).'
        $env:AIC_BACKEND_DOCKERFILE = 'backend/Dockerfile.full'
        $env:AIC_FRONTEND_DOCKERFILE = 'frontend/Dockerfile.full'
    }

    Write-AicInfo 'Empacotando imagens Docker (mysql → backend → web)...'
    $envFile = Join-Path $InstallDir 'deploy/.env'
    & docker compose --project-directory $InstallDir --env-file $envFile pull mysql
    if ($LASTEXITCODE -ne 0) {
        Write-AicWarn 'Pull do MySQL falhou ou foi ignorado; continuando com cache local.'
    }

    if ($Pull) {
        Invoke-AicCompose -InstallDir $InstallDir build --pull backend
        Invoke-AicCompose -InstallDir $InstallDir build --pull web
    }
    else {
        Invoke-AicCompose -InstallDir $InstallDir build backend
        Invoke-AicCompose -InstallDir $InstallDir build web
    }

    Write-AicInfo 'Iniciando containers...'
    Invoke-AicCompose -InstallDir $InstallDir up -d
}

function Wait-AicHealth {
    param(
        [Parameter(Mandatory)]
        [string] $InstallDir,
        [int] $Port = 80
    )

    Write-AicInfo "Aguardando health check em http://localhost:$Port/api/health ..."
    for ($i = 0; $i -lt 60; $i++) {
        try {
            Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 5 | Out-Null
            Write-AicOk 'Aplicação respondendo.'
            return
        }
        catch {
            Start-Sleep -Seconds 5
        }
    }

    Write-AicWarn 'Health check não confirmado dentro do tempo esperado. Verifique os logs.'
}

function Show-AicSummary {
    param([Parameter(Mandatory)] [string] $InstallDir)

    $envFile = Join-Path $InstallDir 'deploy/.env'
    Import-AicEnvFile -FilePath $envFile

    $port = if ($env:APP_HTTP_PORT) { $env:APP_HTTP_PORT } else { '80' }
    $sha = 'n/a'
    if (Test-Path (Join-Path $InstallDir '.git')) {
        Push-Location $InstallDir
        try {
            $sha = (git rev-parse --short HEAD).Trim()
        }
        finally {
            Pop-Location
        }
    }

    Write-Host ''
    Write-AicOk 'Deploy concluído.'
    Write-Host "  URL:        http://localhost:$port"
    Write-Host "  Swagger:    http://localhost:$port/docs"
    Write-Host "  Commit:     $sha"
    Write-Host "  Logs:       $Script:AicScriptsDir/aic-app.ps1 -Action Logs"
    Write-Host ''
}

function Invoke-AicInstall {
    Test-AicPrerequisites

    $targetDir = Get-AicInstallDir
    $envFile = Join-Path $targetDir 'deploy/.env'
    if (Test-Path $envFile) {
        Import-AicEnvFile -FilePath $envFile
    }

    $repoUrl = if ($env:GIT_REPO_URL) { $env:GIT_REPO_URL } else { 'https://github.com/francissantiago/AIC_APP.git' }
    $branch = if ($env:GIT_BRANCH) { $env:GIT_BRANCH } else { 'main' }

    if (-not (Test-Path (Join-Path $targetDir '.git'))) {
        Write-AicInfo "Clonando $repoUrl (branch $branch) em $targetDir ..."
        New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
        git clone --branch $branch --depth 1 $repoUrl $targetDir
        if ($LASTEXITCODE -ne 0) {
            Stop-AicWithError 'Falha ao clonar repositório.'
        }
    }
    else {
        Write-AicWarn "Diretório Git já existe: $targetDir"
        $answer = Read-Host 'Continuar instalação/atualização local? [s/N]'
        if ($answer -notmatch '^[sS]$') {
            Stop-AicWithError 'Instalação cancelada.'
        }
    }

    $envFile = Get-AicEnvFilePath -InstallDir $targetDir
    $envContent = Get-Content -Path $envFile -Raw
    if ($envContent -match 'change-me') {
        Write-AicInfo 'Gerando segredos aleatórios ...'
        Set-AicEnvValue -FilePath $envFile -Key 'JWT_SECRET' -Value (New-AicRandomHex 32)
        Set-AicEnvValue -FilePath $envFile -Key 'DB_ROOT_PASSWORD' -Value (New-AicRandomHex 16)
        Set-AicEnvValue -FilePath $envFile -Key 'DB_PASSWORD' -Value (New-AicRandomHex 16)
    }

    Import-AicEnvFile -FilePath $envFile
    $defaultPort = if ($env:APP_HTTP_PORT) { $env:APP_HTTP_PORT } else { '80' }
    $defaultCors = if ($env:CORS_ORIGIN) { $env:CORS_ORIGIN } else { 'http://localhost' }

    $inputPort = Read-Host "Porta HTTP [$defaultPort]"
    if ($inputPort) {
        Set-AicEnvValue -FilePath $envFile -Key 'APP_HTTP_PORT' -Value $inputPort
    }

    $inputCors = Read-Host "CORS_ORIGIN [$defaultCors]"
    if ($inputCors) {
        Set-AicEnvValue -FilePath $envFile -Key 'CORS_ORIGIN' -Value $inputCors
        Set-AicEnvValue -FilePath $envFile -Key 'FRONTEND_APP_URL' -Value $inputCors
    }

    Set-AicEnvValue -FilePath $envFile -Key 'INSTALL_DIR' -Value $targetDir
    Import-AicEnvFile -FilePath $envFile

    Invoke-AicComposeBuildAndUp -InstallDir $targetDir

    $port = if ($env:APP_HTTP_PORT) { [int]$env:APP_HTTP_PORT } else { 80 }
    Wait-AicHealth -InstallDir $targetDir -Port $port
    Show-AicSummary -InstallDir $targetDir
}

function Invoke-AicUpdate {
    Test-AicPrerequisites

    $targetDir = Get-AicInstallDir
    if (-not (Test-Path (Join-Path $targetDir '.git'))) {
        Stop-AicWithError "Diretório não é um repositório Git: $targetDir"
    }

    $envFile = Get-AicEnvFilePath -InstallDir $targetDir
    Import-AicEnvFile -FilePath $envFile

    $branch = if ($env:GIT_BRANCH) { $env:GIT_BRANCH } else { 'main' }
    Write-AicInfo "Buscando atualizações (origin/$branch) ..."

    Push-Location $targetDir
    try {
        git fetch origin $branch
        if ($LASTEXITCODE -ne 0) {
            Stop-AicWithError 'git fetch falhou.'
        }

        $localSha = (git rev-parse HEAD).Trim()
        $remoteSha = (git rev-parse "origin/$branch").Trim()

        if ($localSha -eq $remoteSha) {
            Write-AicOk "Já está na versão mais recente ($($localSha.Substring(0, 7)))."
            return
        }

        Write-AicInfo "Atualizando de $($localSha.Substring(0, 7)) para $($remoteSha.Substring(0, 7)) ..."
        git pull --ff-only origin $branch
        if ($LASTEXITCODE -ne 0) {
            Stop-AicWithError 'git pull falhou.'
        }
    }
    finally {
        Pop-Location
    }

    Invoke-AicComposeBuildAndUp -InstallDir $targetDir -Pull

    $port = if ($env:APP_HTTP_PORT) { [int]$env:APP_HTTP_PORT } else { 80 }
    Wait-AicHealth -InstallDir $targetDir -Port $port
    Show-AicSummary -InstallDir $targetDir
}

function Invoke-AicStatus {
    $targetDir = Get-AicInstallDir
    $envFile = Join-Path $targetDir 'deploy/.env'
    if (-not (Test-Path $envFile)) {
        Stop-AicWithError "Arquivo $envFile não encontrado."
    }

    Import-AicEnvFile -FilePath $envFile

    Write-Host ''
    Write-AicInfo 'Containers'
    Invoke-AicCompose -InstallDir $targetDir ps

    Write-Host ''
    Write-AicInfo 'Versão Git'
    if (Test-Path (Join-Path $targetDir '.git')) {
        Push-Location $targetDir
        try {
            git log -1 --oneline
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host 'Repositório Git não encontrado.'
    }

    Write-Host ''
    Write-AicInfo 'Health'
    $port = if ($env:APP_HTTP_PORT) { $env:APP_HTTP_PORT } else { '80' }
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/api/health" -UseBasicParsing
        Write-Host $response.Content
    }
    catch {
        Write-AicWarn 'Health check falhou.'
    }
}

function Invoke-AicStop {
    $targetDir = Get-AicInstallDir
    Invoke-AicCompose -InstallDir $targetDir stop
    Write-AicOk 'Containers parados.'
}

function Invoke-AicStart {
    $targetDir = Get-AicInstallDir
    Invoke-AicCompose -InstallDir $targetDir up -d
    Write-AicOk 'Containers iniciados.'
}

function Invoke-AicLogs {
    $targetDir = Get-AicInstallDir
    Invoke-AicCompose -InstallDir $targetDir logs -f --tail=200
}
