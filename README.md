# Biomni MCP Integration - VSCode Extension

A VSCode extension that integrates Biomni's Model Context Protocol (MCP) capabilities directly into your development environment, providing intelligent code assistance and AI-powered development tools.

## Features

- **🧬 Comprehensive Command Palette**: 20+ Biomni tools accessible via Ctrl+Shift+P
- **🔍 Database Integration**: Query UniProt, PDB, AlphaFold, and InterPro databases
- **🧪 Genomics Analysis**: BLAST searches, sequence analysis, and scRNA-seq annotation
- **💊 Pharmacology Tools**: Molecular docking and ADMET property prediction
- **📁 File Format Support**: FASTA, FASTQ, VCF, and other biological file formats
- **⚡ Context-Sensitive Commands**: Relevant tools appear based on file types
- **⌨️ Keyboard Shortcuts**: Quick access to frequently used commands
- **🔧 MCP Integration**: Connect to Biomni MCP servers for enhanced AI assistance
- **⚙️ Flexible Configuration**: Customizable settings for all tools and behaviors

## Requirements

- VS Code ^1.90.0
- Node.js 18.x or higher
- Biomni MCP server (for full functionality)

## Installation

### From VSIX
1. Download the latest `.vsix` file from releases
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
4. Type "Install from VSIX" and select the command
5. Choose the downloaded `.vsix` file

### From Source
1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Press `F5` to launch a new Extension Development Host

## Usage

### Command Palette Access

Open the command palette with `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type "Biomni" to see all available commands:

#### Quick Access Commands
- `Ctrl+Shift+U` - Query UniProt Database
- `Ctrl+Shift+B` - BLAST Sequence Search (context-sensitive)
- `Ctrl+Shift+D` - Molecular Docking with DiffDock
- `Ctrl+Shift+V` - Validate File Format (context-sensitive)

#### Database Commands
- **Query UniProt Database** - Search for protein information
- **Query Protein Data Bank** - Find protein structures
- **Query AlphaFold Database** - Get structure predictions
- **Query InterPro Database** - Search protein domains

#### Genomics Commands
- **BLAST Sequence Search** - Perform sequence searches
- **Annotate Single Cell RNA-seq** - Cell type annotation
- **Liftover Genomic Coordinates** - Convert between genome builds
- **ATAC-seq Differential Accessibility** - Analyze chromatin data

#### File Operations
- **Validate File Format** - Check biological file formats
- **Show File Information** - Display file metadata
- **Suggest Analysis Tools** - Get tool recommendations

For a complete list of commands and detailed usage, see [Command Palette Documentation](./docs/command-palette.md).

### Extension Management

- `Biomni: Activate MCP Integration` - Manually activate the extension
- `Biomni: Deactivate MCP Integration` - Manually deactivate the extension

### Configuration

Configure the extension through VS Code settings (`Ctrl+,` or `Cmd+,`):

```json
{
  "biomni.enabled": true,
  "biomni.mcpServerUrl": "http://localhost:8080",
  "biomni.autoActivate": true
}
```

#### Settings

- `biomni.enabled` (boolean): Enable/disable the extension (default: `true`)
- `biomni.mcpServerUrl` (string): MCP server URL (default: `"http://localhost:8080"`)
- `biomni.autoActivate` (boolean): Auto-activate on workspace open (default: `true`)

## Development

### Prerequisites

- Node.js 18.x or 20.x
- npm or yarn

### Setup

```bash
git clone <repository-url>
cd epic-vscode-extension
npm install
```

### Building

```bash
npm run compile       # Compile TypeScript
npm run watch        # Watch mode for development
npm run package      # Create VSIX package
```

### Testing

```bash
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Linting

```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
```

## Project Structure

```
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── biomni/
│   │   └── mcpClient.ts      # MCP client implementation
│   └── types/
│       ├── config.ts         # Configuration types
│       └── index.ts          # Type exports
├── test/
│   ├── setup.ts              # Test setup and mocks
│   ├── extension.test.ts     # Extension tests
│   └── biomni/
│       └── mcpClient.test.ts # MCP client tests
├── out/                      # Compiled JavaScript output
├── .github/workflows/        # CI/CD pipeline
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest test configuration
├── .eslintrc.json           # ESLint configuration
└── .prettierrc              # Prettier configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows the [Conventional Commits](https://conventionalcommits.org/) specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or modifications
- `chore:` Build process or auxiliary tool changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### [0.0.1] - 2025-09-04

#### Added
- Initial extension setup with TypeScript
- Basic MCP client implementation
- Extension activation/deactivation commands
- Configuration settings
- Jest testing framework
- ESLint and Prettier setup
- GitHub Actions CI/CD pipeline