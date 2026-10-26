# Biomni Extension API Keys Setup

## Quick Setup Guide

The Biomni VSCode extension is now configured and the MCP server is running! 

### Current Status:
✅ **MCP Server**: Running on http://localhost:8080  
✅ **Extension**: Installed and commands available  
⚠️ **API Keys**: Need to be configured  

## Configure API Keys

1. **Open VSCode**

2. **Open Command Palette**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)

3. **Run API Key Management Command**
   - Type: `Biomni: Manage API Keys`
   - Press Enter

4. **Add Your API Keys** (Optional - for full functionality)

### Getting API Keys

While the extension works with the mock server for testing, for real bioinformatics queries you'll need API keys from:

#### NCBI (National Center for Biotechnology Information)
- **Sign up**: https://www.ncbi.nlm.nih.gov/account/
- **Get API key**: https://www.ncbi.nlm.nih.gov/account/settings/
- **Documentation**: https://www.ncbi.nlm.nih.gov/books/NBK25497/

#### UniProt (Universal Protein Resource)
- **Website**: https://www.uniprot.org/
- **API Docs**: https://www.uniprot.org/help/api
- **Note**: Most endpoints work without authentication

#### Ensembl
- **Website**: https://www.ensembl.org/
- **REST API**: https://rest.ensembl.org/
- **Note**: No API key required for basic usage

#### Protein Data Bank (PDB)
- **Website**: https://www.rcsb.org/
- **API Docs**: https://www.rcsb.org/docs/api/getting-started
- **Note**: No API key required for basic queries

#### AlphaFold
- **Website**: https://alphafold.ebi.ac.uk/
- **API Docs**: https://alphafold.ebi.ac.uk/api-docs
- **Note**: No API key required

#### InterPro
- **Website**: https://www.ebi.ac.uk/interpro/
- **API Docs**: https://www.ebi.ac.uk/interpro/api/
- **Note**: No API key required

## Test the Extension

### 1. Activate the Extension
- Command: `Biomni: Activate Biomni MCP Integration`

### 2. Test Connection
- Command: `Biomni: Test Connection`
- This should show "Connected to MCP server"

### 3. Try Basic Commands
Without API keys, you can test with mock data:
- `Biomni: Validate File Format` - Validates bioinformatics file formats
- `Biomni: Show File Info` - Displays file information
- `Biomni: Open Settings Panel` - Configure extension settings

### 4. Try Database Queries (with API keys)
Once API keys are configured:
- `Biomni: Query UniProt Database`
- `Biomni: Query PDB Database`
- `Biomni: Run BLAST Sequence Analysis`

## MCP Server Management

### Check Server Status
```bash
curl http://localhost:8080/health
```

### View Server Logs
```bash
tail -f mcp-server.log
```

### Stop Server
```bash
# Find the process
ps aux | grep basic_mcp_server

# Kill the process
kill <PID>
```

### Restart Server
```bash
./start-mcp-server.sh
```

## Troubleshooting

### Extension Not Responding
1. Check MCP server is running: `curl http://localhost:8080/health`
2. Reload VSCode window: `Cmd+Shift+P` → "Developer: Reload Window"
3. Check Output panel: View → Output → Select "Biomni" from dropdown

### Commands Not Found
1. Ensure extension is installed: Extensions view → Search "Biomni"
2. Check extension is enabled
3. Reload VSCode window

### Server Connection Failed
1. Verify server is running on port 8080
2. Check firewall settings
3. Try restarting the server

### API Key Issues
1. Ensure keys are saved in VSCode's secure storage
2. Check API key validity with the service provider
3. Some services have rate limits - wait and retry

## Next Steps

1. **Explore Features**: Try different bioinformatics analysis commands
2. **Customize Settings**: `Biomni: Open Settings Panel`
3. **Read Documentation**: Check the extension README for detailed usage
4. **Report Issues**: File bugs on the GitHub repository

## Support

For issues or questions:
- Check VSCode Output panel for error messages
- Review server logs: `tail -f mcp-server.log`
- Use Developer Tools: Help → Toggle Developer Tools