param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath
)

$ErrorActionPreference = "Stop"

$installerCandidates = @(
  [IO.Path]::GetFullPath((Join-Path (Get-Location).Path $InstallerPath)),
  [IO.Path]::GetFullPath((Join-Path (Join-Path $PSScriptRoot "..\..\..") $InstallerPath))
)
$installer = $installerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $installer) {
  throw "Installer was not found at any of: $($installerCandidates -join ', ')"
}
$smokeRoot = Join-Path ([IO.Path]::GetTempPath()) ("Fixmind Installer Smoke éspace-" + [guid]::NewGuid())
$installDirectory = Join-Path $smokeRoot "app"
$dataDirectory = Join-Path $smokeRoot "data"
$marker = Join-Path $dataDirectory "preservation-marker.txt"

New-Item -ItemType Directory -Path $smokeRoot, $dataDirectory | Out-Null
Set-Content -LiteralPath $marker -Value "preserve-me" -NoNewline

try {
  $installResult = Start-Process -FilePath $installer -ArgumentList @("/S", "/D=$installDirectory") -Wait -PassThru
  if ($installResult.ExitCode -ne 0) {
    throw "Installer exited with code $($installResult.ExitCode)."
  }

  $reinstallResult = Start-Process -FilePath $installer -ArgumentList @("/S", "/D=$installDirectory") -Wait -PassThru
  if ($reinstallResult.ExitCode -ne 0) {
    throw "Repair/reinstall exited with code $($reinstallResult.ExitCode)."
  }

  $executable = Join-Path $installDirectory "fixmind-desktop.exe"
  if (-not (Test-Path -LiteralPath $executable)) {
    throw "Installed Fixmind executable was not found at $executable."
  }

  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $executable
  $startInfo.WorkingDirectory = $installDirectory
  $startInfo.UseShellExecute = $false
  $startInfo.Environment["PATH"] = ""
  $startInfo.Environment["FIXMIND_DATA_DIR"] = $dataDirectory
  $appProcess = [Diagnostics.Process]::Start($startInfo)
  Start-Sleep -Seconds 8
  if ($appProcess.HasExited) {
    throw "Installed Fixmind exited before the clean-PATH smoke window completed."
  }

  $appProcess.CloseMainWindow() | Out-Null
  if (-not $appProcess.WaitForExit(5000)) {
    $appProcess.Kill($true)
    $appProcess.WaitForExit()
  }

  $uninstaller = Join-Path $installDirectory "uninstall.exe"
  if (Test-Path -LiteralPath $uninstaller) {
    $uninstallResult = Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait -PassThru
    if ($uninstallResult.ExitCode -ne 0) {
      throw "Uninstaller exited with code $($uninstallResult.ExitCode)."
    }
  }

  if (-not (Test-Path -LiteralPath $marker)) {
    throw "Installed-app smoke removed user data during uninstall."
  }

  Write-Output "Installed Fixmind smoke passed with an empty PATH."
}
finally {
  Remove-Item -LiteralPath $smokeRoot -Recurse -Force -ErrorAction SilentlyContinue
}
