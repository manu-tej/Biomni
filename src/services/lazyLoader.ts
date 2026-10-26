import * as vscode from 'vscode';
import { PerformanceMonitorService } from './performanceMonitor';
import { CacheManagerService, CacheCategory } from './cacheManager';

/**
 * Lazy loading configuration
 */
export interface LazyLoadConfig {
  // Performance thresholds
  maxInitialLoadTime: number; // milliseconds
  memoryThreshold: number; // bytes

  // Loading behavior
  preloadCritical: boolean;
  backgroundLoading: boolean;
  progressFeedback: boolean;

  // Chunking for large content
  chunkSize: number; // items per chunk
  maxConcurrentChunks: number;

  // Timeouts
  loadTimeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

/**
 * Lazy loadable resource interface
 */
export interface LazyResource<T = any> {
  id: string;
  category: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  loadFn: () => Promise<T>;
  size?: number;
  dependencies?: string[];
  cached?: boolean;
}

/**
 * Loading state interface
 */
export interface LoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  isFailed: boolean;
  progress?: number;
  error?: string;
  startTime?: number;
  loadTime?: number;
}

/**
 * Lazy loading statistics
 */
export interface LazyLoadStats {
  totalResources: number;
  loadedResources: number;
  failedResources: number;
  totalLoadTime: number;
  averageLoadTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  backgroundLoads: number;
}

/**
 * Lazy loading service for heavy operations and large content
 */
export class LazyLoaderService {
  private static instance: LazyLoaderService | undefined;
  private resources = new Map<string, LazyResource>();
  private loadingStates = new Map<string, LoadingState>();
  private loadedData = new Map<string, any>();
  private performanceMonitor: PerformanceMonitorService;
  private cacheManager: CacheManagerService;
  private stats: LazyLoadStats;
  private config: LazyLoadConfig;
  private loadingQueue: string[] = [];
  private activeLoads = new Set<string>();

  private readonly DEFAULT_CONFIG: LazyLoadConfig = {
    maxInitialLoadTime: 2000, // 2 seconds max initial load
    memoryThreshold: 100 * 1024 * 1024, // 100MB
    preloadCritical: true,
    backgroundLoading: true,
    progressFeedback: true,
    chunkSize: 50, // 50 items per chunk
    maxConcurrentChunks: 3,
    loadTimeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  };

  private constructor(config?: Partial<LazyLoadConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.performanceMonitor = PerformanceMonitorService.getInstance();
    this.cacheManager = CacheManagerService.getInstance();
    this.stats = this.initializeStats();

    console.log('LazyLoaderService initialized with config:', {
      maxInitialLoadTime: this.config.maxInitialLoadTime + 'ms',
      chunkSize: this.config.chunkSize,
      backgroundLoading: this.config.backgroundLoading,
      preloadCritical: this.config.preloadCritical,
    });
  }

  public static getInstance(config?: Partial<LazyLoadConfig>): LazyLoaderService {
    if (!LazyLoaderService.instance) {
      LazyLoaderService.instance = new LazyLoaderService(config);
    }
    return LazyLoaderService.instance;
  }

  /**
   * Initialize loading statistics
   */
  private initializeStats(): LazyLoadStats {
    return {
      totalResources: 0,
      loadedResources: 0,
      failedResources: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      backgroundLoads: 0,
    };
  }

  /**
   * Register a lazy loadable resource
   */
  public registerResource<T>(resource: LazyResource<T>): void {
    this.resources.set(resource.id, resource);
    this.loadingStates.set(resource.id, {
      isLoading: false,
      isLoaded: false,
      isFailed: false,
    });

    this.stats.totalResources++;

    console.log(`Registered lazy resource: ${resource.id} (${resource.priority} priority)`);

    // Preload critical resources immediately
    if (this.config.preloadCritical && resource.priority === 'critical') {
      void this.loadResource(resource.id);
    }
  }

  /**
   * Unregister a lazy loadable resource
   */
  public unregisterResource(resourceId: string): void {
    if (this.resources.has(resourceId)) {
      this.resources.delete(resourceId);
      this.loadingStates.delete(resourceId);
      this.loadedData.delete(resourceId);
      this.stats.totalResources--;

      console.log(`Unregistered lazy resource: ${resourceId}`);
    }
  }

