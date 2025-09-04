# Biomni VSCode Extension - Performance Optimization Guide

## Overview

The Biomni VSCode Extension is designed to handle large biological datasets efficiently. This guide provides comprehensive strategies for optimizing performance, from basic configuration tweaks to advanced system-level optimizations.

## Quick Performance Wins

### Essential Settings for Better Performance

Apply these settings immediately for noticeable improvements:

```json
{
  // Enable caching for faster repeated operations
  "biomni.performance.cache.enabled": true,
  "biomni.performance.cache.size": 512,
  "biomni.performance.cache.ttl": 3600,
  
  // Optimize parallel processing
  "biomni.performance.processing.enableParallelProcessing": true,
  "biomni.performance.processing.maxConcurrentJobs": 4,
  
  // Manage memory usage
  "biomni.performance.memory.maxMemoryUsage": 1024,
  "biomni.performance.memory.enableGarbageCollection": true,
  
  // Reduce display overhead for large files
  "biomni.display.sequences.maxSequenceLength": 5000,
  "biomni.display.results.maxResultsPerPage": 50
}
```

### System Requirements by Use Case

| Use Case | RAM | CPU | Storage | Network |
|----------|-----|-----|---------|---------|
| **Basic** | 4GB | 2 cores | 1GB | 10 Mbps |
| **Standard** | 8GB | 4 cores | 5GB | 25 Mbps |
| **Heavy** | 16GB+ | 8+ cores | 20GB+ | 100+ Mbps |
| **Genomics** | 32GB+ | 16+ cores | 100GB+ | Gigabit |

## Memory Optimization

### Understanding Memory Usage

Biomni uses memory for several purposes:
- **File Caching**: Stores frequently accessed files
- **Result Caching**: Caches BLAST and analysis results
- **Processing Buffers**: Temporary storage during analysis
- **UI State**: Interface and visualization data

### Memory Configuration

#### Automatic Memory Management
```json
{
  // Let Biomni manage memory automatically
  "biomni.performance.memory.maxMemoryUsage": 0, // 0 = auto-detect
  "biomni.performance.memory.enableGarbageCollection": true,
  "biomni.performance.memory.gcThreshold": 512
}
```

#### Manual Memory Limits
```json
{
  // Set specific limits for controlled environments
  "biomni.performance.memory.maxMemoryUsage": 2048, // 2GB limit
  "biomni.performance.memory.gcThreshold": 1536,    // GC at 1.5GB
  "biomni.performance.cache.maxFiles": 500,
  "biomni.performance.cache.size": 256
}
```

### Large File Handling

#### Streaming for Large Files
```json
{
  // Enable streaming for files larger than threshold
  "biomni.performance.processing.enableStreamProcessing": true,
  "biomni.performance.processing.streamThreshold": 50, // MB
  "biomni.performance.processing.chunkSize": 1000     // sequences per chunk
}
```

#### Memory-Efficient Display
```json
{
  // Limit what's displayed to save memory
  "biomni.display.sequences.maxSequenceLength": 1000,
  "biomni.display.sequences.virtualScrolling": true,
  "biomni.display.results.lazyLoading": true,
  "biomni.display.results.maxResultsPerPage": 25
}
```

## CPU and Processing Optimization

### Parallel Processing Configuration

#### Optimal Core Usage
```bash
# Check your CPU core count
echo "CPU cores: $(nproc)"  # Linux
echo "CPU cores: $(sysctl -n hw.ncpu)"  # macOS
```

```json
{
  // Configure based on your system
  // Recommended: 50-75% of available cores
  "biomni.performance.processing.maxConcurrentJobs": 6,  // for 8-core system
  "biomni.performance.processing.enableParallelProcessing": true,
  "biomni.performance.processing.threadPoolSize": 4
}
```

