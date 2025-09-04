/**
 * Settings schema definitions and validation for Biomni VSCode extension
 */

export interface BiomniToolsSettings {
  blast: {
    database: 'nt' | 'nr' | 'refseq_genomic' | 'refseq_protein' | 'swissprot' | 'pdb';
    eValue: number;
    maxTargetSequences: number;
    wordSize: number;
    customOptions: string;
  };
  alignment: {
    algorithm: 'clustalw' | 'muscle' | 'mafft' | 'tcoffee';
    format: 'clustal' | 'fasta' | 'phylip' | 'nexus';
    gapOpenPenalty: number;
    gapExtensionPenalty: number;
  };
  annotation: {
    defaultDatabases: string[];
    includeGeneOntology: boolean;
    includePathways: boolean;
    customAnnotationSources: string[];
  };
}

export interface BiomniDisplaySettings {
  sequences: {
    maxSequenceLength: number;
    showLineNumbers: boolean;
    wrapLongSequences: boolean;
    highlightGcContent: boolean;
    colorScheme: 'default' | 'nucleotide' | 'protein' | 'hydrophobicity';
  };
  results: {
    maxResultsPerPage: number;
    showThumbnails: boolean;
    defaultSortOrder: 'relevance' | 'evalue' | 'score' | 'length';
    enableInteractiveCharts: boolean;
  };
  ui: {
    theme: 'auto' | 'light' | 'dark';
    fontSize: number;
    showWelcomeScreen: boolean;
    enableNotifications: boolean;
  };
}

export interface BiomniPerformanceSettings {
  cache: {
    enabled: boolean;
    size: number; // MB
    ttl: number; // seconds
    maxFiles: number;
  };
  processing: {
    maxConcurrentJobs: number;
    timeoutDuration: number; // seconds
    enableParallelProcessing: boolean;
    chunkSize: number;
  };
  memory: {
    maxMemoryUsage: number; // MB
    enableGarbageCollection: boolean;
    gcThreshold: number; // MB
  };
}

export interface BiomniSecuritySettings {
  apiKeys: {
    // Note: These are references - actual keys stored in VSCode Secret Storage
    ncbiApiKeySet: boolean;
    uniprotApiKeySet: boolean;
    ensemblApiKeySet: boolean;
    customApiKeysSet: string[]; // List of custom key names
  };
  privacy: {
    enableDataRetention: boolean;
    retentionPeriod: number; // days
    shareUsageStatistics: boolean;
    enableAuditLogging: boolean;
  };
  external: {
    allowedHosts: string[];
    enableSslVerification: boolean;
    useProxy: boolean;
    proxyUrl: string;
  };
}

export interface BiomniWorkflowSettings {
  templates: {
    defaultWorkflows: string[];
    customWorkflows: string[];
    autoSaveWorkflows: boolean;
  };
  execution: {
    defaultEnvironment: 'local' | 'remote' | 'cloud';
    retryAttempts: number;
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

export interface BiomniExtensionSettings {
  core: {
    enabled: boolean;
    mcpServerUrl: string;
    autoActivate: boolean;
    debugMode: boolean;
    telemetryEnabled: boolean;
  };
  fileDetection: {
    enabled: boolean;
    cacheEnabled: boolean;
    maxCacheSize: number;
    showSmartSuggestions: boolean;
    showNewFileNotifications: boolean;
    autoValidateFiles: boolean;
  };
  integration: {
    enableCloudSync: boolean;
    syncInterval: number; // minutes
    enableCollaboration: boolean;
    shareWorkspaceSettings: boolean;
  };
}

export interface BiomniSettings {
  tools: BiomniToolsSettings;
  display: BiomniDisplaySettings;
  performance: BiomniPerformanceSettings;
  security: BiomniSecuritySettings;
  workflows: BiomniWorkflowSettings;
  extension: BiomniExtensionSettings;
}

// Settings validation schema
export const SETTINGS_SCHEMA = {
  type: 'object',
  properties: {
    tools: {
      type: 'object',
      properties: {
        blast: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              enum: ['nt', 'nr', 'refseq_genomic', 'refseq_protein', 'swissprot', 'pdb'],
              default: 'nt'
            },
            eValue: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 0.01
            },
            maxTargetSequences: {
              type: 'number',
              minimum: 1,
              maximum: 10000,
              default: 500
            },
            wordSize: {
              type: 'number',
              minimum: 2,
              maximum: 50,
              default: 11
            },
            customOptions: {
              type: 'string',
              default: ''
            }
          }
        },
        alignment: {
          type: 'object',
          properties: {
            algorithm: {
              type: 'string',
              enum: ['clustalw', 'muscle', 'mafft', 'tcoffee'],
              default: 'muscle'
            },
            format: {
              type: 'string',
              enum: ['clustal', 'fasta', 'phylip', 'nexus'],
              default: 'clustal'
            },
            gapOpenPenalty: {
              type: 'number',
              minimum: -50,
              maximum: 0,
              default: -10
            },
            gapExtensionPenalty: {
              type: 'number',
              minimum: -50,
              maximum: 0,
              default: -1
            }
          }
        }
      }
    },
    display: {
      type: 'object',
      properties: {
        sequences: {
          type: 'object',
          properties: {
            maxSequenceLength: {
              type: 'number',
              minimum: 100,
              maximum: 1000000,
              default: 10000
            },
            showLineNumbers: {
              type: 'boolean',
              default: true
            },
            wrapLongSequences: {
              type: 'boolean',
              default: true
            },
            highlightGcContent: {
              type: 'boolean',
              default: false
            },
            colorScheme: {
              type: 'string',
              enum: ['default', 'nucleotide', 'protein', 'hydrophobicity'],
              default: 'default'
            }
          }
        }
      }
    },
    performance: {
      type: 'object',
      properties: {
        cache: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              default: true
            },
            size: {
              type: 'number',
              minimum: 10,
              maximum: 10240,
              default: 256
            },
            ttl: {
              type: 'number',
              minimum: 300,
              maximum: 86400,
              default: 3600
            }
          }
        }
      }
    },
    security: {
      type: 'object',
      properties: {
        privacy: {
          type: 'object',
          properties: {
            enableDataRetention: {
              type: 'boolean',
              default: true
            },
            retentionPeriod: {
              type: 'number',
              minimum: 1,
              maximum: 365,
              default: 30
            },
            shareUsageStatistics: {
              type: 'boolean',
              default: false
            }
          }
        }
      }
    }
  }
} as const;

