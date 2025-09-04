# Quick Test Guide for Biomni Extension

## Basic Health Check
1. Open Command Palette (⌘⇧P or Ctrl+Shift+P)
2. Type "Biomni" - you should see all Biomni commands listed
3. If you see the commands, the extension is loaded correctly

## Test Each Feature Area

### API Key Management
- Run: `Biomni: Manage API Keys`
- Expected: Should show a quick pick menu for managing API keys
- If error: Check Developer Console for details

### Configuration Validation  
- Run: `Biomni: Validate Configuration`
- Expected: Should validate and report configuration status
- Success message means settings are correct

### File Type Detection
- Create a file: `test.fasta`
- Add content:
  ```
  >sequence1
  ATCGATCGATCG
  ```
- Expected: File should have syntax highlighting

### MCP Integration (if server is running)
- Run: `Biomni: Show MCP Status`
- Expected: Shows connection status to MCP server
- If not connected, that's OK - just checking command works

## Troubleshooting

### If commands don't appear:
1. Check extension is installed: Extensions view → Search "Biomni"
2. Reload window: Command Palette → "Developer: Reload Window"
3. Check Extension Host logs: Command Palette → "Developer: Show Logs" → Extension Host

### If commands throw errors:
1. Most commands will work even without external services
2. API-dependent commands need API keys configured
3. MCP commands need MCP server running (optional)

## Success Indicators
✅ Commands appear in Command Palette
✅ No errors in Extension Host log on startup
✅ Settings commands open without error
✅ File type detection works for .fasta files