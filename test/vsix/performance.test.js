/**
 * VSIX Performance Tests
 * Issue #47: VSIX Package Creation & Testing
 * 
 * Tests for extension performance metrics after VSIX installation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('VSIX Performance Tests', () => {
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
        const extractDir = path.join(tempDir, 'vsix-perf-test-' + Date.now());
        
        execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
        
        const packageJsonPath = path.join(extractDir, 'extension', 'package.json');
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        extensionId = `${packageJson.publisher}.${packageJson.name}`;
        
        // Cleanup extraction
        fs.rmSync(extractDir, { recursive: true, force: true });

        // Create test workspace
        testWorkspace = path.join(tempDir, 'vsix-perf-workspace-' + Date.now());
        fs.mkdirSync(testWorkspace, { recursive: true });

        // Install extension for all performance tests
        try {
            execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
        } catch (error) {
            // Ignore if not installed
        }
        
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

    describe('Package Size Performance', () => {
        test('should meet VSCode marketplace size limits', () => {
            const stats = fs.statSync(vsixPath);
            const sizeBytes = stats.size;
            const sizeMB = sizeBytes / (1024 * 1024);
            const sizeKB = sizeBytes / 1024;

            console.log(`Package size: ${sizeMB.toFixed(2)}MB (${sizeKB.toFixed(0)}KB)`);

            // VSCode marketplace limit is 5MB
            expect(sizeMB).toBeLessThan(5);

            // Warn if approaching the limit
            if (sizeMB > 4) {
                console.warn(`Package size ${sizeMB.toFixed(2)}MB is approaching 5MB limit`);
            }

            // Good practice is to keep under 2MB for better download performance
            if (sizeMB > 2) {
                console.warn(`Package size ${sizeMB.toFixed(2)}MB exceeds 2MB recommendation`);
            }
        });

        test('should have optimal compression ratio', async () => {
            // Extract VSIX to measure uncompressed size
            const tempDir = require('os').tmpdir();
            const extractDir = path.join(tempDir, 'vsix-size-test-' + Date.now());
            
            execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
            
            // Calculate uncompressed size
            const getDirectorySize = (dirPath) => {
                let totalSize = 0;
                const items = fs.readdirSync(dirPath);
                
                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        totalSize += getDirectorySize(itemPath);
                    } else {
                        totalSize += stats.size;
                    }
                }
                
                return totalSize;
            };
            
            const uncompressedSize = getDirectorySize(extractDir);
            const compressedSize = fs.statSync(vsixPath).size;
            const compressionRatio = compressedSize / uncompressedSize;
            
            console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`);
            console.log(`Uncompressed: ${(uncompressedSize / 1024).toFixed(0)}KB`);
            console.log(`Compressed: ${(compressedSize / 1024).toFixed(0)}KB`);
            
            // Good compression should achieve at least 30% reduction
            expect(compressionRatio).toBeLessThan(0.7);
            
            // Cleanup
            fs.rmSync(extractDir, { recursive: true, force: true });
        });

        test('should not include large unnecessary files', async () => {
            // Extract and analyze file sizes
            const tempDir = require('os').tmpdir();
            const extractDir = path.join(tempDir, 'vsix-large-files-test-' + Date.now());
            
            execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
            
            const extensionDir = path.join(extractDir, 'extension');
            const largeFiles = [];
            const maxFileSizeKB = 500; // 500KB threshold
            
            const scanForLargeFiles = (dir) => {
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        scanForLargeFiles(itemPath);
                    } else {
                        const fileSizeKB = stats.size / 1024;
                        if (fileSizeKB > maxFileSizeKB) {
                            largeFiles.push({
                                path: path.relative(extensionDir, itemPath),
                                sizeKB: fileSizeKB
                            });
                        }
                    }
                }
            };
            
            scanForLargeFiles(extensionDir);
            
            if (largeFiles.length > 0) {
                console.log('Large files detected:');
                largeFiles.forEach(file => {
                    console.log(`  ${file.path}: ${file.sizeKB.toFixed(0)}KB`);
                });
            }
            
            // No single file should be larger than 1MB unless it's essential
            const veryLargeFiles = largeFiles.filter(file => file.sizeKB > 1024);
            expect(veryLargeFiles.length).toBe(0);
            
            // Cleanup
            fs.rmSync(extractDir, { recursive: true, force: true });
        });
    });

    describe('Installation Performance', () => {
        test('should install within acceptable time', async () => {
            // Uninstall first
            try {
                execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                // Ignore if not installed
            }

            // Time the installation
            const startTime = Date.now();
            
            execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
            
            const endTime = Date.now();
            const installTime = endTime - startTime;
            
            console.log(`Installation time: ${installTime}ms`);
            
            // Installation should complete within 30 seconds
            expect(installTime).toBeLessThan(30000);
            
            // Warn if installation is slow
            if (installTime > 10000) {
                console.warn(`Installation time ${installTime}ms is slower than expected`);
            }
            
            // Verify installation succeeded
            await new Promise(resolve => setTimeout(resolve, 2000));
            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            expect(installedExtensions).toContain(extensionId);
        }, 40000);

        test('should uninstall quickly', async () => {
            // Ensure extension is installed
            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            if (!installedExtensions.includes(extensionId)) {
                execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Time the uninstallation
            const startTime = Date.now();
            
            execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
            
            const endTime = Date.now();
            const uninstallTime = endTime - startTime;
            
            console.log(`Uninstallation time: ${uninstallTime}ms`);
            
            // Uninstallation should complete within 10 seconds
            expect(uninstallTime).toBeLessThan(10000);
            
            // Verify uninstallation succeeded
            await new Promise(resolve => setTimeout(resolve, 2000));
            const remainingExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            expect(remainingExtensions).not.toContain(extensionId);
        }, 20000);
    });

    describe('Activation Performance', () => {
        beforeEach(async () => {
            // Ensure extension is installed
            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            if (!installedExtensions.includes(extensionId)) {
                execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        });

        test('should not significantly impact VSCode startup', async () => {
            // Create a test file to trigger activation
            const testFile = path.join(testWorkspace, 'test.js');
            fs.writeFileSync(testFile, 'console.log("test");');

            // Measure VSCode startup time
            const startTime = Date.now();
            
            try {
                // Start VSCode with the test file and close quickly
                execSync(`timeout 8s code "${testFile}" --wait --new-window`, { 
                    stdio: 'pipe',
                    timeout: 12000
                });
            } catch (error) {
                // Timeout is expected for this test
            }
            
            const endTime = Date.now();
            const startupTime = endTime - startTime;
            
            console.log(`VSCode startup time with extension: ${startupTime}ms`);
            
            // Should start within reasonable time
            expect(startupTime).toBeLessThan(15000);
            
            // Cleanup
            fs.unlinkSync(testFile);
        }, 20000);

        test('should have efficient activation events', () => {
            const activationEvents = packageJson.activationEvents;
            
            // Check for overly broad activation events
            const hasWildcard = activationEvents.includes('*');
            const hasOnStartup = activationEvents.includes('onStartupFinished');
            
            if (hasWildcard) {
                console.warn('Extension uses wildcard (*) activation - may impact startup performance');
            }
            
            if (hasOnStartup) {
                console.log('Extension activates on startup - this is acceptable but monitor performance');
            }
            
            // Count specific vs. broad activation events
            const specificEvents = activationEvents.filter(event => 
                event.startsWith('onCommand:') || 
                event.startsWith('onLanguage:') ||
                event.startsWith('workspaceContains:')
            );
            
            const broadEvents = activationEvents.filter(event =>
                event === '*' || 
                event === 'onStartupFinished'
            );
            
            console.log(`Activation events - Specific: ${specificEvents.length}, Broad: ${broadEvents.length}`);
            
            // Prefer specific activation events
            expect(specificEvents.length).toBeGreaterThanOrEqual(broadEvents.length);
        });
    });

    describe('Memory Usage', () => {
        test('should not include excessive dependencies', async () => {
            // Extract and analyze node_modules if included
            const tempDir = require('os').tmpdir();
            const extractDir = path.join(tempDir, 'vsix-deps-test-' + Date.now());
            
            execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
            
            const extensionDir = path.join(extractDir, 'extension');
            const nodeModulesPath = path.join(extensionDir, 'node_modules');
            
            if (fs.existsSync(nodeModulesPath)) {
                console.log('Extension includes node_modules');
                
                // List included dependencies
                const dependencies = fs.readdirSync(nodeModulesPath)
                    .filter(item => !item.startsWith('.'))
                    .filter(item => {
                        const itemPath = path.join(nodeModulesPath, item);
                        return fs.statSync(itemPath).isDirectory();
                    });
                
                console.log(`Bundled dependencies: ${dependencies.join(', ')}`);
                
                // Should only include runtime dependencies from package.json
                const declaredDeps = Object.keys(packageJson.dependencies || {});
                
                dependencies.forEach(dep => {
                    // Should be declared in package.json dependencies (not devDependencies)
                    expect(declaredDeps).toContain(dep);
                });
                
                // Should not include development dependencies
                const devDeps = Object.keys(packageJson.devDependencies || {});
                const includedDevDeps = dependencies.filter(dep => devDeps.includes(dep));
                
                if (includedDevDeps.length > 0) {
                    console.warn(`Development dependencies included: ${includedDevDeps.join(', ')}`);
                }
                
                expect(includedDevDeps.length).toBe(0);
            } else {
                console.log('Extension does not include node_modules (bundled)');
            }
            
            // Cleanup
            fs.rmSync(extractDir, { recursive: true, force: true });
        });

        test('should use appropriate file formats', async () => {
            // Extract and analyze file types
            const tempDir = require('os').tmpdir();
            const extractDir = path.join(tempDir, 'vsix-format-test-' + Date.now());
            
            execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
            
            const extensionDir = path.join(extractDir, 'extension');
            const fileTypes = {};
            
            const analyzeFiles = (dir) => {
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        analyzeFiles(itemPath);
                    } else {
                        const ext = path.extname(item).toLowerCase();
                        if (!fileTypes[ext]) {
                            fileTypes[ext] = { count: 0, totalSize: 0 };
                        }
                        fileTypes[ext].count++;
                        fileTypes[ext].totalSize += stats.size;
                    }
                }
            };
            
            analyzeFiles(extensionDir);
            
            console.log('File type analysis:');
            Object.keys(fileTypes).sort().forEach(ext => {
                const info = fileTypes[ext];
                console.log(`  ${ext || '(no extension)'}: ${info.count} files, ${(info.totalSize / 1024).toFixed(0)}KB`);
            });
            
            // Check for unoptimized file types
            if (fileTypes['.ts'] && fileTypes['.ts'].count > 0) {
                console.warn('TypeScript source files found - should be compiled to .js');
            }
            
            if (fileTypes['.map'] && fileTypes['.map'].count > 0) {
                console.warn('Source map files found - consider excluding from production');
            }
            
            // Cleanup
            fs.rmSync(extractDir, { recursive: true, force: true });
        });
    });

    describe('Network Performance', () => {
        test('should have reasonable download time estimate', () => {
            const sizeBytes = fs.statSync(vsixPath).size;
            
            // Estimate download times for different connection speeds
            const speeds = {
                'Slow 3G (0.5 Mbps)': 0.5 * 1024 * 1024 / 8, // bytes per second
                'Fast 3G (2 Mbps)': 2 * 1024 * 1024 / 8,
                'WiFi (10 Mbps)': 10 * 1024 * 1024 / 8,
                'Broadband (50 Mbps)': 50 * 1024 * 1024 / 8
            };
            
            console.log('Estimated download times:');
            Object.keys(speeds).forEach(speedName => {
                const bytesPerSecond = speeds[speedName];
                const downloadTimeSeconds = sizeBytes / bytesPerSecond;
                console.log(`  ${speedName}: ${downloadTimeSeconds.toFixed(1)}s`);
                
                // Should download in reasonable time on slow connections
                if (speedName.includes('Slow 3G')) {
                    expect(downloadTimeSeconds).toBeLessThan(60); // 1 minute max on slow 3G
                }
            });
        });
    });
});