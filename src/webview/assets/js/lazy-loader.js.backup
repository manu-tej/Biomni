/**
 * Lazy Loading Utility for VSCode Extension Assets
 * Provides efficient loading of assets only when needed
 */

(function(global) {
    'use strict';
    
    // Asset cache
    const assetCache = new Map();
    const loadingPromises = new Map();
    
    /**
     * Lazy loading configuration
     */
    const config = {
        // Size threshold for lazy loading (in bytes)
        sizeThreshold: 10000,
        // CSS preload threshold
        cssPreloadThreshold: 5000,
        // Image lazy loading threshold
        imageIntersectionThreshold: 0.1,
        // Cache expiry time (5 minutes)
        cacheExpiry: 5 * 60 * 1000
    };
    
    /**
     * Asset metadata for optimization decisions
     */
    const assetMetadata = {
        'style.css': { size: 10317, priority: 'high', type: 'css' },
        'style.min.css': { size: 7941, priority: 'high', type: 'css' },
        'main.js': { size: 9450, priority: 'high', type: 'js' },
        'main.min.js': { size: 4755, priority: 'high', type: 'js' },
        'webview-client.js': { size: 46440, priority: 'medium', type: 'js' },
        'webview-client.min.js': { size: 25659, priority: 'medium', type: 'js' },
        'biomni-dark.svg': { size: 509, priority: 'low', type: 'image' },
        'biomni-light.svg': { size: 514, priority: 'low', type: 'image' }
    };
    
    /**
     * Intersection Observer for lazy loading images
     */
    let imageObserver = null;
    
    function initializeImageObserver() {
        if (!('IntersectionObserver' in global) || imageObserver) {
            return;
        }
        
        imageObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        loadImage(img);
                        imageObserver.unobserve(img);
                    }
                });
            },
            {
                threshold: config.imageIntersectionThreshold,
                rootMargin: '50px'
            }
        );
    }
    
    /**
     * Load image with lazy loading support
     */
    function loadImage(img) {
        const src = img.dataset.src || img.src;
        if (!src || img.classList.contains('loaded')) return;
        
        const cached = assetCache.get(src);
        if (cached && Date.now() - cached.timestamp < config.cacheExpiry) {
            img.src = cached.data;
            img.classList.add('loaded');
            return;
        }
        
        img.src = src;
        img.classList.add('loading');
        
        img.onload = () => {
            img.classList.remove('loading');
            img.classList.add('loaded');
            
            // Cache the successful load
            assetCache.set(src, {
                data: src,
                timestamp: Date.now()
            });
        };
        
        img.onerror = () => {
            img.classList.remove('loading');
            img.classList.add('error');
            console.warn('Failed to load image:', src);
        };
    }
    
    /**
     * Load CSS file lazily
     */
    function loadCSS(href, priority = 'medium') {
        return new Promise((resolve, reject) => {
            // Check cache first
            const cached = assetCache.get(href);
            if (cached && Date.now() - cached.timestamp < config.cacheExpiry) {
                resolve(cached.data);
                return;
            }
            
            // Check if already loading
            if (loadingPromises.has(href)) {
                return loadingPromises.get(href);
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            
            if (priority === 'high') {
                link.setAttribute('importance', 'high');
            }
            
            const promise = new Promise((res, rej) => {
                link.onload = () => {
                    // Cache successful load
                    assetCache.set(href, {
                        data: link,
                        timestamp: Date.now()
                    });
                    
                    loadingPromises.delete(href);
                    res(link);
                };
                
                link.onerror = () => {
                    loadingPromises.delete(href);
                    rej(new Error(`Failed to load CSS: ${href}`));
                };
            });
            
            loadingPromises.set(href, promise);
            
            // Add to document
            document.head.appendChild(link);
            
            promise.then(resolve, reject);
        });
    }
    
    /**
     * Load JavaScript file lazily
     */
    function loadJS(src, options = {}) {
        return new Promise((resolve, reject) => {
            const { async = true, defer = false, priority = 'medium' } = options;
            
            // Check cache first
            const cached = assetCache.get(src);
            if (cached && Date.now() - cached.timestamp < config.cacheExpiry) {
                resolve(cached.data);
                return;
            }
            
            // Check if already loading
            if (loadingPromises.has(src)) {
                return loadingPromises.get(src);
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = async;
            script.defer = defer;
            
            if (priority === 'high') {
                script.setAttribute('importance', 'high');
            }
            
            const promise = new Promise((res, rej) => {
                script.onload = () => {
                    // Cache successful load
                    assetCache.set(src, {
                        data: script,
                        timestamp: Date.now()
                    });
                    
                    loadingPromises.delete(src);
                    res(script);
                };
                
                script.onerror = () => {
                    loadingPromises.delete(src);
                    rej(new Error(`Failed to load JS: ${src}`));
                };
            });
            
            loadingPromises.set(src, promise);
            
            // Add to document
            document.head.appendChild(script);
            
            promise.then(resolve, reject);
        });
    }
    
    /**
     * Preload critical assets
     */
    function preloadCriticalAssets() {
        const criticalAssets = Object.entries(assetMetadata)
            .filter(([_, meta]) => meta.priority === 'high')
            .map(([name]) => name);
        
        criticalAssets.forEach(asset => {
            const link = document.createElement('link');
            link.rel = 'preload';
            
            const metadata = assetMetadata[asset];
            if (metadata.type === 'css') {
                link.as = 'style';
                link.href = `./${asset}`;
            } else if (metadata.type === 'js') {
                link.as = 'script';
                link.href = `./${asset}`;
            } else if (metadata.type === 'image') {
                link.as = 'image';
                link.href = `../../images/${asset}`;
            }
            
            document.head.appendChild(link);
        });
    }
    
    /**
     * Initialize lazy loading system
     */
    function initialize() {
        // Initialize image observer
        initializeImageObserver();
        
        // Preload critical assets
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', preloadCriticalAssets);
        } else {
            preloadCriticalAssets();
        }
        
        // Setup image lazy loading for existing images
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            if (imageObserver) {
                imageObserver.observe(img);
            } else {
                // Fallback for browsers without Intersection Observer
                loadImage(img);
            }
        });
        
        // Setup automatic cleanup
        setInterval(() => {
            const now = Date.now();
            for (const [key, cached] of assetCache.entries()) {
                if (now - cached.timestamp > config.cacheExpiry) {
                    assetCache.delete(key);
                }
            }
        }, config.cacheExpiry);
    }
    
    /**
     * Public API
     */
    const LazyLoader = {
        loadCSS,
        loadJS,
        loadImage,
        preloadCriticalAssets,
        initialize,
        
        // Configuration
        config,
        assetMetadata,
        
        // Cache management
        clearCache() {
            assetCache.clear();
            loadingPromises.clear();
        },
        
        getCacheSize() {
            return assetCache.size;
        },
        
        getCacheStats() {
            return {
                cached: assetCache.size,
                loading: loadingPromises.size,
                hitRate: assetCache.size / (assetCache.size + loadingPromises.size) || 0
            };
        }
    };
    
    // Export to global scope
    global.LazyLoader = LazyLoader;
    
    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Support for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LazyLoader;
    }
    
})(typeof window !== 'undefined' ? window : this);