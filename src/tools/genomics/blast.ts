import { BlastParams, BlastResults, BlastHit, BlastStatistics } from './index';

/**
 * BLAST tool implementation that interfaces with Biomni's BLAST functionality
 */
export class BlastTool {
  constructor(private mcpProvider: any) {}

  /**
   * Perform BLAST search using Biomni's MCP server
   */
  async search(params: BlastParams): Promise<BlastResults> {
    try {
      // Prepare parameters for MCP call
      const mcpParams = this.prepareMCPParams(params);

      // Call Biomni's BLAST function through MCP
      const rawResults = await this.mcpProvider.invoke('biomni.blast_search', mcpParams);

      // Parse and format results
      return this.parseBlastResults(rawResults, params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`BLAST search failed: ${errorMessage}`);
    }
  }

  /**
   * Get available BLAST databases
   */
  async getAvailableDatabases(): Promise<string[]> {
    try {
      const result = await this.mcpProvider.invoke('biomni.blast_databases', {});
      return (
        result.databases || ['nr', 'nt', 'refseq_protein', 'refseq_genomic', 'swissprot', 'pdb']
      );
    } catch (error) {
      // Return default databases if MCP call fails
      return ['nr', 'nt', 'refseq_protein', 'refseq_genomic', 'swissprot', 'pdb'];
    }
  }

  /**
   * Get BLAST program suggestions based on sequence type
   */
  suggestBlastProgram(sequence: string): string[] {
    const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();

    // Simple heuristic to determine sequence type
    const nucleotideChars = (cleanSequence.match(/[ATCGUN]/g) || []).length;
    const totalChars = cleanSequence.length;
    const nucleotideRatio = nucleotideChars / totalChars;

    if (nucleotideRatio > 0.8) {
      // Likely nucleotide sequence
      return ['blastn', 'blastx', 'tblastx'];
    } else {
      // Likely protein sequence
      return ['blastp', 'tblastn'];
    }
  }

  /**
   * Validate BLAST parameters
   */
  validateParameters(params: BlastParams): string[] {
    const errors: string[] = [];

    if (!params.sequence || params.sequence.trim().length === 0) {
      errors.push('Sequence is required');
    }

    if (params.sequence && params.sequence.length > 100000) {
      errors.push('Sequence is too long (maximum 100,000 characters)');
    }

    if (params.evalue !== undefined && (params.evalue <= 0 || params.evalue > 1000)) {
      errors.push('E-value must be between 0 and 1000');
    }

    if (
      params.maxTargetSeqs !== undefined &&
      (params.maxTargetSeqs < 1 || params.maxTargetSeqs > 5000)
    ) {
      errors.push('Maximum target sequences must be between 1 and 5000');
    }

    if (params.wordSize !== undefined && params.wordSize < 4) {
      errors.push('Word size must be at least 4');
    }

    return errors;
  }

  /**
   * Get default parameters for different BLAST programs
   */
  getDefaultParameters(program: string): Partial<BlastParams> {
    const defaults: Record<string, Partial<BlastParams>> = {
      blastn: {
        evalue: 10.0,
        maxTargetSeqs: 100,
        wordSize: 11,
        reward: 2,
        penalty: -3,
      },
      blastp: {
        evalue: 10.0,
        maxTargetSeqs: 100,
        wordSize: 3,
        matrix: 'BLOSUM62',
        gapOpen: 11,
        gapExtend: 1,
      },
      blastx: {
        evalue: 10.0,
        maxTargetSeqs: 100,
        wordSize: 3,
        matrix: 'BLOSUM62',
        gapOpen: 11,
        gapExtend: 1,
      },
      tblastn: {
        evalue: 10.0,
        maxTargetSeqs: 100,
        wordSize: 3,
        matrix: 'BLOSUM62',
        gapOpen: 11,
        gapExtend: 1,
      },
      tblastx: {
        evalue: 10.0,
        maxTargetSeqs: 100,
        wordSize: 3,
        matrix: 'BLOSUM62',
      },
    };

    const params = defaults[program];
    if (params !== undefined) {
      return params;
    }
    // Fallback to blastn defaults
    return {
      evalue: 10.0,
      maxTargetSeqs: 100,
      wordSize: 11,
      reward: 2,
      penalty: -3,
    };
  }

  // Private helper methods

  /**
   * Prepare parameters for MCP call
   */
  private prepareMCPParams(params: BlastParams): any {
    return {
      sequence: params.sequence.replace(/\s/g, ''),
      database: params.database,
      program: params.program,
      evalue: params.evalue || 10.0,
      max_target_seqs: params.maxTargetSeqs || 100,
      word_size: params.wordSize,
      gap_open: params.gapOpen,
      gap_extend: params.gapExtend,
      matrix: params.matrix,
      reward: params.reward,
      penalty: params.penalty,
    };
  }

