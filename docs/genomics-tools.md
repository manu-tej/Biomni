# Biomni Genomics Tools Integration

This document provides comprehensive information about the genomics tools integration in the Biomni VSCode extension.

## Overview

The Biomni VSCode extension includes a complete suite of essential genomics tools that allow researchers to perform common bioinformatics analyses directly within their development environment. The tools are designed to provide professional-grade functionality with user-friendly interfaces and comprehensive result visualization.

## Features

### Core Genomics Tools

1. **BLAST Search**
   - Nucleotide-nucleotide (blastn)
   - Protein-protein (blastp)
   - Translated searches (blastx, tblastn, tblastx)
   - Multiple database support (nr, nt, RefSeq, SwissProt, PDB)
   - Interactive parameter configuration
   - Real-time progress tracking

2. **Gene Annotation**
   - Open Reading Frame (ORF) detection
   - Protein domain identification
   - Functional annotation
   - Genomic feature prediction
   - Multiple genetic code tables support

3. **Sequence Analysis**
   - Nucleotide composition analysis
   - GC content calculation
   - Melting temperature prediction
   - Molecular weight calculation
   - Restriction enzyme site mapping
   - Repeat sequence detection

4. **Interactive Results Viewer**
   - Rich HTML-based results display
   - Sortable and filterable tables
   - Sequence alignment visualization
   - Export to multiple formats
   - Result history and caching

### Supported File Formats

The genomics tools work with various biological file formats:

- **Input Formats**: FASTA (.fasta, .fa, .fas, .seq, .fna, .ffn, .frn), FASTQ (.fastq, .fq)
- **Export Formats**: CSV, JSON, FASTA, GenBank, plain text summaries

## Getting Started

### Prerequisites

1. **Biomni MCP Server**: The genomics tools require the Biomni MCP (Model Context Protocol) server to be running. This provides access to the underlying bioinformatics algorithms.

2. **VSCode Extension**: Install the Biomni VSCode extension from the marketplace or build from source.

### Installation

1. Install the extension:
   ```bash
   code --install-extension biomni-mcp-integration-0.0.1.vsix
   ```

2. Configure the MCP server connection in VSCode settings:
   - Open Settings (Cmd/Ctrl + ,)
   - Search for "Biomni"
   - Configure server settings as needed

### Basic Usage

#### Running a BLAST Search

1. **From File Context**:
   - Right-click on a FASTA file in the Explorer
   - Select "BLAST Sequence Search" from the context menu
   - Configure search parameters in the dialog
   - View results in the interactive results panel

2. **From Command Palette**:
   - Open Command Palette (Cmd/Ctrl + Shift + P)
   - Type "Biomni: BLAST Sequence Search"
   - Enter or select sequence
   - Configure parameters and run

3. **From Editor Selection**:
   - Select sequence text in the editor
   - Use keyboard shortcut (Ctrl+Shift+B)
   - Configure parameters and run

#### Gene Annotation

1. Open a FASTA file or select sequence text
2. Use Command Palette: "Biomni: Annotate Gene Sequence"
3. Choose annotation scope:
   - Complete Analysis (ORFs + domains + features + functions)
   - ORFs Only
   - Domains Only
   - Features Only
4. View comprehensive results with visualizations

#### Sequence Analysis

1. Select DNA/RNA sequence
2. Command Palette: "Biomni: Analyze Sequence Properties"
3. View detailed analysis including:
   - Basic composition statistics
   - GC content and melting temperature
   - Restriction enzyme sites
   - Molecular properties
   - Repeat regions

## Command Reference

### Genomics Commands

| Command | Keyboard Shortcut | Description |
|---------|------------------|-------------|
| `biomni.genomics.blastSequence` | Ctrl+Shift+B | Perform BLAST sequence search |
| `biomni.genomics.annotateGenes` | Ctrl+Shift+A | Annotate gene sequences |
| `biomni.genomics.analyzeSequence` | - | Analyze sequence properties |
| `biomni.genomics.findORFs` | - | Find open reading frames |
| `biomni.genomics.translateSequence` | - | Translate DNA to protein |
| `biomni.genomics.showResults` | - | Show analysis results viewer |
| `biomni.genomics.exportResults` | - | Export results to file |
| `biomni.genomics.clearCache` | - | Clear results cache |

### Available Through Context Menu

Right-click on biological files (.fasta, .fastq, .vcf, etc.) to access:

- BLAST searches
- Sequence analysis
- Gene annotation
- File validation
- Format-specific tools

## Advanced Features

### BLAST Configuration

