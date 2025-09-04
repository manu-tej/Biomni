# Biomni VSCode Extension - Installation Guide

## Overview

The Biomni VSCode Extension brings powerful bioinformatics capabilities directly into your Visual Studio Code environment. This extension provides intelligent analysis and tools for biological file formats including FASTA, FASTQ, VCF, and many more.

## System Requirements

### Minimum Requirements
- **Visual Studio Code**: Version 1.90.0 or higher
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Memory**: 4 GB RAM (8 GB recommended)
- **Storage**: 500 MB free space
- **Network**: Internet connection for initial setup and external tool integration

### Recommended Requirements
- **Visual Studio Code**: Latest version
- **Node.js**: Version 18.x or 20.x (for development features)
- **Memory**: 8 GB RAM or higher
- **Storage**: 2 GB free space (for caching and temporary files)
- **CPU**: Multi-core processor (for parallel processing features)

## Installation Methods

### Method 1: Visual Studio Code Marketplace (Recommended)

1. **Open Visual Studio Code**
2. **Access Extensions Panel**:
   - Click the Extensions icon in the Activity Bar (left sidebar)
   - Or use keyboard shortcut: `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS)
3. **Search for Extension**:
   - Type "Biomni MCP Integration" in the search box
   - Look for the extension by "biomni" publisher
4. **Install Extension**:
   - Click the "Install" button
   - Wait for the installation to complete
   - The extension will activate automatically

### Method 2: Install from VSIX File

If you have received a `.vsix` file or need to install a specific version:

1. **Download the VSIX File**:
   - Download the latest `.vsix` file from the [GitHub Releases](https://github.com/manu-tej/epic-vscode-extension/releases)
   - Or obtain it from your system administrator

2. **Install via Command Palette**:
   - Open VS Code
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type "Extensions: Install from VSIX" and select the command
   - Browse to and select your downloaded `.vsix` file
   - Click "Install"

3. **Alternative Installation Method**:
   - Open VS Code
   - Go to Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`)
   - Click the "..." (More Actions) button at the top of the Extensions panel
   - Select "Install from VSIX..."
   - Choose your `.vsix` file

### Method 3: Development Installation (For Contributors)

If you want to install from source code or contribute to development:

1. **Prerequisites**:
   ```bash
   # Install Node.js (version 18 or 20)
   node --version  # Should show v18.x.x or v20.x.x
   npm --version   # Should show 8.x.x or higher
   ```

2. **Clone Repository**:
   ```bash
   git clone https://github.com/manu-tej/epic-vscode-extension.git
   cd epic-vscode-extension
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Compile the Extension**:
   ```bash
   npm run compile
   ```

5. **Launch Development Host**:
   - Open the project in VS Code
   - Press `F5` to launch a new Extension Development Host window
   - The extension will be loaded in the development environment

## First-Time Setup

### 1. Verify Installation

After installation, verify the extension is working:

1. **Check Extension Status**:
   - Go to Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`)
   - Search for "Biomni" - it should show as "Enabled"
   - Look for the green checkmark indicating successful installation

