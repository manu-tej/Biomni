// Services index - Export all service classes and their types

// Performance Monitoring Service
export { 
  PerformanceMonitorService,
  type PerformanceMetrics,
  type CommandPerformanceEntry,
  type ApiPerformanceEntry,
  type PerformanceReport,
  type PerformanceThresholds
} from './performanceMonitor';

// Cache Manager Service
export { 
  CacheManagerService,
  CacheCategory,
  type CacheEntry,
  type CacheStats,
  type CacheConfig
} from './cacheManager';

// Lazy Loader Service
export { 
  LazyLoaderService,
  type LazyResource,
  type LoadingState,
  type LazyLoadStats,
  type LazyLoadConfig
} from './lazyLoader';

// Genomics Tools Service  
export { 
  GenomicsToolsService,
  type BlastParams,
  type BlastResult,
  type AnnotationOptions,
  type AnnotationResult,
  type SequenceAnalysis
} from './genomicsTools';

// Command Palette Service
export { CommandPaletteService } from './commandPalette';

// Results Manager Service
export { ResultsManager } from './resultsManager';

// Workflow Engine Service
export { WorkflowEngine } from './workflowEngine';