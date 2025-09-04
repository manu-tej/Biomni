
/**
 * Command category types for better organization
 */
export type CommandCategory = 
  | 'Genomics'
  | 'Proteomics'
  | 'Database'
  | 'Analysis'
  | 'Visualization'
  | 'Pharmacology'
  | 'Systems Biology'
  | 'File Operations'
  | 'Settings'
  | 'MCP';

/**
 * Command definition interface
 */
export interface BiomniCommand {
  /** Command identifier */
  command: string;
  /** Display title in command palette */
  title: string;
  /** Category for grouping and filtering */
  category: CommandCategory;
  /** Description for command palette search */
  description: string;
  /** File type contexts where command is relevant */
  when?: string;
  /** Keyboard shortcut */
  keybinding?: string;
  /** Command handler function name */
  handler: string;
  /** Icon for command palette */
  icon?: string;
  /** Priority for command ordering (higher = more important) */
  priority: number;
}

/**
 * Top 20 Biomni commands for the command palette
 * Organized by category and priority for optimal user experience
 */
export const BIOMNI_COMMANDS: BiomniCommand[] = [
  // === DATABASE & QUERY COMMANDS (High Priority) ===
  {
    command: 'biomni.database.queryUniprot',
    title: 'Query UniProt Database',
    category: 'Database',
    description: 'Search UniProt for protein information using natural language',
    handler: 'handleQueryUniprot',
    icon: '$(database)',
    priority: 100,
    keybinding: 'ctrl+shift+u'
  },
  {
    command: 'biomni.database.queryPDB',
    title: 'Query Protein Data Bank',
    category: 'Database',
    description: 'Search PDB for protein structures and download files',
    handler: 'handleQueryPDB',
    icon: '$(database)',
    priority: 95
  },
  {
    command: 'biomni.database.queryAlphaFold',
    title: 'Query AlphaFold Database',
    category: 'Database',
    description: 'Get AlphaFold protein structure predictions',
    handler: 'handleQueryAlphaFold',
    icon: '$(database)',
    priority: 90
  },
  {
    command: 'biomni.database.queryInterPro',
    title: 'Query InterPro Database',
    category: 'Database',
    description: 'Search InterPro for protein domains and families',
    handler: 'handleQueryInterPro',
    icon: '$(database)',
    priority: 85
  },

  // === GENOMICS & SEQUENCE ANALYSIS (High Priority) ===
  {
    command: 'biomni.genomics.blastSequence',
    title: 'BLAST Sequence Search',
    category: 'Genomics',
    description: 'Perform BLAST search on nucleotide or protein sequences',
    when: 'resourceExtname =~ /\\.(fasta|fa|fas|seq|fna|ffn|frn)$/',
    handler: 'handleBlastSequence',
    icon: '$(search)',
    priority: 100,
    keybinding: 'ctrl+shift+b'
  },
  {
    command: 'biomni.genomics.annotateGenes',
    title: 'Annotate Gene Sequence',
    category: 'Genomics',
    description: 'Find ORFs, domains, and predict gene functions',
    when: 'resourceExtname =~ /\\.(fasta|fa|fas|seq|fna|ffn|frn)$/',
    handler: 'handleAnnotateGenes',
    icon: '$(gene)',
    priority: 98,
    keybinding: 'ctrl+shift+a'
  },
  {
    command: 'biomni.genomics.analyzeSequence',
    title: 'Analyze Sequence Properties',
    category: 'Genomics',
    description: 'Calculate GC content, melting temp, restriction sites, and more',
    when: 'resourceExtname =~ /\\.(fasta|fa|fas|seq|fna|ffn|frn)$/',
    handler: 'handleAnalyzeSequence',
    icon: '$(graph)',
    priority: 96
  },
  {
    command: 'biomni.genomics.findORFs',
    title: 'Find Open Reading Frames',
    category: 'Genomics',
    description: 'Identify potential coding sequences and ORFs',
    when: 'resourceExtname =~ /\\.(fasta|fa|fas|seq|fna|ffn|frn)$/',
    handler: 'handleFindORFs',
    icon: '$(bracket)',
    priority: 94
  },
  {
    command: 'biomni.genomics.translateSequence',
    title: 'Translate DNA to Protein',
    category: 'Genomics',
    description: 'Translate DNA sequence in all reading frames',
    when: 'resourceExtname =~ /\\.(fasta|fa|fas|seq|fna|ffn|frn)$/',
    handler: 'handleTranslateSequence',
    icon: '$(arrow-right)',
    priority: 92
  },
  {
    command: 'biomni.genomics.annotateScRNA',
    title: 'Annotate Single Cell RNA-seq',
    category: 'Genomics',
    description: 'Annotate cell types in scRNA-seq data',
    when: 'resourceExtname =~ /\\.(h5|h5ad|csv|xlsx)$/',
    handler: 'handleAnnotateScRNA',
    icon: '$(microscope)',
    priority: 88
  },
  {
    command: 'biomni.genomics.liftoverCoordinates',
    title: 'Liftover Genomic Coordinates',
    category: 'Genomics',
    description: 'Convert coordinates between genome builds',
    handler: 'handleLiftoverCoordinates',
    icon: '$(arrow-both)',
    priority: 85
  },
  {
    command: 'biomni.genomics.showResults',
    title: 'Show Analysis Results',
    category: 'Genomics',
    description: 'View interactive genomics analysis results',
    handler: 'handleShowResults',
    icon: '$(preview)',
    priority: 80
  },
  {
    command: 'biomni.genomics.exportResults',
    title: 'Export Analysis Results',
    category: 'Genomics',
    description: 'Export results to various formats (CSV, FASTA, GenBank)',
    handler: 'handleExportResults',
    icon: '$(export)',
    priority: 75
  },
  {
    command: 'biomni.genomics.clearCache',
    title: 'Clear Results Cache',
    category: 'Genomics',
    description: 'Clear cached analysis results',
    handler: 'handleClearCache',
    icon: '$(trash)',
    priority: 60
  },

  // === PHARMACOLOGY & DRUG DISCOVERY (High Priority) ===
  {
    command: 'biomni.pharmacology.runDiffDock',
    title: 'Molecular Docking with DiffDock',
    category: 'Pharmacology',
    description: 'Perform protein-ligand docking using DiffDock',
    handler: 'handleRunDiffDock',
    icon: '$(combine)',
    priority: 90,
    keybinding: 'ctrl+shift+d'
  },
  {
    command: 'biomni.pharmacology.predictADMET',
    title: 'Predict ADMET Properties',
    category: 'Pharmacology',
    description: 'Predict absorption, distribution, metabolism, excretion, toxicity',
    handler: 'handlePredictADMET',
    icon: '$(beaker)',
    priority: 85
  },

  // === SYSTEMS BIOLOGY & ANALYSIS (Medium-High Priority) ===
  {
    command: 'biomni.systems.fluxBalanceAnalysis',
    title: 'Flux Balance Analysis',
    category: 'Systems Biology',
    description: 'Perform FBA on metabolic networks',
    handler: 'handleFluxBalanceAnalysis',
    icon: '$(graph)',
    priority: 80
  },
  {
    command: 'biomni.analysis.proteinDisorderRegions',
    title: 'Predict Protein Disorder Regions',
    category: 'Proteomics',
    description: 'Identify intrinsically disordered regions in proteins',
    handler: 'handleProteinDisorderRegions',
    icon: '$(squiggly)',
    priority: 75
  },

  // === SPECIALIZED ANALYSIS TOOLS (Medium Priority) ===
  {
    command: 'biomni.analysis.circularDichroism',
    title: 'Analyze Circular Dichroism Spectra',
    category: 'Analysis',
    description: 'Analyze protein secondary structure from CD spectra',
    handler: 'handleCircularDichroism',
    icon: '$(graph-line)',
    priority: 70
  },
  {
    command: 'biomni.analysis.cellMigration',
    title: 'Analyze Cell Migration Metrics',
    category: 'Analysis',
    description: 'Quantify cell migration and motility patterns',
    handler: 'handleCellMigration',
    icon: '$(location)',
    priority: 65
  },
  {
    command: 'biomni.analysis.atacSeq',
    title: 'ATAC-seq Differential Accessibility',
    category: 'Genomics',
    description: 'Analyze chromatin accessibility changes',
    when: 'resourceExtname =~ /\\.(bed|bedgraph|bw|bigwig)$/',
    handler: 'handleATACSeq',
    icon: '$(diff)',
    priority: 70
  },

  // === FILE OPERATIONS & UTILITIES (Medium Priority) ===
  {
    command: 'biomni.file.validateFormat',
    title: 'Validate Biological File Format',
    category: 'File Operations',
    description: 'Validate FASTA, FASTQ, VCF, and other bio file formats',
    when: 'resourceExtname =~ /\\.(fasta|fastq|vcf|pdb|gff|gtf|sam|bam|bed)$/',
    handler: 'handleValidateFormat',
    icon: '$(check)',
    priority: 60,
    keybinding: 'ctrl+shift+v'
  },
  {
    command: 'biomni.file.showInfo',
    title: 'Show File Information',
    category: 'File Operations',
    description: 'Display detailed information about biological files',
    when: 'resourceExtname =~ /\\.(fasta|fastq|vcf|pdb|gff|gtf|sam|bam|bed)$/',
    handler: 'handleShowInfo',
    icon: '$(info)',
    priority: 55
  },
  {
    command: 'biomni.file.suggestTools',
    title: 'Suggest Analysis Tools',
    category: 'File Operations',
    description: 'Get tool suggestions based on file type and content',
    when: 'resourceExtname =~ /\\.(fasta|fastq|vcf|pdb|gff|gtf|sam|bam|bed)$/',
    handler: 'handleSuggestTools',
    icon: '$(lightbulb)',
    priority: 50
  },

  // === LITERATURE & SUPPORT (Lower Priority) ===
  {
    command: 'biomni.literature.queryArxiv',
    title: 'Query ArXiv Papers',
    category: 'Database',
    description: 'Search for relevant scientific papers on ArXiv',
    handler: 'handleQueryArxiv',
    icon: '$(book)',
    priority: 45
  },
  {
    command: 'biomni.support.runPython',
    title: 'Execute Python Code',
    category: 'Analysis',
    description: 'Run Python code with Biomni environment',
    handler: 'handleRunPython',
    icon: '$(terminal)',
    priority: 40
  },

  // === MCP & SYSTEM COMMANDS (Lower Priority) ===
  {
    command: 'biomni.mcp.refreshTools',
    title: 'Refresh MCP Tools',
    category: 'MCP',
    description: 'Refresh available tools from MCP server',
    handler: 'handleRefreshTools',
    icon: '$(refresh)',
    priority: 35
  },

  // === SETTINGS COMMANDS ===
  {
    command: 'biomni.settings.manageApiKeys',
    title: 'Manage API Keys',
    category: 'Settings',
    description: 'Add, update, or remove API keys for external services',
    handler: 'handleManageApiKeys',
    icon: '$(key)',
    priority: 30
  },
  {
    command: 'biomni.settings.validateConfiguration',
    title: 'Validate Configuration',
    category: 'Settings',
    description: 'Validate current extension configuration',
    handler: 'handleValidateConfiguration',
    icon: '$(verified)',
    priority: 25
  },
  {
    command: 'biomni.settings.export',
    title: 'Export Settings',
    category: 'Settings',
    description: 'Export current settings to JSON file',
    handler: 'handleExportSettings',
    icon: '$(export)',
    priority: 20
  },
  {
    command: 'biomni.settings.import',
    title: 'Import Settings',
    category: 'Settings',
    description: 'Import settings from JSON file',
    handler: 'handleImportSettings',
    icon: '$(cloud-download)',
    priority: 20
  },
  {
    command: 'biomni.settings.reset',
    title: 'Reset to Defaults',
    category: 'Settings',
    description: 'Reset all settings to default values',
    handler: 'handleResetSettings',
    icon: '$(discard)',
    priority: 15
  }
];

