# Getting Started with Biomni VSCode Extension

## Welcome to Biomni! 

The Biomni VSCode Extension transforms Visual Studio Code into a powerful bioinformatics workbench. In just a few minutes, you'll be analyzing biological sequences, running BLAST searches, and working with standard bioinformatics file formats.

## Your First 5 Minutes

### Step 1: Open a Biological File

Let's start by creating or opening a sample biological file:

1. **Create a New FASTA File**:
   - Press `Ctrl+N` (Windows/Linux) or `Cmd+N` (macOS) for a new file
   - Save it as `sample.fasta` (`Ctrl+S` or `Cmd+S`)
   - Paste this sample DNA sequence:

```fasta
>Human_Beta_Globin_Partial
ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA
>Chimpanzee_Beta_Globin_Partial
ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA
```

2. **Notice the Magic**:
   - Syntax highlighting automatically applies
   - The file is recognized as FASTA format
   - Status bar shows file type information

### Step 2: Explore Context Menu Features

1. **Right-click in the file** to see Biomni-specific options:
   - **Validate File Format**: Check if your FASTA file is properly formatted
   - **Show File Info**: Get statistics about sequences
   - **Run BLAST**: Search for similar sequences
   - **Align Sequences**: Create multiple sequence alignments
   - **Translate Sequences**: Convert DNA to amino acid sequences

2. **Try File Validation**:
   - Right-click → "Validate File Format"
   - A notification will show if your file is valid
   - Any format issues will be highlighted with suggestions

### Step 3: Run Your First BLAST Search

1. **Select a Sequence**:
   - Click and drag to select the DNA sequence from the first entry
   - Or use `Ctrl+A` / `Cmd+A` to select all

2. **Run BLAST**:
   - Right-click → "Run BLAST"
   - Choose database (default: "nt" for nucleotide)
   - Click "Run Search"
   - Results will open in a new panel

3. **Explore Results**:
   - Browse through sequence alignments
   - Check E-values and similarity scores
   - Click on accession numbers to get more information

### Step 4: Try Sequence Translation

1. **Translate DNA to Protein**:
   - Right-click in your FASTA file
   - Select "Translate Sequences"
   - Choose reading frame (usually "All frames" for exploratory analysis)
   - View the amino acid translation in a new document

### Step 5: Access the Command Palette

The Command Palette gives you quick access to all Biomni features:

1. **Open Command Palette**: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. **Type "Biomni"** to see all available commands:
   - `Biomni: Activate MCP Integration`
   - `Biomni: Show File Info`
   - `Biomni: Open Settings Panel`
   - And many more...

## Core Features Overview

### File Format Support

Biomni recognizes and provides specialized support for:

| Format | Extensions | Features Available |
|--------|------------|-------------------|
| **FASTA** | `.fasta`, `.fa`, `.fas`, `.seq`, `.fna`, `.ffn`, `.frn` | BLAST, alignment, translation, validation |
| **FASTQ** | `.fastq`, `.fq` | Quality control, trimming, validation |
| **VCF** | `.vcf` | Variant annotation, filtering, statistics |
| **Other** | `.pdb`, `.gff`, `.gtf`, `.sam`, `.bam`, `.bed` | Format validation, info display |

### Bioinformatics Tools Integration

#### BLAST Search
- **Local and Remote**: Search against NCBI databases or local installations
- **Multiple Databases**: nt, nr, RefSeq, UniProt, PDB, and more
- **Flexible Parameters**: E-value thresholds, max targets, word size
- **Rich Results**: Interactive alignments with statistics

#### Sequence Alignment
- **Multiple Algorithms**: ClustalW, MUSCLE, MAFFT, T-Coffee
- **Various Formats**: Clustal, FASTA, PHYLIP, NEXUS output
- **Parameter Control**: Gap penalties, alignment algorithms
- **Visualization**: Alignment viewer with conservation highlighting

#### Sequence Analysis
- **Translation**: DNA/RNA to protein in all reading frames
- **Composition Analysis**: GC content, codon usage, amino acid composition
- **Pattern Recognition**: ORF finding, signal peptides, domains
- **Quality Assessment**: Sequence statistics and validation

### Smart Features

#### Intelligent File Detection
- Automatic format recognition based on content and extension
- Smart suggestions when you open biological files
- Context-aware feature availability

#### Performance Optimization
- Efficient handling of large sequence files
- Background processing for long-running analyses
- Caching for frequently accessed results
- Memory management for large datasets

