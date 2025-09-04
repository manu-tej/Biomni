# Biomni VSCode Extension - User Guide

This guide provides step-by-step instructions for using the genomics tools in the Biomni VSCode extension.

## Quick Start

### 1. Installation

1. Install the Biomni VSCode extension
2. Ensure Biomni Python package is installed: `pip install biomni`
3. Configure MCP server settings in VSCode preferences

### 2. Your First BLAST Search

1. Create a new file with a FASTA sequence:
   ```
   >my_protein_sequence
   MKRISTTITTIITIIGNCGADS
   ```

2. Right-click in the editor and select **"BLAST Sequence Search"**

3. Choose search parameters:
   - **Program**: blastp (for protein sequences)
   - **Database**: swissprot (curated protein database)
   - **E-value**: 10.0 (default)

4. Click **"Run Search"** and wait for results

5. View interactive results with hit details, alignments, and export options

## Common Workflows

### Analyzing an Unknown DNA Sequence

**Scenario**: You have a DNA sequence and want to identify what it codes for.

1. **Sequence Analysis** (understand basic properties):
   ```
   Command Palette → "Biomni: Analyze Sequence Properties"
   ```
   - Check GC content, length, composition
   - Identify restriction sites
   - Look for repeat patterns

2. **Find ORFs** (identify potential coding regions):
   ```
   Command Palette → "Biomni: Find Open Reading Frames"
   ```
   - Set minimum ORF length (usually 100+ bp)
   - Review all reading frames
   - Note start/stop codons

3. **Translate and BLAST** (identify homologs):
   ```
   Command Palette → "Biomni: Translate DNA to Protein"
   ```
   - Choose appropriate reading frame
   - Copy protein sequence
   - Run BLAST search against protein database

4. **Gene Annotation** (comprehensive analysis):
   ```
   Command Palette → "Biomni: Annotate Gene Sequence"
   ```
   - Choose "Complete Analysis"
   - Review ORFs, domains, features, and predictions
   - Export results for further analysis

### Protein Function Prediction

**Scenario**: You have a protein sequence and want to predict its function.

1. **BLAST against SwissProt**:
   - Use `blastp` program
   - Search `swissprot` database
   - Look for high-scoring matches with good coverage

2. **Domain Analysis**:
   ```
   Command Palette → "Biomni: Annotate Gene Sequence"
   ```
   - Select "Domains Only"
   - Identify conserved protein domains
   - Check domain architecture

3. **Functional Annotation**:
   - Review BLAST hit descriptions
   - Note conserved domains and their functions
   - Cross-reference multiple predictions

### Comparative Sequence Analysis

**Scenario**: Compare multiple sequences to find similarities and differences.

1. **Individual Analysis**:
   - Analyze each sequence separately
   - Note composition, length, features

2. **BLAST Comparison**:
   - Use one sequence as query against custom database
   - Or search each against public databases
   - Compare hit patterns and scores

3. **ORF Comparison**:
   - Find ORFs in each sequence
   - Compare ORF patterns and locations
   - Identify conserved coding regions

## Tool-Specific Guides

### BLAST Search Guide

**Choosing the Right Program**:
- **blastn**: DNA sequence vs DNA database
- **blastp**: Protein sequence vs protein database
- **blastx**: DNA sequence vs protein database (translated)
- **tblastn**: Protein sequence vs DNA database (translated)
- **tblastx**: DNA vs DNA, both translated

**Database Selection**:
- **nr**: Largest protein database, includes everything
- **swissprot**: Manually curated, high quality annotations
- **refseq**: Reference sequences, one per species
- **pdb**: Sequences with known 3D structures
- **nt**: Largest nucleotide database

**Parameter Tuning**:
- **E-value**: Lower = more stringent (try 1e-5 for high confidence)
- **Max hits**: More hits = broader search (but slower)
- **Word size**: Larger = faster but less sensitive

**Interpreting Results**:
- **E-value < 1e-5**: Usually significant
- **Bit score > 40**: Good similarity
- **Identity > 30%**: Likely homolog
- **Coverage > 70%**: Good alignment

### Gene Annotation Guide

**Annotation Scope Options**:
- **Complete Analysis**: Everything (recommended for new sequences)
- **ORFs Only**: Just find coding regions
- **Domains Only**: Focus on protein domains
- **Features Only**: Regulatory elements

**ORF Analysis**:
- Minimum length: 100 bp for bacteria, 300 bp for eukaryotes
- Check all reading frames
- Look for start codons (ATG, GTG, TTG)
- Verify stop codons

**Domain Interpretation**:
- E-value < 1e-3 typically significant
- Multiple domains suggest multi-functional protein
- Domain architecture reveals protein family

**Feature Annotation**:
- Promoters: Look near gene starts
- Enhancers: Can be distant from genes
- Repeats: May indicate regulatory importance

### Sequence Analysis Guide

**Basic Statistics**:
- **GC Content**: 
  - Bacteria: 30-70%
  - Human: ~41%
  - Plants: ~36%
- **Length**: Consider biological context
- **Composition**: Look for biases

**Restriction Analysis**:
- Plan cloning strategies
- Identify unique cut sites
- Avoid sites in important regions

