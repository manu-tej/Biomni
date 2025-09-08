import * as vscode from 'vscode';

export interface PerformanceMetrics {
  activationTime: number;
  memoryUsage: number;
  commandExecutionTimes: Record<string, number[]>;
  apiResponseTimes: Record<string, number[]>;
  extensionSize: number;
  lastUpdate: Date;
}

export interface CommandPerformanceEntry {
  commandName: string;
  executionTime: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface ApiPerformanceEntry {
  endpoint: string;
  responseTime: number;
  timestamp: Date;
  success: boolean;
  httpStatus?: number;
  errorMessage?: string;
}

export interface PerformanceReport {
  summary: {
    avgActivationTime: number;
    avgMemoryUsage: number;
    totalCommands: number;
    totalApiCalls: number;
    avgCommandTime: number;
    avgApiResponseTime: number;
    successRate: number;
  };
  degradationWarnings: string[];
  recommendations: string[];
  detailedMetrics: PerformanceMetrics;
}

export interface PerformanceThresholds {
  maxActivationTime: number; // 2000ms
  maxMemoryUsage: number; // 100MB
  maxCommandExecutionTime: number; // 500ms
  maxApiResponseTime: number; // 3000ms
  memoryLeakThreshold: number; // 50MB increase
  performanceDegradationThreshold: number; // 50% increase in times
}

export class PerformanceMonitorService {
  private static instance: PerformanceMonitorService | undefined;
  private metrics: PerformanceMetrics;
  private commandHistory: CommandPerformanceEntry[] = [];
  private apiHistory: ApiPerformanceEntry[] = [];
  private activationStartTime: number = 0;
  private memoryMonitorInterval: NodeJS.Timeout | undefined;
  private context: vscode.ExtensionContext | undefined;
  
  private readonly thresholds: PerformanceThresholds = {
    maxActivationTime: 2000, // 2 seconds
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxCommandExecutionTime: 500, // 500ms
    maxApiResponseTime: 3000, // 3 seconds
    memoryLeakThreshold: 50 * 1024 * 1024, // 50MB
    performanceDegradationThreshold: 1.5 // 50% increase
  };

  private constructor() {
    this.metrics = {
      activationTime: 0,
      memoryUsage: 0,
      commandExecutionTimes: {},
      apiResponseTimes: {},
      extensionSize: 0,
      lastUpdate: new Date()
    };
  }

  public static getInstance(): PerformanceMonitorService {
    if (!PerformanceMonitorService.instance) {
      PerformanceMonitorService.instance = new PerformanceMonitorService();
    }
    return PerformanceMonitorService.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    this.startActivationMeasurement();
    this.startMemoryMonitoring();
    this.calculateExtensionSize();
    
    console.log('PerformanceMonitorService initialized');
  }

  /**
   * Start measuring extension activation time
   */
  public startActivationMeasurement(): void {
    this.activationStartTime = Date.now();
  }

  /**
   * Complete activation time measurement
   */
  public completeActivationMeasurement(): void {
    if (this.activationStartTime > 0) {
      this.metrics.activationTime = Date.now() - this.activationStartTime;
      this.metrics.lastUpdate = new Date();
      
      if (this.metrics.activationTime > this.thresholds.maxActivationTime) {
        console.warn(`Activation time exceeded threshold: ${this.metrics.activationTime}ms > ${this.thresholds.maxActivationTime}ms`);
        void vscode.window.showWarningMessage(`Extension activation took ${this.metrics.activationTime}ms (threshold: ${this.thresholds.maxActivationTime}ms)`);
      }
      
      console.log(`Extension activation completed in ${this.metrics.activationTime}ms`);
    }
  }

  /**
   * Start monitoring memory usage periodically
   */
  private startMemoryMonitoring(): void {
    // Monitor memory every 30 seconds
    this.memoryMonitorInterval = setInterval(() => {
      this.measureMemoryUsage();
    }, 30000);
  }

  /**
   * Measure current memory usage
   */
  public measureMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapUsed + memUsage.external;
    
    // Check for potential memory leaks
    if (this.metrics.memoryUsage > 0) {
      const memoryIncrease = totalMemory - this.metrics.memoryUsage;
      if (memoryIncrease > this.thresholds.memoryLeakThreshold) {
        console.warn(`Potential memory leak detected: ${Math.round(memoryIncrease / (1024 * 1024))}MB increase`);
      }
    }
    
    this.metrics.memoryUsage = totalMemory;
    this.metrics.lastUpdate = new Date();
    
