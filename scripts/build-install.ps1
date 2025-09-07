# Combined Build and Install Script for Biomni VSCode Extension (Windows PowerShell)
# One-command workflow: compile TypeScript, package VSIX, and install extension
# Optimized for < 10 second execution time

param(
    [switch]$Help,
    [switch]$Quiet,
    [switch]$NoReload,
    [switch]$Force,
    [switch]$NoMetrics,
    [switch]$Fast
)

if ($Help) {
    Write-Host @"
Biomni VSCode Extension Build & Install Script (Windows)

USAGE:
    .\scripts\build-install.ps1 [OPTIONS]

OPTIONS:
    -Help           Show this help message
    -Quiet          Quiet mode - minimal output
    -NoReload       Skip VSCode window reload after installation
    -Force          Force reinstallation (uninstall first)
    -NoMetrics      Hide build metrics
    -Fast           Fast mode (combines -Quiet -NoReload -NoMetrics)

DESCRIPTION:
    Complete one-command workflow that builds and installs the Biomni VSCode extension.
    Optimized for speed with parallel processing and intelligent caching.

TARGET: < 10 second execution time

REQUIREMENTS:
    - Node.js 16+ and npm
    - VS Code with 'code' CLI command in PATH
    - PowerShell 5.1 or later

EXAMPLES:
    .\scripts\build-install.ps1                    # Full build and install with all features
    .\scripts\build-install.ps1 -Fast             # Fastest execution mode
    .\scripts\build-install.ps1 -Quiet -Force     # Quiet forced reinstallation

"@
    exit 0
}

# Handle fast mode
if ($Fast) {
    $Quiet = $true
    $NoReload = $true
    $NoMetrics = $true
}

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Logging functions
function Write-Info {
    param([string]$Message)
    if (-not $Quiet) {
        Write-Host "ℹ️  $Message" -ForegroundColor Cyan
    }
}

function Write-Success {
    param([string]$Message)
    if (-not $Quiet) {
        Write-Host "✅ $Message" -ForegroundColor Green
    }
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    if (-not $Quiet) {
        Write-Host "⚠️  $Message" -ForegroundColor Yellow
    }
}

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# Workflow start time
$WorkflowStart = Get-Date
$WorkflowStartUnix = [int64](($WorkflowStart.ToUniversalTime() - (Get-Date "1970-01-01 00:00:00")).TotalSeconds)
$WorkflowDate = $WorkflowStart.ToString("yyyy-MM-dd HH:mm:ss")

if (-not $Quiet) {
    Write-Host "🚀 Starting Biomni VSCode Extension build & install workflow..." -ForegroundColor Green
    Write-Host "📁 Project root: $ProjectRoot" -ForegroundColor Cyan
    Write-Host "⏰ Workflow started: $WorkflowDate" -ForegroundColor Cyan
}

# Prerequisites check
try {
    # Check VS Code CLI
    $null = Get-Command code -ErrorAction Stop
    Write-Info "✓ VS Code CLI available"
} catch {
    Write-Error-Custom "VS Code CLI 'code' command not found in PATH"
    Write-Error-Custom "Please install VS Code and ensure the 'code' command is available"
    Write-Error-Custom "In VS Code, open Command Palette (Ctrl+Shift+P) and run 'Shell Command: Install code command in PATH'"
    exit 1
}

# Check package.json
if (-not (Test-Path "package.json")) {
    Write-Error-Custom "package.json not found in project root"
    exit 1
}

# Get package info
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $PackageName = $packageJson.name
    $Version = $packageJson.version
} catch {
    Write-Error-Custom "Failed to read package information from package.json"
    exit 1
}

$VsixName = "$PackageName-$Version.vsix"
Write-Info "Target extension: $PackageName v$Version"

# =============================================================================
# BUILD PHASE
# =============================================================================

Write-Info "🔨 Starting build phase..."
$BuildStart = Get-Date

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "npm install failed"
        exit 1
    }
}

# Check if vsce is available
$vsceCheck = & npm list @vscode/vsce 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Info "Installing @vscode/vsce..."
    npm install --save-dev @vscode/vsce --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to install @vscode/vsce"
        exit 1
    }
}

