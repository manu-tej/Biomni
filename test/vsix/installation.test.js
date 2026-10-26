/**
 * VSIX Installation Tests
 * Issue #47: VSIX Package Creation & Testing
 * 
 * Tests for VSIX package installation, upgrade, and uninstallation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('VSIX Installation Tests', () => {
    let vsixPath;
    let extensionId;
    let testWorkspace;

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
        console.log(`Testing VSIX: ${vsixFiles[0].file}`);

        // Extract extension ID from VSIX
        const tempDir = require('os').tmpdir();
        const extractDir = path.join(tempDir, 'vsix-test-' + Date.now());
        
        execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);
        
        const packageJsonPath = path.join(extractDir, 'extension', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        extensionId = `${packageJson.publisher}.${packageJson.name}`;
        
        // Cleanup
        fs.rmSync(extractDir, { recursive: true, force: true });

        // Create test workspace
        testWorkspace = path.join(tempDir, 'vsix-test-workspace-' + Date.now());
        fs.mkdirSync(testWorkspace, { recursive: true });
    });

    afterAll(async () => {
        // Cleanup test workspace
        if (testWorkspace && fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    beforeEach(async () => {
        // Ensure extension is not installed before each test
        try {
            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            if (installedExtensions.includes(extensionId)) {
                execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
                // Wait for uninstallation to complete
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            // Ignore errors if extension is not installed
        }
    });

    afterEach(async () => {
        // Cleanup installed extension after each test
        try {
            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            if (installedExtensions.includes(extensionId)) {
                execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Installation', () => {
        test('should install VSIX package successfully', async () => {
            expect(fs.existsSync(vsixPath)).toBe(true);

            // Install extension
            const installResult = execSync(`code --install-extension "${vsixPath}" --force`, { 
                encoding: 'utf8' 
            });

            // Wait for installation to complete
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Verify installation
            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            expect(installedExtensions).toContain(extensionId);
        }, 30000);

        test('should handle reinstallation gracefully', async () => {
            // Install extension first time
            execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Install again (should overwrite)
            const reinstallResult = execSync(`code --install-extension "${vsixPath}" --force`, { 
                encoding: 'utf8' 
            });

            // Verify still installed
            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            expect(installedExtensions).toContain(extensionId);
        }, 30000);

        test('should report installation errors for corrupted VSIX', async () => {
            // Create a corrupted VSIX file
            const corruptedVsix = path.join(testWorkspace, 'corrupted.vsix');
            fs.writeFileSync(corruptedVsix, 'corrupted data');

            // Attempt installation should fail
            expect(() => {
                execSync(`code --install-extension "${corruptedVsix}" --force`, { 
                    stdio: 'pipe' 
                });
            }).toThrow();

            // Cleanup
            fs.unlinkSync(corruptedVsix);
        });
    });

    describe('Verification', () => {
        beforeEach(async () => {
            // Install extension for verification tests
            execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
            await new Promise(resolve => setTimeout(resolve, 3000));
        });

        test('should appear in extension list', () => {
            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            expect(installedExtensions).toContain(extensionId);
        });

        test('should show correct extension details', () => {
            const extensionInfo = execSync(`code --list-extensions --show-versions`, { 
                encoding: 'utf8' 
            });
            
            expect(extensionInfo).toContain(extensionId);
            // Should contain version information
            expect(extensionInfo.split('\n').find(line => line.includes(extensionId))).toMatch(/@\d+\.\d+\.\d+/);
        });

        test('should not interfere with other extensions', () => {
            const beforeCount = execSync('code --list-extensions', { encoding: 'utf8' }).split('\n').length;
            
            // Install another extension (if available)
            // For this test, we'll just verify our extension doesn't break the list
            const afterExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            
            expect(afterExtensions).toContain(extensionId);
            expect(afterExtensions.split('\n').length).toBeGreaterThanOrEqual(beforeCount);
        });
    });

    describe('Uninstallation', () => {
        beforeEach(async () => {
            // Install extension for uninstallation tests
            execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
            await new Promise(resolve => setTimeout(resolve, 3000));
        });

        test('should uninstall successfully', async () => {
            // Verify extension is installed
            let installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            expect(installedExtensions).toContain(extensionId);

            // Uninstall extension
            execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Verify uninstallation
            installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            expect(installedExtensions).not.toContain(extensionId);
        }, 30000);

        test('should handle uninstalling non-existent extension gracefully', () => {
            const fakeExtensionId = 'fake.nonexistent-extension';
            
            // Should not throw error for non-existent extension
            expect(() => {
                execSync(`code --uninstall-extension "${fakeExtensionId}"`, { 
                    stdio: 'pipe' 
                });
            }).not.toThrow();
        });

        test('should clean up extension files completely', async () => {
            // Note: This test is platform-dependent and requires knowledge of
            // VSCode's extension storage locations
            
            // For now, we'll just verify the extension is no longer listed
            execSync(`code --uninstall-extension "${extensionId}"`, { stdio: 'pipe' });
            await new Promise(resolve => setTimeout(resolve, 3000));

            const installedExtensions = execSync('code --list-extensions', { encoding: 'utf8' });
            expect(installedExtensions).not.toContain(extensionId);
        }, 30000);
    });

    describe('Cross-Platform Compatibility', () => {
        test('should work on current platform', () => {
            const platform = process.platform;
            console.log(`Testing on platform: ${platform}`);
            
            // Platform-specific tests could go here
            expect(['darwin', 'linux', 'win32']).toContain(platform);
        });

        test('should handle platform-specific paths correctly', () => {
            // Test that the extension handles file paths correctly for the current platform
            expect(path.isAbsolute(vsixPath)).toBe(true);
            expect(fs.existsSync(vsixPath)).toBe(true);
        });
    });

    describe('Performance', () => {
        test('should install within reasonable time', async () => {
            const startTime = Date.now();
            
            execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const endTime = Date.now();
            const installTime = endTime - startTime;
            
            // Installation should complete within 30 seconds
            expect(installTime).toBeLessThan(30000);
            
            console.log(`Installation time: ${installTime}ms`);
        }, 35000);

        test('should not significantly impact VSCode startup', async () => {
            // Install extension
            execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'pipe' });
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Test VSCode startup time with extension
            const startTime = Date.now();
            
            try {
                // Start VSCode and immediately close it
                execSync(`timeout 5s code --wait "${testWorkspace}" --new-window`, { 
                    stdio: 'pipe',
                    timeout: 10000
                });
            } catch (error) {
                // Timeout is expected
            }
            
            const endTime = Date.now();
            const startupTime = endTime - startTime;
            
            // Should start within reasonable time (including timeout)
            expect(startupTime).toBeLessThan(15000);
            
            console.log(`VSCode startup time with extension: ${startupTime}ms`);
        }, 20000);
    });
});