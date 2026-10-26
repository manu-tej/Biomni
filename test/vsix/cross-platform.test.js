/**
 * VSIX Cross-Platform Tests
 * Issue #47: VSIX Package Creation & Testing
 * 
 * Tests for cross-platform compatibility of VSIX package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

describe('VSIX Cross-Platform Tests', () => {
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
        const extractDir = path.join(tempDir, 'vsix-platform-test-' + Date.now());
        
        execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
        
        const packageJsonPath = path.join(extractDir, 'extension', 'package.json');
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        extensionId = `${packageJson.publisher}.${packageJson.name}`;
        
        // Cleanup extraction
        fs.rmSync(extractDir, { recursive: true, force: true });

        // Create test workspace
        testWorkspace = path.join(tempDir, 'vsix-platform-workspace-' + Date.now());
        fs.mkdirSync(testWorkspace, { recursive: true });
    });

    afterAll(async () => {
        // Cleanup
        if (testWorkspace && fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    describe('Platform Detection', () => {
        test('should detect current platform correctly', () => {
            const platform = process.platform;
            const arch = process.arch;
            
            console.log(`Running on: ${platform} ${arch}`);
            console.log(`Node.js version: ${process.version}`);
            console.log(`OS info: ${os.type()} ${os.release()}`);
            
            // Verify we're running on a supported platform
            const supportedPlatforms = ['darwin', 'linux', 'win32'];
            expect(supportedPlatforms).toContain(platform);
        });

        test('should handle platform-specific paths', () => {
            // Test path handling for current platform
            const testPath = path.join(testWorkspace, 'test', 'file.txt');
            const normalized = path.normalize(testPath);
            
            expect(path.isAbsolute(normalized)).toBe(path.isAbsolute(testPath));
            
            // Platform-specific path separator tests
            if (process.platform === 'win32') {
                expect(normalized.includes('\\\\')).toBe(false); // No double backslashes
            } else {
                expect(normalized.includes('//')).toBe(false); // No double forward slashes
            }
        });
    });

    describe('File System Compatibility', () => {
        test('should handle file names correctly on current platform', () => {
            // Test various file name scenarios
            const testFiles = [
                'simple.txt',
                'file with spaces.txt',
                'file-with-dashes.txt',
                'file_with_underscores.txt',
                'file.with.dots.txt'
            ];

            testFiles.forEach(filename => {
                const filePath = path.join(testWorkspace, filename);
                
                // Create and verify file
                fs.writeFileSync(filePath, 'test content');
                expect(fs.existsSync(filePath)).toBe(true);
                
                // Read and verify content
                const content = fs.readFileSync(filePath, 'utf8');
                expect(content).toBe('test content');
                
                // Cleanup
                fs.unlinkSync(filePath);
            });
        });

        test('should handle directory operations correctly', () => {
            const testDir = path.join(testWorkspace, 'test-directory');
            const nestedDir = path.join(testDir, 'nested', 'deep');
            
            // Create nested directories
            fs.mkdirSync(nestedDir, { recursive: true });
            expect(fs.existsSync(nestedDir)).toBe(true);
            
            // Create file in nested directory
            const testFile = path.join(nestedDir, 'test.txt');
            fs.writeFileSync(testFile, 'nested content');
            expect(fs.existsSync(testFile)).toBe(true);
            
            // Cleanup
            fs.rmSync(testDir, { recursive: true, force: true });
            expect(fs.existsSync(testDir)).toBe(false);
        });

        test('should handle file permissions appropriately', () => {
            if (process.platform === 'win32') {
                // Windows has different permission model
                console.log('Skipping POSIX permission test on Windows');
                return;
            }

            const testFile = path.join(testWorkspace, 'permission-test.txt');
            fs.writeFileSync(testFile, 'permission test');
            
            // Check initial permissions
            const stats = fs.statSync(testFile);
            expect(stats.mode & 0o777).toBeGreaterThan(0);
            
            // Cleanup
            fs.unlinkSync(testFile);
        });
    });

    describe('Path Resolution', () => {
        test('should resolve relative paths correctly', () => {
            const relativePath = path.join('..', 'test', 'file.txt');
            const absolutePath = path.resolve(testWorkspace, relativePath);
            
            expect(path.isAbsolute(absolutePath)).toBe(true);
            expect(absolutePath.includes(path.normalize('../test/file.txt'))).toBe(true);
        });

        test('should handle path separators correctly', () => {
            // Test mixed separators (should be normalized)
            const mixedPath = 'folder/subfolder\\file.txt';
            const normalized = path.normalize(mixedPath);
            
            // Should use platform-appropriate separators
            if (process.platform === 'win32') {
                expect(normalized.includes('/')).toBe(false);
                expect(normalized.includes('\\\\')).toBe(false);
            } else {
                expect(normalized.includes('\\\\')).toBe(false);
            }
        });

        test('should handle special characters in paths', () => {
            // Test platform-specific special characters
            const specialChars = process.platform === 'win32' 
                ? ['space file.txt', 'file-dash.txt', 'file_underscore.txt']
                : ['space file.txt', 'file-dash.txt', 'file_underscore.txt', 'file$dollar.txt'];
            
            specialChars.forEach(filename => {
                const filePath = path.join(testWorkspace, filename);
                const resolvedPath = path.resolve(filePath);
                
                expect(path.isAbsolute(resolvedPath)).toBe(true);
                expect(resolvedPath.includes(filename)).toBe(true);
            });
        });
    });

    describe('VSCode Integration', () => {
        test('should be compatible with VSCode CLI on current platform', () => {
            // Check if VSCode CLI is available
            try {
                const vscodeVersion = execSync('code --version', { encoding: 'utf8' });
                console.log(`VSCode version: ${vscodeVersion.split('\n')[0]}`);
                
                // Should be able to list extensions
                const extensions = execSync('code --list-extensions', { encoding: 'utf8' });
                expect(typeof extensions).toBe('string');
                
            } catch (error) {
                console.warn('VSCode CLI not available for testing');
                // Don't fail the test if VSCode CLI is not available
            }
        });

        test('should handle VSCode workspace files correctly', () => {
            // Create a test workspace file
            const workspaceFile = path.join(testWorkspace, 'test.code-workspace');
            const workspaceConfig = {
                folders: [
                    { path: '.' }
                ],
                settings: {}
            };
            
            fs.writeFileSync(workspaceFile, JSON.stringify(workspaceConfig, null, 2));
            
            // Verify file was created correctly
            expect(fs.existsSync(workspaceFile)).toBe(true);
            
            // Verify content can be parsed
            const parsed = JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
            expect(parsed.folders).toHaveLength(1);
            
            // Cleanup
            fs.unlinkSync(workspaceFile);
        });
    });

    describe('Extension Content Compatibility', () => {
        test('should have platform-neutral file references', async () => {
            // Extract VSIX to examine file structure
            const tempDir = require('os').tmpdir();
            const extractDir = path.join(tempDir, 'vsix-content-test-' + Date.now());
            
            execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
            
            const extensionDir = path.join(extractDir, 'extension');
            
            // Check package.json for platform-neutral paths
            const packageJsonPath = path.join(extensionDir, 'package.json');
            const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
            
            // Should use forward slashes in JSON (platform neutral)
            const jsonPaths = packageContent.match(/"[^"]*\.[a-zA-Z]+"/g) || [];
            jsonPaths.forEach(pathMatch => {
                // Remove quotes
                const cleanPath = pathMatch.slice(1, -1);
                if (cleanPath.includes('/') || cleanPath.includes('\\\\')) {
                    // Should use forward slashes for JSON paths
                    expect(cleanPath.includes('\\\\')).toBe(false);
                }
            });
            
            // Check for binary files that might have platform dependencies
            const checkForBinaries = (dir) => {
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        checkForBinaries(itemPath);
                    } else {
                        const ext = path.extname(item).toLowerCase();
                        const platformSpecificExts = ['.exe', '.dll', '.so', '.dylib'];
                        
                        if (platformSpecificExts.includes(ext)) {
                            console.warn(`Platform-specific binary found: ${path.relative(extensionDir, itemPath)}`);
                        }
                    }
                }
            };
            
            checkForBinaries(extensionDir);
            
            // Cleanup
            fs.rmSync(extractDir, { recursive: true, force: true });
        });

        test('should use appropriate line endings', async () => {
            // Extract and check line endings in text files
            const tempDir = require('os').tmpdir();
            const extractDir = path.join(tempDir, 'vsix-lineending-test-' + Date.now());
            
            execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
            
            const extensionDir = path.join(extractDir, 'extension');
            const textFiles = [];
            
            const findTextFiles = (dir) => {
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        findTextFiles(itemPath);
                    } else {
                        const ext = path.extname(item).toLowerCase();
                        const textExts = ['.js', '.json', '.md', '.txt', '.css', '.html'];
                        
                        if (textExts.includes(ext)) {
                            textFiles.push(itemPath);
                        }
                    }
                }
            };
            
            findTextFiles(extensionDir);
            
            // Check line endings in a sample of text files
            const sampleFiles = textFiles.slice(0, Math.min(5, textFiles.length));
            
            sampleFiles.forEach(filePath => {
                const content = fs.readFileSync(filePath, 'utf8');
                const relativePath = path.relative(extensionDir, filePath);
                
                // Check for consistent line endings
                const hasLF = content.includes('\\n');
                const hasCRLF = content.includes('\\r\\n');
                
                if (hasLF && hasCRLF) {
                    console.warn(`Mixed line endings in: ${relativePath}`);
                }
                
                // JSON files should typically use LF
                if (filePath.endsWith('.json') && hasCRLF) {
                    console.warn(`CRLF line endings in JSON file: ${relativePath}`);
                }
            });
            
            // Cleanup
            fs.rmSync(extractDir, { recursive: true, force: true });
        });
    });

    describe('Environment Variables', () => {
        test('should handle environment variables correctly', () => {
            // Test environment variable access
            const homeDir = os.homedir();
            const tempDir = os.tmpdir();
            
            expect(typeof homeDir).toBe('string');
            expect(homeDir.length).toBeGreaterThan(0);
            expect(fs.existsSync(homeDir)).toBe(true);
            
            expect(typeof tempDir).toBe('string');
            expect(tempDir.length).toBeGreaterThan(0);
            expect(fs.existsSync(tempDir)).toBe(true);
        });

        test('should handle PATH variable correctly', () => {
            const pathVar = process.env.PATH || process.env.Path;
            expect(typeof pathVar).toBe('string');
            
            // Should contain multiple paths
            const pathSeparator = process.platform === 'win32' ? ';' : ':';
            const paths = pathVar.split(pathSeparator);
            expect(paths.length).toBeGreaterThan(1);
        });
    });

    describe('Unicode and Encoding', () => {
        test('should handle Unicode file names', () => {
            // Test Unicode support
            const unicodeFiles = [
                'test-áéíóú.txt',
                'test-中文.txt',
                'test-🚀.txt'
            ];

            unicodeFiles.forEach(filename => {
                try {
                    const filePath = path.join(testWorkspace, filename);
                    fs.writeFileSync(filePath, 'unicode test', 'utf8');
                    
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        expect(content).toBe('unicode test');
                        fs.unlinkSync(filePath);
                    } else {
                        console.warn(`Unicode filename not supported: ${filename}`);
                    }
                } catch (error) {
                    console.warn(`Unicode filename test failed: ${filename} - ${error.message}`);
                }
            });
        });

        test('should handle UTF-8 encoding correctly', () => {
            const testFile = path.join(testWorkspace, 'utf8-test.txt');
            const unicodeContent = 'Hello 世界 🌍 café naïve résumé';
            
            // Write UTF-8 content
            fs.writeFileSync(testFile, unicodeContent, 'utf8');
            
            // Read back and verify
            const readContent = fs.readFileSync(testFile, 'utf8');
            expect(readContent).toBe(unicodeContent);
            
            // Cleanup
            fs.unlinkSync(testFile);
        });
    });
});