#### Algorithm-Specific Optimization
```json
{
  // BLAST optimization
  "biomni.tools.blast.parallelSearches": true,
  "biomni.tools.blast.maxConcurrentQueries": 3,
  
  // Alignment optimization
  "biomni.tools.alignment.parallelAlignment": true,
  "biomni.tools.alignment.maxConcurrentAlignments": 2,
  
  // Annotation optimization
  "biomni.tools.annotation.batchSize": 1000,
  "biomni.tools.annotation.parallelAnnotation": true
}
```

### Processing Pipeline Optimization

#### Batch Processing
```json
{
  // Process multiple items together for efficiency
  "biomni.performance.processing.batchSize": 100,
  "biomni.performance.processing.batchTimeout": 5000,
  "biomni.performance.processing.enableBatching": true
}
```

#### Queue Management
```json
{
  // Manage processing queues
  "biomni.performance.processing.queueSize": 1000,
  "biomni.performance.processing.priorityProcessing": true,
  "biomni.performance.processing.timeoutDuration": 300
}
```

## Storage and I/O Optimization

### Cache Configuration

#### Intelligent Caching
```json
{
  // Smart caching based on usage patterns
  "biomni.performance.cache.enabled": true,
  "biomni.performance.cache.size": 1024,        // MB
  "biomni.performance.cache.maxFiles": 2000,
  "biomni.performance.cache.ttl": 7200,         // 2 hours
  "biomni.performance.cache.lruEnabled": true,  // Least Recently Used eviction
  "biomni.performance.cache.compressionEnabled": true
}
```

#### Cache Location Optimization
```json
{
  // Use SSD for cache if available
  "biomni.performance.cache.location": "/path/to/ssd/cache",
  "biomni.performance.cache.tempDirectory": "/tmp/biomni",
  "biomni.performance.cache.cleanupEnabled": true,
  "biomni.performance.cache.maxAge": 86400      // 24 hours
}
```

### File I/O Optimization

#### Asynchronous File Operations
```json
{
  // Enable async I/O for better responsiveness
  "biomni.performance.io.asyncFileOperations": true,
  "biomni.performance.io.maxConcurrentReads": 5,
  "biomni.performance.io.bufferSize": 8192,
  "biomni.performance.io.enableCompression": true
}
```

#### Network I/O Optimization
```json
{
  // Optimize network operations
  "biomni.performance.network.connectionPooling": true,
  "biomni.performance.network.maxConnections": 10,
  "biomni.performance.network.timeout": 30000,
  "biomni.performance.network.retryAttempts": 3,
  "biomni.performance.network.compressionEnabled": true
}
```

## Database and External Service Optimization

### BLAST Performance Tuning

#### Local BLAST Setup
```json
{
  // Configure for local BLAST installation
  "biomni.tools.blast.localBlastPath": "/usr/local/bin/blast",
  "biomni.tools.blast.localDatabasePath": "/path/to/blast/db",
  "biomni.tools.blast.useLocalFirst": true,
  "biomni.tools.blast.fallbackToRemote": true
}
```

#### BLAST Parameter Optimization
```json
{
  // Optimize BLAST parameters for speed vs accuracy
  "biomni.tools.blast.wordSize": 28,           // Larger = faster, less sensitive
  "biomni.tools.blast.maxTargetSequences": 100, // Fewer = faster
  "biomni.tools.blast.eValue": 0.01,           // Higher = faster, less stringent
  "biomni.tools.blast.numThreads": 4,          // Use multiple threads
  "biomni.tools.blast.enableFiltering": false  // Disable for speed
}
```

### External API Optimization

#### Connection Management
```json
{
  // Optimize external API calls
  "biomni.performance.api.connectionPooling": true,
  "biomni.performance.api.maxRetries": 2,
  "biomni.performance.api.backoffStrategy": "exponential",
  "biomni.performance.api.requestTimeout": 15000,
  "biomni.performance.api.batchRequests": true
}
```

