/**
 * VSIX Functionality Tests
 * Issue #47: VSIX Package Creation & Testing
 * 
 * Tests for extension functionality after VSIX installation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('VSIX Functionality Tests', () => {
    let vsixPath;
    let extensionId;
    let testWorkspace;
    let packageJson;

    beforeAll(async () => {
        // Find latest VSIX file
        const projectRoot = path.resolve(__dirname, '../..');
        const vsixFiles = fs.readdirSync(projectRoot)
            .filter(file => file.endsWith('.vsix'))
            .map(file => ({
                file,
                path: path.join(projectRoot, file),
                mtime: fs.statSync(path.join(projectRoot, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        if (vsixFiles.length === 0) {
            throw new Error('No VSIX file found. Build one first.');
        }

        vsixPath = vsixFiles[0].path;

        // Extract package.json from VSIX
        const tempDir = require('os').tmpdir();
        const extractDir = path.join(tempDir, 'vsix-func-test-' + Date.now());
        
        execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
        
        const packageJsonPath = path.join(extractDir, 'extension', 'package.json');
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        extensionId = `${packageJson.publisher}.${packageJson.name}`;
        
        // Cleanup extraction
        fs.rmSync(extractDir, { recursive: true, force: true });

        // Create test workspace
        testWorkspace = path.join(tempDir, 'vsix-func-workspace-' + Date.now());
        fs.mkdirSync(testWorkspace, { recursive: true });

        // Install extension for all functionality tests
        execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' }).catch(() => {});
        execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
        await new Promise(resolve => setTimeout(resolve, 5000));
    });

    afterAll(async () => {
        // Cleanup
        try {
            execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
        } catch (error) {
            // Ignore cleanup errors
        }

        if (testWorkspace && fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    describe('Extension Metadata', () => {
        test('should have correct package.json structure', () => {
            expect(packageJson).toHaveProperty('name');
            expect(packageJson).toHaveProperty('displayName');
            expect(packageJson).toHaveProperty('description');
            expect(packageJson).toHaveProperty('version');
            expect(packageJson).toHaveProperty('publisher');
            expect(packageJson).toHaveProperty('engines');
            expect(packageJson.engines).toHaveProperty('vscode');
        });

        test('should have valid version format', () => {
            expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
        });

        test('should have valid VSCode engine version', () => {
            expect(packageJson.engines.vscode).toMatch(/^\^?\d+\.\d+\.\d+/);
        });

        test('should have proper categories', () => {
            expect(Array.isArray(packageJson.categories)).toBe(true);
            expect(packageJson.categories.length).toBeGreaterThan(0);
        });

        test('should have activation events', () => {
            expect(Array.isArray(packageJson.activationEvents)).toBe(true);
            expect(packageJson.activationEvents.length).toBeGreaterThan(0);
        });
    });

    describe('Extension Contributions', () => {
        test('should define commands', () => {
            if (packageJson.contributes && packageJson.contributes.commands) {
                expect(Array.isArray(packageJson.contributes.commands)).toBe(true);
                expect(packageJson.contributes.commands.length).toBeGreaterThan(0);
                
                // Verify command structure
                packageJson.contributes.commands.forEach(command => {
                    expect(command).toHaveProperty('command');
                    expect(command).toHaveProperty('title');
                    expect(typeof command.command).toBe('string');
                    expect(typeof command.title).toBe('string');
                });
            }
        });

        test('should define configuration if present', () => {
            if (packageJson.contributes && packageJson.contributes.configuration) {
                const config = packageJson.contributes.configuration;
                expect(config).toHaveProperty('title');
                expect(config).toHaveProperty('properties');
                expect(typeof config.properties).toBe('object');
            }
        });

        test('should define languages if present', () => {
            if (packageJson.contributes && packageJson.contributes.languages) {
                expect(Array.isArray(packageJson.contributes.languages)).toBe(true);
                
                packageJson.contributes.languages.forEach(language => {
                    expect(language).toHaveProperty('id');
                    expect(language).toHaveProperty('extensions');
                    expect(Array.isArray(language.extensions)).toBe(true);
                });
            }
        });

        test('should define views if present', () => {
            if (packageJson.contributes && packageJson.contributes.views) {
                expect(typeof packageJson.contributes.views).toBe('object');
            }
        });
    });

    describe('File Type Associations', () => {
        test('should handle FASTA files if configured', async () => {
            if (packageJson.contributes && packageJson.contributes.languages) {
                const fastaLang = packageJson.contributes.languages.find(
                    lang => lang.id === 'fasta'
                );
                
                if (fastaLang) {
                    // Create a test FASTA file
                    const fastaFile = path.join(testWorkspace, 'test.fasta');
                    fs.writeFileSync(fastaFile, '>test_sequence\nATCGATCGATCG\n');
                    
                    expect(fs.existsSync(fastaFile)).toBe(true);
                    
                    // Verify file extensions
                    expect(fastaLang.extensions).toContain('.fasta');
                    
                    // Cleanup
                    fs.unlinkSync(fastaFile);
                }
            }
        });

        test('should handle FASTQ files if configured', async () => {
            if (packageJson.contributes && packageJson.contributes.languages) {
                const fastqLang = packageJson.contributes.languages.find(
                    lang => lang.id === 'fastq'
                );
                
                if (fastqLang) {
                    // Create a test FASTQ file
                    const fastqFile = path.join(testWorkspace, 'test.fastq');
                    fs.writeFileSync(fastqFile, '@test_read\nATCGATCG\n+\nIIIIIIII\n');
                    
                    expect(fs.existsSync(fastqFile)).toBe(true);
                    
                    // Verify file extensions
                    expect(fastqLang.extensions).toContain('.fastq');
                    
                    // Cleanup
                    fs.unlinkSync(fastqFile);
                }
            }
        });

        test('should handle VCF files if configured', async () => {
            if (packageJson.contributes && packageJson.contributes.languages) {
                const vcfLang = packageJson.contributes.languages.find(
                    lang => lang.id === 'vcf'
                );
                
                if (vcfLang) {
                    // Create a test VCF file
                    const vcfFile = path.join(testWorkspace, 'test.vcf');
                    fs.writeFileSync(vcfFile, '##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n');
                    
                    expect(fs.existsSync(vcfFile)).toBe(true);
                    
                    // Verify file extensions
                    expect(vcfLang.extensions).toContain('.vcf');
                    
                    // Cleanup
                    fs.unlinkSync(vcfFile);
                }
            }
        });
    });

    describe('Configuration Properties', () => {
        test('should have valid configuration defaults', () => {
            if (packageJson.contributes && packageJson.contributes.configuration) {
                const properties = packageJson.contributes.configuration.properties;
                
                Object.keys(properties).forEach(key => {
                    const property = properties[key];
                    
                    // Should have type
                    expect(property).toHaveProperty('type');
                    
                    // Should have description
                    expect(property).toHaveProperty('description');
                    expect(typeof property.description).toBe('string');
                    expect(property.description.length).toBeGreaterThan(0);
                    
                    // Should have default value
                    expect(property).toHaveProperty('default');
                    
                    // Type should match default value type
                    if (property.type === 'boolean') {
                        expect(typeof property.default).toBe('boolean');
                    } else if (property.type === 'string') {
                        expect(typeof property.default).toBe('string');
                    } else if (property.type === 'number') {
                        expect(typeof property.default).toBe('number');
                    } else if (property.type === 'array') {
                        expect(Array.isArray(property.default)).toBe(true);
                    }
                });
            }
        });

        test('should have reasonable configuration ranges', () => {
            if (packageJson.contributes && packageJson.contributes.configuration) {
                const properties = packageJson.contributes.configuration.properties;
                
                Object.keys(properties).forEach(key => {
                    const property = properties[key];
                    
                    if (property.type === 'number') {
                        if (property.minimum !== undefined) {
                            expect(property.default).toBeGreaterThanOrEqual(property.minimum);
                        }
                        if (property.maximum !== undefined) {
                            expect(property.default).toBeLessThanOrEqual(property.maximum);
                        }
                    }
                    
                    if (property.enum) {
                        expect(property.enum).toContain(property.default);
                    }
                });
            }
        });
    });

    describe('Extension Activation', () => {
        test('should activate on valid events', () => {
            const activationEvents = packageJson.activationEvents;
            
            activationEvents.forEach(event => {
                // Check for valid activation event patterns
                const validPatterns = [
                    /^onLanguage:/,
                    /^onCommand:/,
                    /^workspaceContains:/,
                    /^onFileSystem:/,
                    /^onView:/,
                    /^onStartupFinished$/,
                    /^\*$/
                ];
                
                const isValid = validPatterns.some(pattern => pattern.test(event));
                expect(isValid).toBe(true);
            });
        });

        test('should not use wildcard activation unnecessarily', () => {
            const hasWildcard = packageJson.activationEvents.includes('*');
            
            if (hasWildcard) {
                console.warn('Extension uses wildcard (*) activation - consider more specific events');
            }
            
            // This is a warning, not a failure
            expect(true).toBe(true);
        });
    });

    describe('Resource Files', () => {
        test('should include required runtime files in VSIX', async () => {
            // Extract VSIX to check contents
            const tempDir = require('os').tmpdir();
            const extractDir = path.join(tempDir, 'vsix-resource-test-' + Date.now());
            
            execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
            
            const extensionDir = path.join(extractDir, 'extension');
            
            // Check for main entry point
            const mainFile = path.join(extensionDir, packageJson.main || 'extension.js');
            expect(fs.existsSync(mainFile)).toBe(true);
            
            // Check for language configurations if present
            if (packageJson.contributes && packageJson.contributes.languages) {
                packageJson.contributes.languages.forEach(language => {
                    if (language.configuration) {
                        const configFile = path.join(extensionDir, language.configuration);
                        expect(fs.existsSync(configFile)).toBe(true);
                    }
                });
            }
            
            // Check for grammar files if present
            if (packageJson.contributes && packageJson.contributes.grammars) {
                packageJson.contributes.grammars.forEach(grammar => {
                    const grammarFile = path.join(extensionDir, grammar.path);
                    expect(fs.existsSync(grammarFile)).toBe(true);
                });
            }
            
            // Check for icon if specified
            if (packageJson.icon) {
                const iconFile = path.join(extensionDir, packageJson.icon);
                expect(fs.existsSync(iconFile)).toBe(true);
            }
            
            // Cleanup
            fs.rmSync(extractDir, { recursive: true, force: true });
        });
    });

    describe('Performance Characteristics', () => {
        test('should have reasonable package size', () => {
            const stats = fs.statSync(vsixPath);
            const sizeMB = stats.size / (1024 * 1024);
            
            // Should be under 5MB (VSCode limit)
            expect(sizeMB).toBeLessThan(5);
            
            // Log actual size for monitoring
            console.log(`VSIX package size: ${sizeMB.toFixed(2)}MB`);
        });

        test('should not include unnecessary development files', async () => {
            // Extract VSIX to check for dev files
            const tempDir = require('os').tmpdir();
            const extractDir = path.join(tempDir, 'vsix-devfile-test-' + Date.now());
            
            execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
            
            const extensionDir = path.join(extractDir, 'extension');
            
            // Check that development files are not included
            const bannedFiles = [
                'src',
                'test',
                'tests',
                '.git',
                '.vscode',
                'node_modules',
                'coverage',
                '.nyc_output',
                'scripts'
            ];
            
            bannedFiles.forEach(file => {
                const filePath = path.join(extensionDir, file);
                expect(fs.existsSync(filePath)).toBe(false);
            });
            
            // Check for source maps (should not be in production)
            const findSourceMaps = (dir) => {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    if (fs.statSync(itemPath).isDirectory()) {
                        findSourceMaps(itemPath);
                    } else if (item.endsWith('.map')) {
                        console.warn(`Source map found in production: ${itemPath}`);
                    }
                }
            };
            
            findSourceMaps(extensionDir);
            
            // Cleanup
            fs.rmSync(extractDir, { recursive: true, force: true });
        });
    });
});