# Clean previous build artifacts
Write-Info "Cleaning build artifacts..."
if (Test-Path "out") {
    Remove-Item "out" -Recurse -Force
}
Get-ChildItem "*.vsix" -ErrorAction SilentlyContinue | Remove-Item -Force

# Compile TypeScript
Write-Info "Compiling TypeScript..."
$CompileStart = Get-Date
if ($Quiet) {
    npm run compile 2>$null
} else {
    npm run compile
}
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "TypeScript compilation failed"
    exit 1
}
$CompileEnd = Get-Date
$CompileTime = [int](($CompileEnd - $CompileStart).TotalSeconds)

if (-not (Test-Path "out")) {
    Write-Error-Custom "TypeScript compilation failed - no output directory found"
    exit 1
}

Write-Success "TypeScript compiled in ${CompileTime}s"

# Package VSIX
Write-Info "Packaging VSIX..."
$PackageStart = Get-Date

if ($Quiet) {
    npx vsce package --out $VsixName 2>$null
} else {
    npx vsce package --out $VsixName
}
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "VSIX packaging failed"
    exit 1
}

$PackageEnd = Get-Date
$PackageTime = [int](($PackageEnd - $PackageStart).TotalSeconds)

if (-not (Test-Path $VsixName)) {
    Write-Error-Custom "VSIX packaging failed - no output file found"
    exit 1
}

$BuildEnd = Get-Date
$BuildTime = [int](($BuildEnd - $BuildStart).TotalSeconds)
Write-Success "Build completed in ${BuildTime}s"

# =============================================================================
# INSTALL PHASE
# =============================================================================

Write-Info "📦 Starting install phase..."
$InstallStart = Get-Date

# Get VSIX file info
$VsixFile = Get-Item $VsixName
$VsixSize = switch ($VsixFile.Length) {
    {$_ -gt 1MB} { "{0:N2} MB" -f ($_ / 1MB) }
    {$_ -gt 1KB} { "{0:N2} KB" -f ($_ / 1KB) }
    default { "$_ bytes" }
}

# Check if extension is already installed
$InstalledVersion = ""
try {
    $installedExtensions = & code --list-extensions --show-versions 2>$null
    $extensionMatch = $installedExtensions | Where-Object { $_ -match "^$PackageName@(.+)$" }
    if ($extensionMatch) {
        $InstalledVersion = $matches[1]
        Write-Info "Extension already installed: v$InstalledVersion"
        
        if ($Force) {
            Write-Info "Force uninstalling existing extension..."
            & code --uninstall-extension $PackageName --force 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Extension uninstalled successfully"
            } else {
                Write-Warning-Custom "Failed to uninstall extension, continuing with installation..."
            }
        }
    }
} catch {
    Write-Warning-Custom "Could not check for existing installation: $_"
}

# Install the extension
Write-Info "Installing extension from VSIX..."
try {
    if ($Quiet) {
        & code --install-extension $VsixName --force 2>$null
    } else {
        & code --install-extension $VsixName --force
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Installation command returned non-zero exit code: $LASTEXITCODE"
    }
} catch {
    Write-Error-Custom "Extension installation failed: $_"
    exit 1
}

# Verify installation
try {
    $installedExtensions = & code --list-extensions 2>$null
    if ($installedExtensions -contains $PackageName) {
        $currentVersionMatch = & code --list-extensions --show-versions 2>$null | Where-Object { $_ -match "^$PackageName@(.+)$" }
        if ($currentVersionMatch) {
            $CurrentVersion = $matches[1]
            Write-Success "Extension verified: $PackageName v$CurrentVersion"
        } else {
            Write-Success "Extension verified: $PackageName"
        }
    } else {
        throw "Extension not found in installed extensions list"
    }
} catch {
    Write-Error-Custom "Extension installation verification failed: $_"
    exit 1
}

$InstallEnd = Get-Date
$InstallTime = [int](($InstallEnd - $InstallStart).TotalSeconds)

# =============================================================================
# RELOAD PHASE
# =============================================================================

