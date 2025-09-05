# Install script for Biomni VSCode Extension (Windows PowerShell)
# Installs the packaged VSIX and optionally reloads VSCode

param(
    [switch]$Help,
    [switch]$NoReload,
    [switch]$SkipBuild,
    [switch]$Quiet,
    [switch]$Force
)

if ($Help) {
    Write-Host @"
Biomni VSCode Extension Install Script (Windows)

USAGE:
    .\scripts\install.ps1 [OPTIONS]

OPTIONS:
    -Help           Show this help message
    -NoReload       Skip VSCode window reload after installation
    -SkipBuild      Skip building, install existing VSIX only
    -Quiet          Quiet mode - minimal output
    -Force          Force reinstallation (uninstall first)

DESCRIPTION:
    Installs the Biomni VSCode extension from a packaged VSIX file.
    By default, builds the extension first, then installs and reloads VSCode.

REQUIREMENTS:
    - VS Code with 'code' CLI command in PATH
    - Node.js and npm (unless -SkipBuild is used)
    - PowerShell 5.1 or later

EXAMPLES:
    .\scripts\install.ps1                     # Build and install with reload
    .\scripts\install.ps1 -SkipBuild          # Install existing VSIX only
    .\scripts\install.ps1 -NoReload           # Install without reloading VSCode
    .\scripts\install.ps1 -Quiet -Force       # Quiet forced reinstallation

"@
    exit 0
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

if (-not $Quiet) {
    Write-Host "🚀 Starting Biomni VSCode Extension installation..." -ForegroundColor Green
    Write-Host "📁 Project root: $ProjectRoot" -ForegroundColor Cyan
}

# Check if VS Code CLI is available
try {
    $null = Get-Command code -ErrorAction Stop
} catch {
    Write-Error-Custom "VS Code CLI 'code' command not found in PATH"
    Write-Error-Custom "Please install VS Code and ensure the 'code' command is available"
    Write-Error-Custom "In VS Code, open Command Palette (Ctrl+Shift+P) and run 'Shell Command: Install code command in PATH'"
    exit 1
}

# Check if package.json exists
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

# Build if not skipped
if (-not $SkipBuild) {
    Write-Info "Building extension first..."
    try {
        if ($Quiet) {
            & .\scripts\build.ps1 *> $null
        } else {
            & .\scripts\build.ps1
        }
        if ($LASTEXITCODE -ne 0) {
            throw "Build script returned non-zero exit code: $LASTEXITCODE"
        }
    } catch {
        Write-Error-Custom "Build failed: $_"
        exit 1
    }
}

# Check if VSIX file exists
if (-not (Test-Path $VsixName)) {
    Write-Error-Custom "VSIX file not found: $VsixName"
    Write-Error-Custom "Run the build script first or use existing VSIX file"
    exit 1
}

# Get VSIX file info
$VsixFile = Get-Item $VsixName
$VsixSize = switch ($VsixFile.Length) {
    {$_ -gt 1MB} { "{0:N2} MB" -f ($_ / 1MB) }
    {$_ -gt 1KB} { "{0:N2} KB" -f ($_ / 1KB) }
    default { "$_ bytes" }
}
Write-Info "Found VSIX: $VsixName ($VsixSize)"

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
$InstallStart = Get-Date

try {
    & code --install-extension $VsixName --force 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Installation command returned non-zero exit code: $LASTEXITCODE"
    }
    
    $InstallEnd = Get-Date
    $InstallTime = [int](($InstallEnd - $InstallStart).TotalSeconds)
    Write-Success "Extension installed successfully in ${InstallTime}s"
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

# Reload VS Code windows
if (-not $NoReload) {
    Write-Info "Reloading VS Code windows..."
    
    try {
        # Try to find VS Code process
        $vsCodeProcesses = Get-Process -Name "Code" -ErrorAction SilentlyContinue
        
        if ($vsCodeProcesses) {
            # Use Windows API to send reload command
            Add-Type -AssemblyName System.Windows.Forms
            
            # Focus on VS Code window and send Ctrl+Shift+P
            foreach ($process in $vsCodeProcesses) {
                if ($process.MainWindowTitle -like "*Visual Studio Code*") {
                    # Bring window to front
                    [Microsoft.VisualBasic.Interaction]::AppActivate($process.Id)
                    Start-Sleep -Milliseconds 500
                    
                    # Send Ctrl+Shift+P to open command palette
                    [System.Windows.Forms.SendKeys]::SendWait("^+p")
                    Start-Sleep -Milliseconds 500
                    
                    # Type reload command
                    [System.Windows.Forms.SendKeys]::SendWait("Developer: Reload Window")
                    Start-Sleep -Milliseconds 500
                    
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

# Installation summary
if (-not $Quiet) {
    Write-Host ""
    Write-Host "🎉 Installation completed successfully!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
    Write-Host "📊 INSTALLATION SUMMARY" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
    Write-Host "🎯 Extension: $PackageName" -ForegroundColor Cyan
    Write-Host "📦 Version: v$Version" -ForegroundColor Cyan
    Write-Host "📏 Package size: $VsixSize" -ForegroundColor Cyan
    Write-Host "⏱️  Install time: ${InstallTime}s" -ForegroundColor Cyan
    
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
    Write-Host ""
    Write-Host "✨ Your Biomni VSCode extension is ready to use!" -ForegroundColor Green
    Write-Host "💡 Access commands via Command Palette (Ctrl+Shift+P) and search for 'Biomni'" -ForegroundColor Cyan
}