# Extension Test Checklist

## Installation
1. ✅ Package built successfully: `biomni-mcp-integration-0.0.1.vsix`
2. Install in VSCode: Press `Ctrl+Shift+P` → "Install from VSIX"

## Fixed Issues

### Command Registration ✅
- Added 5 settings commands to BIOMNI_COMMANDS array
- Implemented all handlers in BiomniCommandHandlers class
- Fixed context passing to handlers
- Removed duplicate command registrations

### API Improvements ✅
- Added `getAllApiKeys()` method to settings service
- Fixed `updateSetting()` parameter structure
- Improved error handling in settings operations

## Commands to Test

### Settings Commands (Priority)
- `Biomni: Manage API Keys` - Store/remove/list API keys
- `Biomni: Export Settings` - Export configuration to JSON
- `Biomni: Import Settings` - Import configuration from JSON
- `Biomni: Validate Configuration` - Check config validity
- `Biomni: Reset to Defaults` - Reset all settings

### Database Commands
- `Biomni: Query UniProt Database`
- `Biomni: Query Protein Data Bank`
- `Biomni: Query AlphaFold Database`
- `Biomni: Query InterPro Database`

### Genomics Commands
- `Biomni: BLAST Sequence Search`
- `Biomni: Annotate Single Cell RNA-seq`
- `Biomni: Gene Ontology Enrichment`
- `Biomni: Liftover Genomic Coordinates`

### File Operations
- `Biomni: Validate File Format`
- `Biomni: Show File Information`
- `Biomni: Suggest Analysis Tools`

## Extension Features
- ✅ WebSocket MCP connection with reconnection logic
- ✅ 32 command palette commands configured
- ✅ 15+ biological file format detection
- ✅ Molecular & network visualization components
- ✅ Secure API key storage via VSCode SecretStorage
- ✅ Settings import/export functionality
- ✅ TypeScript strict mode compliance

## Known Working Components
- TypeScript compilation: No errors
- Package building: Successfully creates VSIX
- Command registration: All handlers implemented
- Settings service: Full CRUD operations
- File detection: Pattern matching for biological formats

## Test Steps
1. Install the VSIX package
2. Open Command Palette (`Ctrl+Shift+P`)
3. Type "Biomni" to see all commands
4. Test "Manage API Keys" command first
5. Try other commands based on priority

## Troubleshooting
- If commands not found: Reload VSCode window
- If extension not active: Run "Biomni: Activate MCP Integration"
- Check Output panel → "Biomni" for logs

## Package Info
- Version: 0.0.1
- Size: 629.3 KB
- Files: 324
- Compilation: Clean (no TypeScript errors)