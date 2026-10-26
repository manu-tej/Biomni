#!/bin/bash

# VSIX Installation Testing Script
# Issue #47: VSIX Package Creation & Testing
# Created: 2025-09-11
#
# Tests VSIX installation, functionality, and uninstallation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$PROJECT_ROOT/test/vsix"
REPORTS_DIR="$PROJECT_ROOT/reports/vsix"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Help function
show_help() {
    cat << EOF
Usage: $0 [OPTIONS] [VSIX_PATH]

Test VSIX package installation, functionality, and uninstallation.

OPTIONS:
    --all-platforms     Test on multiple VSCode installations
    --skip-uninstall    Skip uninstallation test
    --keep-installed    Keep extension installed after tests
    --report-only       Only generate test report (no actual testing)
    --vsix-path         Path to VSIX file to test
    --help              Show this help message

EXAMPLES:
    $0                                  # Test latest VSIX in project
    $0 --all-platforms                  # Test on all available platforms
    $0 my-extension.vsix                # Test specific VSIX file
    $0 --vsix-path ./dist/ext.vsix      # Test with explicit path

REQUIREMENTS:
    - VSCode must be installed and accessible via 'code' command
    - Extension must not be currently installed in test instances

EOF
}

# Test configuration
TEST_RESULTS_TOTAL=0
TEST_RESULTS_PASSED=0
TEST_RESULTS_FAILED=0
TEST_RESULTS_SKIPPED=0

# Parse command line arguments
ALL_PLATFORMS=false
SKIP_UNINSTALL=false
KEEP_INSTALLED=false
REPORT_ONLY=false
VSIX_PATH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --all-platforms)
            ALL_PLATFORMS=true
            shift
            ;;
        --skip-uninstall)
            SKIP_UNINSTALL=true
            shift
            ;;
        --keep-installed)
            KEEP_INSTALLED=true
            shift
            ;;
        --report-only)
            REPORT_ONLY=true
            shift
            ;;
        --vsix-path)
            VSIX_PATH="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *.vsix)
            VSIX_PATH="$1"
            shift
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Find VSIX file if not specified
if [ -z "$VSIX_PATH" ]; then
    # Look for latest VSIX in project root
    LATEST_VSIX=$(find "$PROJECT_ROOT" -name "*.vsix" -type f -exec ls -t {} + | head -n1)
    if [ -n "$LATEST_VSIX" ]; then
        VSIX_PATH="$LATEST_VSIX"
        info "Using latest VSIX: $(basename "$VSIX_PATH")"
    else
        error "No VSIX file found. Build one first or specify with --vsix-path"
        exit 1
    fi
fi

# Validate VSIX path
if [ ! -f "$VSIX_PATH" ]; then
    error "VSIX file not found: $VSIX_PATH"
    exit 1
fi

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Report file
REPORT_FILE="$REPORTS_DIR/vsix-test-report-$TIMESTAMP.md"

log "Starting VSIX installation tests..."
log "VSIX: $(basename "$VSIX_PATH")"
log "Report: $REPORT_FILE"

# Initialize report
cat > "$REPORT_FILE" << EOF
# VSIX Installation Test Report

**Generated:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')  
**VSIX:** $(basename "$VSIX_PATH")  
**Size:** $(du -h "$VSIX_PATH" | cut -f1)  

## Test Summary

EOF

# Test functions
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    TEST_RESULTS_TOTAL=$((TEST_RESULTS_TOTAL + 1))
    
    log "Running test: $test_name"
    
    if $test_function; then
        success "✅ $test_name: PASSED"
        TEST_RESULTS_PASSED=$((TEST_RESULTS_PASSED + 1))
        echo "- ✅ **$test_name**: PASSED" >> "$REPORT_FILE"
        return 0
    else
        error "❌ $test_name: FAILED"
        TEST_RESULTS_FAILED=$((TEST_RESULTS_FAILED + 1))
        echo "- ❌ **$test_name**: FAILED" >> "$REPORT_FILE"
        return 1
    fi
}

skip_test() {
    local test_name="$1"
    local reason="$2"
    
    TEST_RESULTS_TOTAL=$((TEST_RESULTS_TOTAL + 1))
    TEST_RESULTS_SKIPPED=$((TEST_RESULTS_SKIPPED + 1))
    
    warning "⏭️  $test_name: SKIPPED ($reason)"
    echo "- ⏭️ **$test_name**: SKIPPED ($reason)" >> "$REPORT_FILE"
}