#### Rate Limiting
```json
{
  // Respect API rate limits
  "biomni.performance.api.rateLimit": 100,     // requests per minute
  "biomni.performance.api.burstLimit": 10,     // burst requests
  "biomni.performance.api.queueRequests": true,
  "biomni.performance.api.prioritizeRequests": true
}
```

## UI and Display Optimization

### Rendering Performance

#### Virtual Scrolling for Large Results
```json
{
  // Enable virtual scrolling for large datasets
  "biomni.display.virtualScrolling.enabled": true,
  "biomni.display.virtualScrolling.itemHeight": 25,
  "biomni.display.virtualScrolling.bufferSize": 10,
  "biomni.display.virtualScrolling.renderAhead": 5
}
```

#### Lazy Loading
```json
{
  // Load content on demand
  "biomni.display.results.lazyLoading": true,
  "biomni.display.results.loadingStrategy": "progressive",
  "biomni.display.results.preloadCount": 20,
  "biomni.display.results.unloadThreshold": 100
}
```

### Visualization Optimization

#### Chart and Graph Performance
```json
{
  // Optimize visualizations
  "biomni.display.charts.maxDataPoints": 1000,
  "biomni.display.charts.enableWebGL": true,
  "biomni.display.charts.levelOfDetail": true,
  "biomni.display.charts.simplifyPaths": true
}
```

#### Sequence Display Optimization
```json
{
  // Optimize sequence visualization
  "biomni.display.sequences.renderingMode": "canvas", // vs "dom"
  "biomni.display.sequences.maxVisibleLength": 2000,
  "biomni.display.sequences.enableSyntaxHighlighting": false, // for large files
  "biomni.display.sequences.bufferLines": 100
}
```

## Network Optimization

### Bandwidth Management

#### Connection Optimization
```json
{
  // Optimize network usage
  "biomni.performance.network.compressionLevel": 6,
  "biomni.performance.network.enableGzip": true,
  "biomni.performance.network.keepAliveTimeout": 30000,
  "biomni.performance.network.pipelining": true
}
```

#### Proxy Configuration
```json
{
  // Configure proxy for better performance
  "biomni.performance.network.proxyEnabled": false,
  "biomni.performance.network.proxyUrl": "http://proxy:8080",
  "biomni.performance.network.bypassProxy": ["localhost", "127.0.0.1"]
}
```

### CDN and Caching
```json
{
  // Use CDN for static resources
  "biomni.performance.network.cdnEnabled": true,
  "biomni.performance.network.cdnUrl": "https://cdn.biomni.org",
  "biomni.performance.network.cacheHeaders": true,
  "biomni.performance.network.etag": true
}
```

## Platform-Specific Optimizations

### Windows Optimization

#### Windows-Specific Settings
```json
{
  // Windows performance tweaks
  "biomni.performance.windows.useNativeFilewatcher": true,
  "biomni.performance.windows.enableHardwareAcceleration": true,
  "biomni.performance.windows.powerPlan": "high-performance"
}
```

#### Registry Optimizations (Advanced)
```registry
# Increase file handles (requires admin)
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\kernel]
"IoPageLockLimit"=dword:10000000
```

### macOS Optimization

#### macOS-Specific Settings
```json
{
  // macOS performance tweaks
  "biomni.performance.macos.useMetalAcceleration": true,
  "biomni.performance.macos.enableGrandCentralDispatch": true,
  "biomni.performance.macos.useQuartzFilters": false
}
```

#### System Preferences
```bash
# Increase file descriptor limits
echo "ulimit -n 65536" >> ~/.bash_profile

# Optimize memory management
sudo sysctl -w vm.max_map_count=262144
```

### Linux Optimization

#### Linux-Specific Settings
```json
{
  // Linux performance tweaks
  "biomni.performance.linux.useIoUring": true,
  "biomni.performance.linux.enableCgroups": true,
  "biomni.performance.linux.useHugepages": true
}
```

#### System Optimizations
```bash
# Increase file limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize virtual memory
echo "vm.swappiness=10" >> /etc/sysctl.conf
echo "vm.max_map_count=262144" >> /etc/sysctl.conf
```

