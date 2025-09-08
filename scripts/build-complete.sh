#!/bin/bash

# Enhanced build script for Biomni VSCode Extension
# Ensures all components are properly compiled and packaged

set -e  # Exit on error

echo "====================================="
echo "🚀 Biomni VSCode Extension Build"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[BUILD]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js 16+ required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js version OK: $(node -v)"

# Clean previous build
print_status "Cleaning previous build..."
rm -rf out/
rm -rf *.vsix
print_success "Clean complete"

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_status "Dependencies up to date"
fi

# Compile TypeScript
print_status "Compiling TypeScript..."
npx tsc -p ./ --listFiles > /tmp/compiled-files.txt
COMPILED_COUNT=$(wc -l < /tmp/compiled-files.txt)
print_success "Compiled $COMPILED_COUNT TypeScript files"

# Verify critical files are compiled
print_status "Verifying critical components..."
CRITICAL_FILES=(
    "out/extension.js"
    "out/biomni/mcpClient.js"
    "out/biomni/mcpProvider.js"
    "out/sidebar/BiomniSidebarProvider.js"
    "out/services/genomicsTools.js"
    "out/services/resultsManager.js"
    "out/services/commandPalette.js"
    "out/commands/handlers.js"
    "out/fileTypes/index.js"
    "out/settings/index.js"
)

MISSING_FILES=()
for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
        print_warning "Missing: $file"
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    print_error "Critical files missing from build!"
    exit 1
fi
print_success "All critical components compiled"

# Check for TypeScript errors
print_status "Checking for TypeScript errors..."
if npx tsc --noEmit 2>/dev/null; then
    print_success "No TypeScript errors"
else
    print_warning "TypeScript reported errors (continuing anyway)"
fi

# Copy resources
print_status "Copying resources..."
if [ -d "images" ]; then
    cp -r images out/ 2>/dev/null || true
    print_success "Images copied"
fi

if [ -d "syntaxes" ]; then
    cp -r syntaxes out/ 2>/dev/null || true
    print_success "Syntax files copied"
fi

if [ -f "language-configuration.json" ]; then
    cp language-configuration.json out/ 2>/dev/null || true
    print_success "Language configuration copied"
fi

# Generate source maps report
print_status "Generating build report..."
find out -name "*.js.map" | wc -l > /tmp/sourcemaps-count.txt
SOURCEMAP_COUNT=$(cat /tmp/sourcemaps-count.txt)
print_success "Generated $SOURCEMAP_COUNT source maps"

# Calculate build size
BUILD_SIZE=$(du -sh out/ | cut -f1)
print_success "Build size: $BUILD_SIZE"

# List all services
print_status "Compiled services:"
echo "  - BiomniSidebarProvider (Tree-based sidebar UI)"
echo "  - GenomicsToolsService (BLAST, sequence analysis, database queries)"
echo "  - ResultsManager (Result caching and export)"
echo "  - CommandPaletteService (Quick actions and workflows)"
echo "  - BiomniMcpClient (MCP server communication)"
echo "  - BiomniMCPProvider (VSCode MCP integration)"
echo "  - FileTypeManager (Biological file detection)"
echo "  - BiomniSettingsService (Configuration management)"
echo "  - BiomniCommandHandlers (Command implementations)"

# Package extension (optional)
if [ "$1" == "--package" ]; then
    print_status "Packaging extension..."
    npx vsce package --no-dependencies
    VSIX_FILE=$(ls *.vsix 2>/dev/null | head -n1)
    if [ -n "$VSIX_FILE" ]; then
        VSIX_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
        print_success "Extension packaged: $VSIX_FILE ($VSIX_SIZE)"
    else
        print_error "Failed to create VSIX package"
        exit 1
    fi
fi

# Final summary
echo ""
echo "====================================="
echo -e "${GREEN}✅ Build Complete!${NC}"
echo "====================================="
echo ""
echo "Build Statistics:"
echo "  - TypeScript files: $COMPILED_COUNT"
echo "  - Source maps: $SOURCEMAP_COUNT"
echo "  - Build size: $BUILD_SIZE"
echo "  - Critical components: ${#CRITICAL_FILES[@]}"
echo ""
echo "Next steps:"
echo "  1. Run extension: Press F5 in VSCode"
echo "  2. Package: ./scripts/build-complete.sh --package"
echo "  3. Install: code --install-extension *.vsix"
echo ""

# Create build manifest
cat > out/build-manifest.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)",
  "typescriptVersion": "$(npx tsc -v | cut -d' ' -f2)",
  "compiledFiles": $COMPILED_COUNT,
  "sourceMaps": $SOURCEMAP_COUNT,
  "buildSize": "$BUILD_SIZE",
  "components": {
    "sidebar": "BiomniSidebarProvider",
    "genomicsTools": "GenomicsToolsService",
    "resultsManager": "ResultsManager",
    "commandPalette": "CommandPaletteService",
    "mcpClient": "BiomniMcpClient",
    "mcpProvider": "BiomniMCPProvider",
    "fileTypes": "FileTypeManager",
    "settings": "BiomniSettingsService",
    "commands": "BiomniCommandHandlers"
  }
}
EOF

print_success "Build manifest created: out/build-manifest.json"

exit 0