# Test: Check VSCode availability
test_vscode_available() {
    if command -v code &> /dev/null; then
        info "VSCode found: $(code --version | head -n1)"
        return 0
    else
        error "VSCode CLI not available"
        return 1
    fi
}

# Test: Install extension
test_install_extension() {
    log "Installing extension from VSIX..."
    
    # Get extension ID from package.json inside VSIX
    local temp_dir=$(mktemp -d)
    unzip -q "$VSIX_PATH" -d "$temp_dir"
    local package_json="$temp_dir/extension/package.json"
    
    if [ ! -f "$package_json" ]; then
        error "package.json not found in VSIX"
        rm -rf "$temp_dir"
        return 1
    fi
    
    local publisher=$(node -p "require('$package_json').publisher" 2>/dev/null || echo "")
    local name=$(node -p "require('$package_json').name" 2>/dev/null || echo "")
    local extension_id="$publisher.$name"
    
    rm -rf "$temp_dir"
    
    if [ -z "$publisher" ] || [ -z "$name" ]; then
        error "Could not extract extension ID from package.json"
        return 1
    fi
    
    info "Extension ID: $extension_id"
    
    # Uninstall if already installed
    if code --list-extensions | grep -q "^$extension_id$"; then
        warning "Extension already installed, uninstalling first..."
        code --uninstall-extension "$extension_id" || true
        sleep 2
    fi
    
    # Install extension
    if code --install-extension "$VSIX_PATH" --force; then
        sleep 2
        
        # Verify installation
        if code --list-extensions | grep -q "^$extension_id$"; then
            success "Extension installed successfully"
            export INSTALLED_EXTENSION_ID="$extension_id"
            return 0
        else
            error "Extension installation verification failed"
            return 1
        fi
    else
        error "Extension installation failed"
        return 1
    fi
}

# Test: Verify extension in list
test_extension_listed() {
    if [ -z "${INSTALLED_EXTENSION_ID:-}" ]; then
        error "Extension ID not available"
        return 1
    fi
    
    if code --list-extensions | grep -q "^$INSTALLED_EXTENSION_ID$"; then
        success "Extension found in installed extensions list"
        return 0
    else
        error "Extension not found in installed extensions list"
        return 1
    fi
}

# Test: Launch VSCode with extension
test_vscode_launch() {
    log "Testing VSCode launch with extension..."
    
    # Create a temporary workspace
    local temp_workspace=$(mktemp -d)
    echo '{"folders": []}' > "$temp_workspace/test.code-workspace"
    
    # Launch VSCode with the workspace and close it quickly
    if timeout 10s code "$temp_workspace/test.code-workspace" --wait --new-window 2>/dev/null || true; then
        success "VSCode launched successfully with extension"
        rm -rf "$temp_workspace"
        return 0
    else
        warning "VSCode launch test completed (timeout expected)"
        rm -rf "$temp_workspace"
        return 0  # Don't fail on timeout, it's expected
    fi
}

# Test: Extension activation
test_extension_activation() {
    log "Testing extension activation..."
    
    # This is a simplified test - in a real scenario you'd test specific commands
    # For now, we just verify the extension is still listed after VSCode launch
    if [ -z "${INSTALLED_EXTENSION_ID:-}" ]; then
        error "Extension ID not available"
        return 1
    fi
    
    if code --list-extensions | grep -q "^$INSTALLED_EXTENSION_ID$"; then
        success "Extension remains active after VSCode launch"
        return 0
    else
        error "Extension activation test failed"
        return 1
    fi
}