## Monitoring and Diagnostics

### Performance Monitoring

#### Built-in Monitoring
```json
{
  // Enable performance monitoring
  "biomni.performance.monitoring.enabled": true,
  "biomni.performance.monitoring.collectMetrics": true,
  "biomni.performance.monitoring.reportInterval": 60000,
  "biomni.performance.monitoring.enableProfiling": false
}
```

#### Resource Usage Tracking
Access via Command Palette: `Biomni: Show Performance Metrics`

```typescript
// Example metrics output
{
  "memory": {
    "used": "512MB",
    "available": "1024MB",
    "cacheSize": "128MB"
  },
  "cpu": {
    "usage": "45%",
    "activeJobs": 3
  },
  "cache": {
    "hitRate": "85%",
    "entries": 456
  },
  "network": {
    "requests": 234,
    "totalBytes": "45MB",
    "avgResponseTime": "150ms"
  }
}
```

### Diagnostic Commands

#### Performance Analysis Commands
```bash
# Via Command Palette (Ctrl+Shift+P):

# Show current resource usage
Biomni: Show Performance Metrics

# Analyze cache efficiency
Biomni: Cache Analysis

# Network performance test
Biomni: Network Diagnostic

# Memory usage breakdown
Biomni: Memory Analysis

# Export performance report
Biomni: Export Performance Report
```

#### Log Analysis
```json
{
  // Configure logging for performance analysis
  "biomni.performance.logging.level": "info",
  "biomni.performance.logging.enableTiming": true,
  "biomni.performance.logging.logSlowOperations": true,
  "biomni.performance.logging.slowOperationThreshold": 5000
}
```

## Benchmarking and Testing

### Performance Benchmarks

#### Standard Benchmark Suite
```bash
# Run performance benchmarks
npm run benchmark

# Specific benchmark categories
npm run benchmark:memory
npm run benchmark:cpu
npm run benchmark:network
npm run benchmark:cache
```

#### Custom Benchmarking
```typescript
// Example benchmark script
import { performanceBenchmark } from './test/benchmark';

async function runCustomBenchmark() {
  const results = await performanceBenchmark({
    fileSize: '100MB',
    operation: 'blast-search',
    iterations: 10
  });
  
  console.log('Benchmark Results:', results);
}
```

### Load Testing

#### Stress Testing Configuration
```json
{
  // Configure for stress testing
  "biomni.performance.stressTesting.enabled": false,
  "biomni.performance.stressTesting.maxConcurrentOperations": 50,
  "biomni.performance.stressTesting.testDuration": 300000,
  "biomni.performance.stressTesting.rampUpTime": 30000
}
```

## Troubleshooting Performance Issues

### Common Performance Problems

#### Slow File Loading
**Symptoms**: Files take a long time to open
**Solutions**:
1. Enable file caching:
   ```json
   {
     "biomni.extension.fileDetection.cacheEnabled": true,
     "biomni.performance.cache.enabled": true
   }
   ```
2. Increase cache size:
   ```json
   {
     "biomni.performance.cache.size": 512
   }
   ```
3. Use SSD storage for cache directory

#### High Memory Usage
**Symptoms**: VS Code uses excessive RAM
**Solutions**:
1. Limit memory usage:
   ```json
   {
     "biomni.performance.memory.maxMemoryUsage": 1024,
     "biomni.performance.memory.enableGarbageCollection": true
   }
   ```
2. Reduce cache size:
   ```json
   {
     "biomni.performance.cache.size": 256,
     "biomni.performance.cache.maxFiles": 500
   }
   ```
3. Close unused files and results

#### Slow BLAST Searches
**Symptoms**: BLAST searches take too long
**Solutions**:
1. Use local BLAST installation
2. Optimize BLAST parameters:
   ```json
   {
     "biomni.tools.blast.wordSize": 28,
     "biomni.tools.blast.maxTargetSequences": 100
   }
   ```