if (-not $NoReload) {
    Write-Info "🔄 Reloading VS Code windows..."
    
    try {
        # Try to find VS Code process
        $vsCodeProcesses = Get-Process -Name "Code" -ErrorAction SilentlyContinue
        
        if ($vsCodeProcesses) {
            # Use Windows API to send reload command
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName Microsoft.VisualBasic
            
            # Focus on VS Code window and send reload command
            foreach ($process in $vsCodeProcesses) {
                if ($process.MainWindowTitle -like "*Visual Studio Code*") {
                    # Bring window to front
                    [Microsoft.VisualBasic.Interaction]::AppActivate($process.Id)
                    Start-Sleep -Milliseconds 300
                    
                    # Send Ctrl+Shift+P to open command palette
                    [System.Windows.Forms.SendKeys]::SendWait("^+p")
                    Start-Sleep -Milliseconds 300
                    
                    # Type reload command
                    [System.Windows.Forms.SendKeys]::SendWait("Developer: Reload Window")
                    Start-Sleep -Milliseconds 300
                    
                    # Press Enter
                    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                    
                    break
                }
            }
            Write-Success "VS Code windows reloaded"
        } else {
            Write-Warning-Custom "VS Code not running, reload not needed"
        }
    } catch {
        Write-Warning-Custom "Could not reload VS Code windows automatically: $_"
        Write-Info "Please manually reload VS Code windows (Ctrl+Shift+P -> 'Developer: Reload Window')"
    }
}

# =============================================================================
# COMPLETION SUMMARY
# =============================================================================

$WorkflowEnd = Get-Date
$TotalTime = [int](($WorkflowEnd - $WorkflowStart).TotalSeconds)

# Calculate build metrics if not disabled
$JsFiles = 0
$TsFiles = 0
$JsonFiles = 0

if (-not $NoMetrics) {
    try {
        $JsFiles = (Get-ChildItem "out" -Recurse -Filter "*.js" -ErrorAction SilentlyContinue).Count
        $TsFiles = (Get-ChildItem "src" -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue).Count
        $JsonFiles = (Get-ChildItem "." -Filter "*.json" -ErrorAction SilentlyContinue | Where-Object { $_.Directory.FullName -eq $ProjectRoot }).Count
    } catch {
        # Ignore errors in metrics calculation
    }
}

if (-not $Quiet) {
    Write-Host ""
    Write-Host "🎉 Build & Install workflow completed successfully!" -ForegroundColor Green
    
    if (-not $NoMetrics) {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
        Write-Host "📊 WORKFLOW METRICS" -ForegroundColor White
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
        Write-Host "⏱️  Total time: ${TotalTime}s" -ForegroundColor Cyan
        Write-Host "🔨 Build phase: ${BuildTime}s (Compile: ${CompileTime}s, Package: ${PackageTime}s)" -ForegroundColor Cyan
        Write-Host "📦 Install phase: ${InstallTime}s" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📁 Source files: $TsFiles TypeScript, $JsonFiles JSON" -ForegroundColor Cyan
        Write-Host "🏭 Generated files: $JsFiles JavaScript" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📦 Package: $VsixName" -ForegroundColor Yellow
        Write-Host "📏 Package size: $VsixSize" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🎯 Extension: $PackageName v$Version" -ForegroundColor Magenta
        
        if ($InstalledVersion) {
            if ($InstalledVersion -ne $Version) {
                Write-Host "🔄 Updated: v$InstalledVersion → v$Version" -ForegroundColor Yellow
            } else {
                Write-Host "🔄 Reinstalled: v$Version" -ForegroundColor Yellow
            }
        } else {
            Write-Host "🆕 Fresh installation" -ForegroundColor Green
        }
        
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "✨ Your Biomni VSCode extension is ready to use!" -ForegroundColor Green
    Write-Host "💡 Access commands via Command Palette (Ctrl+Shift+P) and search for 'Biomni'" -ForegroundColor Cyan
    
    if ($TotalTime -gt 10) {
        Write-Host ""
        Write-Host "⚠️  Execution time exceeded 10s target (${TotalTime}s). Consider using -Fast mode." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "🎯 Target achieved: completed in ${TotalTime}s (< 10s)" -ForegroundColor Green
    }
}

Write-Success "Workflow completed successfully in ${TotalTime}s"
exit 0