**Program Selection**:
- **blastn**: DNA vs DNA database
- **blastp**: Protein vs protein database  
- **blastx**: Translated DNA vs protein database
- **tblastn**: Protein vs translated DNA database
- **tblastx**: Translated DNA vs translated DNA database

**Database Options**:
- **nr**: Non-redundant protein sequences
- **nt**: Non-redundant nucleotide sequences
- **refseq_protein**: RefSeq protein sequences
- **refseq_genomic**: RefSeq genomic sequences
- **swissprot**: Manually annotated Swiss-Prot proteins
- **pdb**: Protein Data Bank sequences

**Advanced Parameters**:
- E-value threshold (default: 10.0)
- Maximum number of hits (default: 100)
- Word size for initial matches
- Gap opening and extension penalties
- Scoring matrices (BLOSUM62, PAM30, etc.)

### Gene Annotation Options

**ORF Detection**:
- Minimum ORF length (default: 100 bp)
- All reading frames analysis
- Start/stop codon recognition
- Multiple genetic code tables

**Domain Analysis**:
- Pfam domain database search
- InterPro functional domains
- E-value significance thresholds
- Domain architecture analysis

**Feature Annotation**:
- Promoter element prediction
- Enhancer/silencer identification
- Repeat sequence annotation
- CpG island detection

### Export Options

**CSV Format**:
- Tabular data with headers
- Suitable for spreadsheet analysis
- Multiple result sections

**FASTA Format**:
- Sequence data with descriptive headers
- Compatible with other bioinformatics tools
- Multiple sequences per file

**GenBank Format**:
- Standard annotation format
- Feature tables included
- Compatible with NCBI tools

**JSON Format**:
- Complete data preservation
- Programmatic access friendly
- Hierarchical structure

## Results Management

### Caching System

- Automatic result caching for performance
- Persistent storage across sessions
- Configurable cache size limits
- Manual cache management

### History Tracking

- Chronological result history
- Search and filter capabilities
- Metadata preservation
- Quick result retrieval

### Interactive Viewer

The results viewer provides:

- **Sortable Tables**: Click column headers to sort
- **Expandable Sections**: Click to expand/collapse details
- **Copy Functions**: Copy sequences to clipboard
- **Export Options**: Multiple format export from viewer
- **Navigation**: Easy browsing of large result sets

## Performance Considerations

### Optimization Tips

1. **Sequence Length**: Very long sequences (>100kb) may take longer to process
2. **BLAST Parameters**: Adjust E-value and max hits for faster searches
3. **Cache Usage**: Cached results provide instant access
4. **Background Processing**: Long operations run in background with progress indication

### Memory Usage

- Results are cached in memory for quick access
- Automatic cleanup of old results
- Configurable memory limits
- Persistent storage for important results

## Troubleshooting

### Common Issues

**"MCP Server Not Available"**
- Ensure Biomni is installed: `pip install biomni`
- Check MCP server configuration in settings
- Verify network connectivity if using remote server

**"Sequence Validation Failed"**
- Check sequence format (FASTA recommended)
- Verify sequence contains valid nucleotide/amino acid codes
- Remove any non-biological characters

**"BLAST Search Timeout"**
- Reduce sequence length or number of target sequences
- Check network connectivity to BLAST databases
- Try with different database (local vs. remote)

**"Export Failed"**
- Ensure write permissions in target directory
- Check available disk space
- Verify export format is supported for result type

### Performance Issues

**Slow BLAST Searches**:
- Use more restrictive E-value thresholds
- Limit maximum target sequences
- Consider using smaller databases for initial searches

**High Memory Usage**:
- Clear results cache regularly
- Reduce cache size limits in settings
- Close unused result viewers

### Getting Help

