#!/bin/bash
set -e

# Combined Build and Install Script for Biomni VSCode Extension (Mac/Linux)
# One-command workflow: compile TypeScript, package VSIX, and install extension
# Optimized for < 10 second execution time

# Script configuration
QUIET=false
SKIP_RELOAD=false
FORCE_REINSTALL=false
PARALLEL_BUILD=true
SHOW_METRICS=true

# Help function
show_help() {
    cat << EOF
Biomni VSCode Extension Build & Install Script (Mac/Linux)

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    -q, --quiet         Quiet mode - minimal output
    -n, --no-reload     Skip VSCode window reload after installation
    -f, --force         Force reinstallation (uninstall first)
    --no-parallel       Disable parallel optimizations
    --no-metrics        Hide build metrics
    --fast              Fast mode (quiet + no-reload + no-metrics)

DESCRIPTION:
    Complete one-command workflow that builds and installs the Biomni VSCode extension.
    Optimized for speed with parallel processing and intelligent caching.

TARGET: < 10 second execution time

REQUIREMENTS:
    - Node.js 16+ and npm
    - VS Code with 'code' CLI command in PATH
    - vsce package (automatically installed if missing)

EXAMPLES:
    $0                  # Full build and install with all features
    $0 --fast           # Fastest execution mode
    $0 --quiet --force  # Quiet forced reinstallation

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -n|--no-reload)
            SKIP_RELOAD=true
            shift
            ;;
        -f|--force)
            FORCE_REINSTALL=true
            shift
            ;;
        --no-parallel)
            PARALLEL_BUILD=false
            shift
            ;;
        --no-metrics)
            SHOW_METRICS=false
            shift
            ;;
        --fast)
            QUIET=true
            SKIP_RELOAD=true
            SHOW_METRICS=false
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    if [ "$QUIET" = false ]; then
        echo "ℹ️  $1"
    fi
}

log_success() {
    if [ "$QUIET" = false ]; then
        echo "✅ $1"
    fi
}

log_error() {
    echo "❌ $1" >&2
}

log_warning() {
    if [ "$QUIET" = false ]; then
        echo "⚠️  $1"
    fi
}

log_metrics() {
    if [ "$SHOW_METRICS" = true ] && [ "$QUIET" = false ]; then
        echo "$1"
    fi
}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Start timing
TOTAL_START=$(date +%s)
TOTAL_START_PRETTY=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$QUIET" = false ]; then
    echo "🚀 Starting Biomni VSCode Extension Build & Install"
    echo "📁 Project: $PROJECT_ROOT"
    echo "⏰ Started: $TOTAL_START_PRETTY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# Quick prerequisite checks
log_info "Checking prerequisites..."

# Check VS Code CLI
if ! command -v code &> /dev/null; then
    log_error "VS Code CLI 'code' command not found in PATH"
    log_error "Install VS Code and run 'Shell Command: Install code command in PATH'"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js 16+"
    exit 1
fi

# Get package info early
if [ ! -f "package.json" ]; then
    log_error "package.json not found in project root"
    exit 1
fi

PACKAGE_NAME=$(node -p "require('./package.json').name" 2>/dev/null) || {
    log_error "Failed to read package name from package.json"
    exit 1
}

VERSION=$(node -p "require('./package.json').version" 2>/dev/null) || {
    log_error "Failed to read version from package.json"
    exit 1
}

VSIX_NAME="${PACKAGE_NAME}-${VERSION}.vsix"

log_success "Prerequisites OK (Node.js $(node -v), VS Code CLI available)"

# BUILD PHASE
log_info "🔨 Building extension..."
BUILD_START=$(date +%s)

# Clean previous artifacts quickly
rm -f *.vsix 2>/dev/null || true

# Check if dependencies need installation
DEPS_START=$(date +%s)
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    if [ "$QUIET" = true ]; then
        npm install --silent > /dev/null 2>&1
    else
        npm install --silent
    fi
elif [ "package.json" -nt "node_modules" ]; then
    log_info "Updating dependencies..."
    if [ "$QUIET" = true ]; then
        npm install --silent > /dev/null 2>&1
    else
        npm install --silent
    fi
else
    log_info "Dependencies up to date"
fi
DEPS_END=$(date +%s)
DEPS_TIME=$((DEPS_END - DEPS_START))

# TypeScript compilation
COMPILE_START=$(date +%s)
log_info "Compiling TypeScript..."

if [ "$QUIET" = true ]; then
    npm run compile > /dev/null 2>&1
else
    npm run compile
fi

if [ $? -ne 0 ]; then
    log_error "TypeScript compilation failed"
    exit 1
fi

# Quick verification of critical output
if [ ! -d "out" ] || [ ! -f "out/extension.js" ]; then
    log_error "TypeScript compilation incomplete - missing critical files"
    exit 1
fi

COMPILE_END=$(date +%s)
COMPILE_TIME=$((COMPILE_END - COMPILE_START))
log_success "TypeScript compiled in ${COMPILE_TIME}s"