#### Integration Capabilities
- MCP (Model Context Protocol) server integration
- External tool connectivity
- Cloud service integration
- Collaborative features

## Working with Different File Types

### FASTA Files

FASTA is the most common sequence format. Here's how to make the most of it:

**Sample Protein FASTA**:
```fasta
>sp|P04637|P53_HUMAN Cellular tumor antigen p53 OS=Homo sapiens
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP
DEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAK
SVTCTYSPALNKMFCQLAKTCPVQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHE
RCSDSDGLAPPQHLIRVEGNLRVEYLDDRNTFRHSVVVPYEPPEVGSDCTTIHYNYMCNS
SCMGGMNRRPILTIITLEDSSGNLLGRNSFEVRVCACPGRDRRTEEENLRKKGEPHHELP
PGSTKRALPNNTSSSPQPKKKPLDGEYFTLQIRGRERFEMFRELNEALELKDAQAGKEPG
GSRAHSSHLKSKKGQSTSRHKKLMFKTEGPDSD
```

**Key Features for FASTA**:
- **Sequence Information**: Right-click → "Show File Info" for length, composition, statistics
- **BLAST Search**: Find homologous sequences in databases
- **Multiple Alignment**: Compare multiple sequences
- **Translation**: Convert nucleotide to amino acid sequences
- **Export**: Save results in various formats

### FASTQ Files

FASTQ files contain sequence data with quality information:

**Sample FASTQ**:
```fastq
@SRR000001.1 EM7LVYS02FOYNU length=250
TCAGTTTTCCTCCAAGTTTCAGTCATTTCAACAATCTCAACAACCTAACGGGATTATGTTCAGACTGCTTCAGCCTCACCCCAAGAACCCAAATCCATTGGAAGAAGACCAGATAGAAGATCAGATTAGAAGATCAAAGAAGATTAGAAGATTAGAAAGAACAGAACCAAAGAACACAACCAACAAACAATTCCACTAACTTTAGTCCATAAGAACAGCCAACAACAG
+
HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
```

**Key Features for FASTQ**:
- **Quality Control**: Analyze read quality distributions
- **Trimming**: Remove low-quality bases or adapters
- **Filtering**: Remove poor-quality reads
- **Statistics**: Get comprehensive read statistics
- **Validation**: Check file format integrity

### VCF Files

VCF (Variant Call Format) files contain genetic variation data:

**Sample VCF**:
```vcf
##fileformat=VCFv4.2
##source=myImputationProgramV3.1
##reference=file:///seq/references/1000GenomesPilot-NCBI36.fasta
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	NA00001
20	14370	rs6054257	G	A	29	PASS	NS=3;DP=14;AF=0.5;DB;H2	GT:GQ:DP:HQ	0|0:48:1:51,51
20	17330	.	T	A	3	q10	NS=3;DP=11;AF=0.017	GT:GQ:DP:HQ	0|0:49:3:58,50
```

**Key Features for VCF**:
- **Variant Annotation**: Annotate variants with functional consequences
- **Filtering**: Apply quality filters and criteria
- **Statistics**: Calculate variant frequencies and distributions
- **Visualization**: View variants in genomic context

## Customization and Configuration

### Essential Settings

