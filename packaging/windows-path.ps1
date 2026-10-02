param([ValidateSet('add','remove')][string]$Action, [Parameter(Mandatory=$true)][string]$InstallDirectory)
$ErrorActionPreference = 'Stop'
$current = [Environment]::GetEnvironmentVariable('Path', 'User')
$entries = @($current -split ';' | Where-Object { $_ -and $_.TrimEnd('\') -ine $InstallDirectory.TrimEnd('\') })
if ($Action -eq 'add') { $entries += $InstallDirectory }
[Environment]::SetEnvironmentVariable('Path', ($entries -join ';'), 'User')
