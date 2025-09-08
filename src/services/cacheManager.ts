import * as vscode from 'vscode';
import { PerformanceMonitorService } from './performanceMonitor';

/**
 * Cache entry interface with metadata
 */
export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  key: string;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  // Size limits
  maxEntries: number;
  maxSize: number; // in bytes
  
  // Time-based expiration
  defaultTtl: number; // milliseconds
  maxTtl: number;
  
  // Performance-based policies
  enablePerformanceAdaptation: boolean;
  performanceThresholdMs: number;
  memoryThresholdBytes: number;
  
  // Eviction policies
  enableLRU: boolean;
  enableTTL: boolean;
  enableSizeBased: boolean;
  
  // Categories with different policies
  categoryConfigs: Record<string, Partial<CacheConfig>>;
}

/**
 * Cache categories for different data types
 */
export enum CacheCategory {
  API_RESPONSES = 'api_responses',
  TOOL_DEFINITIONS = 'tool_definitions', 
  USER_PREFERENCES = 'user_preferences',
  COMMAND_RESULTS = 'command_results',
  FILE_CONTENT = 'file_content',
  ANALYSIS_RESULTS = 'analysis_results'
}

/**
 * Intelligent cache manager with performance-based policies
 */
export class CacheManagerService {
  private static instance: CacheManagerService | undefined;
  private cache = new Map<string, CacheEntry>();
  private performanceMonitor: PerformanceMonitorService;
  private stats: CacheStats;
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | undefined;
  private adaptationInterval: NodeJS.Timeout | undefined;
  
  private readonly DEFAULT_CONFIG: CacheConfig = {
    maxEntries: 1000,
    maxSize: 50 * 1024 * 1024, // 50MB
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    maxTtl: 60 * 60 * 1000, // 1 hour
    enablePerformanceAdaptation: true,
    performanceThresholdMs: 500,
    memoryThresholdBytes: 80 * 1024 * 1024, // 80MB
    enableLRU: true,
    enableTTL: true,
    enableSizeBased: true,
    categoryConfigs: {
      [CacheCategory.API_RESPONSES]: {
        defaultTtl: 10 * 60 * 1000, // 10 minutes for API responses
        maxTtl: 30 * 60 * 1000 // 30 minutes max
      },
      [CacheCategory.TOOL_DEFINITIONS]: {
        defaultTtl: 60 * 60 * 1000, // 1 hour for tool definitions
        maxTtl: 24 * 60 * 60 * 1000 // 24 hours max
      },
      [CacheCategory.USER_PREFERENCES]: {
        defaultTtl: 24 * 60 * 60 * 1000, // 24 hours for user prefs
        maxTtl: 7 * 24 * 60 * 60 * 1000 // 7 days max
      },
      [CacheCategory.COMMAND_RESULTS]: {
        defaultTtl: 2 * 60 * 1000, // 2 minutes for command results
        maxTtl: 10 * 60 * 1000 // 10 minutes max
      },
      [CacheCategory.FILE_CONTENT]: {
        defaultTtl: 30 * 1000, // 30 seconds for file content
        maxTtl: 5 * 60 * 1000 // 5 minutes max
      },
      [CacheCategory.ANALYSIS_RESULTS]: {
        defaultTtl: 15 * 60 * 1000, // 15 minutes for analysis results
        maxTtl: 60 * 60 * 1000 // 1 hour max
      }
    }
  };

  private constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.performanceMonitor = PerformanceMonitorService.getInstance();
    this.stats = this.initializeStats();
    this.startCleanupRoutine();
    this.startPerformanceAdaptation();
    