3. Enable parallel processing
4. Use faster database (e.g., RefSeq instead of nr)

#### UI Responsiveness Issues
**Symptoms**: Interface becomes slow or unresponsive
**Solutions**:
1. Enable virtual scrolling:
   ```json
   {
     "biomni.display.virtualScrolling.enabled": true
   }
   ```
2. Reduce display limits:
   ```json
   {
     "biomni.display.sequences.maxSequenceLength": 1000,
     "biomni.display.results.maxResultsPerPage": 25
   }
   ```
3. Disable unnecessary visualizations

### Diagnostic Workflow

#### Step 1: Identify the Problem
```bash
# Check resource usage
Biomni: Show Performance Metrics

# Enable performance logging
"biomni.performance.logging.enableTiming": true

# Monitor VS Code performance
Help > Toggle Developer Tools > Performance tab
```

#### Step 2: Isolate the Cause
```bash
# Test with minimal configuration
Biomni: Reset Performance Settings

# Disable features one by one
# Test with small files first
# Check network connectivity
```

#### Step 3: Apply Optimizations
```bash
# Apply relevant optimizations from this guide
# Test changes incrementally
# Monitor improvements
```

#### Step 4: Validate Improvements
```bash
# Re-run benchmarks
# Monitor resource usage over time
# Test with real-world workloads
```

## Best Practices Summary

### Configuration Best Practices
1. **Start with defaults**: Don't over-optimize initially
2. **Monitor first**: Use metrics to identify bottlenecks
3. **Optimize incrementally**: Make one change at a time
4. **Test thoroughly**: Validate improvements with real workloads
5. **Document changes**: Keep track of what works

### Hardware Recommendations
1. **SSD storage**: Critical for good I/O performance
2. **Sufficient RAM**: 8GB minimum, 16GB+ for large datasets
3. **Multi-core CPU**: Parallel processing capabilities important
4. **Fast network**: For external database access

### Workflow Optimization
1. **Use appropriate file sizes**: Don't load 1GB files unnecessarily
2. **Cache frequently used data**: Enable intelligent caching
3. **Batch operations**: Process multiple items together
4. **Close unused resources**: Free up memory and CPU

---

## Performance Profile Templates

### Research Laboratory Profile
```json
{
  // Optimized for research with large datasets
  "biomni.performance.memory.maxMemoryUsage": 4096,
  "biomni.performance.processing.maxConcurrentJobs": 8,
  "biomni.performance.cache.size": 1024,
  "biomni.tools.blast.useLocalFirst": true,
  "biomni.display.sequences.maxSequenceLength": 10000
}
```

### Educational Environment Profile
```json
{
  // Optimized for classroom use with limited resources
  "biomni.performance.memory.maxMemoryUsage": 512,
  "biomni.performance.processing.maxConcurrentJobs": 2,
  "biomni.performance.cache.size": 128,
  "biomni.display.sequences.maxSequenceLength": 1000,
  "biomni.tools.blast.maxTargetSequences": 50
}
```

### High-Performance Computing Profile
```json
{
  // Optimized for HPC environments
  "biomni.performance.memory.maxMemoryUsage": 0, // Auto-detect
  "biomni.performance.processing.maxConcurrentJobs": 16,
  "biomni.performance.cache.size": 2048,
  "biomni.performance.processing.enableParallelProcessing": true,
  "biomni.tools.blast.numThreads": 8,
  "biomni.performance.network.maxConnections": 20
}
```

---

This performance guide provides comprehensive strategies for optimizing the Biomni VSCode Extension across various use cases and system configurations. Regular monitoring and incremental optimization will help you achieve the best performance for your specific workflows.

For additional support with performance issues, please refer to our [Troubleshooting Guide](../user-guide/troubleshooting.md) or create an issue in our [GitHub repository](https://github.com/manu-tej/epic-vscode-extension/issues).