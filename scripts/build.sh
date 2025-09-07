#!/bin/bash
set -e

# Build script for Biomni VSCode Extension (Mac/Linux)
# Compiles TypeScript, packages VSIX, and reports build metrics

# Configuration
FAST_MODE=false
QUIET=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fast)
            FAST_MODE=true
            QUIET=true
            shift
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [ "$QUIET" = false ]; then
    echo "🚀 Starting Biomni VSCode Extension build process..."
fi

# Logging functions
log_info() {
    if [ "$QUIET" = false ]; then
        echo "$1"
    fi
}

log_warning() {
    echo "$1"  # Always show warnings
}

log_error() {
    echo "$1" >&2  # Always show errors
}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Build start time
BUILD_START=$(date +%s)
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$QUIET" = false ]; then
    echo "📁 Project root: $PROJECT_ROOT"
    echo "⏰ Build started: $BUILD_DATE"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    log_warning "⚠️  node_modules not found. Running npm install..."
    if [ "$FAST_MODE" = true ]; then
        npm install --silent > /dev/null 2>&1
    else
        npm install --silent
    fi
elif [ "package.json" -nt "node_modules" ]; then
    log_warning "⚠️  Dependencies may be outdated. Running npm install..."
    if [ "$FAST_MODE" = true ]; then
        npm install --silent > /dev/null 2>&1
    else
        npm install --silent
    fi
fi

# Check if vsce is available
if ! command -v npx vsce &> /dev/null; then
    log_warning "⚠️  vsce not found. Installing @vscode/vsce..."
    if [ "$FAST_MODE" = true ]; then
        npm install --save-dev @vscode/vsce --silent > /dev/null 2>&1
    else
        npm install --save-dev @vscode/vsce --silent
    fi
fi

# Clean previous build artifacts (optimized)
log_info "🧹 Cleaning previous build artifacts..."
rm -rf out/
rm -f *.vsix

# Compile TypeScript
log_info "🔨 Compiling TypeScript..."
COMPILE_START=$(date +%s)
if [ "$FAST_MODE" = true ]; then
    npm run compile > /dev/null 2>&1
else
    npm run compile
fi
COMPILE_END=$(date +%s)
COMPILE_TIME=$((COMPILE_END - COMPILE_START))

if [ ! -d "out" ]; then
    log_error "❌ TypeScript compilation failed - no output directory found"
    exit 1
fi

# Copy webview resources to output
log_info "📋 Copying webview resources..."
mkdir -p out/webview
cp src/webview/style.css out/webview/ 2>/dev/null || true
cp src/webview/webview-client.js out/webview/ 2>/dev/null || true

log_info "✅ TypeScript compilation completed in ${COMPILE_TIME}s"

# Count compiled files (skip in fast mode)
if [ "$FAST_MODE" = false ]; then
    JS_FILES=$(find out -name "*.js" | wc -l)
    log_info "📊 Generated $JS_FILES JavaScript files"
fi

# Package VSIX
log_info "📦 Packaging VSIX..."
PACKAGE_START=$(date +%s)

# Get package info
PACKAGE_NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
VSIX_NAME="${PACKAGE_NAME}-${VERSION}.vsix"

if [ "$FAST_MODE" = true ]; then
    npx vsce package --out "$VSIX_NAME" > /dev/null 2>&1
else
    npx vsce package --out "$VSIX_NAME"
fi

PACKAGE_END=$(date +%s)
PACKAGE_TIME=$((PACKAGE_END - PACKAGE_START))

if [ ! -f "$VSIX_NAME" ]; then
    log_error "❌ VSIX packaging failed - no output file found"
    exit 1
fi

log_info "✅ VSIX packaging completed in ${PACKAGE_TIME}s"

# Build metrics
BUILD_END=$(date +%s)
TOTAL_BUILD_TIME=$((BUILD_END - BUILD_START))

if [ "$QUIET" = false ]; then
    echo ""
    echo "🎉 Build completed successfully!"
    
    if [ "$FAST_MODE" = false ]; then
        # Get file sizes and counts for detailed metrics (skip in fast mode)
        VSIX_SIZE=$(ls -lh "$VSIX_NAME" | awk '{print $5}')
        VSIX_SIZE_BYTES=$(stat -c%s "$VSIX_NAME" 2>/dev/null || stat -f%z "$VSIX_NAME" 2>/dev/null || echo "0")
        TS_FILES=$(find src -name "*.ts" | wc -l)
        JSON_FILES=$(find . -maxdepth 1 -name "*.json" | wc -l)
        JS_FILES=${JS_FILES:-$(find out -name "*.js" | wc -l)}
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📊 BUILD METRICS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🏗️  Total build time: ${TOTAL_BUILD_TIME}s"
        echo "⚡ TypeScript compile: ${COMPILE_TIME}s"
        echo "📦 VSIX packaging: ${PACKAGE_TIME}s"
        echo ""
        echo "📁 Source files: ${TS_FILES} TypeScript, ${JSON_FILES} JSON"
        echo "🏭 Generated files: ${JS_FILES} JavaScript"
        echo ""
        echo "📦 Package: $VSIX_NAME"
        echo "📏 Package size: $VSIX_SIZE ($VSIX_SIZE_BYTES bytes)"
        echo ""
        echo "🎯 Extension: $PACKAGE_NAME v$VERSION"
        echo "📅 Build date: $BUILD_DATE"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "✨ Ready for installation! Run './scripts/install.sh' to install the extension."
    else
        # Fast mode summary - just essential info
        echo "⚡ Build completed in ${TOTAL_BUILD_TIME}s"
        echo "📦 Package: $VSIX_NAME"
        echo "✨ Ready for installation!"
    fi
else
    # Quiet mode - just output the VSIX filename for scripting
    echo "$VSIX_NAME"
fi