    if (totalMemory > this.thresholds.maxMemoryUsage) {
      console.warn(`Memory usage exceeded threshold: ${Math.round(totalMemory / (1024 * 1024))}MB > ${Math.round(this.thresholds.maxMemoryUsage / (1024 * 1024))}MB`);
    }
  }

  /**
   * Calculate extension bundle size
   */
  private calculateExtensionSize(): void {
    if (this.context) {
      const fs = require('fs');
      const path = require('path');
      
      try {
        const extensionPath = this.context.extensionPath;
        const outPath = path.join(extensionPath, 'out');
        
        if (fs.existsSync(outPath)) {
          this.metrics.extensionSize = this.calculateDirectorySize(outPath);
        }
      } catch (error) {
        console.error('Failed to calculate extension size:', error);
      }
    }
  }

  /**
   * Calculate directory size recursively
   */
  private calculateDirectorySize(dirPath: string): number {
    const fs = require('fs');
    const path = require('path');
    let totalSize = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += this.calculateDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      console.error(`Failed to calculate size for ${dirPath}:`, error);
    }
    
    return totalSize;
  }

  /**
   * Measure command execution time
   */
  public async measureCommandExecution<T>(
    commandName: string, 
    commandFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;
    let result: T;
    
    try {
      result = await commandFunction();
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error; // Re-throw the error after recording metrics
    } finally {
      const executionTime = Date.now() - startTime;
      
      // Record command performance
      const entry: CommandPerformanceEntry = {
        commandName,
        executionTime,
        timestamp: new Date(),
        success,
        ...(errorMessage && { errorMessage })
      };
      
      this.commandHistory.push(entry);
      
      // Keep only last 100 entries to prevent memory bloat
      if (this.commandHistory.length > 100) {
        this.commandHistory = this.commandHistory.slice(-100);
      }
      
      // Update metrics
      if (!this.metrics.commandExecutionTimes[commandName]) {
        this.metrics.commandExecutionTimes[commandName] = [];
      }
      this.metrics.commandExecutionTimes[commandName].push(executionTime);
      
      // Keep only last 10 measurements per command
      if (this.metrics.commandExecutionTimes[commandName].length > 10) {
        this.metrics.commandExecutionTimes[commandName] = 
          this.metrics.commandExecutionTimes[commandName].slice(-10);
      }
      
      this.metrics.lastUpdate = new Date();
      
      // Check thresholds
      if (executionTime > this.thresholds.maxCommandExecutionTime) {
        console.warn(`Command ${commandName} execution time exceeded threshold: ${executionTime}ms > ${this.thresholds.maxCommandExecutionTime}ms`);
      }
      
      console.log(`Command ${commandName} executed in ${executionTime}ms (success: ${success})`);
    }
    
    return result!;
  }

  /**
   * Measure API call performance
   */
  public async measureApiCall<T>(
    endpoint: string,
    apiFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let httpStatus: number | undefined;
    let errorMessage: string | undefined;
    let result: T;
    
    try {
      result = await apiFunction();
    } catch (error) {
      success = false;
      
      // Try to extract HTTP status from error
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        httpStatus = errorObj.status || errorObj.statusCode;
        errorMessage = errorObj.message || error.toString();
      } else {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }
      
      throw error; // Re-throw the error after recording metrics
    } finally {
      const responseTime = Date.now() - startTime;
      
      // Record API performance
      const entry: ApiPerformanceEntry = {
        endpoint,
        responseTime,
        timestamp: new Date(),
        success,
        ...(httpStatus && { httpStatus }),
        ...(errorMessage && { errorMessage })
      };
      
      this.apiHistory.push(entry);
      
      // Keep only last 100 entries to prevent memory bloat
      if (this.apiHistory.length > 100) {
        this.apiHistory = this.apiHistory.slice(-100);
      }
      
      // Update metrics
      if (!this.metrics.apiResponseTimes[endpoint]) {
        this.metrics.apiResponseTimes[endpoint] = [];
      }
      this.metrics.apiResponseTimes[endpoint].push(responseTime);
      
      // Keep only last 10 measurements per endpoint
      if (this.metrics.apiResponseTimes[endpoint].length > 10) {
        this.metrics.apiResponseTimes[endpoint] = 
          this.metrics.apiResponseTimes[endpoint].slice(-10);
      }
      
      this.metrics.lastUpdate = new Date();
      
      // Check thresholds
      if (responseTime > this.thresholds.maxApiResponseTime) {
        console.warn(`API call to ${endpoint} response time exceeded threshold: ${responseTime}ms > ${this.thresholds.maxApiResponseTime}ms`);
      }
      
      console.log(`API call to ${endpoint} completed in ${responseTime}ms (success: ${success})`);
    }
    
    return result!;
  }

  /**
   * Detect performance degradation
   */
  private detectPerformanceDegradation(): string[] {
    const warnings: string[] = [];
    
    // Check activation time
    if (this.metrics.activationTime > this.thresholds.maxActivationTime) {
      warnings.push(`Activation time (${this.metrics.activationTime}ms) exceeds threshold (${this.thresholds.maxActivationTime}ms)`);
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      const memoryMB = Math.round(this.metrics.memoryUsage / (1024 * 1024));
      const thresholdMB = Math.round(this.thresholds.maxMemoryUsage / (1024 * 1024));
      warnings.push(`Memory usage (${memoryMB}MB) exceeds threshold (${thresholdMB}MB)`);
    }
    
    // Check command execution times
    for (const [command, times] of Object.entries(this.metrics.commandExecutionTimes)) {
      if (times.length >= 3) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        if (avgTime > this.thresholds.maxCommandExecutionTime) {
          warnings.push(`Command ${command} average execution time (${Math.round(avgTime)}ms) exceeds threshold (${this.thresholds.maxCommandExecutionTime}ms)`);
        }
        
        // Check for performance degradation (comparing recent vs older measurements)
        if (times.length >= 6) {
          const recentTimes = times.slice(-3);
          const olderTimes = times.slice(0, 3);
          const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
          const olderAvg = olderTimes.reduce((a, b) => a + b, 0) / olderTimes.length;
          
          if (recentAvg > olderAvg * this.thresholds.performanceDegradationThreshold) {
            warnings.push(`Command ${command} performance degraded: ${Math.round((recentAvg / olderAvg - 1) * 100)}% slower`);
          }
        }
      }
    }
    
    // Check API response times
    for (const [endpoint, times] of Object.entries(this.metrics.apiResponseTimes)) {
      if (times.length >= 3) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        if (avgTime > this.thresholds.maxApiResponseTime) {
          warnings.push(`API ${endpoint} average response time (${Math.round(avgTime)}ms) exceeds threshold (${this.thresholds.maxApiResponseTime}ms)`);
        }
        
        // Check for performance degradation
        if (times.length >= 6) {
          const recentTimes = times.slice(-3);
          const olderTimes = times.slice(0, 3);
          const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
          const olderAvg = olderTimes.reduce((a, b) => a + b, 0) / olderTimes.length;
          
          if (recentAvg > olderAvg * this.thresholds.performanceDegradationThreshold) {
            warnings.push(`API ${endpoint} performance degraded: ${Math.round((recentAvg / olderAvg - 1) * 100)}% slower`);
          }
        }
      }
    }
    
    return warnings;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Bundle size recommendations
    if (this.metrics.extensionSize > 5 * 1024 * 1024) { // 5MB
      recommendations.push('Consider optimizing bundle size - current size exceeds 5MB');
    }
    
    // Memory usage recommendations
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      recommendations.push('Memory usage is approaching threshold - consider memory optimization');
    }
    
    // Command performance recommendations
    const slowCommands = Object.entries(this.metrics.commandExecutionTimes)
      .filter(([, times]) => {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        return avgTime > this.thresholds.maxCommandExecutionTime * 0.8;
      })
      .map(([command]) => command);
    
    if (slowCommands.length > 0) {
      recommendations.push(`Consider optimizing slow commands: ${slowCommands.join(', ')}`);
    }
    
    // API performance recommendations
    const slowApis = Object.entries(this.metrics.apiResponseTimes)
      .filter(([, times]) => {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        return avgTime > this.thresholds.maxApiResponseTime * 0.8;
      })
      .map(([endpoint]) => endpoint);
    
    if (slowApis.length > 0) {
      recommendations.push(`Consider caching or optimizing slow API calls: ${slowApis.join(', ')}`);
    }
    
    return recommendations;
  }

  /**
   * Generate comprehensive performance report
   */
  public generateReport(): PerformanceReport {
    const allCommandTimes = Object.values(this.metrics.commandExecutionTimes).flat();
    const allApiTimes = Object.values(this.metrics.apiResponseTimes).flat();
    const successfulCommands = this.commandHistory.filter(entry => entry.success).length;
    const successfulApiCalls = this.apiHistory.filter(entry => entry.success).length;
    
    const report: PerformanceReport = {
      summary: {
        avgActivationTime: this.metrics.activationTime,
        avgMemoryUsage: this.metrics.memoryUsage,
        totalCommands: this.commandHistory.length,
        totalApiCalls: this.apiHistory.length,
        avgCommandTime: allCommandTimes.length > 0 ? 
          Math.round(allCommandTimes.reduce((a, b) => a + b, 0) / allCommandTimes.length) : 0,
        avgApiResponseTime: allApiTimes.length > 0 ? 
          Math.round(allApiTimes.reduce((a, b) => a + b, 0) / allApiTimes.length) : 0,
        successRate: Math.round(((successfulCommands + successfulApiCalls) / 
          Math.max(1, this.commandHistory.length + this.apiHistory.length)) * 100)
      },
      degradationWarnings: this.detectPerformanceDegradation(),
      recommendations: this.generateRecommendations(),
      detailedMetrics: { ...this.metrics }
    };
    
    return report;
  }

  /**
   * Log performance dashboard to console
   */
  public logPerformanceDashboard(): void {
    const report = this.generateReport();
    
    console.log('\n=== PERFORMANCE DASHBOARD ===');
    console.log(`Activation Time: ${report.summary.avgActivationTime}ms`);
    console.log(`Memory Usage: ${Math.round(report.summary.avgMemoryUsage / (1024 * 1024))}MB`);
    console.log(`Extension Size: ${Math.round(this.metrics.extensionSize / (1024 * 1024))}MB`);
    console.log(`Total Commands: ${report.summary.totalCommands}`);
    console.log(`Total API Calls: ${report.summary.totalApiCalls}`);
    console.log(`Average Command Time: ${report.summary.avgCommandTime}ms`);
    console.log(`Average API Response Time: ${report.summary.avgApiResponseTime}ms`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    
    if (report.degradationWarnings.length > 0) {
      console.log('\n⚠️ PERFORMANCE WARNINGS:');
      report.degradationWarnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    console.log(`\nLast Update: ${this.metrics.lastUpdate.toLocaleString()}`);
    console.log('=============================\n');
  }

  /**
   * Show performance dashboard in VS Code
   */
  public async showPerformanceDashboard(): Promise<void> {
    const report = this.generateReport();
    
    const dashboardContent = [
      '=== PERFORMANCE DASHBOARD ===',
      '',
      '📊 SUMMARY:',
      `  • Activation Time: ${report.summary.avgActivationTime}ms`,
      `  • Memory Usage: ${Math.round(report.summary.avgMemoryUsage / (1024 * 1024))}MB`,
      `  • Extension Size: ${Math.round(this.metrics.extensionSize / (1024 * 1024))}MB`,
      `  • Commands Executed: ${report.summary.totalCommands}`,
      `  • API Calls Made: ${report.summary.totalApiCalls}`,
      `  • Avg Command Time: ${report.summary.avgCommandTime}ms`,
      `  • Avg API Response: ${report.summary.avgApiResponseTime}ms`,
      `  • Success Rate: ${report.summary.successRate}%`,
      ''
    ];
    
    if (report.degradationWarnings.length > 0) {
      dashboardContent.push('⚠️ PERFORMANCE WARNINGS:');
      report.degradationWarnings.forEach(warning => {
        dashboardContent.push(`  • ${warning}`);
      });
      dashboardContent.push('');
    }
    
    if (report.recommendations.length > 0) {
      dashboardContent.push('💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        dashboardContent.push(`  • ${rec}`);
      });
      dashboardContent.push('');
    }
    
    dashboardContent.push(`Last Update: ${this.metrics.lastUpdate.toLocaleString()}`);
    
    // Show in information message
    const message = dashboardContent.join('\n');
    await vscode.window.showInformationMessage('Performance Dashboard', {
      modal: true,
      detail: message
    });
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get command history
   */
  public getCommandHistory(): CommandPerformanceEntry[] {
    return [...this.commandHistory];
  }

  /**
   * Get API call history
   */
  public getApiHistory(): ApiPerformanceEntry[] {
    return [...this.apiHistory];
  }

  /**
   * Reset all metrics and history
   */
  public reset(): void {
    this.metrics = {
      activationTime: 0,
      memoryUsage: 0,
      commandExecutionTimes: {},
      apiResponseTimes: {},
      extensionSize: 0,
      lastUpdate: new Date()
    };
    this.commandHistory = [];
    this.apiHistory = [];
    this.activationStartTime = 0;
    
    console.log('Performance metrics reset');
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = undefined;
    }
    
    console.log('PerformanceMonitorService disposed');
  }
}