    console.log('CacheManagerService initialized with config:', {
      maxEntries: this.config.maxEntries,
      maxSize: Math.round(this.config.maxSize / (1024 * 1024)) + 'MB',
      defaultTtl: this.config.defaultTtl + 'ms',
      performanceAdaptation: this.config.enablePerformanceAdaptation
    });
  }

  public static getInstance(config?: Partial<CacheConfig>): CacheManagerService {
    if (!CacheManagerService.instance) {
      CacheManagerService.instance = new CacheManagerService(config);
    }
    return CacheManagerService.instance;
  }

  /**
   * Initialize cache statistics
   */
  private initializeStats(): CacheStats {
    return {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0,
      memoryUsage: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now()
    };
  }

  /**
   * Generate cache key with category prefix
   */
  private generateKey(category: CacheCategory, key: string): string {
    return `${category}:${key}`;
  }

  /**
   * Calculate estimated size of a value
   */
  private calculateSize(value: any): number {
    try {
      const serialized = JSON.stringify(value);
      return new Blob([serialized]).size;
    } catch {
      // Fallback for non-serializable objects
      return 1024; // 1KB estimate
    }
  }

  /**
   * Get cache configuration for category
   */
  private getCategoryConfig(category: CacheCategory): CacheConfig {
    const categoryConfig = this.config.categoryConfigs[category] || {};
    return { ...this.config, ...categoryConfig };
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!this.config.enableTTL) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Update entry access information
   */
  private updateAccess(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  /**
   * Get adaptive TTL based on performance data
   */
  private getAdaptiveTtl(category: CacheCategory, baseKey: string): number {
    if (!this.config.enablePerformanceAdaptation) {
      return this.getCategoryConfig(category).defaultTtl;
    }

    const metrics = this.performanceMonitor.getMetrics();
    const categoryConfig = this.getCategoryConfig(category);
    
    // Check API performance for API responses
    if (category === CacheCategory.API_RESPONSES) {
      const apiTimes = metrics.apiResponseTimes[baseKey] || [];
      if (apiTimes.length > 0) {
        const avgResponseTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
        
        // Longer TTL for slower APIs to reduce calls
        if (avgResponseTime > this.config.performanceThresholdMs) {
          return Math.min(categoryConfig.defaultTtl * 2, categoryConfig.maxTtl);
        }
      }
    }
    
    // Check command performance for command results
    if (category === CacheCategory.COMMAND_RESULTS) {
      const commandTimes = metrics.commandExecutionTimes[baseKey] || [];
      if (commandTimes.length > 0) {
        const avgCommandTime = commandTimes.reduce((a, b) => a + b, 0) / commandTimes.length;
        
        // Longer TTL for slower commands
        if (avgCommandTime > this.config.performanceThresholdMs) {
          return Math.min(categoryConfig.defaultTtl * 1.5, categoryConfig.maxTtl);
        }
      }
    }
    
    // Check memory pressure - shorter TTL if memory is high
    if (metrics.memoryUsage > this.config.memoryThresholdBytes) {
      return Math.max(categoryConfig.defaultTtl * 0.5, 30000); // Min 30 seconds
    }
    
    return categoryConfig.defaultTtl;
  }

  /**
   * Evict entries based on various policies
   */
  private evictEntries(): void {
    const currentTime = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries first
    if (this.config.enableTTL) {
      for (const [key, entry] of entries) {
        if (this.isExpired(entry)) {
          this.cache.delete(key);
          this.stats.evictionCount++;
          this.stats.totalSize -= entry.size;
          this.stats.totalEntries--;
        }
      }
    }
    
    // Check if we still need to evict more entries
    const needsEviction = this.cache.size > this.config.maxEntries || 
                         this.stats.totalSize > this.config.maxSize;
    
    if (!needsEviction) return;
    
    // Sort by LRU and access frequency for smart eviction
    const sortedEntries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        if (this.config.enableLRU) {
          // Prioritize by last accessed time and access count
          const aScore = a.entry.lastAccessed + (a.entry.accessCount * 60000);
          const bScore = b.entry.lastAccessed + (b.entry.accessCount * 60000);
          return aScore - bScore;
        }
        return a.entry.timestamp - b.entry.timestamp;
      });
    
    // Evict least valuable entries
    const targetEvictions = Math.max(
      this.cache.size - this.config.maxEntries,
      Math.ceil(this.cache.size * 0.1) // Evict at least 10%
    );
    
    for (let i = 0; i < targetEvictions && sortedEntries.length > 0; i++) {
      const { key, entry } = sortedEntries[i];
      this.cache.delete(key);
      this.stats.evictionCount++;
      this.stats.totalSize -= entry.size;
      this.stats.totalEntries--;
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    const entries = Array.from(this.cache.values());
    
    this.stats.totalEntries = entries.length;
    this.stats.totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    this.stats.hitRate = this.stats.hitCount / Math.max(1, this.stats.hitCount + this.stats.missCount);
    this.stats.memoryUsage = this.stats.totalSize;
    
    if (entries.length > 0) {
      this.stats.oldestEntry = Math.min(...entries.map(e => e.timestamp));
      this.stats.newestEntry = Math.max(...entries.map(e => e.timestamp));
    }
  }

  /**
   * Start cleanup routine
   */
  private startCleanupRoutine(): void {
    // Run cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.evictEntries();
      this.updateStats();
      
      console.log('Cache cleanup completed:', {
        entries: this.stats.totalEntries,
        size: Math.round(this.stats.totalSize / 1024) + 'KB',
        hitRate: Math.round(this.stats.hitRate * 100) + '%',
        evictions: this.stats.evictionCount
      });
    }, 2 * 60 * 1000);
  }

  /**
   * Start performance adaptation routine
   */
  private startPerformanceAdaptation(): void {
    if (!this.config.enablePerformanceAdaptation) return;
    
    // Adapt cache policies every 5 minutes
    this.adaptationInterval = setInterval(() => {
      this.adaptCachePolicies();
    }, 5 * 60 * 1000);
  }

  /**
   * Adapt cache policies based on performance data
   */
  private adaptCachePolicies(): void {
    const performanceReport = this.performanceMonitor.generateReport();
    
    // Adjust TTL based on performance recommendations
    const hasSlowApiCalls = performanceReport.recommendations.some(rec => 
      rec.includes('slow API calls')
    );
    
    const hasMemoryPressure = performanceReport.degradationWarnings.some(warning => 
      warning.includes('Memory usage')
    );
    
    if (hasSlowApiCalls) {
      // Increase default TTL for API responses
      const apiConfig = this.config.categoryConfigs[CacheCategory.API_RESPONSES];
      if (apiConfig && apiConfig.defaultTtl) {
        apiConfig.defaultTtl = Math.min(apiConfig.defaultTtl * 1.2, apiConfig.maxTtl || this.config.maxTtl);
        console.log('Adapted API cache TTL due to slow responses:', apiConfig.defaultTtl);
      }
    }
    
    if (hasMemoryPressure) {
      // Reduce cache size limits
      this.config.maxSize = Math.max(this.config.maxSize * 0.8, 10 * 1024 * 1024); // Min 10MB
      this.config.maxEntries = Math.max(Math.floor(this.config.maxEntries * 0.8), 100); // Min 100 entries
      console.log('Adapted cache size due to memory pressure:', {
        maxSize: Math.round(this.config.maxSize / (1024 * 1024)) + 'MB',
        maxEntries: this.config.maxEntries
      });
      
      // Force cleanup
      this.evictEntries();
    }
  }

  /**
   * Store value in cache with intelligent policies
   */
  public async set<T>(
    category: CacheCategory, 
    key: string, 
    value: T, 
    customTtl?: number
  ): Promise<void> {
    const cacheKey = this.generateKey(category, key);
    const size = this.calculateSize(value);
    const ttl = customTtl || this.getAdaptiveTtl(category, key);
    
    // Check if value is too large for cache
    if (size > this.config.maxSize * 0.1) { // Don't cache items > 10% of max size
      console.warn(`Cache item too large, skipping: ${cacheKey} (${Math.round(size / 1024)}KB)`);
      return;
    }
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      key: cacheKey
    };
    
    // Remove existing entry if present
    if (this.cache.has(cacheKey)) {
      const oldEntry = this.cache.get(cacheKey)!;
      this.stats.totalSize -= oldEntry.size;
      this.stats.totalEntries--;
    }
    
    this.cache.set(cacheKey, entry);
    this.stats.totalSize += size;
    this.stats.totalEntries++;
    
    // Trigger eviction if needed
    if (this.cache.size > this.config.maxEntries || this.stats.totalSize > this.config.maxSize) {
      this.evictEntries();
    }
    
    console.log(`Cached: ${cacheKey} (TTL: ${Math.round(ttl / 1000)}s, Size: ${Math.round(size / 1024)}KB)`);
  }

  /**
   * Retrieve value from cache
   */
  public async get<T>(category: CacheCategory, key: string): Promise<T | null> {
    const cacheKey = this.generateKey(category, key);
    const entry = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.missCount++;
      console.log(`Cache miss: ${cacheKey}`);
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      this.stats.missCount++;
      this.stats.evictionCount++;
      this.stats.totalSize -= entry.size;
      this.stats.totalEntries--;
      console.log(`Cache expired: ${cacheKey}`);
      return null;
    }
    
    this.updateAccess(entry);
    this.stats.hitCount++;
    console.log(`Cache hit: ${cacheKey} (accessed ${entry.accessCount} times)`);
    
    return entry.value;
  }

  /**
   * Check if key exists in cache and is not expired
   */
  public async has(category: CacheCategory, key: string): Promise<boolean> {
    const cacheKey = this.generateKey(category, key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      this.stats.evictionCount++;
      this.stats.totalSize -= entry.size;
      this.stats.totalEntries--;
      return false;
    }
    
    return true;
  }

  /**
   * Remove specific cache entry
   */
  public async delete(category: CacheCategory, key: string): Promise<boolean> {
    const cacheKey = this.generateKey(category, key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    this.cache.delete(cacheKey);
    this.stats.totalSize -= entry.size;
    this.stats.totalEntries--;
    this.stats.evictionCount++;
    
    console.log(`Cache deleted: ${cacheKey}`);
    return true;
  }

  /**
   * Clear cache by category or entirely
   */
  public async clear(category?: CacheCategory): Promise<void> {
    if (category) {
      const prefix = `${category}:`;
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(prefix));
      
      for (const key of keysToDelete) {
        const entry = this.cache.get(key)!;
        this.cache.delete(key);
        this.stats.totalSize -= entry.size;
        this.stats.totalEntries--;
        this.stats.evictionCount++;
      }
      
      console.log(`Cleared cache category: ${category} (${keysToDelete.length} entries)`);
    } else {
      const entryCount = this.cache.size;
      this.cache.clear();
      this.stats = this.initializeStats();
      console.log(`Cleared entire cache (${entryCount} entries)`);
    }
  }

  /**
   * Get current cache statistics
   */
  public getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart adaptation if needed
    if (newConfig.enablePerformanceAdaptation !== undefined) {
      if (this.adaptationInterval) {
        clearInterval(this.adaptationInterval);
      }
      this.startPerformanceAdaptation();
    }
    
    console.log('Cache configuration updated:', newConfig);
  }

  /**
   * Get cache entries for debugging
   */
  public getEntries(category?: CacheCategory): Array<{ key: string; entry: CacheEntry }> {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
    
    if (category) {
      const prefix = `${category}:`;
      return entries.filter(({ key }) => key.startsWith(prefix));
    }
    
    return entries;
  }

  /**
   * Show cache dashboard in VS Code
   */
  public async showDashboard(): Promise<void> {
    const stats = this.getStats();
    
    const dashboardContent = [
      '=== CACHE MANAGER DASHBOARD ===',
      '',
      '📊 CACHE STATISTICS:',
      `  • Total Entries: ${stats.totalEntries}`,
      `  • Total Size: ${Math.round(stats.totalSize / 1024)}KB`,
      `  • Hit Rate: ${Math.round(stats.hitRate * 100)}%`,
      `  • Cache Hits: ${stats.hitCount}`,
      `  • Cache Misses: ${stats.missCount}`,
      `  • Evictions: ${stats.evictionCount}`,
      '',
      '⚙️ CONFIGURATION:',
      `  • Max Entries: ${this.config.maxEntries}`,
      `  • Max Size: ${Math.round(this.config.maxSize / (1024 * 1024))}MB`,
      `  • Default TTL: ${Math.round(this.config.defaultTtl / 1000)}s`,
      `  • Performance Adaptation: ${this.config.enablePerformanceAdaptation ? 'ON' : 'OFF'}`,
      '',
      '🗂️ CACHE CATEGORIES:',
    ];
    
    // Add category statistics
    for (const category of Object.values(CacheCategory)) {
      const categoryEntries = this.getEntries(category);
      const categorySize = categoryEntries.reduce((sum, { entry }) => sum + entry.size, 0);
      dashboardContent.push(`  • ${category}: ${categoryEntries.length} entries (${Math.round(categorySize / 1024)}KB)`);
    }
    
    dashboardContent.push('');
    dashboardContent.push(`Last Update: ${new Date().toLocaleString()}`);
    
    const message = dashboardContent.join('\n');
    await vscode.window.showInformationMessage('Cache Dashboard', {
      modal: true,
      detail: message
    });
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    if (this.adaptationInterval) {
      clearInterval(this.adaptationInterval);
      this.adaptationInterval = undefined;
    }
    
    this.cache.clear();
    console.log('CacheManagerService disposed');
  }
}