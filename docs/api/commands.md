# Biomni VSCode Extension - Commands API Reference

## Overview

The Biomni VSCode Extension exposes a comprehensive set of commands through the VS Code Command Palette and API. This document provides detailed information about each command, including parameters, return values, and usage examples.

## Command Categories

- [Core Extension Commands](#core-extension-commands)
- [File Operations](#file-operations)
- [FASTA Commands](#fasta-commands)
- [FASTQ Commands](#fastq-commands)
- [VCF Commands](#vcf-commands)
- [Settings Commands](#settings-commands)

## Core Extension Commands

### `biomni.activate`

Manually activate the Biomni MCP integration.

**Command ID**: `biomni.activate`  
**Title**: "Activate Biomni MCP Integration"  
**Category**: "Biomni"  

**Usage**:
```typescript
// Via Command Palette
// Ctrl+Shift+P → "Biomni: Activate Biomni MCP Integration"

// Via API
await vscode.commands.executeCommand('biomni.activate');
```

**Parameters**: None

**Returns**: `Promise<boolean>` - `true` if activation successful, `false` otherwise

**Example**:
```typescript
try {
  const activated = await vscode.commands.executeCommand('biomni.activate');
  if (activated) {
    vscode.window.showInformationMessage('Biomni activated successfully');
  }
} catch (error) {
  vscode.window.showErrorMessage(`Failed to activate Biomni: ${error.message}`);
}
```

**Error Conditions**:
- MCP server unreachable
- Invalid configuration
- Extension already activated

---

### `biomni.deactivate`

Manually deactivate the Biomni MCP integration.

**Command ID**: `biomni.deactivate`  
**Title**: "Deactivate Biomni MCP Integration"  
**Category**: "Biomni"  

**Usage**:
```typescript
// Via Command Palette
// Ctrl+Shift+P → "Biomni: Deactivate Biomni MCP Integration"

// Via API
await vscode.commands.executeCommand('biomni.deactivate');
```

**Parameters**: None

**Returns**: `Promise<boolean>` - `true` if deactivation successful

**Example**:
```typescript
const deactivated = await vscode.commands.executeCommand('biomni.deactivate');
console.log('Deactivation result:', deactivated);
```

## File Operations

### `biomni.file.validate`

Validate the format of a biological file.

**Command ID**: `biomni.file.validate`  
**Title**: "Validate File Format"  
**Category**: "Biomni"  

**Context**: Available for files with biological file extensions (.fasta, .fastq, .vcf, etc.)

**Usage**:
```typescript
// Via Context Menu (right-click in file)
// Or Command Palette → "Biomni: Validate File Format"

// Via API
const result = await vscode.commands.executeCommand('biomni.file.validate', fileUri);
```

**Parameters**:
- `fileUri` (optional): `vscode.Uri` - URI of file to validate. If not provided, uses active editor.

**Returns**: 
```typescript
Promise<{
  isValid: boolean;
  errors: Array<{
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: Array<{
    line: number;
    message: string;
  }>;
  statistics: {
    totalLines: number;
    sequences?: number;
    variants?: number;
    reads?: number;
  };
}>
```

**Example**:
```typescript
const activeEditor = vscode.window.activeTextEditor;
if (activeEditor) {
  const validation = await vscode.commands.executeCommand(
    'biomni.file.validate', 
    activeEditor.document.uri
  );
  
  if (!validation.isValid) {
    console.log('Validation errors:', validation.errors);
    // Show errors in problems panel
    validation.errors.forEach(error => {
      console.log(`Line ${error.line}: ${error.message}`);
    });
  }
}
```

---

### `biomni.file.showInfo`

Display detailed information about a biological file.

**Command ID**: `biomni.file.showInfo`  
**Title**: "Show File Info"  
**Category**: "Biomni"  

**Usage**:
```typescript
// Via Context Menu or Command Palette
const info = await vscode.commands.executeCommand('biomni.file.showInfo', fileUri);
```

**Parameters**:
- `fileUri` (optional): `vscode.Uri` - File to analyze

**Returns**:
```typescript
Promise<{
  fileType: 'fasta' | 'fastq' | 'vcf' | 'unknown';
  size: number; // bytes
  statistics: {
    // FASTA files
    sequences?: {
      count: number;
      totalLength: number;
      averageLength: number;
      minLength: number;
      maxLength: number;
      gcContent?: number; // for nucleotide sequences
    };
    // FASTQ files
    reads?: {
      count: number;
      averageLength: number;
      averageQuality: number;
      gcContent: number;
    };
    // VCF files
    variants?: {
      count: number;
      chromosomes: string[];
      variantTypes: Record<string, number>;
    };
  };
  metadata: Record<string, any>;
}>
```

**Example**:
```typescript
const info = await vscode.commands.executeCommand('biomni.file.showInfo');
if (info.fileType === 'fasta' && info.statistics.sequences) {
  const stats = info.statistics.sequences;
  vscode.window.showInformationMessage(
    `FASTA file contains ${stats.count} sequences, ` +
    `average length: ${stats.averageLength} bp`
  );
}
```

---

### `biomni.file.suggestTools`

Suggest relevant bioinformatics tools based on file type and content.

**Command ID**: `biomni.file.suggestTools`  
**Title**: "Suggest Tools"  
**Category**: "Biomni"  

**Usage**:
```typescript
const suggestions = await vscode.commands.executeCommand('biomni.file.suggestTools');
```

**Returns**:
```typescript
Promise<Array<{
  toolName: string;
  description: string;
  commandId: string;
  category: 'analysis' | 'visualization' | 'export' | 'quality';
  applicability: number; // 0-1, higher = more relevant
  requirements?: string[];
}>>
```

**Example**:
```typescript
const suggestions = await vscode.commands.executeCommand('biomni.file.suggestTools');
suggestions.forEach(tool => {
  console.log(`${tool.toolName}: ${tool.description} (${tool.applicability * 100}% relevant)`);
});
```

## FASTA Commands

### `biomni.fasta.blast`

Perform BLAST search on FASTA sequences.

**Command ID**: `biomni.fasta.blast`  
**Title**: "Run BLAST"  
**Category**: "Biomni FASTA"  

**Usage**:
```typescript
const results = await vscode.commands.executeCommand('biomni.fasta.blast', options);
```

**Parameters**:
```typescript
{
  sequence?: string; // If not provided, uses selected text or whole file
  database?: 'nt' | 'nr' | 'refseq_genomic' | 'refseq_protein' | 'swissprot' | 'pdb';
  eValue?: number; // Default from settings
  maxTargetSequences?: number;
  wordSize?: number;
  program?: 'blastn' | 'blastp' | 'blastx' | 'tblastn' | 'tblastx'; // Auto-detected
  customOptions?: string;
}
```

**Returns**:
```typescript
Promise<{
  queryLength: number;
  database: string;
  hits: Array<{
    accession: string;
    description: string;
    length: number;
    eValue: number;
    bitScore: number;
    identity: number;
    coverage: number;
    alignments: Array<{
      queryStart: number;
      queryEnd: number;
      subjectStart: number;
      subjectEnd: number;
      querySeq: string;
      subjectSeq: string;
      matchSeq: string;
    }>;
  }>;
  statistics: {
    searchTime: number;
    effectiveDbSize: number;
  };
}>
```

**Example**:
```typescript
// BLAST selected sequence against nucleotide database
const editor = vscode.window.activeTextEditor;
if (editor && editor.selection && !editor.selection.isEmpty) {
  const selectedText = editor.document.getText(editor.selection);
  
  const blastResults = await vscode.commands.executeCommand('biomni.fasta.blast', {
    sequence: selectedText,
    database: 'nt',
    eValue: 1e-5,
    maxTargetSequences: 10
  });
  
  console.log(`Found ${blastResults.hits.length} hits`);
  blastResults.hits.forEach((hit, index) => {
    console.log(`${index + 1}. ${hit.description} (E-value: ${hit.eValue})`);
  });
}
```

---

### `biomni.fasta.align`

Perform multiple sequence alignment on FASTA sequences.

**Command ID**: `biomni.fasta.align`  
**Title**: "Align Sequences"  
**Category**: "Biomni FASTA"  

**Parameters**:
```typescript
{
  sequences?: string[]; // If not provided, uses all sequences in file
  algorithm?: 'clustalw' | 'muscle' | 'mafft' | 'tcoffee';
  outputFormat?: 'clustal' | 'fasta' | 'phylip' | 'nexus';
  gapOpenPenalty?: number;
  gapExtensionPenalty?: number;
  customOptions?: string;
}
```

**Returns**:
```typescript
Promise<{
  alignment: string; // Aligned sequences in requested format
  algorithm: string;
  parameters: Record<string, any>;
  statistics: {
    alignmentLength: number;
    conservedPositions: number;
    gapsIntroduced: number;
    alignmentScore?: number;
  };
  tree?: string; // Phylogenetic tree if generated
}>
```

**Example**:
```typescript
// Align all sequences in current FASTA file using MUSCLE
const alignment = await vscode.commands.executeCommand('biomni.fasta.align', {
  algorithm: 'muscle',
  outputFormat: 'clustal'
});

// Create new document with alignment
const alignmentDoc = await vscode.workspace.openTextDocument({
  content: alignment.alignment,
  language: 'clustal'
});
await vscode.window.showTextDocument(alignmentDoc);
```

---

### `biomni.fasta.translate`

Translate nucleotide sequences to amino acid sequences.

**Command ID**: `biomni.fasta.translate`  
**Title**: "Translate Sequences"  
**Category**: "Biomni FASTA"  

**Parameters**:
```typescript
{
  sequences?: string[]; // Sequences to translate
  readingFrame?: 1 | 2 | 3 | -1 | -2 | -3 | 'all';
  geneticCode?: number; // NCBI genetic code table number (default: 1)
  minOrfLength?: number; // Minimum ORF length to report
  includeStopCodons?: boolean;
}
```

**Returns**:
```typescript
Promise<{
  translations: Array<{
    sequenceId: string;
    readingFrame: number;
    translation: string;
    startPosition: number;
    endPosition: number;
    length: number;
    hasStopCodon: boolean;
  }>;
  geneticCode: number;
  statistics: {
    totalOrfs: number;
    averageOrfLength: number;
    longestOrf: number;
  };
}>
```

**Example**:
```typescript
// Translate in all reading frames
const translations = await vscode.commands.executeCommand('biomni.fasta.translate', {
  readingFrame: 'all',
  minOrfLength: 100
});

// Create new document with translations
let translationText = '';
translations.translations.forEach(trans => {
  translationText += `>${trans.sequenceId}_frame_${trans.readingFrame}\n`;
  translationText += `${trans.translation}\n`;
});

const doc = await vscode.workspace.openTextDocument({
  content: translationText,
  language: 'fasta'
});
await vscode.window.showTextDocument(doc);
```

## FASTQ Commands

### `biomni.fastq.qualityControl`

Perform quality control analysis on FASTQ files.

**Command ID**: `biomni.fastq.qualityControl`  
**Title**: "Quality Control"  
**Category**: "Biomni FASTQ"  

**Parameters**:
```typescript
{
  fileUri?: vscode.Uri;
  outputFormat?: 'html' | 'json' | 'text';
  includeCharts?: boolean;
  subsampleSize?: number; // For large files
}
```

**Returns**:
```typescript
Promise<{
  summary: {
    totalReads: number;
    averageLength: number;
    averageQuality: number;
    gcContent: number;
  };
  perBaseQuality: Array<{
    position: number;
    meanQuality: number;
    q25: number;
    q50: number;
    q75: number;
  }>;
  qualityDistribution: Array<{
    quality: number;
    count: number;
  }>;
  lengthDistribution: Array<{
    length: number;
    count: number;
  }>;
  overrepresentedSequences: Array<{
    sequence: string;
    count: number;
    percentage: number;
    possibleSource: string;
  }>;
  recommendations: string[];
}>
```

**Example**:
```typescript
const qcResults = await vscode.commands.executeCommand('biomni.fastq.qualityControl', {
  includeCharts: true,
  outputFormat: 'json'
});

console.log(`Total reads: ${qcResults.summary.totalReads}`);
console.log(`Average quality: ${qcResults.summary.averageQuality.toFixed(2)}`);

if (qcResults.recommendations.length > 0) {
  vscode.window.showWarningMessage(
    `Quality issues detected: ${qcResults.recommendations.join('; ')}`
  );
}
```

## VCF Commands

### `biomni.vcf.annotate`

Annotate variants in VCF files.

**Command ID**: `biomni.vcf.annotate`  
**Title**: "Annotate Variants"  
**Category**: "Biomni VCF"  

**Parameters**:
```typescript
{
  fileUri?: vscode.Uri;
  databases?: string[]; // Default from settings
  includeGeneOntology?: boolean;
  includePathways?: boolean;
  customSources?: string[];
  outputFormat?: 'vcf' | 'tsv' | 'json';
}
```

**Returns**:
```typescript
Promise<{
  annotatedVariants: Array<{
    chromosome: string;
    position: number;
    ref: string;
    alt: string;
    annotations: {
      gene?: string;
      consequence?: string;
      impact?: 'HIGH' | 'MODERATE' | 'LOW' | 'MODIFIER';
      proteinChange?: string;
      transcript?: string;
      geneOntology?: string[];
      pathways?: string[];
    };
  }>;
  statistics: {
    totalVariants: number;
    annotatedVariants: number;
    highImpact: number;
    moderateImpact: number;
    lowImpact: number;
  };
  annotationSources: string[];
}>
```

**Example**:
```typescript
const annotations = await vscode.commands.executeCommand('biomni.vcf.annotate', {
  includeGeneOntology: true,
  includePathways: true
});

// Filter high impact variants
const highImpactVariants = annotations.annotatedVariants.filter(
  variant => variant.annotations.impact === 'HIGH'
);

console.log(`Found ${highImpactVariants.length} high impact variants`);
```

## Settings Commands

### `biomni.settings.openPanel`

Open the Biomni settings panel.

**Command ID**: `biomni.settings.openPanel`  
**Title**: "Open Settings Panel"  
**Category**: "Biomni Settings"  

**Usage**:
```typescript
await vscode.commands.executeCommand('biomni.settings.openPanel');
```

---

### `biomni.settings.export`

Export current Biomni settings to a file.

**Command ID**: `biomni.settings.export`  
**Title**: "Export Settings"  
**Category**: "Biomni Settings"  

**Parameters**:
```typescript
{
  outputPath?: string;
  includeWorkspaceSettings?: boolean;
  format?: 'json' | 'yaml';
}
```

**Returns**: `Promise<string>` - Path to exported settings file

**Example**:
```typescript
const exportPath = await vscode.commands.executeCommand('biomni.settings.export', {
  includeWorkspaceSettings: true,
  format: 'json'
});
vscode.window.showInformationMessage(`Settings exported to: ${exportPath}`);
```

---

### `biomni.settings.import`

Import Biomni settings from a file.

**Command ID**: `biomni.settings.import`  
**Title**: "Import Settings"  
**Category**: "Biomni Settings"  

**Parameters**:
```typescript
{
  settingsPath?: string; // If not provided, shows file picker
  applyToWorkspace?: boolean;
  merge?: boolean; // If false, replaces all settings
}
```

**Returns**: `Promise<boolean>` - Success status

---

### `biomni.settings.reset`

Reset Biomni settings to defaults.

**Command ID**: `biomni.settings.reset`  
**Title**: "Reset to Defaults"  
**Category**: "Biomni Settings"  

**Parameters**:
```typescript
{
  scope?: 'user' | 'workspace' | 'both';
  confirmReset?: boolean;
}
```

---

### `biomni.settings.manageApiKeys`

Manage API keys for external services.

**Command ID**: `biomni.settings.manageApiKeys`  
**Title**: "Manage API Keys"  
**Category**: "Biomni Settings"  

---

### `biomni.settings.validateConfiguration`

Validate current configuration settings.

**Command ID**: `biomni.settings.validateConfiguration`  
**Title**: "Validate Configuration"  
**Category**: "Biomni Settings"  

**Returns**:
```typescript
Promise<{
  isValid: boolean;
  errors: Array<{
    setting: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    setting: string;
    message: string;
    suggestion?: string;
  }>;
}>
```

## Error Handling

All commands follow consistent error handling patterns:

```typescript
try {
  const result = await vscode.commands.executeCommand('biomni.fasta.blast', options);
  // Handle successful result
} catch (error) {
  if (error instanceof BiomniError) {
    // Biomni-specific error with additional context
    console.error('Biomni Error:', error.message, error.context);
  } else {
    // Generic error
    console.error('Command failed:', error.message);
  }
  
  vscode.window.showErrorMessage(`Operation failed: ${error.message}`);
}
```

### Error Types

```typescript
interface BiomniError extends Error {
  code: string;
  context?: Record<string, any>;
  suggestions?: string[];
}
```

Common error codes:
- `BIOMNI_SERVER_UNREACHABLE`: Cannot connect to MCP server
- `BIOMNI_INVALID_FILE_FORMAT`: File format is invalid or unsupported
- `BIOMNI_INSUFFICIENT_PERMISSIONS`: Insufficient permissions for operation
- `BIOMNI_QUOTA_EXCEEDED`: API quota or resource limit exceeded
- `BIOMNI_NETWORK_ERROR`: Network connectivity issue
- `BIOMNI_CONFIGURATION_ERROR`: Invalid configuration settings

## Integration Examples

### Extension Integration

```typescript
// In your extension's activate function
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register command that uses Biomni
  const disposable = vscode.commands.registerCommand('myext.analyzeFasta', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.fasta')) {
      vscode.window.showErrorMessage('Please open a FASTA file');
      return;
    }
    
    try {
      // Use Biomni to get file info
      const info = await vscode.commands.executeCommand('biomni.file.showInfo');
      
      // Use Biomni to run BLAST
      const blastResults = await vscode.commands.executeCommand('biomni.fasta.blast', {
        database: 'nr',
        eValue: 1e-3
      });
      
      // Process results
      const hits = blastResults.hits.slice(0, 5); // Top 5 hits
      const message = `Found ${hits.length} significant hits`;
      vscode.window.showInformationMessage(message);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
  });
  
  context.subscriptions.push(disposable);
}
```

### Programmatic Configuration

```typescript
// Update settings programmatically
async function configureBiomni() {
  const config = vscode.workspace.getConfiguration('biomni');
  
  // Update BLAST database preference
  await config.update('tools.blast.database', 'refseq_genomic', true);
  
  // Enable performance optimizations
  await config.update('performance.cache.enabled', true, true);
  await config.update('performance.processing.maxConcurrentJobs', 8, true);
  
  // Validate new configuration
  const validation = await vscode.commands.executeCommand('biomni.settings.validateConfiguration');
  if (!validation.isValid) {
    console.error('Configuration errors:', validation.errors);
  }
}
```

---

This API reference provides comprehensive documentation for integrating with and extending the Biomni VSCode Extension. For more examples and advanced usage patterns, see the [Developer Guide](../developer/contribution-guide.md).