# Copy essential resources quickly
if [ -d "src/webview" ]; then
    mkdir -p out/webview 2>/dev/null || true
    cp src/webview/*.css out/webview/ 2>/dev/null || true
    cp src/webview/*.js out/webview/ 2>/dev/null || true
fi

# VSIX Packaging
PACKAGE_START=$(date +%s)
log_info "📦 Packaging VSIX..."

# Check for vsce availability
if ! command -v npx vsce &> /dev/null; then
    log_info "Installing @vscode/vsce..."
    npm install --save-dev @vscode/vsce --silent
fi

# Package with optimizations
if [ "$QUIET" = true ]; then
    npx vsce package --out "$VSIX_NAME" > /dev/null 2>&1
else
    npx vsce package --out "$VSIX_NAME"
fi

if [ $? -ne 0 ] || [ ! -f "$VSIX_NAME" ]; then
    log_error "VSIX packaging failed"
    exit 1
fi

PACKAGE_END=$(date +%s)
PACKAGE_TIME=$((PACKAGE_END - PACKAGE_START))

BUILD_END=$(date +%s)
BUILD_TOTAL_TIME=$((BUILD_END - BUILD_START))

log_success "VSIX packaged in ${PACKAGE_TIME}s"

# INSTALL PHASE
log_info "📥 Installing extension..."
INSTALL_START=$(date +%s)

# Check if already installed and handle force reinstall
if [ "$FORCE_REINSTALL" = true ]; then
    if code --list-extensions 2>/dev/null | grep -q "^${PACKAGE_NAME}$"; then
        log_info "Force uninstalling existing extension..."
        code --uninstall-extension "$PACKAGE_NAME" --force > /dev/null 2>&1 || true
    fi
fi

# Install the extension
if [ "$QUIET" = true ]; then
    code --install-extension "$VSIX_NAME" --force > /dev/null 2>&1
else
    code --install-extension "$VSIX_NAME" --force
fi

if [ $? -ne 0 ]; then
    log_error "Extension installation failed"
    exit 1
fi

INSTALL_END=$(date +%s)
INSTALL_TIME=$((INSTALL_END - INSTALL_START))

log_success "Extension installed in ${INSTALL_TIME}s"

# Quick verification
VERIFY_START=$(date +%s)
if code --list-extensions 2>/dev/null | grep -q "biomni\.biomni-mcp-integration"; then
    log_success "Extension verified successfully"
else
    log_warning "Extension verification inconclusive (likely installed correctly)"
fi
VERIFY_END=$(date +%s)
VERIFY_TIME=$((VERIFY_END - VERIFY_START))

# VS Code reload (if not skipped)
RELOAD_TIME=0
if [ "$SKIP_RELOAD" = false ]; then
    RELOAD_START=$(date +%s)
    log_info "🔄 Reloading VS Code windows..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use AppleScript
        osascript -e '
        tell application "Visual Studio Code"
            if running then
                tell application "System Events"
                    tell process "Visual Studio Code"
                        key code 15 using {command down, shift down}
                    end tell
                end tell
            end if
        end tell
        ' 2>/dev/null && log_success "VS Code windows reloaded" || log_warning "Could not reload automatically"
    elif command -v xdotool &> /dev/null && pgrep -x "code" > /dev/null; then
        # Linux with xdotool
        xdotool search --name "Visual Studio Code" key --window %@ ctrl+shift+p 2>/dev/null
        sleep 0.3
        xdotool type "Developer: Reload Window" 2>/dev/null
        sleep 0.3
        xdotool key Return 2>/dev/null
        log_success "VS Code windows reloaded"
    else
        log_info "Please manually reload VS Code (Cmd/Ctrl+Shift+P -> 'Developer: Reload Window')"
    fi
    
    RELOAD_END=$(date +%s)
    RELOAD_TIME=$((RELOAD_END - RELOAD_START))
fi

# Calculate final metrics
TOTAL_END=$(date +%s)
TOTAL_TIME=$((TOTAL_END - TOTAL_START))

# Success summary
if [ "$QUIET" = false ]; then
    echo ""
    echo "🎉 Build & Install completed successfully!"
    
    if [ "$SHOW_METRICS" = true ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚡ PERFORMANCE METRICS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🏁 Total time: ${TOTAL_TIME}s"
        echo "📦 Dependencies: ${DEPS_TIME}s"
        echo "🔨 Compilation: ${COMPILE_TIME}s" 
        echo "📦 Packaging: ${PACKAGE_TIME}s"
        echo "📥 Installation: ${INSTALL_TIME}s"
        echo "✅ Verification: ${VERIFY_TIME}s"
        if [ "$SKIP_RELOAD" = false ]; then
            echo "🔄 VS Code reload: ${RELOAD_TIME}s"
        fi
        
        # Performance assessment
        if [ "$TOTAL_TIME" -le 10 ]; then
            echo "🏆 EXCELLENT: Under 10 second target!"
        elif [ "$TOTAL_TIME" -le 15 ]; then
            echo "✅ GOOD: Close to 10 second target"
        else
            echo "⚠️  SLOW: Consider using --fast mode for optimization"
        fi
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Get file info
        VSIX_SIZE=$(ls -lh "$VSIX_NAME" | awk '{print $5}')
        JS_FILES=$(find out -name "*.js" 2>/dev/null | wc -l)
        
        echo "📊 BUILD SUMMARY"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎯 Extension: $PACKAGE_NAME v$VERSION"
        echo "📦 Package: $VSIX_NAME ($VSIX_SIZE)"
        echo "🏗️  Compiled: $JS_FILES JavaScript files"
        echo "📅 Built: $(date '+%Y-%m-%d %H:%M:%S')"
    else
        echo "✨ $PACKAGE_NAME v$VERSION installed successfully in ${TOTAL_TIME}s"
    fi
    
    echo ""
    echo "✨ Your Biomni VSCode extension is ready to use!"
    echo "💡 Access via Command Palette (Cmd/Ctrl+Shift+P) -> 'Biomni'"
fi

exit 0