2. **Access Biomni Commands**:
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P` to open Command Palette
   - Type "Biomni" - you should see various Biomni commands available

3. **Test File Recognition**:
   - Create a test file with extension `.fasta`, `.fastq`, or `.vcf`
   - Open the file in VS Code
   - Right-click in the file - you should see Biomni-specific context menu options

### 2. Configure Basic Settings

1. **Open Settings**:
   - Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
   - Or go to File → Preferences → Settings

2. **Search for Biomni Settings**:
   - Type "biomni" in the settings search box
   - You should see all Biomni-related configuration options

3. **Essential Configuration**:
   ```json
   {
     "biomni.extension.core.enabled": true,
     "biomni.extension.core.autoActivate": true,
     "biomni.extension.fileDetection.enabled": true,
     "biomni.extension.fileDetection.showSmartSuggestions": true
   }
   ```

### 3. MCP Server Configuration (Optional)

If you have a Biomni MCP server running:

1. **Configure Server URL**:
   ```json
   {
     "biomni.extension.core.mcpServerUrl": "http://localhost:8080"
   }
   ```

2. **Test Connection**:
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run "Biomni: Activate MCP Integration"
   - Check the Output panel for connection status

## Platform-Specific Installation Notes

### Windows

- **Windows Defender**: You may need to allow VS Code and the extension through Windows Defender
- **PowerShell Execution Policy**: For development installation, you might need to run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **Path Configuration**: Ensure VS Code is in your system PATH for command-line operations

### macOS

- **Gatekeeper**: macOS may show security warnings for the extension. Click "Allow" if prompted
- **Xcode Command Line Tools**: For development features, install with:
  ```bash
  xcode-select --install
  ```
- **Homebrew** (recommended for additional tools):
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

### Linux

- **Package Manager**: Install VS Code via your distribution's package manager
- **Dependencies**: Ensure you have build essentials installed:
  ```bash
  # Ubuntu/Debian
  sudo apt update && sudo apt install -y build-essential

  # CentOS/RHEL/Fedora
  sudo yum groupinstall -y "Development Tools"  # or dnf for newer versions
  ```
- **Snap Installation**: If using VS Code via Snap, the extension should work normally

## Verification Steps

### Quick Verification Checklist

After installation, verify these items work correctly:

- [ ] Extension appears in Extensions panel as "Enabled"
- [ ] Biomni commands available in Command Palette
- [ ] File type recognition for biological formats (.fasta, .fastq, .vcf)
- [ ] Context menu options appear for supported files
- [ ] Settings panel shows Biomni configuration options
- [ ] Status bar shows Biomni indicators (if applicable)

### Test File Verification

Create and test with sample files:

1. **FASTA Test File** (`test.fasta`):
   ```
   >Sample_Sequence_1
   ATCGATCGATCGATCG
   >Sample_Sequence_2
   GCTAGCTAGCTAGCTA
   ```

2. **FASTQ Test File** (`test.fastq`):
   ```
   @Sequence_1
   ATCGATCGATCGATCG
   +
   IIIIIIIIIIIIIIII
   ```

3. **VCF Test File** (`test.vcf`):
   ```
   ##fileformat=VCFv4.2
   #CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
   chr1	100	.	A	T	60	PASS	.
   ```

Open these files in VS Code and verify:
- Syntax highlighting is applied
- Right-click context menus show Biomni options
- Files are recognized as their respective biological formats

## Troubleshooting

### Common Installation Issues

#### Extension Not Appearing in Extensions Panel

**Symptoms**: Cannot find "Biomni MCP Integration" in VS Code Extensions
**Solutions**:
1. Ensure you're searching for the exact name: "Biomni MCP Integration"
2. Check that your VS Code version meets requirements (1.90.0+)
3. Restart VS Code and try again
4. Clear VS Code cache:
   - Close VS Code
   - Delete cache folder:
     - Windows: `%APPDATA%\Code\User\workspaceStorage`
     - macOS: `~/Library/Application Support/Code/User/workspaceStorage`
     - Linux: `~/.config/Code/User/workspaceStorage`
   - Restart VS Code

#### Extension Installation Fails

**Symptoms**: "Installation failed" or "Extension failed to install"
**Solutions**:
1. **Check Network Connection**: Ensure stable internet connection
2. **Proxy Configuration**: If behind corporate proxy, configure VS Code proxy settings:
   ```json
   {
     "http.proxy": "http://proxy.company.com:8080",
     "http.proxyStrictSSL": false
   }
   ```
3. **Disk Space**: Ensure sufficient free disk space (>500MB)
4. **Permissions**: Run VS Code as administrator (Windows) or with sudo (Linux/macOS)
5. **Firewall**: Temporarily disable firewall/antivirus and try again

#### Extension Installed but Not Working

**Symptoms**: Extension appears installed but features don't work
**Solutions**:
1. **Restart VS Code**: Close and reopen VS Code completely
2. **Check Extension Status**: In Extensions panel, ensure extension shows "Enabled" not "Disabled"
3. **Enable Extension**: If disabled, click "Enable" button
4. **Reload Window**: Press `Ctrl+Shift+P` / `Cmd+Shift+P`, run "Developer: Reload Window"
5. **Check Error Messages**: Open VS Code Developer Tools (`Help` → `Toggle Developer Tools`) and check Console tab for errors

### File Recognition Issues

#### Biological Files Not Recognized

**Symptoms**: .fasta, .fastq, .vcf files don't show Biomni features
**Solutions**:
1. **Check File Extensions**: Ensure files have correct extensions (.fasta, .fa, .fastq, .fq, .vcf)
2. **Verify Settings**:
   ```json
   {
     "biomni.extension.fileDetection.enabled": true
   }
   ```
3. **Manual Language Assignment**: 
   - Click language indicator in status bar (bottom right)
   - Select appropriate language (FASTA, FASTQ, VCF)

### Performance Issues

#### Extension Slow to Load

**Symptoms**: VS Code takes long time to start or extension features are slow
**Solutions**:
1. **Disable Auto-Activation** (temporarily):
   ```json
   {
     "biomni.extension.core.autoActivate": false
   }
   ```
2. **Adjust Cache Settings**:
   ```json
   {
     "biomni.performance.cache.enabled": true,
     "biomni.performance.cache.size": 128
   }
   ```
3. **Reduce Concurrent Jobs**:
   ```json
   {
     "biomni.performance.processing.maxConcurrentJobs": 2
   }
   ```

#### High Memory Usage

**Symptoms**: VS Code uses excessive RAM
**Solutions**:
1. **Limit Memory Usage**:
   ```json
   {
     "biomni.performance.memory.maxMemoryUsage": 256,
     "biomni.performance.memory.enableGarbageCollection": true
   }
   ```
2. **Reduce Cache Size**:
   ```json
   {
     "biomni.performance.cache.size": 64,
     "biomni.performance.cache.maxFiles": 500
   }
   ```

### Network and Connectivity Issues

#### MCP Server Connection Fails

**Symptoms**: "Failed to connect to MCP server" errors
**Solutions**:
1. **Verify Server URL**: Check that MCP server is running and accessible:
   ```bash
   # Test connection
   curl http://localhost:8080/health
   ```
2. **Check Firewall**: Ensure firewall allows connections to MCP server port
3. **Configure Allowed Hosts**:
   ```json
   {
     "biomni.security.external.allowedHosts": [
       "localhost",
       "your-server.com"
     ]
   }
   ```

## Advanced Configuration

### Workspace-Specific Settings

Create `.vscode/settings.json` in your project root for project-specific configuration:

```json
{
  "biomni.extension.core.enabled": true,
  "biomni.tools.blast.database": "nt",
  "biomni.tools.alignment.algorithm": "muscle",
  "biomni.display.sequences.colorScheme": "nucleotide"
}
```

### User Settings Backup

To backup your Biomni settings:

1. **Export Settings**:
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run "Biomni Settings: Export Settings"
   - Save the JSON file

2. **Import Settings**:
   - Run "Biomni Settings: Import Settings"
   - Select your saved JSON file

### Performance Tuning

For optimal performance with large files:

```json
{
  "biomni.performance.processing.enableParallelProcessing": true,
  "biomni.performance.processing.maxConcurrentJobs": 4,
  "biomni.performance.cache.enabled": true,
  "biomni.performance.cache.size": 512,
  "biomni.display.sequences.maxSequenceLength": 5000
}
```

## Getting Help

### Documentation Resources

- **User Guide**: [Full documentation](docs/user-guide/)
- **API Reference**: [API documentation](docs/api/)
- **Video Tutorials**: [Tutorial videos](docs/videos/)
- **GitHub Issues**: [Report bugs or request features](https://github.com/manu-tej/epic-vscode-extension/issues)

### Support Channels

- **GitHub Discussions**: Community support and questions
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides and examples

### Diagnostic Information

If you need to provide diagnostic information for support:

1. **Get Extension Info**:
   - Go to Extensions panel
   - Click on Biomni extension
   - Note version number and status

2. **Collect Logs**:
   - Open Output panel (`View` → `Output`)
   - Select "Biomni MCP Integration" from the dropdown
   - Copy relevant log entries

3. **System Information**:
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Run "Developer: Reload Window with Extensions Disabled"
   - Note if issues persist without extensions

---

## Next Steps

After successful installation:

1. **Read the Getting Started Guide**: [docs/user-guide/getting-started.md](getting-started.md)
2. **Explore Configuration Options**: [docs/user-guide/configuration.md](configuration.md)
3. **Watch Video Tutorials**: [docs/videos/](../videos/)
4. **Join the Community**: [GitHub Discussions](https://github.com/manu-tej/epic-vscode-extension/discussions)

Happy bioinformatics coding with Biomni! 🧬