  /**
   * Load a resource with caching and performance monitoring
   */
  public async loadResource<T>(resourceId: string): Promise<T | null> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      console.warn(`Resource not found: ${resourceId}`);
      return null;
    }

    const state = this.loadingStates.get(resourceId)!;

    // Return cached data if already loaded
    if (state.isLoaded && this.loadedData.has(resourceId)) {
      console.log(`Using already loaded resource: ${resourceId}`);
      return this.loadedData.get(resourceId);
    }

    // Return null if currently loading (avoid duplicate loads)
    if (state.isLoading) {
      console.log(`Resource already loading: ${resourceId}`);
      return null;
    }

    // Check cache first
    if (resource.cached !== false) {
      const cached = await this.cacheManager.get<T>(CacheCategory.ANALYSIS_RESULTS, resourceId);
      if (cached) {
        this.loadedData.set(resourceId, cached);
        state.isLoaded = true;
        console.log(`Loaded resource from cache: ${resourceId}`);
        return cached;
      }
    }

    return await this.performanceMonitor.measureCommandExecution(`lazyLoad:${resourceId}`, () =>
      this.executeResourceLoad<T>(resourceId)
    );
  }

  /**
   * Execute the actual resource loading
   */
  private async executeResourceLoad<T>(resourceId: string): Promise<T | null> {
    const resource = this.resources.get(resourceId)!;
    const state = this.loadingStates.get(resourceId)!;

    // Update loading state
    state.isLoading = true;
    state.isFailed = false;
    state.startTime = Date.now();
    this.activeLoads.add(resourceId);

    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < this.config.retryAttempts) {
      try {
        console.log(`Loading resource: ${resourceId} (attempt ${attempt + 1})`);

        // Load with timeout
        const loadPromise = resource.loadFn();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Load timeout')), this.config.loadTimeout);
        });

        const data = await Promise.race([loadPromise, timeoutPromise]);

        // Update state and cache
        const loadTime = Date.now() - state.startTime!;
        state.isLoading = false;
        state.isLoaded = true;
        state.loadTime = loadTime;

        this.loadedData.set(resourceId, data);
        this.activeLoads.delete(resourceId);
        this.stats.loadedResources++;
        this.stats.totalLoadTime += loadTime;
        this.stats.averageLoadTime = this.stats.totalLoadTime / this.stats.loadedResources;

        // Cache the result if caching is enabled
        if (resource.cached !== false) {
          await this.cacheManager.set(CacheCategory.ANALYSIS_RESULTS, resourceId, data);
        }

        console.log(`Successfully loaded resource: ${resourceId} (${loadTime}ms)`);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt < this.config.retryAttempts) {
          console.log(
            `Failed to load resource: ${resourceId}, retrying in ${this.config.retryDelay}ms`
          );
          await this.delay(this.config.retryDelay);
        }
      }
    }

    // All attempts failed
    state.isLoading = false;
    state.isFailed = true;
    state.error = lastError?.message || 'Unknown error';
    this.activeLoads.delete(resourceId);
    this.stats.failedResources++;

    console.error(
      `Failed to load resource after ${this.config.retryAttempts} attempts: ${resourceId}`,
      lastError
    );
    return null;
  }

  /**
   * Load multiple resources in chunks with progress feedback
   */
  public async loadResourcesInChunks<T>(
    resourceIds: string[],
    progressCallback?: (loaded: number, total: number) => void
  ): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const chunks = this.chunkArray(resourceIds, this.config.chunkSize);
    let loaded = 0;

    console.log(`Loading ${resourceIds.length} resources in ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i += this.config.maxConcurrentChunks) {
      const concurrentChunks = chunks.slice(i, i + this.config.maxConcurrentChunks);

      await Promise.all(
        concurrentChunks.map(async chunk => {
          for (const resourceId of chunk) {
            try {
              const data = await this.loadResource<T>(resourceId);
              results.set(resourceId, data);
              loaded++;

              if (progressCallback) {
                progressCallback(loaded, resourceIds.length);
              }

              // Progress feedback for UI
              if (this.config.progressFeedback && loaded % 10 === 0) {
                void vscode.window.setStatusBarMessage(
                  `Loading resources: ${loaded}/${resourceIds.length}`,
                  2000
                );
              }
            } catch (error) {
              console.error(`Failed to load resource in chunk: ${resourceId}`, error);
              results.set(resourceId, null);
              loaded++;

              if (progressCallback) {
                progressCallback(loaded, resourceIds.length);
              }
            }
          }
        })
      );
    }

    console.log(`Completed chunked loading: ${loaded}/${resourceIds.length} resources`);
    return results;
  }

  /**
   * Preload resources in background based on priority
   */
  public async preloadResources(maxLoadTime?: number): Promise<void> {
    if (!this.config.backgroundLoading) {
      return;
    }

    const loadTime = maxLoadTime || this.config.maxInitialLoadTime;
    const startTime = Date.now();

    // Get resources sorted by priority
    const resourcesByPriority = Array.from(this.resources.entries())
      .filter(([_, resource]) => {
        const state = this.loadingStates.get(resource.id)!;
        return !state.isLoaded && !state.isLoading;
      })
      .sort(([_, a], [__, b]) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    console.log(
      `Starting background preload of ${resourcesByPriority.length} resources (max ${loadTime}ms)`
    );

    for (const [resourceId, resource] of resourcesByPriority) {
      // Check if we've exceeded the time limit
      if (Date.now() - startTime > loadTime) {
        console.log(`Preload time limit reached (${loadTime}ms)`);
        break;
      }

      // Check memory usage
      const memoryUsage = this.performanceMonitor.getMetrics().memoryUsage;
      if (memoryUsage > this.config.memoryThreshold) {
        console.log(
          `Preload stopped due to memory threshold (${Math.round(memoryUsage / (1024 * 1024))}MB)`
        );
        break;
      }

      // Load critical and high priority resources immediately
      if (resource.priority === 'critical' || resource.priority === 'high') {
        await this.loadResource(resourceId);
        this.stats.backgroundLoads++;
      } else {
        // Queue normal and low priority for background loading
        this.queueBackgroundLoad(resourceId);
      }
    }

    console.log(`Preload completed in ${Date.now() - startTime}ms`);
  }

  /**
   * Queue resource for background loading
   */
  private queueBackgroundLoad(resourceId: string): void {
    if (!this.loadingQueue.includes(resourceId)) {
      this.loadingQueue.push(resourceId);
    }
  }

  /**
   * Process background loading queue
   */
  public async processBackgroundQueue(): Promise<void> {
    if (this.loadingQueue.length === 0) {
      return;
    }

    console.log(`Processing background queue: ${this.loadingQueue.length} resources`);

    // Process queue with memory and concurrency limits
    while (
      this.loadingQueue.length > 0 &&
      this.activeLoads.size < this.config.maxConcurrentChunks
    ) {
      const resourceId = this.loadingQueue.shift()!;

      // Check memory before loading
      const memoryUsage = this.performanceMonitor.getMetrics().memoryUsage;
      if (memoryUsage > this.config.memoryThreshold) {
        console.log('Background loading paused due to memory threshold');
        this.loadingQueue.unshift(resourceId); // Put back in queue
        break;
      }

      // Load in background without awaiting
      this.loadResource(resourceId)
        .then(() => {
          this.stats.backgroundLoads++;
        })
        .catch(error => {
          console.error(`Background load failed: ${resourceId}`, error);
        });
    }
  }

  /**
   * Get loading state for a resource
   */
  public getLoadingState(resourceId: string): LoadingState | null {
    return this.loadingStates.get(resourceId) || null;
  }

  /**
   * Check if resource is loaded
   */
  public isLoaded(resourceId: string): boolean {
    const state = this.loadingStates.get(resourceId);
    return state?.isLoaded || false;
  }

  /**
   * Get all loaded data
   */
  public getLoadedData<T>(resourceId: string): T | null {
    return this.loadedData.get(resourceId) || null;
  }

  /**
   * Clear loaded data and reset states
   */
  public clearLoaded(resourceIds?: string[]): void {
    if (resourceIds) {
      for (const resourceId of resourceIds) {
        this.loadedData.delete(resourceId);
        const state = this.loadingStates.get(resourceId);
        if (state) {
          state.isLoaded = false;
          state.isFailed = false;
          delete state.error;
        }
      }
      console.log(`Cleared ${resourceIds.length} loaded resources`);
    } else {
      this.loadedData.clear();
      for (const state of this.loadingStates.values()) {
        state.isLoaded = false;
        state.isFailed = false;
        delete state.error;
      }
      console.log('Cleared all loaded resources');
    }
  }

  /**
   * Get lazy loading statistics
   */
  public getStats(): LazyLoadStats {
    // Update cache hit rate from cache manager
    const cacheStats = this.cacheManager.getStats();
    this.stats.cacheHitRate = cacheStats.hitRate;
    this.stats.memoryUsage = cacheStats.memoryUsage;

    return { ...this.stats };
  }

  /**
   * Show lazy loading dashboard
   */
  public async showDashboard(): Promise<void> {
    const stats = this.getStats();

    const dashboardContent = [
      '=== LAZY LOADING DASHBOARD ===',
      '',
      '📊 LOADING STATISTICS:',
      `  • Total Resources: ${stats.totalResources}`,
      `  • Loaded Resources: ${stats.loadedResources}`,
      `  • Failed Resources: ${stats.failedResources}`,
      `  • Success Rate: ${Math.round((stats.loadedResources / Math.max(1, stats.totalResources)) * 100)}%`,
      `  • Average Load Time: ${Math.round(stats.averageLoadTime)}ms`,
      `  • Cache Hit Rate: ${Math.round(stats.cacheHitRate * 100)}%`,
      `  • Background Loads: ${stats.backgroundLoads}`,
      '',
      '⚡ CURRENT STATUS:',
      `  • Active Loads: ${this.activeLoads.size}`,
      `  • Queued Resources: ${this.loadingQueue.length}`,
      `  • Memory Usage: ${Math.round(stats.memoryUsage / (1024 * 1024))}MB`,
      '',
      '⚙️ CONFIGURATION:',
      `  • Max Initial Load: ${this.config.maxInitialLoadTime}ms`,
      `  • Chunk Size: ${this.config.chunkSize}`,
      `  • Max Concurrent: ${this.config.maxConcurrentChunks}`,
      `  • Background Loading: ${this.config.backgroundLoading ? 'ON' : 'OFF'}`,
      `  • Preload Critical: ${this.config.preloadCritical ? 'ON' : 'OFF'}`,
      '',
    ];

    // Add resource status by priority
    const resourcesByPriority: Record<string, number> = { critical: 0, high: 0, normal: 0, low: 0 };
    for (const resource of this.resources.values()) {
      if (resource && resource.priority) {
        const count = resourcesByPriority[resource.priority];
        if (count !== undefined) {
          resourcesByPriority[resource.priority] = count + 1;
        }
      }
    }

    dashboardContent.push('🎯 RESOURCES BY PRIORITY:');
    for (const [priority, count] of Object.entries(resourcesByPriority)) {
      if (count > 0) {
        dashboardContent.push(
          `  • ${priority.charAt(0).toUpperCase() + priority.slice(1)}: ${count}`
        );
      }
    }

    dashboardContent.push('');
    dashboardContent.push(`Last Update: ${new Date().toLocaleString()}`);

    const message = dashboardContent.join('\n');
    await vscode.window.showInformationMessage('Lazy Loading Dashboard', {
      modal: true,
      detail: message,
    });
  }

  /**
   * Utility: Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<LazyLoadConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('LazyLoader configuration updated:', newConfig);
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clear all loading states
    this.loadingQueue = [];
    this.activeLoads.clear();
    this.loadedData.clear();
    this.loadingStates.clear();
    this.resources.clear();

    console.log('LazyLoaderService disposed');
  }
}