**Molecular Properties**:
- **Melting Temperature**: For PCR primer design
- **Molecular Weight**: For protein analysis
- **Extinction**: For concentration calculations

## Results Management

### Viewing Results

**Results Viewer Features**:
- **Sortable Tables**: Click column headers
- **Expandable Details**: Click rows for more info
- **Copy Functions**: Copy sequences/IDs
- **Filter Options**: Search within results

**Navigation**:
- Use tabs to switch between result types
- Expand/collapse sections as needed
- Use search box to find specific entries

### Exporting Results

**Export Formats**:
- **CSV**: For spreadsheet analysis
- **JSON**: For programming/scripting
- **FASTA**: For other bioinformatics tools
- **GenBank**: For submission to databases

**Export Tips**:
- Choose format based on downstream analysis
- Include metadata when possible
- Use descriptive filenames
- Save important results permanently

### History Management

**Accessing History**:
```
Command Palette → "Biomni: Show Analysis Results"
```

**History Features**:
- Chronological listing
- Search by sequence or parameters
- Quick re-analysis
- Batch export options

**Cache Management**:
- Results cached automatically
- Clear cache when space needed
- Important results persist across sessions

## Tips and Best Practices

### Sequence Preparation

1. **Clean Your Sequences**:
   - Remove line numbers and spaces
   - Use proper FASTA format
   - Check for invalid characters

2. **Quality Check**:
   - Verify sequence accuracy
   - Remove vector sequences
   - Check for contamination

### Analysis Strategy

1. **Start Broad, Then Focus**:
   - Begin with general analysis
   - Use results to guide specific searches
   - Validate findings with multiple approaches

2. **Consider Context**:
   - Know your organism/tissue
   - Consider experimental conditions
   - Check recent literature

### Performance Optimization

1. **Manage Resources**:
   - Close unused result windows
   - Clear cache periodically
   - Monitor memory usage

2. **Optimize Parameters**:
   - Use appropriate stringency
   - Limit search scope when possible
   - Take advantage of caching

### Result Validation

1. **Cross-Reference Results**:
   - Use multiple databases
   - Try different search programs
   - Check with different parameters

2. **Literature Review**:
   - Search recent publications
   - Check protein/gene databases
   - Validate with experimental data

## Troubleshooting Common Issues

### BLAST Problems

**"No significant hits found"**:
- Try less stringent E-value
- Use different database
- Check sequence quality
- Try different BLAST program

**"Search taking too long"**:
- Reduce max target sequences
- Use more stringent E-value
- Try smaller database
- Check network connection

### Sequence Issues

**"Invalid sequence format"**:
- Use proper FASTA format
- Remove non-biological characters
- Check sequence type (DNA vs protein)

**"Sequence too long"**:
- Break into smaller segments
- Use online tools for very large sequences
- Consider sequence trimming

### Performance Issues

**"Extension running slowly"**:
- Close unused result viewers
- Clear results cache
- Restart VSCode if needed
- Check system resources

**"Out of memory errors"**:
- Reduce cache size in settings
- Close other applications
- Process smaller sequences
- Clear browser cache

## Advanced Usage

### Custom Workflows

Create custom analysis workflows by combining tools:

1. **Batch Analysis**:
   - Process multiple sequences
   - Compare results systematically
   - Export comprehensive reports

2. **Iterative Refinement**:
   - Use initial results to refine searches
   - Progressively narrow focus
   - Validate with multiple methods

### Integration with External Tools

**Export for External Analysis**:
- Export FASTA for alignment tools
- Use CSV for statistical analysis
- Generate GenBank for submissions

**Import from External Sources**:
- Copy sequences from databases
- Import from sequencing platforms
- Process literature sequences

### Automation Tips

**Keyboard Shortcuts**:
- Learn key combinations for frequent tasks
- Create custom shortcuts if needed
- Use Command Palette efficiently

**Batch Processing**:
- Process similar sequences together
- Use consistent parameters
- Export results systematically

## Getting Help

### Documentation Resources

- **User Guide**: This document
- **API Reference**: Technical documentation
- **Troubleshooting Guide**: Common issues and solutions
- **Video Tutorials**: Step-by-step guides

### Community Support

- **GitHub Issues**: Bug reports and feature requests
- **Discussion Forums**: Community Q&A
- **Email Support**: Direct developer contact

### Training Resources

- **Webinars**: Regular training sessions
- **Workshops**: Hands-on learning
- **Conference Presentations**: Latest developments

---

## Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| BLAST Search | Ctrl+Shift+B |
| Gene Annotation | Ctrl+Shift+A |
| Sequence Analysis | Command Palette |
| Show Results | Command Palette |
| Export Results | From results viewer |

### File Extensions Supported

- **.fasta, .fa, .fas**: FASTA sequences
- **.fastq, .fq**: FASTQ with quality scores
- **.seq**: Generic sequence format
- **.vcf**: Variant calling format

### Default Parameters

- **BLAST E-value**: 10.0
- **Max BLAST hits**: 100
- **Min ORF length**: 100 bp
- **Cache size**: 100 results

---

*For the most up-to-date information, visit our [GitHub repository](https://github.com/manu-tej/Biomni).*