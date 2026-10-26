#!/bin/bash

# VSIX Package Build Script for Biomni MCP Integration
# Issue #47: VSIX Package Creation & Testing
# Created: 2025-09-11

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/dist"
VSIX_DIR="$PROJECT_ROOT"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PACKAGE_NAME="biomni-mcp-integration"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Help function
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Build VSIX package for Biomni MCP Integration extension.

OPTIONS:
    --dev           Build development version (no optimization)
    --skip-tests    Skip running tests before build
    --no-validate   Skip VSIX validation after build
    --output-dir    Specify output directory (default: project root)
    --help         Show this help message

EXAMPLES:
    $0                    # Standard production build
    $0 --dev              # Development build
    $0 --skip-tests       # Build without running tests
    $0 --output-dir ./packages  # Custom output directory

EOF
}

# Parse command line arguments
DEV_BUILD=false
SKIP_TESTS=false
SKIP_VALIDATION=false
OUTPUT_DIR="$VSIX_DIR"

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            DEV_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --no-validate)
            SKIP_VALIDATION=true
            shift
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Ensure we're in the project root
cd "$PROJECT_ROOT"

log "Starting VSIX build process..."
log "Project: $PACKAGE_NAME"
log "Build type: $([ "$DEV_BUILD" = true ] && echo "Development" || echo "Production")"
log "Output directory: $OUTPUT_DIR"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Check prerequisites
log "Checking prerequisites..."

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    error "npm is not installed"
    exit 1
fi

# Check vsce
if ! command -v vsce &> /dev/null; then
    warning "vsce not found globally, using local version"
    if [ ! -f "node_modules/.bin/vsce" ]; then
        error "vsce not found. Install with: npm install -g @vscode/vsce"
        exit 1
    fi
    VSCE_CMD="npx vsce"
else
    VSCE_CMD="vsce"
fi

success "Prerequisites check passed"

# Install dependencies
log "Installing dependencies..."
npm ci --silent
success "Dependencies installed"

# Run tests unless skipped
if [ "$SKIP_TESTS" = false ]; then
    log "Running tests..."
    npm run test 2>/dev/null || {
        error "Tests failed. Use --skip-tests to bypass"
        exit 1
    }
    success "Tests passed"
else
    warning "Skipping tests as requested"
fi

# Build the extension
log "Building extension..."
if [ "$DEV_BUILD" = true ]; then
    npm run compile
    BUILD_TYPE="dev"
else
    npm run build:production:skip-tests
    BUILD_TYPE="prod"
fi
success "Extension built successfully"

# Check that required files exist
log "Validating build output..."
REQUIRED_FILES=(
    "out/extension.js"
    "package.json"
    "language-configuration.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "Required file not found: $file"
        exit 1
    fi
done

# Check for syntax files
if [ ! -d "syntaxes" ]; then
    warning "Syntaxes directory not found"
else
    success "Syntax files found"
fi

# Check for icons
if [ ! -d "images" ]; then
    warning "Images directory not found"
else
    success "Images directory found"
fi

success "Build output validation passed"

# Get package version
PACKAGE_VERSION=$(node -p "require('./package.json').version")
VSIX_FILENAME="${PACKAGE_NAME}-${PACKAGE_VERSION}-${BUILD_TYPE}-${TIMESTAMP}.vsix"
VSIX_PATH="$OUTPUT_DIR/$VSIX_FILENAME"

# Remove any existing VSIX files in output directory
log "Cleaning up existing VSIX files..."
rm -f "$OUTPUT_DIR"/*.vsix

# Package the extension
log "Packaging extension to VSIX..."
log "Output file: $VSIX_FILENAME"

# Build vsce command
VSCE_ARGS=(package)
VSCE_ARGS+=(--out "$VSIX_PATH")

if [ "$DEV_BUILD" = true ]; then
    VSCE_ARGS+=(--no-dependencies)
fi

# Execute vsce package
$VSCE_CMD "${VSCE_ARGS[@]}" || {
    error "VSCE packaging failed"
    exit 1
}

success "VSIX package created: $VSIX_FILENAME"

# Get package size
PACKAGE_SIZE=$(du -h "$VSIX_PATH" | cut -f1)
PACKAGE_SIZE_BYTES=$(stat -f%z "$VSIX_PATH" 2>/dev/null || stat -c%s "$VSIX_PATH" 2>/dev/null)
PACKAGE_SIZE_MB=$((PACKAGE_SIZE_BYTES / 1024 / 1024))

log "Package size: $PACKAGE_SIZE ($PACKAGE_SIZE_MB MB)"

# Check size limit (5MB for VSCode Marketplace)
if [ "$PACKAGE_SIZE_MB" -gt 5 ]; then
    error "Package size exceeds 5MB limit for VSCode Marketplace!"
    error "Current size: ${PACKAGE_SIZE_MB}MB, Maximum: 5MB"
    exit 1
else
    success "Package size within limits (${PACKAGE_SIZE_MB}MB / 5MB)"
fi

# Validate VSIX unless skipped
if [ "$SKIP_VALIDATION" = false ]; then
    log "Validating VSIX package..."
    if [ -f "$SCRIPT_DIR/validate-vsix.js" ]; then
        node "$SCRIPT_DIR/validate-vsix.js" "$VSIX_PATH" || {
            error "VSIX validation failed"
            exit 1
        }
        success "VSIX validation passed"
    else
        warning "VSIX validator not found, skipping validation"
    fi
else
    warning "Skipping VSIX validation as requested"
fi

# Create symlink to latest build
LATEST_LINK="$OUTPUT_DIR/${PACKAGE_NAME}-latest.vsix"
rm -f "$LATEST_LINK"
ln -s "$(basename "$VSIX_PATH")" "$LATEST_LINK"
log "Created symlink: $(basename "$LATEST_LINK") -> $(basename "$VSIX_PATH")"

# Summary
log "Build Summary:"
log "  Package: $VSIX_FILENAME"
log "  Size: $PACKAGE_SIZE"
log "  Location: $VSIX_PATH"
log "  Build type: $([ "$DEV_BUILD" = true ] && echo "Development" || echo "Production")"

success "VSIX build completed successfully!"

# Optional: Open containing folder (macOS/Linux)
if command -v open &> /dev/null; then
    log "Opening output directory..."
    open "$OUTPUT_DIR"
elif command -v xdg-open &> /dev/null; then
    log "Opening output directory..."
    xdg-open "$OUTPUT_DIR"
fi

exit 0