// Default settings
export const DEFAULT_SETTINGS: BiomniSettings = {
  tools: {
    blast: {
      database: 'nt',
      eValue: 0.01,
      maxTargetSequences: 500,
      wordSize: 11,
      customOptions: ''
    },
    alignment: {
      algorithm: 'muscle',
      format: 'clustal',
      gapOpenPenalty: -10,
      gapExtensionPenalty: -1
    },
    annotation: {
      defaultDatabases: ['uniprot', 'go', 'kegg'],
      includeGeneOntology: true,
      includePathways: true,
      customAnnotationSources: []
    }
  },
  display: {
    sequences: {
      maxSequenceLength: 10000,
      showLineNumbers: true,
      wrapLongSequences: true,
      highlightGcContent: false,
      colorScheme: 'default'
    },
    results: {
      maxResultsPerPage: 50,
      showThumbnails: true,
      defaultSortOrder: 'evalue',
      enableInteractiveCharts: true
    },
    ui: {
      theme: 'auto',
      fontSize: 14,
      showWelcomeScreen: true,
      enableNotifications: true
    }
  },
  performance: {
    cache: {
      enabled: true,
      size: 256,
      ttl: 3600,
      maxFiles: 1000
    },
    processing: {
      maxConcurrentJobs: 4,
      timeoutDuration: 300,
      enableParallelProcessing: true,
      chunkSize: 1000
    },
    memory: {
      maxMemoryUsage: 512,
      enableGarbageCollection: true,
      gcThreshold: 256
    }
  },
  security: {
    apiKeys: {
      ncbiApiKeySet: false,
      uniprotApiKeySet: false,
      ensemblApiKeySet: false,
      customApiKeysSet: []
    },
    privacy: {
      enableDataRetention: true,
      retentionPeriod: 30,
      shareUsageStatistics: false,
      enableAuditLogging: false
    },
    external: {
      allowedHosts: ['ncbi.nlm.nih.gov', 'uniprot.org', 'ensembl.org'],
      enableSslVerification: true,
      useProxy: false,
      proxyUrl: ''
    }
  },
  workflows: {
    templates: {
      defaultWorkflows: ['sequence-analysis', 'variant-calling', 'genome-annotation'],
      customWorkflows: [],
      autoSaveWorkflows: true
    },
    execution: {
      defaultEnvironment: 'local',
      retryAttempts: 3,
      enableLogging: true,
      logLevel: 'info'
    }
  },
  extension: {
    core: {
      enabled: true,
      mcpServerUrl: 'http://localhost:8080',
      autoActivate: true,
      debugMode: false,
      telemetryEnabled: false
    },
    fileDetection: {
      enabled: true,
      cacheEnabled: true,
      maxCacheSize: 1000,
      showSmartSuggestions: true,
      showNewFileNotifications: false,
      autoValidateFiles: true
    },
    integration: {
      enableCloudSync: false,
      syncInterval: 30,
      enableCollaboration: false,
      shareWorkspaceSettings: false
    }
  }
};

// Settings categories for UI organization
export const SETTINGS_CATEGORIES = {
  TOOLS: 'Tools Configuration',
  DISPLAY: 'Display Options', 
  PERFORMANCE: 'Performance Settings',
  SECURITY: 'Security & Privacy',
  WORKFLOWS: 'Workflow Management',
  EXTENSION: 'Extension Settings'
} as const;

// Setting keys that require secure storage
export const SECURE_SETTINGS = [
  'ncbiApiKey',
  'uniprotApiKey', 
  'ensemblApiKey',
  'customApiKeys'
] as const;