  /**
   * Parse raw BLAST results from MCP into structured format
   */
  private parseBlastResults(rawResults: any, originalParams: BlastParams): BlastResults {
    try {
      // Handle different possible result formats from Biomni
      const results = typeof rawResults === 'string' ? JSON.parse(rawResults) : rawResults;

      const hits: BlastHit[] = this.parseBlastHits(results.hits || results.alignments || []);
      const statistics: BlastStatistics = this.parseBlastStatistics(
        results.statistics || results.stats || {}
      );

      return {
        querySequence: originalParams.sequence,
        database: originalParams.database,
        program: originalParams.program,
        hits,
        statistics,
        parameters: originalParams,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse BLAST results: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse individual BLAST hits
   */
  private parseBlastHits(hitsData: any[]): BlastHit[] {
    return hitsData.map((hit, index) => {
      // Handle different possible hit formats
      const alignment = hit.alignments?.[0] || hit.hsps?.[0] || hit;

      return {
        id: hit.id || hit.accession || `hit_${index + 1}`,
        description: hit.description || hit.title || 'No description',
        accession: hit.accession || hit.id || '',
        length: parseInt(hit.length || hit.subject_length || '0'),
        evalue: parseFloat(alignment.evalue || alignment.expect || '1'),
        bitScore: parseFloat(alignment.bit_score || alignment.bits || '0'),
        score: parseFloat(alignment.score || '0'),
        identity: parseInt(alignment.identity || '0'),
        positive: parseInt(alignment.positive || alignment.similarity || '0'),
        gaps: parseInt(alignment.gaps || '0'),
        queryStart: parseInt(alignment.query_start || alignment.qstart || '1'),
        queryEnd: parseInt(alignment.query_end || alignment.qend || '1'),
        subjectStart: parseInt(alignment.subject_start || alignment.sstart || '1'),
        subjectEnd: parseInt(alignment.subject_end || alignment.send || '1'),
        querySequence: alignment.query_sequence || alignment.qseq || '',
        subjectSequence: alignment.subject_sequence || alignment.sseq || '',
        alignmentString: alignment.midline || alignment.alignment || '',
      };
    });
  }

  /**
   * Parse BLAST search statistics
   */
  private parseBlastStatistics(statsData: any): BlastStatistics {
    return {
      searchSpace: parseInt(statsData.search_space || statsData.searchSpace || '0'),
      effectiveLength: parseInt(statsData.effective_length || statsData.effectiveLength || '0'),
      kappa: parseFloat(statsData.kappa || '0.041'),
      lambda: parseFloat(statsData.lambda || '0.267'),
      entropy: parseFloat(statsData.entropy || '0.14'),
    };
  }

  /**
   * Format alignment for display
   */
  formatAlignment(hit: BlastHit, lineLength: number = 60): string {
    const lines: string[] = [];
    const querySeq = hit.querySequence;
    const subjSeq = hit.subjectSequence;
    const alignment = hit.alignmentString;

    if (!querySeq || !subjSeq || !alignment) {
      return 'Alignment data not available';
    }

    let queryPos = hit.queryStart;
    let subjPos = hit.subjectStart;

    for (let i = 0; i < querySeq.length; i += lineLength) {
      const queryLine = querySeq.substring(i, i + lineLength);
      const alignLine = alignment.substring(i, i + lineLength);
      const subjLine = subjSeq.substring(i, i + lineLength);

      const queryEndPos = queryPos + queryLine.replace(/-/g, '').length - 1;
      const subjEndPos = subjPos + subjLine.replace(/-/g, '').length - 1;

      lines.push(`Query  ${queryPos.toString().padStart(4)} ${queryLine} ${queryEndPos}`);
      lines.push(`            ${alignLine}`);
      lines.push(`Sbjct  ${subjPos.toString().padStart(4)} ${subjLine} ${subjEndPos}`);
      lines.push('');

      queryPos = queryEndPos + 1;
      subjPos = subjEndPos + 1;
    }

    return lines.join('\n');
  }

  /**
   * Calculate alignment identity percentage
   */
  calculateIdentity(hit: BlastHit): number {
    if (hit.identity && hit.querySequence) {
      const alignmentLength = hit.querySequence.replace(/-/g, '').length;
      return alignmentLength > 0 ? (hit.identity / alignmentLength) * 100 : 0;
    }
    return 0;
  }

  /**
   * Get color coding for E-value significance
   */
  getEValueColor(evalue: number): string {
    if (evalue < 1e-50) {
      return '#ff0000';
    } // Red - highly significant
    if (evalue < 1e-10) {
      return '#ff8000';
    } // Orange - significant
    if (evalue < 1e-5) {
      return '#ffff00';
    } // Yellow - moderately significant
    if (evalue < 1) {
      return '#80ff80';
    } // Light green - marginally significant
    return '#c0c0c0'; // Gray - not significant
  }
}