1. Check the [troubleshooting guide](troubleshooting.md)
2. Review [known issues](https://github.com/biomni/vscode-extension/issues)
3. Submit new issues with detailed error information
4. Join the community discussion forums

## API Reference

### GenomicsTools Class

Main class for genomics operations:

```typescript
class GenomicsTools {
    // BLAST operations
    performBlastSearch(params: BlastParams): Promise<BlastResults>
    
    // Gene annotation
    annotateGenes(sequence: string, options?: AnnotationOptions): Promise<AnnotationResults>
    
    // Sequence analysis
    analyzeSequence(sequence: string): Promise<SequenceAnalysis>
    
    // Result management
    getAnalysisHistory(): Promise<ResultMetadata[]>
    clearCache(): Promise<void>
    exportResults(resultId: string, format: ExportFormat): Promise<void>
}
```

### Data Types

**BlastParams**:
```typescript
interface BlastParams {
    sequence: string;
    database: string;
    program: string;
    evalue?: number;
    maxTargetSeqs?: number;
    // ... additional parameters
}
```

**BlastResults**:
```typescript
interface BlastResults {
    querySequence: string;
    database: string;
    program: string;
    hits: BlastHit[];
    statistics: BlastStatistics;
    parameters: BlastParams;
    timestamp: Date;
}
```

## Best Practices

### Sequence Preparation

1. **Clean Sequences**: Remove headers, numbers, and special characters
2. **Format Consistency**: Use standard FASTA format when possible
3. **Length Limits**: Be aware of tool-specific length limitations
4. **Character Validation**: Ensure only valid biological characters

### Analysis Workflow

1. **Start Simple**: Begin with basic sequence analysis
2. **Progressive Analysis**: Use results to guide further investigation
3. **Parameter Optimization**: Adjust parameters based on initial results
4. **Result Validation**: Cross-reference with known databases
5. **Documentation**: Export and save important results

### Performance Optimization

1. **Batch Operations**: Group similar analyses together
2. **Cache Management**: Regularly clean up old results
3. **Parameter Tuning**: Use appropriate stringency settings
4. **Resource Monitoring**: Monitor memory and CPU usage

## Integration Examples

### Workflow Integration

```typescript
// Example: Complete sequence analysis workflow
async function analyzeNewSequence(sequence: string) {
    const genomicsTools = new GenomicsTools(context, mcpProvider);
    
    // Step 1: Basic analysis
    const analysis = await genomicsTools.analyzeSequence(sequence);
    console.log(`GC Content: ${analysis.gcContent}%`);
    
    // Step 2: Find ORFs if nucleotide sequence
    if (analysis.gcContent > 0) { // Indicates nucleotide sequence
        const annotation = await genomicsTools.annotateGenes(sequence, {
            findOrfs: true,
            translateOrfs: true
        });
        
        // Step 3: BLAST search for significant ORFs
        for (const orf of annotation.orfs) {
            if (orf.length > 300) { // Only long ORFs
                const blastResults = await genomicsTools.performBlastSearch({
                    sequence: orf.translation,
                    database: 'swissprot',
                    program: 'blastp'
                });
                
                if (blastResults.hits.length > 0) {
                    console.log(`Found homolog: ${blastResults.hits[0].description}`);
                }
            }
        }
    }
}
```

### Custom Export Processing

```typescript
// Example: Custom result processing
async function processBlastResults(resultId: string) {
    const result = await resultsManager.getResult(resultId) as BlastResults;
    
    // Filter significant hits
    const significantHits = result.hits.filter(hit => hit.evalue < 1e-5);
    
    // Generate custom report
    const report = {
        query: result.querySequence,
        database: result.database,
        significantHits: significantHits.length,
        topHit: significantHits[0]?.description || 'No significant hits',
        analysis: `${significantHits.length} significant hits found`
    };
    
    // Export custom format
    const customExport = JSON.stringify(report, null, 2);
    return customExport;
}
```

## Future Enhancements

### Planned Features

1. **Additional Tools**:
   - Phylogenetic analysis
   - Multiple sequence alignment
   - Structural prediction
   - Primer design

2. **Enhanced Visualization**:
   - Interactive sequence alignment viewer
   - Phylogenetic tree rendering
   - 3D structure visualization
   - Graphical genome browser

3. **Advanced Integration**:
   - Git integration for result versioning
   - Collaboration features
   - Cloud computing support
   - External database connections

4. **Performance Improvements**:
   - Parallel processing
   - Streaming for large datasets
   - Advanced caching strategies
   - GPU acceleration support

### Community Contributions

We welcome contributions to enhance the genomics tools:

1. **Bug Reports**: Submit detailed issue reports
2. **Feature Requests**: Suggest new functionality
3. **Code Contributions**: Submit pull requests with improvements
4. **Documentation**: Help improve guides and tutorials
5. **Testing**: Contribute test cases and scenarios

## Changelog

### Version 0.0.1 (Current)

**New Features**:
- Complete BLAST integration with all major programs
- Comprehensive gene annotation pipeline
- Advanced sequence analysis tools
- Interactive results viewer with export capabilities
- Result caching and history management
- Multiple export formats (CSV, JSON, FASTA, GenBank)

**Technical Improvements**:
- Full TypeScript implementation
- Comprehensive test coverage
- Optimized memory usage
- Error handling and validation
- Progress tracking for long operations

**Documentation**:
- Complete API documentation
- User guide with examples
- Troubleshooting information
- Best practices guide

---

For more information, visit the [Biomni GitHub repository](https://github.com/manu-tej/Biomni) or contact the development team.