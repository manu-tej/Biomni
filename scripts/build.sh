#!/bin/bash
set -e

# Build script for Biomni VSCode Extension (Mac/Linux)
# Compiles TypeScript, packages VSIX, and reports build metrics

echo "🚀 Starting Biomni VSCode Extension build process..."

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Build start time
BUILD_START=$(date +%s)
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "📁 Project root: $PROJECT_ROOT"
echo "⏰ Build started: $BUILD_DATE"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Running npm install..."
    npm install
fi

# Check if vsce is available
if ! command -v npx vsce &> /dev/null; then
    echo "⚠️  vsce not found. Installing @vscode/vsce..."
    npm install --save-dev @vscode/vsce
fi

# Clean previous build artifacts
echo "🧹 Cleaning previous build artifacts..."
rm -rf out/
rm -f *.vsix

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
COMPILE_START=$(date +%s)
npm run compile
COMPILE_END=$(date +%s)
COMPILE_TIME=$((COMPILE_END - COMPILE_START))

if [ ! -d "out" ]; then
    echo "❌ TypeScript compilation failed - no output directory found"
    exit 1
fi

echo "✅ TypeScript compilation completed in ${COMPILE_TIME}s"

# Count compiled files
JS_FILES=$(find out -name "*.js" | wc -l)
echo "📊 Generated $JS_FILES JavaScript files"

# Package VSIX
echo "📦 Packaging VSIX..."
PACKAGE_START=$(date +%s)

# Get package info
PACKAGE_NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
VSIX_NAME="${PACKAGE_NAME}-${VERSION}.vsix"

npx vsce package --out "$VSIX_NAME"

PACKAGE_END=$(date +%s)
PACKAGE_TIME=$((PACKAGE_END - PACKAGE_START))

if [ ! -f "$VSIX_NAME" ]; then
    echo "❌ VSIX packaging failed - no output file found"
    exit 1
fi

echo "✅ VSIX packaging completed in ${PACKAGE_TIME}s"

# Build metrics
BUILD_END=$(date +%s)
TOTAL_BUILD_TIME=$((BUILD_END - BUILD_START))

# Get file sizes
VSIX_SIZE=$(ls -lh "$VSIX_NAME" | awk '{print $5}')
VSIX_SIZE_BYTES=$(stat -c%s "$VSIX_NAME" 2>/dev/null || stat -f%z "$VSIX_NAME" 2>/dev/null || echo "0")

# Count source files
TS_FILES=$(find src -name "*.ts" | wc -l)
JSON_FILES=$(find . -maxdepth 1 -name "*.json" | wc -l)

echo ""
echo "🎉 Build completed successfully!"
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