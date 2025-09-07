#!/bin/bash
set -e

# Install script for Biomni VSCode Extension (Mac/Linux)
# Installs the packaged VSIX and optionally reloads VSCode

# Default values
FORCE_RELOAD=true
SKIP_BUILD=false
QUIET=false
FAST_MODE=false

# Help function
show_help() {
    cat << EOF
Biomni VSCode Extension Install Script (Mac/Linux)

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    -n, --no-reload     Skip VSCode window reload after installation
    -s, --skip-build    Skip building, install existing VSIX only
    -q, --quiet         Quiet mode - minimal output
    -f, --force         Force reinstallation (uninstall first)
    --fast              Fast mode (quiet + optimized performance)

DESCRIPTION:
    Installs the Biomni VSCode extension from a packaged VSIX file.
    By default, builds the extension first, then installs and reloads VSCode.

REQUIREMENTS:
    - VS Code with 'code' CLI command in PATH
    - Node.js and npm (unless --skip-build is used)

EXAMPLES:
    $0                  # Build and install with reload
    $0 --skip-build     # Install existing VSIX only
    $0 --no-reload      # Install without reloading VSCode
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
        -n|--no-reload)
            FORCE_RELOAD=false
            shift
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -f|--force)
            FORCE_UNINSTALL=true
            shift
            ;;
        --fast)
            FAST_MODE=true
            QUIET=true
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

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ "$QUIET" = false ]; then
    echo "🚀 Starting Biomni VSCode Extension installation..."
    echo "📁 Project root: $PROJECT_ROOT"
fi

# Check if VS Code CLI is available
if ! command -v code &> /dev/null; then
    log_error "VS Code CLI 'code' command not found in PATH"
    log_error "Please install VS Code and ensure the 'code' command is available"
    log_error "In VS Code, open Command Palette (Cmd+Shift+P) and run 'Shell Command: Install code command in PATH'"
    exit 1
fi

# Get package info
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

# Build if not skipped
if [ "$SKIP_BUILD" = false ]; then
    log_info "Building extension first..."
    if [ "$FAST_MODE" = true ]; then
        ./scripts/build.sh --fast > /dev/null 2>&1
    elif [ "$QUIET" = true ]; then
        ./scripts/build.sh --quiet > /dev/null 2>&1
    else
        ./scripts/build.sh
    fi
    
    if [ $? -ne 0 ]; then
        log_error "Build failed"
        exit 1
    fi
fi

# Check if VSIX file exists
if [ ! -f "$VSIX_NAME" ]; then
    log_error "VSIX file not found: $VSIX_NAME"
    log_error "Run the build script first or use existing VSIX file"
    exit 1
fi

# Get VSIX file info
VSIX_SIZE=$(ls -lh "$VSIX_NAME" | awk '{print $5}')
log_info "Found VSIX: $VSIX_NAME ($VSIX_SIZE)"

# Check if extension is already installed
INSTALLED_VERSION=""
if code --list-extensions --show-versions | grep -q "^${PACKAGE_NAME}@"; then
    INSTALLED_VERSION=$(code --list-extensions --show-versions | grep "^${PACKAGE_NAME}@" | cut -d'@' -f2)
    log_info "Extension already installed: v$INSTALLED_VERSION"
    
    if [ "$FORCE_UNINSTALL" = true ]; then
        log_info "Force uninstalling existing extension..."
        code --uninstall-extension "$PACKAGE_NAME" --force
        if [ $? -eq 0 ]; then
            log_success "Extension uninstalled successfully"
        else
            log_warning "Failed to uninstall extension, continuing with installation..."
        fi
    fi
fi

# Install the extension
log_info "Installing extension from VSIX..."
INSTALL_START=$(date +%s)

# Install with force flag to overwrite existing installation
code --install-extension "$VSIX_NAME" --force

if [ $? -eq 0 ]; then
    INSTALL_END=$(date +%s)
    INSTALL_TIME=$((INSTALL_END - INSTALL_START))
    log_success "Extension installed successfully in ${INSTALL_TIME}s"
else
    log_error "Extension installation failed"
    exit 1
fi

# Verify installation
VERIFICATION_RESULT=$(code --list-extensions 2>/dev/null || echo "verification_failed")
if echo "$VERIFICATION_RESULT" | grep -q "biomni\.biomni-mcp-integration"; then
    # Try to get version, but don't fail if it crashes
    CURRENT_VERSION_RESULT=$(code --list-extensions --show-versions 2>/dev/null | grep "biomni\.biomni-mcp-integration" | cut -d'@' -f2 || echo "unknown")
    if [ "$CURRENT_VERSION_RESULT" != "unknown" ] && [ "$CURRENT_VERSION_RESULT" != "verification_failed" ]; then
        log_success "Extension verified: biomni.biomni-mcp-integration v$CURRENT_VERSION_RESULT"
    else
        log_success "Extension verified: biomni.biomni-mcp-integration (version check unavailable)"
    fi
else
    log_warning "Extension verification had issues, but installation likely succeeded"
    log_info "Please check manually in VS Code if the extension is installed"
fi

# Reload VS Code windows
if [ "$FORCE_RELOAD" = true ]; then
    log_info "Reloading VS Code windows..."
    
    # Try to reload all VS Code windows
    # Note: This uses AppleScript on macOS, and xdotool on Linux if available
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
        ' 2>/dev/null && log_success "VS Code windows reloaded" || log_warning "Could not reload VS Code windows automatically"
    elif command -v xdotool &> /dev/null; then
        # Linux with xdotool
        if pgrep -x "code" > /dev/null; then
            xdotool search --name "Visual Studio Code" key --window %@ ctrl+shift+p
            sleep 0.5
            xdotool type "Developer: Reload Window"
            sleep 0.5
            xdotool key Return
            log_success "VS Code windows reloaded"
        else
            log_warning "VS Code not running, reload not needed"
        fi
    else
        log_warning "Automatic reload not available on this system"
        log_info "Please manually reload VS Code windows (Cmd+Shift+P -> 'Developer: Reload Window')"
    fi
fi

# Installation summary
if [ "$QUIET" = false ]; then
    echo ""
    echo "🎉 Installation completed successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 INSTALLATION SUMMARY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Extension: $PACKAGE_NAME"
    echo "📦 Version: v$VERSION"
    echo "📏 Package size: $VSIX_SIZE"
    echo "⏱️  Install time: ${INSTALL_TIME}s"
    if [ -n "$INSTALLED_VERSION" ]; then
        if [ "$INSTALLED_VERSION" != "$VERSION" ]; then
            echo "🔄 Updated: v$INSTALLED_VERSION → v$VERSION"
        else
            echo "🔄 Reinstalled: v$VERSION"
        fi
    else
        echo "🆕 Fresh installation"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✨ Your Biomni VSCode extension is ready to use!"
    echo "💡 Access commands via Command Palette (Cmd+Shift+P) and search for 'Biomni'"
fi