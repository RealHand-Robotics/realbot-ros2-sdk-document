$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root 'source-export\realbot-ros2-sdk-documentation.html'
$shellPath = Join-Path $root 'site-shell.html'
$outputPath = Join-Path $root 'index.html'

$utf8 = [System.Text.UTF8Encoding]::new($false)
$source = [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)
$shell = [System.IO.File]::ReadAllText($shellPath, [System.Text.Encoding]::UTF8)
$match = [regex]::Match($source, '<body[^>]*>([\s\S]*?)</body>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

if (-not $match.Success) {
    throw 'Could not locate the document body in the LibreOffice HTML export.'
}

$body = $match.Groups[1].Value
$result = $shell.Replace('<!-- DOCUMENT_BODY -->', $body)
[System.IO.File]::WriteAllText($outputPath, $result, $utf8)
Write-Host "Built $outputPath"