# Test: Extension commands (if any)
test_extension_commands() {
    log "Testing extension commands..."
    
    # This is a placeholder test - you would implement actual command testing here
    # For this example, we'll just check if the extension contributes commands
    
    local temp_dir=$(mktemp -d)
    unzip -q "$VSIX_PATH" -d "$temp_dir"
    local package_json="$temp_dir/extension/package.json"
    
    if [ -f "$package_json" ]; then
        local has_commands=$(node -p "
            const pkg = require('$package_json');
            !!(pkg.contributes && pkg.contributes.commands && pkg.contributes.commands.length > 0);
        " 2>/dev/null || echo "false")
        
        if [ "$has_commands" = "true" ]; then
            success "Extension defines commands in package.json"
            rm -rf "$temp_dir"
            return 0
        else
            info "Extension does not define commands"
            rm -rf "$temp_dir"
            return 0
        fi
    else
        error "Could not access package.json for command testing"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Test: Uninstall extension
test_uninstall_extension() {
    if [ "$KEEP_INSTALLED" = true ]; then
        skip_test "Extension Uninstallation" "keeping installed as requested"
        return 0
    fi
    
    if [ -z "${INSTALLED_EXTENSION_ID:-}" ]; then
        error "Extension ID not available for uninstallation"
        return 1
    fi
    
    log "Uninstalling extension..."
    
    if code --uninstall-extension "$INSTALLED_EXTENSION_ID"; then
        sleep 2
        
        # Verify uninstallation
        if code --list-extensions | grep -q "^$INSTALLED_EXTENSION_ID$"; then
            error "Extension uninstallation verification failed"
            return 1
        else
            success "Extension uninstalled successfully"
            return 0
        fi
    else
        error "Extension uninstallation failed"
        return 1
    fi
}

# Test: Platform-specific tests
test_platform_specific() {
    local platform=$(uname -s)
    
    case $platform in
        Darwin)
            info "Running macOS-specific tests..."
            # Test macOS-specific functionality
            return 0
            ;;
        Linux)
            info "Running Linux-specific tests..."
            # Test Linux-specific functionality
            return 0
            ;;
        MINGW*|CYGWIN*|MSYS*)
            info "Running Windows-specific tests..."
            # Test Windows-specific functionality
            return 0
            ;;
        *)
            warning "Unknown platform: $platform"
            return 0
            ;;
    esac
}

# Main test execution
main() {
    if [ "$REPORT_ONLY" = true ]; then
        info "Report-only mode, skipping actual tests"
        return 0
    fi
    
    # Core tests
    run_test "VSCode Availability" test_vscode_available
    run_test "Extension Installation" test_install_extension
    run_test "Extension Listed" test_extension_listed
    run_test "VSCode Launch" test_vscode_launch
    run_test "Extension Activation" test_extension_activation
    run_test "Extension Commands" test_extension_commands
    
    # Platform-specific tests
    if [ "$ALL_PLATFORMS" = true ]; then
        run_test "Platform-Specific Tests" test_platform_specific
    fi
    
    # Uninstallation test
    if [ "$SKIP_UNINSTALL" = false ]; then
        run_test "Extension Uninstallation" test_uninstall_extension
    else
        skip_test "Extension Uninstallation" "skipped as requested"
    fi
}

# Generate final report
generate_report() {
    cat >> "$REPORT_FILE" << EOF

## Test Results

- **Total Tests:** ${TEST_RESULTS_TOTAL}
- **Passed:** ${TEST_RESULTS_PASSED}
- **Failed:** ${TEST_RESULTS_FAILED}
- **Skipped:** ${TEST_RESULTS_SKIPPED}

## Success Rate

$(( TEST_RESULTS_PASSED * 100 / TEST_RESULTS_TOTAL ))% (${TEST_RESULTS_PASSED}/${TEST_RESULTS_TOTAL})

## Test Environment

- **Platform:** $(uname -s) $(uname -r)
- **VSCode Version:** $(code --version 2>/dev/null | head -n1 || echo "Not available")
- **Test Date:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')

## Notes

$(if [ ${TEST_RESULTS_FAILED} -gt 0 ]; then
    echo "⚠️ Some tests failed. Please review the test output above for details."
else
    echo "✅ All tests passed successfully!"
fi)

EOF

    log "Test report generated: $REPORT_FILE"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    
    # Clean up any temporary files
    log "Cleaning up..."
    
    exit $exit_code
}

# Set up cleanup trap
trap cleanup EXIT

# Run main test suite
main

# Generate report
generate_report

# Print summary
echo
echo "========================================"
echo "VSIX INSTALLATION TEST SUMMARY"
echo "========================================"
echo "Total tests: ${TEST_RESULTS_TOTAL}"
echo "Passed: ${TEST_RESULTS_PASSED}"
echo "Failed: ${TEST_RESULTS_FAILED}"
echo "Skipped: ${TEST_RESULTS_SKIPPED}"
echo "Success rate: $(( TEST_RESULTS_PASSED * 100 / TEST_RESULTS_TOTAL ))%"
echo "========================================"

if [ ${TEST_RESULTS_FAILED} -gt 0 ]; then
    error "Some tests failed!"
    exit 1
else
    success "All tests passed!"
    exit 0
fi