/**
 * Get commands filtered by category
 */
export function getCommandsByCategory(category: CommandCategory): BiomniCommand[] {
  return BIOMNI_COMMANDS.filter(cmd => cmd.category === category);
}

/**
 * Get commands sorted by priority (descending)
 */
export function getCommandsByPriority(): BiomniCommand[] {
  return [...BIOMNI_COMMANDS].sort((a, b) => b.priority - a.priority);
}

/**
 * Get commands filtered by file context
 */
export function getContextualCommands(fileExtension: string): BiomniCommand[] {
  return BIOMNI_COMMANDS.filter(cmd => {
    if (!cmd.when) return true;
    
    // Simple regex matching for file extensions
    const pattern = cmd.when.replace(/resourceExtname =~ \/(.+)\$\//, '$1');
    const regex = new RegExp(pattern);
    return regex.test(fileExtension);
  });
}

/**
 * Find command by command identifier
 */
export function getCommandById(command: string): BiomniCommand | undefined {
  return BIOMNI_COMMANDS.find(cmd => cmd.command === command);
}

/**
 * Get all command categories
 */
export function getAllCategories(): CommandCategory[] {
  const categories = new Set(BIOMNI_COMMANDS.map(cmd => cmd.category));
  return Array.from(categories).sort();
}

/**
 * Generate VSCode command contribution for package.json
 */
export function generateCommandContributions(): any[] {
  return BIOMNI_COMMANDS.map(cmd => ({
    command: cmd.command,
    title: cmd.title,
    category: `Biomni ${cmd.category}`,
    shortTitle: cmd.title.replace(/^(Biomni\s+)?/, ''),
    icon: cmd.icon || '$(tools)'
  }));
}

/**
 * Generate keybinding contributions for package.json
 */
export function generateKeybindingContributions(): any[] {
  return BIOMNI_COMMANDS
    .filter(cmd => cmd.keybinding)
    .map(cmd => ({
      command: cmd.command,
      key: cmd.keybinding,
      when: cmd.when || 'editorTextFocus'
    }));
}

/**
 * Generate menu contributions for package.json
 */
export function generateMenuContributions(): any {
  const explorerContextMenu: any[] = [];
  const editorContextMenu: any[] = [];
  
  BIOMNI_COMMANDS.forEach((cmd) => {
    if (cmd.when) {
      // Add to explorer context menu
      explorerContextMenu.push({
        when: cmd.when,
        command: cmd.command,
        group: `biomni@${Math.floor(cmd.priority / 10)}`
      });
      
      // Add to editor context menu
      editorContextMenu.push({
        when: cmd.when,
        command: cmd.command,
        group: `biomni@${Math.floor(cmd.priority / 10)}`
      });
    }
  });
  
  return {
    'explorer/context': explorerContextMenu,
    'editor/context': editorContextMenu,
    'commandPalette': BIOMNI_COMMANDS.map(cmd => ({
      command: cmd.command,
      when: cmd.when || 'true'
    }))
  };
}