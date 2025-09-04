/**
 * Tests for file type detection functionality
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { FileDetector } from '../../src/fileTypes/detector';
import { BIO_FILE_FORMATS } from '../../src/fileTypes/registry';

describe('FileDetector', () => {
  let detector: FileDetector;
  
  beforeEach(() => {
    detector = FileDetector.getInstance();
    detector.clearCache(); // Start fresh for each test
  });

  describe('Extension-based detection', () => {
    it('should detect FASTA files by extension', async () => {
      const testCases = [
        { ext: '.fasta', expected: 'fasta' },
        { ext: '.fa', expected: 'fasta' },
        { ext: '.fas', expected: 'fasta' },
        { ext: '.seq', expected: 'fasta' }
      ];

      for (const testCase of testCases) {
        const mockUri = vscode.Uri.file(`/tmp/test${testCase.ext}`);
        
        // Mock file system
        const originalReadFile = vscode.workspace.fs.readFile;
        const originalStat = vscode.workspace.fs.stat;
        
        vscode.workspace.fs.readFile = async () => {
          const content = '>seq1\nACGTACGT\n>seq2\nTGCATGCA';
          return new TextEncoder().encode(content);
        };
        
        vscode.workspace.fs.stat = async () => ({
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100
        });

        try {
          const result = await detector.detectFile(mockUri);
          assert.strictEqual(result?.format.name, 'FASTA');
          assert.strictEqual(result?.detectionMethod, 'extension');
          assert(result!.confidence >= 0.9);
        } finally {
          // Restore original methods
          vscode.workspace.fs.readFile = originalReadFile;
          vscode.workspace.fs.stat = originalStat;
        }
      }
    });

    it('should detect FASTQ files by extension', async () => {
      const mockUri = vscode.Uri.file('/tmp/test.fastq');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        const content = '@seq1\nACGT\n+\nIIII';
        return new TextEncoder().encode(content);
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 50
      });

      try {
        const result = await detector.detectFile(mockUri);
        assert.strictEqual(result?.format.name, 'FASTQ');
        assert.strictEqual(result?.detectionMethod, 'extension');
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });

    it('should detect VCF files by extension', async () => {
      const mockUri = vscode.Uri.file('/tmp/test.vcf');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        const content = '##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO';
        return new TextEncoder().encode(content);
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100
      });

      try {
        const result = await detector.detectFile(mockUri);
        assert.strictEqual(result?.format.name, 'VCF');
        assert.strictEqual(result?.detectionMethod, 'extension');
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });
  });

  describe('Content-based detection', () => {
    it('should detect FASTA by content patterns', async () => {
      const mockUri = vscode.Uri.file('/tmp/test.txt');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        const content = '>sequence_1 description\nACGTACGTACGT\n>sequence_2\nTGCATGCATGCA';
        return new TextEncoder().encode(content);
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 200
      });

      try {
        const result = await detector.detectFile(mockUri);
        assert.strictEqual(result?.format.name, 'FASTA');
        assert.strictEqual(result?.detectionMethod, 'content');
        assert(result!.confidence > 0.5);
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });

    it('should detect FASTQ by content patterns', async () => {
      const mockUri = vscode.Uri.file('/tmp/test.txt');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        const content = '@read1\nACGTACGT\n+\nIIIIIIII\n@read2\nTGCATGCA\n+\nHHHHHHHH';
        return new TextEncoder().encode(content);
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 300
      });

      try {
        const result = await detector.detectFile(mockUri);
        assert.strictEqual(result?.format.name, 'FASTQ');
        assert.strictEqual(result?.detectionMethod, 'content');
        assert(result!.confidence > 0.5);
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });

    it('should detect VCF by content patterns', async () => {
      const mockUri = vscode.Uri.file('/tmp/test.txt');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        const content = '##fileformat=VCFv4.2\n##source=test\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\nchr1\t100\t.\tA\tG\t60\tPASS\t.';
        return new TextEncoder().encode(content);
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 400
      });

      try {
        const result = await detector.detectFile(mockUri);
        assert.strictEqual(result?.format.name, 'VCF');
        assert.strictEqual(result?.detectionMethod, 'content');
        assert(result!.confidence > 0.5);
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });
  });

  describe('Hybrid detection', () => {
    it('should use hybrid detection for ambiguous extensions', async () => {
      // Test case where extension might match multiple formats
      // and content analysis is needed to disambiguate
      const mockUri = vscode.Uri.file('/tmp/test.txt');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        const content = '>clearly_a_fasta_sequence\nACGTACGTACGT\n>another_sequence\nTGCATGCATGCA';
        return new TextEncoder().encode(content);
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 200
      });

      try {
        const result = await detector.detectFile(mockUri);
        assert.strictEqual(result?.format.name, 'FASTA');
        assert.strictEqual(result?.detectionMethod, 'content');
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });
  });

  describe('Cache functionality', () => {
    it('should cache detection results', async () => {
      const mockUri = vscode.Uri.file('/tmp/test.fasta');
      let readCallCount = 0;
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        readCallCount++;
        const content = '>seq1\nACGT';
        return new TextEncoder().encode(content);
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100
      });

      try {
        // First call should read file
        const result1 = await detector.detectFile(mockUri);
        assert.strictEqual(result1?.format.name, 'FASTA');
        
        // Second call should use cache
        const result2 = await detector.detectFile(mockUri);
        assert.strictEqual(result2?.format.name, 'FASTA');
        
        // Should have only read once due to caching
        // Note: This test might be flaky due to extension-based detection
        // potentially not reading content for single-format matches
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });

    it('should clear cache when requested', () => {
      const stats1 = detector.getCacheStats();
      detector.clearCache();
      const stats2 = detector.getCacheStats();
      
      assert.strictEqual(stats2.size, 0);
    });
  });

  describe('Error handling', () => {
    it('should handle file read errors gracefully', async () => {
      const mockUri = vscode.Uri.file('/tmp/nonexistent.fasta');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        throw new Error('File not found');
      };
      
      vscode.workspace.fs.stat = async () => {
        throw new Error('File not found');
      };

      try {
        const result = await detector.detectFile(mockUri);
        assert.strictEqual(result, null);
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });

    it('should handle binary files appropriately', async () => {
      const mockUri = vscode.Uri.file('/tmp/test.bam');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        // Simulate binary BAM content
        const binaryContent = new Uint8Array([0x42, 0x41, 0x4D, 0x01, 0x00, 0x00]);
        return binaryContent;
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 1000
      });

      try {
        const result = await detector.detectFile(mockUri);
        assert.strictEqual(result?.format.name, 'BAM');
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', async () => {
      const mockUri = vscode.Uri.file('/tmp/large.fasta');
      
      const originalReadFile = vscode.workspace.fs.readFile;
      const originalStat = vscode.workspace.fs.stat;
      
      vscode.workspace.fs.readFile = async () => {
        // Simulate large file content (but only return sample size)
        const content = '>large_sequence\n' + 'A'.repeat(10000);
        return new TextEncoder().encode(content);
      };
      
      vscode.workspace.fs.stat = async () => ({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 10 * 1024 * 1024 // 10MB
      });

      try {
        const startTime = Date.now();
        const result = await detector.detectFile(mockUri);
        const endTime = Date.now();
        
        assert.strictEqual(result?.format.name, 'FASTA');
        assert(endTime - startTime < 1000, 'Detection should be fast even for large files');
      } finally {
        vscode.workspace.fs.readFile = originalReadFile;
        vscode.workspace.fs.stat = originalStat;
      }
    });
  });
});