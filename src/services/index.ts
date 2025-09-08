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