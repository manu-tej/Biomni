# Biomni MCP Integration - VSCode Extension

A VSCode extension that integrates Biomni's Model Context Protocol (MCP) capabilities directly into your development environment, providing intelligent code assistance and AI-powered development tools.

## Features

- **MCP Integration**: Connect to Biomni MCP servers for enhanced AI assistance
- **Command Palette**: Easy activation/deactivation through VSCode commands
- **Configuration**: Flexible settings for server URLs and behavior
- **TypeScript**: Built with TypeScript for type safety and better development experience

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

### Commands

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