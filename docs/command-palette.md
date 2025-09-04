# Command Palette Integration

The Biomni VSCode extension provides comprehensive command palette integration, making it easy to access genomics tools, sequence analysis, and data processing commands through VSCode's native Ctrl/Cmd+Shift+P interface.

## Overview

The extension exposes 20+ Biomni tools through the command palette, organized by category and priority for optimal user experience. All commands are prefixed with "Biomni" for easy identification and searching.

## Command Categories

### Database Commands (High Priority)
- **Query UniProt Database** (`Ctrl+Shift+U`) - Search UniProt for protein information
- **Query Protein Data Bank** - Search PDB for protein structures 
- **Query AlphaFold Database** - Get AlphaFold protein structure predictions
- **Query InterPro Database** - Search InterPro for protein domains and families

### Genomics Commands (High Priority)
- **BLAST Sequence Search** (`Ctrl+Shift+B`) - Perform BLAST search on sequences
- **Annotate Single Cell RNA-seq** - Annotate cell types in scRNA-seq data
- **Liftover Genomic Coordinates** - Convert coordinates between genome builds
- **ATAC-seq Differential Accessibility** - Analyze chromatin accessibility changes

### Pharmacology Commands
- **Molecular Docking with DiffDock** (`Ctrl+Shift+D`) - Perform protein-ligand docking
- **Predict ADMET Properties** - Predict absorption, distribution, metabolism, excretion, toxicity

### Analysis Commands
- **Predict Protein Disorder Regions** - Identify intrinsically disordered regions
- **Analyze Circular Dichroism Spectra** - Analyze protein secondary structure from CD
- **Analyze Cell Migration Metrics** - Quantify cell migration and motility patterns
- **Execute Python Code** - Run Python code with Biomni environment

### File Operations
- **Validate Biological File Format** (`Ctrl+Shift+V`) - Validate FASTA, FASTQ, VCF files
- **Show File Information** - Display detailed information about biological files
- **Suggest Analysis Tools** - Get tool suggestions based on file type

### Systems Biology
- **Flux Balance Analysis** - Perform FBA on metabolic networks

### Literature & Support
- **Query ArXiv Papers** - Search for relevant scientific papers
- **Refresh MCP Tools** - Refresh available tools from MCP server

## Using the Command Palette

### Basic Usage

1. **Open Command Palette**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. **Type "Biomni"**: Start typing to filter Biomni commands
3. **Select Command**: Use arrow keys or mouse to select the desired command
4. **Execute**: Press Enter to execute the command

### Fuzzy Search

The command palette supports fuzzy search, allowing you to find commands quickly:

- Type `"biomni blast"` to find BLAST-related commands
- Type `"biomni protein"` to find protein analysis commands
- Type `"biomni file"` to find file operation commands

### Keyboard Shortcuts

Frequently used commands have keyboard shortcuts for quick access:

- `Ctrl+Shift+U` - Query UniProt Database
- `Ctrl+Shift+B` - BLAST Sequence Search (context-sensitive)
- `Ctrl+Shift+D` - Molecular Docking with DiffDock
- `Ctrl+Shift+V` - Validate File Format (context-sensitive)

### Context-Sensitive Commands

Many commands are context-sensitive and will only appear when relevant files are open:

#### FASTA Files (.fasta, .fa, .seq)
- BLAST Sequence Search
- Annotate Gene Sequence
- Analyze Sequence Properties
- Find Open Reading Frames
- Translate DNA to Protein

#### Single Cell Data (.h5, .h5ad, .csv)
- Annotate Single Cell RNA-seq

#### Genomics Data (.bed, .bedgraph, .bw)
- ATAC-seq Differential Accessibility

#### General Biological Files
- Validate File Format
- Show File Information
- Suggest Tools

## Command Execution Flow

### 1. Input Collection
Most commands will prompt for necessary inputs:
- **Database queries**: Natural language search terms
- **File operations**: File selection dialogs
- **Sequence analysis**: Sequence data from active editor or input prompts
- **Parameters**: Algorithm-specific parameters through quick-pick dialogs

### 2. Progress Indication
Long-running operations show progress notifications:
- **Database searches**: "Searching UniProt..."
- **Analysis tasks**: "Running BLAST search..."
- **File operations**: "Processing file..."

### 3. Result Display
Results are presented in multiple formats:
- **JSON documents**: For structured data like database search results
- **Information messages**: For status updates and confirmations
- **Error dialogs**: For failed operations with detailed error messages

## Error Handling

The extension provides comprehensive error handling:

### Common Error Scenarios
- **MCP Client Not Initialized**: Extension activation required
- **Invalid Input**: User-friendly validation messages
- **Network Failures**: Retry suggestions and connectivity troubleshooting
- **File Access Issues**: Permission and path validation

### Error Recovery
- **Automatic Retry**: For transient network issues
- **Graceful Degradation**: Partial results when possible
- **User Guidance**: Clear next steps for resolving issues

## Configuration

### MCP Server Settings
Commands require a functioning MCP server connection. Configure in VSCode settings:

```json
{
  "biomni.extension.core.enabled": true,
  "biomni.extension.core.mcpServerUrl": "http://localhost:8080",
  "biomni.mcp.server.autoStart": true
}
```

### Tool-Specific Settings
Customize behavior for specific tools:

```json
{
  "biomni.tools.blast.database": "nt",
  "biomni.tools.blast.eValue": 0.01,
  "biomni.tools.alignment.algorithm": "muscle"
}
```

## Tips and Best Practices

### Efficient Workflow
1. **Use Keyboard Shortcuts**: For frequently used commands
2. **Context Menu Integration**: Right-click on files for relevant commands
3. **Command History**: VSCode remembers recently used commands
4. **Batch Operations**: Process multiple files using file selection dialogs

### File Management
1. **Open Relevant Files**: Context-sensitive commands appear automatically
2. **Use Workspace**: Organize related biological data in VSCode workspaces
3. **Result Storage**: Commands create new documents for results - save as needed

### Troubleshooting
1. **Check MCP Status**: Use "Show MCP Server Status" command
2. **Refresh Tools**: Use "Refresh Tool Discovery" if tools are missing
3. **Validate Configuration**: Use "Validate Configuration" command
4. **Check Logs**: Enable debug mode for detailed logging

## Extension Integration

### Output Channel
Monitor command execution in the "Biomni" output channel:
- **View → Output** → Select "Biomni" from dropdown
- Shows detailed logs of command execution
- Helpful for debugging and monitoring progress

### Settings Integration
All commands respect extension settings:
- **File → Preferences → Settings**
- Search for "biomni" to find all configuration options
- Changes take effect immediately

### Workspace Integration
Commands work seamlessly with VSCode workspaces:
- **File-scoped operations**: Work on currently open files
- **Workspace-wide searches**: Find relevant files across the workspace
- **Project context**: Maintain analysis context within projects

## Future Enhancements

The command palette integration will continue to evolve:
- **Additional Tools**: More Biomni tools as they become available
- **Enhanced Context**: Smarter context detection for more relevant commands
- **Workflow Integration**: Command chaining and workflow automation
- **Performance**: Faster command execution and better progress indication

For the latest updates and documentation, visit the [Biomni VSCode Extension repository](https://github.com/manu-tej/epic-vscode-extension).