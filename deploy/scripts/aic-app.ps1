#Requires -Version 7.0
param(
    [ValidateSet('Install', 'Update', 'Status', 'Stop', 'Start', 'Logs', 'Menu')]
    [string] $Action = 'Menu',
    [switch] $FromSource
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($FromSource) {
    $env:AIC_BUILD_FROM_SOURCE = '1'
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LibPath = Join-Path $ScriptDir 'lib/common.ps1'
. $LibPath

function Show-Menu {
    Write-Host @'

AIC App — Gerenciador Docker
  [1] Instalar
  [2] Atualizar
  [3] Status
  [4] Parar
  [5] Iniciar
  [6] Logs
  [0] Sair

'@
}

function Invoke-AicAction {
    param([string] $Name)

    switch ($Name) {
        'Install' { Invoke-AicInstall }
        'Update' { Invoke-AicUpdate }
        'Status' { Invoke-AicStatus }
        'Stop' { Invoke-AicStop }
        'Start' { Invoke-AicStart }
        'Logs' { Invoke-AicLogs }
        default { throw "Ação desconhecida: $Name" }
    }
}

if ($Action -ne 'Menu') {
    Invoke-AicAction -Name $Action
    exit 0
}

while ($true) {
    Show-Menu
    $choice = Read-Host 'Escolha uma opção'
    switch ($choice) {
        '1' { Invoke-AicInstall }
        '2' { Invoke-AicUpdate }
        '3' { Invoke-AicStatus }
        '4' { Invoke-AicStop }
        '5' { Invoke-AicStart }
        '6' { Invoke-AicLogs }
        '0' { exit 0 }
        default { Write-Warning 'Opção inválida.' }
    }
}
