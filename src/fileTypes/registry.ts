/**
 * Registry of biological file formats with comprehensive metadata
 */

import { BioFileFormat } from './types';

export const BIO_FILE_FORMATS: Record<string, BioFileFormat> = {
  fasta: {
    name: 'FASTA',
    extensions: ['.fasta', '.fa', '.fas', '.seq', '.fna', '.ffn', '.frn'],
    contentPatterns: [/^>/m, /^>\s*\w+/m],
    mimeType: 'text/x-fasta',
    description: 'FASTA format for nucleotide and protein sequences',
    tools: ['blast', 'align', 'translate', 'reverse-complement'],
    validator: 'validateFasta',
    highlighter: 'fasta',
    supportsCompression: true,
    sizeRange: 'variable',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  fastq: {
    name: 'FASTQ',
    extensions: ['.fastq', '.fq'],
    contentPatterns: [/^@\w+/m, /^@.*\n[ACGTN]+\n\+/m],
    mimeType: 'text/x-fastq',
    description: 'FASTQ format for sequences with quality scores',
    tools: ['quality-control', 'trim', 'filter', 'stats'],
    validator: 'validateFastq',
    highlighter: 'fastq',
    supportsCompression: true,
    sizeRange: 'large',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 2048,
      cacheable: true,
    },
  },

  vcf: {
    name: 'VCF',
    extensions: ['.vcf', '.vcf.gz'],
    contentPatterns: [/^##fileformat=VCF/m, /^#CHROM\s+POS\s+ID/m],
    mimeType: 'text/x-vcf',
    description: 'Variant Call Format for genomic variants',
    tools: ['annotate', 'filter', 'stats', 'validate'],
    validator: 'validateVcf',
    highlighter: 'vcf',
    supportsCompression: true,
    sizeRange: 'large',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 2048,
      cacheable: true,
    },
  },

  pdb: {
    name: 'PDB',
    extensions: ['.pdb'],
    contentPatterns: [/^HEADER\s+/, /^ATOM\s+\d+/, /^HETATM\s+\d+/m],
    mimeType: 'chemical/x-pdb',
    description: 'Protein Data Bank format for 3D structures',
    tools: ['visualize', 'analyze-structure', 'validate-structure'],
    validator: 'validatePdb',
    highlighter: 'pdb',
    supportsCompression: false,
    sizeRange: 'medium',
    optimizationHints: {
      useStreaming: false,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  gff: {
    name: 'GFF/GTF',
    extensions: ['.gff', '.gff3', '.gtf'],
    contentPatterns: [/^##gff-version\s+[23]/m, /^\w+\t\w+\t\w+\t\d+\t\d+/m],
    mimeType: 'text/x-gff',
    description: 'General Feature Format for genomic annotations',
    tools: ['annotate', 'filter', 'convert', 'validate'],
    validator: 'validateGff',
    highlighter: 'gff',
    supportsCompression: true,
    sizeRange: 'large',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  sam: {
    name: 'SAM',
    extensions: ['.sam'],
    contentPatterns: [/^@HD\s+VN:/, /^@SQ\s+SN:/, /^\w+\s+\d+\s+\w+\s+\d+/m],
    mimeType: 'text/x-sam',
    description: 'Sequence Alignment Map format',
    tools: ['convert-to-bam', 'sort', 'index', 'stats'],
    validator: 'validateSam',
    highlighter: 'sam',
    supportsCompression: false,
    sizeRange: 'large',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 2048,
      cacheable: false,
    },
  },

  bam: {
    name: 'BAM',
    extensions: ['.bam'],
    contentPatterns: [/^BAM\x01/],
    mimeType: 'application/x-bam',
    description: 'Binary Alignment Map format',
    tools: ['view', 'sort', 'index', 'stats'],
    validator: 'validateBam',
    supportsCompression: false,
    sizeRange: 'large',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 512,
      cacheable: false,
    },
  },

  bed: {
    name: 'BED',
    extensions: ['.bed'],
    contentPatterns: [/^\w+\s+\d+\s+\d+/m, /^track\s+name=/m],
    mimeType: 'text/x-bed',
    description: 'Browser Extensible Data format for genomic regions',
    tools: ['sort', 'merge', 'intersect', 'visualize'],
    validator: 'validateBed',
    highlighter: 'bed',
    supportsCompression: true,
    sizeRange: 'medium',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  wig: {
    name: 'WIG/BigWig',
    extensions: ['.wig', '.bw', '.bigwig'],
    contentPatterns: [/^track\s+type=wiggle/m, /^variableStep\s+chrom=/m, /^fixedStep\s+chrom=/m],
    mimeType: 'text/x-wig',
    description: 'Wiggle format for continuous-valued data',
    tools: ['convert', 'visualize', 'stats'],
    validator: 'validateWig',
    highlighter: 'wig',
    supportsCompression: true,
    sizeRange: 'large',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  embl: {
    name: 'EMBL',
    extensions: ['.embl', '.emb'],
    contentPatterns: [/^ID\s+\w+/, /^AC\s+\w+/, /^SQ\s+Sequence/m],
    mimeType: 'text/x-embl',
    description: 'EMBL format for sequence data',
    tools: ['convert', 'validate', 'extract-features'],
    validator: 'validateEmbl',
    highlighter: 'embl',
    supportsCompression: true,
    sizeRange: 'medium',
    optimizationHints: {
      useStreaming: false,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  genbank: {
    name: 'GenBank',
    extensions: ['.gb', '.gbk', '.genbank'],
    contentPatterns: [/^LOCUS\s+\w+/, /^DEFINITION\s+/, /^ORIGIN\s*$/m],
    mimeType: 'text/x-genbank',
    description: 'GenBank format for annotated sequences',
    tools: ['convert', 'validate', 'extract-features'],
    validator: 'validateGenbank',
    highlighter: 'genbank',
    supportsCompression: true,
    sizeRange: 'medium',
    optimizationHints: {
      useStreaming: false,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  stockholm: {
    name: 'Stockholm',
    extensions: ['.sto', '.stk', '.stockholm'],
    contentPatterns: [/^# STOCKHOLM 1\.\d+/m, /^#=GF\s+ID/m],
    mimeType: 'text/x-stockholm',
    description: 'Stockholm format for multiple sequence alignments',
    tools: ['view-alignment', 'convert', 'validate'],
    validator: 'validateStockholm',
    highlighter: 'stockholm',
    supportsCompression: true,
    sizeRange: 'medium',
    optimizationHints: {
      useStreaming: false,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  newick: {
    name: 'Newick',
    extensions: ['.nwk', '.tre', '.tree', '.newick'],
    contentPatterns: [/^\s*\([^;]+\);?\s*$/, /^\s*[\w\d_]+:[0-9.]+/],
    mimeType: 'text/x-newick',
    description: 'Newick format for phylogenetic trees',
    tools: ['visualize-tree', 'validate', 'convert'],
    validator: 'validateNewick',
    highlighter: 'newick',
    supportsCompression: true,
    sizeRange: 'small',
    optimizationHints: {
      useStreaming: false,
      sampleSize: 512,
      cacheable: true,
    },
  },

  phylip: {
    name: 'PHYLIP',
    extensions: ['.phy', '.phylip'],
    contentPatterns: [/^\s*\d+\s+\d+\s*$/, /^\w+\s+[ACGTN-]+$/m],
    mimeType: 'text/x-phylip',
    description: 'PHYLIP format for phylogenetic analysis',
    tools: ['convert', 'validate', 'analyze-phylogeny'],
    validator: 'validatePhylip',
    highlighter: 'phylip',
    supportsCompression: true,
    sizeRange: 'medium',
    optimizationHints: {
      useStreaming: false,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  maf: {
    name: 'MAF',
    extensions: ['.maf'],
    contentPatterns: [/^##maf\s+version=/m, /^a\s+score=/m, /^s\s+\w+/m],
    mimeType: 'text/x-maf',
    description: 'Multiple Alignment Format',
    tools: ['view-alignment', 'filter', 'convert'],
    validator: 'validateMaf',
    highlighter: 'maf',
    supportsCompression: true,
    sizeRange: 'large',
    optimizationHints: {
      useStreaming: true,
      sampleSize: 1024,
      cacheable: true,
    },
  },

  psi: {
    name: 'PSI-BLAST',
    extensions: ['.psi', '.pssm'],
    contentPatterns: [/^\s*Last position-specific scoring matrix/m, /^\s*A\s+R\s+N\s+D/m],
    mimeType: 'text/x-psi',
    description: 'PSI-BLAST position-specific scoring matrix',
    tools: ['blast', 'validate', 'convert'],
    validator: 'validatePsi',
    highlighter: 'psi',
    supportsCompression: true,
    sizeRange: 'medium',
    optimizationHints: {
      useStreaming: false,
      sampleSize: 1024,
      cacheable: true,
    },
  },
};

/**
 * Get all registered file formats
 */
export function getAllFormats(): BioFileFormat[] {
  return Object.values(BIO_FILE_FORMATS);
}

/**
 * Get format by name
 */
export function getFormat(name: string): BioFileFormat | undefined {
  return BIO_FILE_FORMATS[name];
}

/**
 * Get formats by extension
 */
export function getFormatsByExtension(extension: string): BioFileFormat[] {
  const normalizedExt = extension.toLowerCase();
  return getAllFormats().filter(format =>
    format.extensions.some(ext => ext.toLowerCase() === normalizedExt)
  );
}

/**
 * Get all supported extensions
 */
export function getSupportedExtensions(): string[] {
  const extensions = new Set<string>();
  getAllFormats().forEach(format => {
    format.extensions.forEach(ext => extensions.add(ext.toLowerCase()));
  });
  return Array.from(extensions).sort();
}
