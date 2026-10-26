#!/usr/bin/env node

/**
 * Security Scanner for Production Build
 * Stream F: Production Build Pipeline & Testing
 * 
 * Comprehensive security scanning of production build artifacts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_PATH = path.join(PROJECT_ROOT, 'dist');
const REPORTS_PATH = path.join(PROJECT_ROOT, 'reports');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

// Security patterns to detect
const SECURITY_PATTERNS = {
    credentials: [
        { name: 'API Keys', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][\w\-\.]{10,}["']/gi },
        { name: 'Passwords', pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{3,}["']/gi },
        { name: 'Secrets', pattern: /(?:secret|private[_-]?key)\s*[:=]\s*["'][^"']{10,}["']/gi },
        { name: 'Tokens', pattern: /(?:token|auth[_-]?token|access[_-]?token)\s*[:=]\s*["'][^"']{10,}["']/gi },
        { name: 'Database URLs', pattern: /(?:mongodb|mysql|postgres|redis):\/\/[^\s"']+/gi },
        { name: 'AWS Keys', pattern: /(?:AKIA[0-9A-Z]{16}|aws[_-]?access[_-]?key)/gi }
    ],
    vulnerabilities: [
        { name: 'eval() usage', pattern: /\beval\s*\(/gi, severity: 'high' },
        { name: 'Function constructor', pattern: /new\s+Function\s*\(/gi, severity: 'high' },
        { name: 'innerHTML assignment', pattern: /\.innerHTML\s*=\s*[^;]+[^"'\s]/gi, severity: 'medium' },
        { name: 'document.write', pattern: /document\.write\s*\(/gi, severity: 'medium' },
        { name: 'setTimeout with string', pattern: /setTimeout\s*\(\s*["'][^"']*["']/gi, severity: 'medium' },
        { name: 'setInterval with string', pattern: /setInterval\s*\(\s*["'][^"']*["']/gi, severity: 'medium' }
    ],
    privacy: [
        { name: 'File paths', pattern: /(?:\/Users\/|C:\\Users\\|\/home\/)[^\s"']+/gi },
        { name: 'IP addresses', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/gi },
        { name: 'Email addresses', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi },
        { name: 'Phone numbers', pattern: /\b\d{3}-\d{3}-\d{4}\b|\(\d{3}\)\s*\d{3}-\d{4}/gi }
    ]
};

// Known vulnerable packages (simplified list)
const VULNERABLE_PACKAGES = [
    'lodash',
    'moment',
    'request',
    'node-uuid',
    'debug',
    'minimist',
    'handlebars',
    'marked'
];

class SecurityScanner {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            summary: {
                passed: 0,
                warnings: 0,
                errors: 0,
                critical: 0
            },
            findings: [],
            dependencies: {
                total: 0,
                vulnerable: [],
                outdated: []
            },
            files: []
        };
    }
    
    log(level, message) {
        const colors = {
            info: '\x1b[34m',
            warn: '\x1b[33m',
            error: '\x1b[31m',
            critical: '\x1b[41m',
            reset: '\x1b[0m'
        };
        
        const color = colors[level] || colors.reset;
        console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
    }
    
    addFinding(type, severity, category, message, file = null, line = null) {
        this.results.findings.push({
            type,
            severity,
            category,
            message,
            file,
            line,
            timestamp: new Date().toISOString()
        });
        
        this.results.summary[severity]++;
        
        const emoji = {
            passed: '✅',
            warnings: '⚠️',
            errors: '❌',
            critical: '🚨'
        }[severity] || '❓';
        
        this.log(severity, `${emoji} ${category}: ${message}${file ? ` (${file}${line ? ':' + line : ''})` : ''}`);
    }
    
    /**
     * Scan bundle files for security issues
     */
    scanBundleFiles() {
        this.log('info', 'Scanning bundle files for security issues...');
        
        if (!fs.existsSync(DIST_PATH)) {
            this.addFinding('validation', 'errors', 'File System', 'Dist directory not found');
            return;
        }
        
        const files = fs.readdirSync(DIST_PATH).filter(f => f.endsWith('.js'));
        
        files.forEach(filename => {
            const filepath = path.join(DIST_PATH, filename);
            this.scanFile(filepath);
        });
    }
    
    /**
     * Scan individual file for security patterns
     */
    scanFile(filepath) {
        const filename = path.basename(filepath);
        this.log('info', `Scanning ${filename}...`);
        
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n');
        
        const fileResult = {
            name: filename,
            size: content.length,
            lines: lines.length,
            findings: []
        };
        
        // Scan for credentials
        Object.values(SECURITY_PATTERNS.credentials).forEach(({ name, pattern }) => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const lineNum = this.findLineNumber(content, match);
                    this.addFinding('security', 'critical', `Credentials: ${name}`, 
                        `Potential credential exposure: ${match.substring(0, 50)}...`, filename, lineNum);
                    fileResult.findings.push({ type: 'credentials', name, match: match.substring(0, 50) });
                });
            }
        });
        
        // Scan for vulnerabilities
        Object.values(SECURITY_PATTERNS.vulnerabilities).forEach(({ name, pattern, severity }) => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const lineNum = this.findLineNumber(content, match);
                    this.addFinding('vulnerability', severity, `Code Vulnerability: ${name}`, 
                        `Potentially unsafe code pattern: ${match}`, filename, lineNum);
                    fileResult.findings.push({ type: 'vulnerability', name, match, severity });
                });
            }
        });
        
        // Scan for privacy issues
        Object.values(SECURITY_PATTERNS.privacy).forEach(({ name, pattern }) => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const lineNum = this.findLineNumber(content, match);
                    // Only warn for privacy issues, don't error
                    this.addFinding('privacy', 'warnings', `Privacy: ${name}`, 
                        `Potential privacy leak: ${match}`, filename, lineNum);
                    fileResult.findings.push({ type: 'privacy', name, match });
                });
            }
        });
        
        this.results.files.push(fileResult);
    }
    
    /**
     * Find line number for a given match in content
     */
    findLineNumber(content, match) {
        const beforeMatch = content.substring(0, content.indexOf(match));
        return beforeMatch.split('\n').length;
    }
    
    /**
     * Scan dependencies for known vulnerabilities
     */
    scanDependencies() {
        this.log('info', 'Scanning dependencies for security issues...');
        
        if (!fs.existsSync(PACKAGE_JSON_PATH)) {
            this.addFinding('validation', 'errors', 'Dependencies', 'package.json not found');
            return;
        }
        
        const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
        const dependencies = {
            ...packageJson.dependencies || {},
            ...packageJson.devDependencies || {}
        };
        
        this.results.dependencies.total = Object.keys(dependencies).length;
        
        // Check for known vulnerable packages
        Object.keys(dependencies).forEach(pkg => {
            if (VULNERABLE_PACKAGES.includes(pkg)) {
                this.addFinding('dependency', 'warnings', 'Vulnerable Package', 
                    `Package ${pkg} has known vulnerabilities. Consider updating or replacing.`);
                this.results.dependencies.vulnerable.push({
                    name: pkg,
                    version: dependencies[pkg]
                });
            }
        });
        
        // Run npm audit if available
        try {
            const auditResult = execSync('npm audit --json', { 
                cwd: PROJECT_ROOT,
                encoding: 'utf8',
                timeout: 30000
            });
            
            const audit = JSON.parse(auditResult);
            
            if (audit.metadata) {
                const { vulnerabilities } = audit.metadata;
                
                if (vulnerabilities.critical > 0) {
                    this.addFinding('dependency', 'critical', 'NPM Audit', 
                        `${vulnerabilities.critical} critical vulnerabilities found`);
                }
                
                if (vulnerabilities.high > 0) {
                    this.addFinding('dependency', 'errors', 'NPM Audit', 
                        `${vulnerabilities.high} high severity vulnerabilities found`);
                }
                
                if (vulnerabilities.moderate > 0) {
                    this.addFinding('dependency', 'warnings', 'NPM Audit', 
                        `${vulnerabilities.moderate} moderate severity vulnerabilities found`);
                }
                
                if (vulnerabilities.low > 0) {
                    this.addFinding('dependency', 'warnings', 'NPM Audit', 
                        `${vulnerabilities.low} low severity vulnerabilities found`);
                }
            }
            
        } catch (error) {
            this.log('warn', 'Could not run npm audit: ' + error.message);
        }
    }
    
    /**
     * Check bundle integrity
     */
    checkBundleIntegrity() {
        this.log('info', 'Checking bundle integrity...');
        
        const bundlePath = path.join(DIST_PATH, 'extension.js');
        if (!fs.existsSync(bundlePath)) {
            this.addFinding('validation', 'errors', 'Bundle Integrity', 'Main bundle file not found');
            return;
        }
        
        // Calculate file hash
        const content = fs.readFileSync(bundlePath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        
        // Check for suspicious modifications
        const stats = fs.statSync(bundlePath);
        const now = new Date();
        const modTime = new Date(stats.mtime);
        const ageMinutes = (now - modTime) / (1000 * 60);
        
        if (ageMinutes > 60) { // Bundle older than 1 hour
            this.addFinding('integrity', 'warnings', 'Bundle Age', 
                `Bundle was created ${Math.round(ageMinutes)} minutes ago`);
        }
        
        // Store integrity info
        this.results.integrity = {
            hash,
            size: stats.size,
            modified: stats.mtime,
            ageMinutes: Math.round(ageMinutes)
        };
    }
    
    /**
     * Validate build configuration security
     */
    validateBuildConfig() {
        this.log('info', 'Validating build configuration security...');
        
        const buildConfigPath = path.join(PROJECT_ROOT, 'build.config.js');
        if (fs.existsSync(buildConfigPath)) {
            try {
                const buildConfig = require(buildConfigPath);
                const config = buildConfig.getBuildConfig('production');
                
                // Check security-related configuration
                if (config.validation && config.validation.security && config.validation.security.enabled) {
                    this.addFinding('config', 'passed', 'Build Security', 'Security validation enabled in build config');
                } else {
                    this.addFinding('config', 'warnings', 'Build Security', 'Security validation not enabled in build config');
                }
                
                // Check source map configuration
                if (config.sourcemap === 'source-map') {
                    this.addFinding('config', 'warnings', 'Source Maps', 'Source maps enabled in production (may expose source code)');
                }
                
            } catch (error) {
                this.addFinding('config', 'errors', 'Build Config', `Failed to validate build config: ${error.message}`);
            }
        }
    }
    
    /**
     * Generate security report
     */
    generateReport() {
        this.log('info', 'Generating security report...');
        
        // Ensure reports directory exists
        if (!fs.existsSync(REPORTS_PATH)) {
            fs.mkdirSync(REPORTS_PATH, { recursive: true });
        }
        
        // Calculate risk score
        const riskScore = this.calculateRiskScore();
        this.results.riskScore = riskScore;
        
        // Generate JSON report
        const reportPath = path.join(REPORTS_PATH, 'security-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // Generate human-readable summary
        const summaryPath = path.join(REPORTS_PATH, 'security-summary.txt');
        let summary = 'Security Scan Summary\n';
        summary += '====================\n\n';
        summary += `Scan Date: ${this.results.timestamp}\n`;
        summary += `Risk Score: ${riskScore}/100 (${this.getRiskLevel(riskScore)})\n\n`;
        summary += `Critical Issues: ${this.results.summary.critical}\n`;
        summary += `Errors: ${this.results.summary.errors}\n`;
        summary += `Warnings: ${this.results.summary.warnings}\n`;
        summary += `Passed Checks: ${this.results.summary.passed}\n\n`;
        
        if (this.results.findings.length > 0) {
            summary += 'Findings by Severity:\n';
            
            ['critical', 'errors', 'warnings'].forEach(severity => {
                const findings = this.results.findings.filter(f => f.severity === severity);
                if (findings.length > 0) {
                    summary += `\n${severity.toUpperCase()}:\n`;
                    findings.forEach(finding => {
                        summary += `  - ${finding.category}: ${finding.message}\n`;
                        if (finding.file) {
                            summary += `    File: ${finding.file}${finding.line ? ':' + finding.line : ''}\n`;
                        }
                    });
                }
            });
        }
        
        if (this.results.dependencies.vulnerable.length > 0) {
            summary += '\nVulnerable Dependencies:\n';
            this.results.dependencies.vulnerable.forEach(dep => {
                summary += `  - ${dep.name}@${dep.version}\n`;
            });
        }
        
        summary += '\nRecommendations:\n';
        summary += this.generateRecommendations();
        
        fs.writeFileSync(summaryPath, summary);
        
        this.log('info', `Security report saved to: ${reportPath}`);
        this.log('info', `Security summary saved to: ${summaryPath}`);
        
        return {
            reportPath,
            summaryPath,
            riskScore,
            summary: this.results.summary
        };
    }
    
    /**
     * Calculate risk score based on findings
     */
    calculateRiskScore() {
        const weights = {
            critical: 25,
            errors: 10,
            warnings: 2,
            passed: -1
        };
        
        let score = 50; // Base score
        
        Object.entries(this.results.summary).forEach(([severity, count]) => {
            if (weights[severity]) {
                score += count * weights[severity];
            }
        });
        
        // Clamp between 0 and 100
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * Get risk level description
     */
    getRiskLevel(score) {
        if (score <= 20) return 'Low';
        if (score <= 50) return 'Medium';
        if (score <= 80) return 'High';
        return 'Critical';
    }
    
    /**
     * Generate security recommendations
     */
    generateRecommendations() {
        let recommendations = '';
        
        const criticalCount = this.results.summary.critical;
        const errorCount = this.results.summary.errors;
        const warningCount = this.results.summary.warnings;
        
        if (criticalCount > 0) {
            recommendations += '- URGENT: Address critical security issues immediately\n';
            recommendations += '- Review and remove any exposed credentials\n';
            recommendations += '- Consider regenerating any potentially compromised keys\n';
        }
        
        if (errorCount > 0) {
            recommendations += '- Fix high-severity security vulnerabilities\n';
            recommendations += '- Update vulnerable dependencies\n';
        }
        
        if (warningCount > 0) {
            recommendations += '- Review and address security warnings\n';
            recommendations += '- Consider removing sensitive information from build\n';
        }
        
        if (this.results.dependencies.vulnerable.length > 0) {
            recommendations += '- Update or replace vulnerable dependencies\n';
            recommendations += '- Run "npm audit fix" to automatically fix issues\n';
        }
        
        recommendations += '- Implement regular security scanning in CI/CD\n';
        recommendations += '- Consider using dependency scanning tools\n';
        recommendations += '- Keep dependencies updated regularly\n';
        
        return recommendations;
    }
    
    /**
     * Run complete security scan
     */
    async run() {
        console.log('🔒 Starting Security Scan...\n');
        
        const startTime = Date.now();
        
        try {
            this.scanBundleFiles();
            this.scanDependencies();
            this.checkBundleIntegrity();
            this.validateBuildConfig();
            
            const report = this.generateReport();
            
            const endTime = Date.now();
            const scanTime = (endTime - startTime) / 1000;
            
            console.log('\n🔒 Security Scan Complete');
            console.log('=========================');
            console.log(`Time: ${scanTime.toFixed(2)}s`);
            console.log(`Risk Score: ${report.riskScore}/100 (${this.getRiskLevel(report.riskScore)})`);
            console.log(`Critical: ${report.summary.critical}, Errors: ${report.summary.errors}, Warnings: ${report.summary.warnings}`);
            
            // Return appropriate exit code
            const hasBlockingIssues = report.summary.critical > 0 || report.summary.errors > 5;
            
            if (hasBlockingIssues) {
                console.log('\n🚨 Security scan failed due to critical issues!');
                return false;
            } else if (report.summary.warnings > 0) {
                console.log('\n⚠️  Security scan passed with warnings');
                return true;
            } else {
                console.log('\n✅ Security scan passed');
                return true;
            }
            
        } catch (error) {
            this.log('error', `Security scan failed: ${error.message}`);
            console.error(error.stack);
            return false;
        }
    }
}

// Run scan if called directly
if (require.main === module) {
    const scanner = new SecurityScanner();
    scanner.run().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = SecurityScanner;