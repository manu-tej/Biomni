# Build script for Biomni VSCode Extension (Windows PowerShell)
# Compiles TypeScript, packages VSIX, and reports build metrics

param(
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Biomni VSCode Extension Build Script (Windows)

USAGE:
    .\scripts\build.ps1

DESCRIPTION:
    Compiles TypeScript, packages VSIX, and reports build metrics.
    Automatically installs dependencies if missing.

REQUIREMENTS:
    - Node.js and npm installed
    - PowerShell 5.1 or later

"@
    exit 0
}

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Biomni VSCode Extension build process..." -ForegroundColor Green

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir

Set-Location $ProjectRoot

# Build start time
$BuildStart = Get-Date
$BuildStartUnix = [int64](($BuildStart.ToUniversalTime() - (Get-Date "1970-01-01 00:00:00")).TotalSeconds)
$BuildDate = $BuildStart.ToString("yyyy-MM-dd HH:mm:ss")

Write-Host "📁 Project root: $ProjectRoot" -ForegroundColor Cyan
Write-Host "⏰ Build started: $BuildDate" -ForegroundColor Cyan

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        exit 1
    }
}

# Check if vsce is available
$vsceCheck = & npm list @vscode/vsce 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  @vscode/vsce not found. Installing..." -ForegroundColor Yellow
    npm install --save-dev @vscode/vsce
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install @vscode/vsce" -ForegroundColor Red
        exit 1
    }
}

# Clean previous build artifacts
Write-Host "🧹 Cleaning previous build artifacts..." -ForegroundColor Yellow
if (Test-Path "out") {
    Remove-Item "out" -Recurse -Force
}
Get-ChildItem "*.vsix" -ErrorAction SilentlyContinue | Remove-Item -Force

# Compile TypeScript
Write-Host "🔨 Compiling TypeScript..." -ForegroundColor Blue
$CompileStart = Get-Date
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript compilation failed" -ForegroundColor Red
    exit 1
}
$CompileEnd = Get-Date
$CompileTime = [int](($CompileEnd - $CompileStart).TotalSeconds)

if (-not (Test-Path "out")) {
    Write-Host "❌ TypeScript compilation failed - no output directory found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ TypeScript compilation completed in ${CompileTime}s" -ForegroundColor Green

# Count compiled files
$JsFiles = (Get-ChildItem "out" -Recurse -Filter "*.js").Count
Write-Host "📊 Generated $JsFiles JavaScript files" -ForegroundColor Cyan

# Package VSIX
Write-Host "📦 Packaging VSIX..." -ForegroundColor Blue
$PackageStart = Get-Date

# Get package info
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$PackageName = $packageJson.name
$Version = $packageJson.version
$VsixName = "$PackageName-$Version.vsix"

npx vsce package --out $VsixName
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ VSIX packaging failed" -ForegroundColor Red
    exit 1
}

$PackageEnd = Get-Date
$PackageTime = [int](($PackageEnd - $PackageStart).TotalSeconds)

if (-not (Test-Path $VsixName)) {
    Write-Host "❌ VSIX packaging failed - no output file found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ VSIX packaging completed in ${PackageTime}s" -ForegroundColor Green

# Build metrics
$BuildEnd = Get-Date
$TotalBuildTime = [int](($BuildEnd - $BuildStart).TotalSeconds)

# Get file sizes
$VsixFile = Get-Item $VsixName
$VsixSize = switch ($VsixFile.Length) {
    {$_ -gt 1MB} { "{0:N2} MB" -f ($_ / 1MB) }
    {$_ -gt 1KB} { "{0:N2} KB" -f ($_ / 1KB) }
    default { "$_ bytes" }
}
$VsixSizeBytes = $VsixFile.Length

# Count source files
$TsFiles = (Get-ChildItem "src" -Recurse -Filter "*.ts").Count
$JsonFiles = (Get-ChildItem "." -Filter "*.json" | Where-Object { $_.Directory.FullName -eq $ProjectRoot }).Count

Write-Host ""
Write-Host "🎉 Build completed successfully!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "📊 BUILD METRICS" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "🏗️  Total build time: ${TotalBuildTime}s" -ForegroundColor Cyan
Write-Host "⚡ TypeScript compile: ${CompileTime}s" -ForegroundColor Cyan
Write-Host "📦 VSIX packaging: ${PackageTime}s" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Source files: $TsFiles TypeScript, $JsonFiles JSON" -ForegroundColor Cyan
Write-Host "🏭 Generated files: $JsFiles JavaScript" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Package: $VsixName" -ForegroundColor Yellow
Write-Host "📏 Package size: $VsixSize ($VsixSizeBytes bytes)" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎯 Extension: $PackageName v$Version" -ForegroundColor Magenta
Write-Host "📅 Build date: $BuildDate" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""
Write-Host "✨ Ready for installation! Run '.\scripts\install.ps1' to install the extension." -ForegroundColor Green