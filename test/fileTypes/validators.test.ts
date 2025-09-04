/**
 * Tests for file format validators
 */

import * as assert from 'assert';
import { ValidatorRegistry } from '../../src/fileTypes/validators';

describe('ValidatorRegistry', () => {
  
  describe('FASTA validation', () => {
    it('should validate correct FASTA format', async () => {
      const validFasta = `>sequence1 description
ACGTACGTACGT
>sequence2
TGCATGCATGCA`;

      const result = await ValidatorRegistry.validateContent('validateFasta', validFasta);
      
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.stats.recordCount, 2);
    });

    it('should detect missing headers', async () => {
      const invalidFasta = `ACGTACGTACGT
TGCATGCATGCA`;

      const result = await ValidatorRegistry.validateContent('validateFasta', invalidFasta);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'NO_HEADERS'));
      assert(result.errors.some(e => e.code === 'SEQUENCE_BEFORE_HEADER'));
    });

    it('should detect invalid sequence characters', async () => {
      const invalidFasta = `>sequence1
ACGTXYZ123`;

      const result = await ValidatorRegistry.validateContent('validateFasta', invalidFasta);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_SEQUENCE'));
    });

    it('should detect empty headers', async () => {
      const invalidFasta = `>
ACGTACGT`;

      const result = await ValidatorRegistry.validateContent('validateFasta', invalidFasta);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'EMPTY_HEADER'));
    });

    it('should warn about empty sequences', async () => {
      const fastaWithEmptySeq = `>sequence1
ACGTACGT
>sequence2
>sequence3
TGCATGCA`;

      const result = await ValidatorRegistry.validateContent('validateFasta', fastaWithEmptySeq);
      
      assert.strictEqual(result.isValid, true); // Warning, not error
      assert(result.warnings.some(w => w.code === 'EMPTY_SEQUENCE'));
    });
  });

  describe('FASTQ validation', () => {
    it('should validate correct FASTQ format', async () => {
      const validFastq = `@read1
ACGTACGT
+
IIIIIIII
@read2
TGCATGCA
+
HHHHHHHH`;

      const result = await ValidatorRegistry.validateContent('validateFastq', validFastq);
      
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.stats.recordCount, 2);
    });

    it('should detect incomplete records', async () => {
      const incompleteFastq = `@read1
ACGTACGT
+`;

      const result = await ValidatorRegistry.validateContent('validateFastq', incompleteFastq);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INCOMPLETE_RECORD'));
    });

    it('should detect invalid header format', async () => {
      const invalidFastq = `#read1
ACGTACGT
+
IIIIIIII`;

      const result = await ValidatorRegistry.validateContent('validateFastq', invalidFastq);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_HEADER1'));
    });

    it('should detect length mismatch between sequence and quality', async () => {
      const mismatchFastq = `@read1
ACGTACGT
+
III`;

      const result = await ValidatorRegistry.validateContent('validateFastq', mismatchFastq);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'LENGTH_MISMATCH'));
    });

    it('should detect invalid sequence characters', async () => {
      const invalidFastq = `@read1
ACGTXYZ
+
IIIIIII`;

      const result = await ValidatorRegistry.validateContent('validateFastq', invalidFastq);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_SEQUENCE'));
    });

    it('should detect invalid quality characters', async () => {
      const invalidFastq = `@read1
ACGTACGT
+
III\x01III`;

      const result = await ValidatorRegistry.validateContent('validateFastq', invalidFastq);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_QUALITY'));
    });
  });

  describe('VCF validation', () => {
    it('should validate correct VCF format', async () => {
      const validVcf = `##fileformat=VCFv4.2
##source=test
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
chr1	100	.	A	G	60	PASS	.
chr1	200	rs123	T	C	90	PASS	.`;

      const result = await ValidatorRegistry.validateContent('validateVcf', validVcf);
      
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.stats.recordCount, 2);
    });

    it('should detect missing fileformat header', async () => {
      const invalidVcf = `##source=test
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
chr1	100	.	A	G	60	PASS	.`;

      const result = await ValidatorRegistry.validateContent('validateVcf', invalidVcf);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'MISSING_FILEFORMAT'));
    });

    it('should detect missing column header', async () => {
      const invalidVcf = `##fileformat=VCFv4.2
chr1	100	.	A	G	60	PASS	.`;

      const result = await ValidatorRegistry.validateContent('validateVcf', invalidVcf);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'MISSING_COLUMN_HEADER'));
    });

    it('should detect invalid column headers', async () => {
      const invalidVcf = `##fileformat=VCFv4.2
#CHR	POSITION	ID	REF	ALT	QUAL	FILTER	INFO
chr1	100	.	A	G	60	PASS	.`;

      const result = await ValidatorRegistry.validateContent('validateVcf', invalidVcf);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_COLUMN_HEADER'));
    });

    it('should detect insufficient columns in data lines', async () => {
      const invalidVcf = `##fileformat=VCFv4.2
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
chr1	100	.	A`;

      const result = await ValidatorRegistry.validateContent('validateVcf', invalidVcf);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INSUFFICIENT_COLUMNS'));
    });

    it('should detect invalid POS values', async () => {
      const invalidVcf = `##fileformat=VCFv4.2
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
chr1	abc	.	A	G	60	PASS	.`;

      const result = await ValidatorRegistry.validateContent('validateVcf', invalidVcf);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_POS'));
    });

    it('should detect invalid REF sequences', async () => {
      const invalidVcf = `##fileformat=VCFv4.2
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
chr1	100	.	XYZ	G	60	PASS	.`;

      const result = await ValidatorRegistry.validateContent('validateVcf', invalidVcf);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_REF'));
    });
  });

  describe('PDB validation', () => {
    it('should validate correct PDB format', async () => {
      const validPdb = `HEADER    TRANSFERASE                             01-JAN-23   TEST
ATOM      1  N   ALA A   1      20.154  16.967  18.542  1.00 11.18           N  
ATOM      2  CA  ALA A   1      19.030  16.045  18.858  1.00 10.38           C  
END`;

      const result = await ValidatorRegistry.validateContent('validatePdb', validPdb);
      
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.stats.recordCount, 2);
    });

    it('should detect short ATOM records', async () => {
      const invalidPdb = `HEADER    TRANSFERASE
ATOM      1  N   ALA`;

      const result = await ValidatorRegistry.validateContent('validatePdb', invalidPdb);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'SHORT_ATOM_RECORD'));
    });

    it('should detect invalid serial numbers', async () => {
      const invalidPdb = `ATOM    xyz  N   ALA A   1      20.154  16.967  18.542  1.00 11.18           N  `;

      const result = await ValidatorRegistry.validateContent('validatePdb', invalidPdb);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_SERIAL'));
    });

    it('should detect invalid coordinates', async () => {
      const invalidPdb = `ATOM      1  N   ALA A   1      abc    16.967  18.542  1.00 11.18           N  `;

      const result = await ValidatorRegistry.validateContent('validatePdb', invalidPdb);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'INVALID_COORDINATES'));
    });

    it('should warn about missing HEADER', async () => {
      const pdbNoHeader = `ATOM      1  N   ALA A   1      20.154  16.967  18.542  1.00 11.18           N  `;

      const result = await ValidatorRegistry.validateContent('validatePdb', pdbNoHeader);
      
      assert.strictEqual(result.isValid, true); // Warning, not error
      assert(result.warnings.some(w => w.code === 'MISSING_HEADER'));
    });

    it('should detect files with no ATOM records', async () => {
      const noAtomsPdb = `HEADER    TRANSFERASE
REMARK 1 TEST FILE`;

      const result = await ValidatorRegistry.validateContent('validatePdb', noAtomsPdb);
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'NO_ATOMS'));
    });
  });

  describe('Error handling', () => {
    it('should throw error for unknown validator', async () => {
      try {
        await ValidatorRegistry.validateContent('unknownValidator', 'test content');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error instanceof Error);
        assert(error.message.includes('Unknown validator'));
      }
    });

    it('should handle empty content', async () => {
      const result = await ValidatorRegistry.validateContent('validateFasta', '');
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'NO_HEADERS'));
    });

    it('should handle only whitespace content', async () => {
      const result = await ValidatorRegistry.validateContent('validateFasta', '   \n\n   ');
      
      assert.strictEqual(result.isValid, false);
      assert(result.errors.some(e => e.code === 'NO_HEADERS'));
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', async () => {
      // Generate large FASTA content
      let largeFasta = '';
      for (let i = 0; i < 1000; i++) {
        largeFasta += `>sequence${i}\n`;
        largeFasta += 'A'.repeat(100) + '\n';
      }

      const startTime = Date.now();
      const result = await ValidatorRegistry.validateContent('validateFasta', largeFasta);
      const endTime = Date.now();
      
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.stats.recordCount, 1000);
      assert(endTime - startTime < 5000, 'Validation should complete within 5 seconds');
    });
  });
});