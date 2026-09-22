$envFile = Join-Path $PSScriptRoot ".env.sync.local"
if (-not (Test-Path $envFile)) {
    Write-Error "Missing $envFile"
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        Set-Item -Path "env:$($Matches[1])" -Value $Matches[2].Trim()
    }
}

$env:NODE_OPTIONS = "--disable-warning=ExperimentalWarning"
node (Join-Path $PSScriptRoot "dist/src/cli.js") @args
