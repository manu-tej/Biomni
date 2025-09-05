// Main JavaScript for Biomni Panel Webview
// Handles tab navigation, command execution, and VSCode integration

(function() {
    'use strict';
    
    // Get reference to VSCode API
    const vscode = acquireVsCodeApi();
    
    // State management
    let currentTab = 'home';
    
    // Initialize the webview when DOM is loaded
    document.addEventListener('DOMContentLoaded', initializeWebview);
    
    /**
     * Initialize webview functionality
     */
    function initializeWebview() {
        setupTabNavigation();
        setupCommandButtons();
        setupKeyboardNavigation();
        
        // Restore state if available
        const state = vscode.getState();
        if (state && state.currentTab) {
            switchToTab(state.currentTab);
        }
        
        console.log('Biomni Panel webview initialized');
    }
    
    /**
     * Setup tab navigation functionality
     */
    function setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', handleTabClick);
        });
    }
    
    /**
     * Handle tab button clicks
     */
    function handleTabClick(event) {
        const tabId = event.currentTarget.id.replace('-tab', '');
        switchToTab(tabId);
        
        // Notify the extension about navigation
        vscode.postMessage({
            type: 'navigate',
            tab: tabId
        });
    }
    
    /**
     * Switch to a specific tab
     */
    function switchToTab(tabId) {
        // Hide all tab panels
        const tabPanels = document.querySelectorAll('.tab-panel');
        tabPanels.forEach(panel => {
            panel.classList.remove('active');
            panel.setAttribute('aria-hidden', 'true');
        });
        
        // Deactivate all tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
            button.setAttribute('aria-selected', 'false');
            button.setAttribute('tabindex', '-1');
        });
        
        // Show selected tab panel
        const targetPanel = document.getElementById(`${tabId}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
            targetPanel.setAttribute('aria-hidden', 'false');
        }
        
        // Activate selected tab button
        const targetButton = document.getElementById(`${tabId}-tab`);
        if (targetButton) {
            targetButton.classList.add('active');
            targetButton.setAttribute('aria-selected', 'true');
            targetButton.setAttribute('tabindex', '0');
            targetButton.focus();
        }
        
        // Update current tab and save state
        currentTab = tabId;
        vscode.setState({ currentTab: tabId });
        
        console.log(`Switched to tab: ${tabId}`);
    }
    
    /**
     * Setup command button functionality
     */
    function setupCommandButtons() {
        const commandButtons = document.querySelectorAll('[data-command]');
        
        commandButtons.forEach(button => {
            button.addEventListener('click', handleCommandClick);
        });
    }
    
    /**
     * Handle command button clicks
     */
    function handleCommandClick(event) {
        event.preventDefault();
        
        const command = event.currentTarget.getAttribute('data-command');
        if (!command) {
            console.warn('No command specified for button');
            return;
        }
        
        // Show loading state
        const originalText = event.currentTarget.textContent;
        event.currentTarget.textContent = 'Executing...';
        event.currentTarget.disabled = true;
        
        // Execute command via VSCode extension
        vscode.postMessage({
            type: 'executeCommand',
            command: command
        });
        
        // Reset button state after delay
        setTimeout(() => {
            event.currentTarget.textContent = originalText;
            event.currentTarget.disabled = false;
        }, 1000);
        
        console.log(`Executing command: ${command}`);
    }
    
    /**
     * Setup keyboard navigation for accessibility
     */
    function setupKeyboardNavigation() {
        document.addEventListener('keydown', handleKeyDown);
    }
    
    /**
     * Handle keyboard navigation
     */
    function handleKeyDown(event) {
        // Tab navigation with arrow keys
        if (event.target.classList.contains('tab-button')) {
            const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
            const currentIndex = tabButtons.indexOf(event.target);
            
            switch (event.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    event.preventDefault();
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabButtons.length - 1;
                    tabButtons[prevIndex].click();
                    break;
                    
                case 'ArrowRight':
                case 'ArrowDown':
                    event.preventDefault();
                    const nextIndex = currentIndex < tabButtons.length - 1 ? currentIndex + 1 : 0;
                    tabButtons[nextIndex].click();
                    break;
                    
                case 'Home':
                    event.preventDefault();
                    tabButtons[0].click();
                    break;
                    
                case 'End':
                    event.preventDefault();
                    tabButtons[tabButtons.length - 1].click();
                    break;
                    
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    event.target.click();
                    break;
            }
        }
        
        // Command shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case '1':
                    event.preventDefault();
                    switchToTab('home');
                    break;
                case '2':
                    event.preventDefault();
                    switchToTab('database');
                    break;
                case '3':
                    event.preventDefault();
                    switchToTab('analysis');
                    break;
                case '4':
                    event.preventDefault();
                    switchToTab('settings');
                    break;
            }
        }
    }
    
    /**
     * Handle messages from the extension
     */
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'switchTab':
                switchToTab(message.tab);
                break;
                
            case 'showNotification':
                showNotification(message.text, message.level || 'info');
                break;
                
            case 'updateStats':
                updateStatistics(message.stats);
                break;
                
            default:
                console.log('Received unknown message:', message);
        }
    });
    
    /**
     * Show notification to user
     */
    function showNotification(text, level = 'info') {
        vscode.postMessage({
            type: level === 'error' ? 'showError' : 'showInfo',
            text: text
        });
    }
    
    /**
     * Update statistics display
     */
    function updateStatistics(stats) {
        if (!stats) return;
        
        const statElements = {
            commands: document.querySelector('.stat-card:nth-child(1) .stat-number'),
            databases: document.querySelector('.stat-card:nth-child(2) .stat-number'),
            tools: document.querySelector('.stat-card:nth-child(3) .stat-number')
        };
        
        if (stats.commands && statElements.commands) {
            statElements.commands.textContent = stats.commands;
        }
        
        if (stats.databases && statElements.databases) {
            statElements.databases.textContent = stats.databases;
        }
        
        if (stats.tools && statElements.tools) {
            statElements.tools.textContent = stats.tools;
        }
    }
    
    /**
     * Utility function to debounce function calls
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Handle window resize for responsive behavior
     */
    const handleResize = debounce(() => {
        // Update any responsive calculations if needed
        console.log('Window resized');
    }, 250);
    
    window.addEventListener('resize', handleResize);
    
    /**
     * Export functions for debugging (development only)
     */
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        window.biomniPanel = {
            switchToTab,
            currentTab: () => currentTab,
            showNotification
        };
    }
    
})();