Access settings via `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS), then search for "biomni":

**Most Important Settings**:
```json
{
  // Core functionality
  "biomni.extension.core.enabled": true,
  "biomni.extension.core.autoActivate": true,
  
  // File detection
  "biomni.extension.fileDetection.enabled": true,
  "biomni.extension.fileDetection.showSmartSuggestions": true,
  
  // Display preferences
  "biomni.display.sequences.maxSequenceLength": 10000,
  "biomni.display.sequences.showLineNumbers": true,
  "biomni.display.sequences.colorScheme": "default",
  
  // Performance
  "biomni.performance.cache.enabled": true,
  "biomni.performance.processing.maxConcurrentJobs": 4
}
```

### Tool-Specific Configuration

**BLAST Settings**:
```json
{
  "biomni.tools.blast.database": "nt",
  "biomni.tools.blast.eValue": 0.01,
  "biomni.tools.blast.maxTargetSequences": 500
}
```

**Alignment Settings**:
```json
{
  "biomni.tools.alignment.algorithm": "muscle",
  "biomni.tools.alignment.format": "clustal"
}
```

### Workspace Configuration

Create `.vscode/settings.json` in your project folder for project-specific settings:

```json
{
  "biomni.tools.blast.database": "refseq_genomic",
  "biomni.display.sequences.colorScheme": "nucleotide",
  "biomni.performance.cache.ttl": 7200
}
```

## Common Workflows

### Workflow 1: Basic Sequence Analysis

1. **Open/Create FASTA file**
2. **Validate format** (Right-click → "Validate File Format")
3. **Get sequence info** (Right-click → "Show File Info")
4. **Run BLAST search** to find homologs
5. **Translate sequences** if working with nucleotides
6. **Export results** in desired format

### Workflow 2: Sequence Comparison

1. **Prepare multi-FASTA file** with sequences to compare
2. **Run multiple sequence alignment** (Right-click → "Align Sequences")
3. **Choose algorithm** (MUSCLE recommended for most cases)
4. **View alignment results** with conservation highlighting
5. **Export alignment** in preferred format (Clustal, PHYLIP, etc.)

### Workflow 3: Next-Gen Sequencing QC

1. **Open FASTQ file** with raw sequencing reads
2. **Run quality control** (Right-click → "Quality Control")
3. **Review quality metrics** (per-base quality, GC content, etc.)
4. **Apply filtering** if needed (remove low-quality reads)
5. **Export cleaned data** for downstream analysis

### Workflow 4: Variant Analysis

1. **Open VCF file** with variant calls
2. **Validate VCF format** to ensure compatibility
3. **Run variant annotation** (Right-click → "Annotate Variants")
4. **Review functional consequences** of variants
5. **Apply filters** based on quality or functional impact
6. **Export filtered results** for further analysis

## Tips for Efficient Usage

### Keyboard Shortcuts

- **Command Palette**: `Ctrl+Shift+P` / `Cmd+Shift+P`
- **File Info**: `Alt+I` (when in supported file)
- **Quick BLAST**: `Alt+B` (when text is selected)
- **Toggle Word Wrap**: `Alt+Z` (useful for long sequences)

### Performance Tips

1. **Large Files**: Use "Show File Info" before opening very large files
2. **Caching**: Enable caching for frequently accessed files
3. **Memory**: Monitor memory usage in large datasets
4. **Background Processing**: Long analyses run in background - continue working

### Organization Tips

1. **Project Structure**: Organize files by analysis type or project
2. **Naming Conventions**: Use descriptive filenames with appropriate extensions
3. **Workspace Settings**: Configure project-specific settings in `.vscode/settings.json`
4. **Result Management**: Save important results with descriptive names

## Getting Help and Support

### Built-in Help

- **Context Menus**: Right-click in any biological file for relevant options
- **Command Palette**: Type "Biomni" to see all available commands
- **Settings**: Search for "biomni" in settings for configuration options
- **Status Bar**: Check status indicators for current operations

### Documentation

- **Full User Guide**: Complete documentation with advanced features
- **API Reference**: For developers and advanced users
- **Video Tutorials**: Step-by-step video guides
- **Troubleshooting**: Solutions to common issues

### Community and Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/manu-tej/epic-vscode-extension/issues)
- **GitHub Discussions**: [Community questions and discussions](https://github.com/manu-tej/epic-vscode-extension/discussions)
- **Documentation**: [Complete documentation](https://manu-tej.github.io/epic-vscode-extension/)

## Next Steps

Now that you're familiar with the basics:

1. **Explore Advanced Features**: Try workflow automation, custom tool integration
2. **Watch Video Tutorials**: See features demonstrated step-by-step
3. **Configure for Your Needs**: Customize settings for your specific workflows
4. **Join the Community**: Share your experiences and learn from others
5. **Contribute**: Help improve the extension by reporting bugs or suggesting features

### Recommended Learning Path

1. **Week 1**: Master basic file operations and single-sequence analysis
2. **Week 2**: Learn comparative analysis and alignment features
3. **Week 3**: Explore advanced BLAST options and result interpretation
4. **Week 4**: Customize settings and workflows for your research needs
5. **Ongoing**: Stay updated with new features and community contributions

## Advanced Preview

Once you're comfortable with the basics, you can explore:

- **Workflow Automation**: Chain multiple analyses together
- **Custom Database Integration**: Connect to proprietary or specialized databases
- **Cloud Integration**: Use cloud computing resources for large analyses
- **Team Collaboration**: Share configurations and results with team members
- **API Integration**: Connect with other bioinformatics tools and pipelines

---

Welcome to the Biomni community! We're excited to see what discoveries you'll make with your new bioinformatics workbench. 🧬✨