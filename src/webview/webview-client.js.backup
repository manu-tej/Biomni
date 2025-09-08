/**
 * Enhanced webview client with secure message passing
 * Uses the typed message system for reliable communication
 */

(function() {
    'use strict';
    
    // Get reference to VSCode API
    const vscode = acquireVsCodeApi();
    
    // State management
    let state = {
        currentTab: 'home',
        isReady: false,
        pendingOperations: new Map(),
        analysisHistory: [],
        settings: {}
    };

    // Message types enum (matching the TypeScript enum)
    const MessageType = {
        Navigate: 'navigate',
        ExecuteCommand: 'executeCommand',
        ShowInfo: 'showInfo',
        ShowError: 'showError',
        ShowWarning: 'showWarning',
        RequestData: 'requestData',
        SaveSettings: 'saveSettings',
        ValidateFile: 'validateFile',
        QueryDatabase: 'queryDatabase',
        StartAnalysis: 'startAnalysis',
        CancelOperation: 'cancelOperation',
        UpdateContent: 'updateContent',
        UpdateProgress: 'updateProgress',
        UpdateStatus: 'updateStatus',
        DeliverData: 'deliverData',
        AnalysisResult: 'analysisResult',
        ValidationResult: 'validationResult',
        DatabaseResult: 'databaseResult',
        SettingsSaved: 'settingsSaved',
        Error: 'error',
        Ready: 'ready'
    };
    
    /**
     * Generate unique message ID
     */
    function generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Create message with proper structure
     */
    function createMessage(type, payload = {}) {
        return {
            type: type,
            timestamp: Date.now(),
            id: generateId(),
            ...payload
        };
    }
    
    /**
     * Send message to extension
     */
    function sendMessage(type, payload = {}) {
        const message = createMessage(type, payload);
        vscode.postMessage(message);
        return message.id;
    }
    
    /**
     * Initialize the webview when DOM is loaded
     */
    // Wait for both DOM and web components to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForWebComponents);
    } else {
        waitForWebComponents();
    }
    
    /**
     * Wait for web components to be defined before initializing
     */
    async function waitForWebComponents() {
        console.log('[Biomni] Waiting for web components to load...');
        
        // Check if customElements is available
        if (!window.customElements) {
            console.error('[Biomni] Web Components API not available!');
            // Fallback to basic initialization
            initializeWebview();
            return;
        }
        
        // Wait for critical components to be defined
        const componentsToWait = [
            'vscode-button',
            'vscode-dropdown',
            'vscode-text-field',
            'vscode-text-area',
            'vscode-checkbox',
            'vscode-progress-ring'
        ];
        
        try {
            // Wait for all components to be defined (with timeout)
            const waitPromises = componentsToWait.map(name => 
                customElements.whenDefined(name).catch(err => {
                    console.warn(`[Biomni] Component ${name} not defined:`, err);
                })
            );
            
            // Add a timeout to prevent infinite waiting
            await Promise.race([
                Promise.all(waitPromises),
                new Promise(resolve => setTimeout(resolve, 3000))
            ]);
            
            console.log('[Biomni] Web components loaded, initializing...');
        } catch (error) {
            console.error('[Biomni] Error waiting for components:', error);
        }
        
        // Initialize the webview
        initializeWebview();
    }
    
    /**
     * Initialize webview functionality
     */
    function initializeWebview() {
        console.log('[Biomni] Starting initialization...');
        
        // Check if web components are available
        const testButton = document.querySelector('vscode-button');
        if (testButton) {
            console.log('[Biomni] VSCode components detected:', testButton.tagName);
        } else {
            console.warn('[Biomni] No VSCode components found in DOM!');
            // Log what we actually see
            const allElements = document.body.innerHTML.substring(0, 500);
            console.log('[Biomni] DOM preview:', allElements);
        }
        
        setupTabNavigation();
        setupCommandButtons();
        setupKeyboardNavigation();
        setupFormHandlers();
        setupProgressIndicators();
        
        // Restore state if available
        const savedState = vscode.getState();
        if (savedState) {
            state = { ...state, ...savedState };
            if (state.currentTab) {
                switchToTab(state.currentTab);
            }
        }
        
        // Request initial data
        requestInitialData();
        
        console.log('[Biomni] Panel webview initialized with secure messaging');
    }
    
    /**
     * Request initial data from extension
     */
    function requestInitialData() {
        sendMessage(MessageType.RequestData, { dataType: 'settings' });
        sendMessage(MessageType.RequestData, { dataType: 'recentFiles' });
        sendMessage(MessageType.RequestData, { dataType: 'analysisHistory' });
    }
    
    /**
     * Setup tab navigation functionality
     */
    function setupTabNavigation() {
        // Query for VSCode button components with tab-button class
        const tabButtons = document.querySelectorAll('vscode-button.tab-button');
        
        console.log(`[Biomni] Found ${tabButtons.length} tab buttons`);
        
        if (tabButtons.length === 0) {
            console.warn('[Biomni] No tab buttons found! Looking for any vscode-button...');
            const anyButtons = document.querySelectorAll('vscode-button');
            console.log(`[Biomni] Found ${anyButtons.length} vscode-button elements`);
            
            // Try alternate selectors
            const byId = ['home-tab', 'database-tab', 'analysis-tab', 'settings-tab'];
            byId.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    console.log(`[Biomni] Found button by ID: ${id}`);
                    btn.addEventListener('click', handleTabClick);
                }
            });
        } else {
            tabButtons.forEach(button => {
                button.addEventListener('click', handleTabClick);
            });
        }
    }
    
    /**
     * Handle tab button clicks
     */
    function handleTabClick(event) {
        const tabId = event.currentTarget.id.replace('-tab', '');
        switchToTab(tabId);
        
        // Notify the extension about navigation
        sendMessage(MessageType.Navigate, { tab: tabId });
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
        
        // Update state
        state.currentTab = tabId;
        vscode.setState(state);
        
        console.log(`Switched to tab: ${tabId}`);
    }
    
    /**
     * Setup command button functionality
     */
    function setupCommandButtons() {
        // Look for all vscode-button elements with data-command attribute
        const commandButtons = document.querySelectorAll('vscode-button[data-command]');
        
        console.log(`[Biomni] Found ${commandButtons.length} command buttons`);
        
        commandButtons.forEach(button => {
            button.addEventListener('click', handleCommandClick);
        });
    }
    
    /**
     * Handle command button clicks
     */
    function handleCommandClick(event) {
        event.preventDefault();
        
        const button = event.currentTarget;
        const command = button.getAttribute('data-command');
        
        if (!command) {
            console.warn('No command specified for button');
            return;
        }
        
        // Show loading state
        const originalContent = button.innerHTML;
        button.innerHTML = '<vscode-icon name="loading" class="spin"></vscode-icon> Executing...';
        button.disabled = true;
        
        // Execute command via extension
        const messageId = sendMessage(MessageType.ExecuteCommand, { 
            command: command,
            args: []
        });
        
        // Store operation for tracking
        state.pendingOperations.set(messageId, {
            button,
            originalContent,
            startTime: Date.now()
        });
        
        // Set timeout for operation
        setTimeout(() => {
            if (state.pendingOperations.has(messageId)) {
                resetButton(button, originalContent);
                state.pendingOperations.delete(messageId);
            }
        }, 30000); // 30 second timeout
        
        console.log(`Executing command: ${command}`);
    }
    
    /**
     * Reset button state
     */
    function resetButton(button, originalContent) {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
    
    /**
     * Setup form handlers
     */
    function setupFormHandlers() {
        // Settings form
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', handleSettingsSubmit);
        }
        
        // Validate config button
        const validateButton = document.getElementById('validate-config');
        if (validateButton) {
            validateButton.addEventListener('click', handleValidateConfig);
        }
        
        // Database query form
        const queryForm = document.getElementById('database-query-form');
        if (queryForm) {
            queryForm.addEventListener('submit', handleDatabaseQuery);
        }
        
        // Analysis form
        const analysisForm = document.getElementById('analysis-form');
        if (analysisForm) {
            analysisForm.addEventListener('submit', handleAnalysisSubmit);
        }
        
        // Analysis type dropdown
        const analysisType = document.getElementById('analysis-type');
        if (analysisType) {
            analysisType.addEventListener('change', handleAnalysisTypeChange);
        }
        
        // File validation
        const validateButton = document.getElementById('validate-file');
        if (validateButton) {
            validateButton.addEventListener('click', handleFileValidation);
        }
    }
    
    /**
     * Handle settings form submission
     */
    function handleSettingsSubmit(event) {
        event.preventDefault();
        
        // Get form values
        const settings = {
            apiKeys: {
                uniprot: document.getElementById('uniprot-key')?.value || '',
                pdb: document.getElementById('pdb-key')?.value || '',
                alphafold: document.getElementById('alphafold-key')?.value || '',
                interpro: document.getElementById('interpro-key')?.value || ''
            },
            preferences: {
                defaultDatabase: document.getElementById('default-database')?.value || 'uniprot',
                cacheEnabled: document.getElementById('cache-enabled')?.checked || false,
                maxCacheSize: parseInt(document.getElementById('cache-size')?.value) || 100
            }
        };
        
        // Filter out empty API keys
        Object.keys(settings.apiKeys).forEach(key => {
            if (!settings.apiKeys[key]) {
                delete settings.apiKeys[key];
            }
        });
        
        sendMessage(MessageType.SaveSettings, { settings });
        showNotification('Saving settings...', 'info');
        
        // Update status
        updateSettingsStatus('saving');
    }
    
    /**
     * Handle validate configuration button
     */
    function handleValidateConfig() {
        sendMessage(MessageType.ExecuteCommand, {
            command: 'biomni.settings.validateConfiguration',
            args: []
        });
        
        updateSettingsStatus('validating');
    }
    
    /**
     * Update settings status display
     */
    function updateSettingsStatus(status) {
        const statusElement = document.getElementById('settings-status');
        if (!statusElement) return;
        
        let html = '<div class="status-item">';
        
        switch (status) {
            case 'saving':
                html += `
                    <vscode-progress-ring></vscode-progress-ring>
                    <span>Saving settings...</span>
                `;
                break;
            case 'validating':
                html += `
                    <vscode-progress-ring></vscode-progress-ring>
                    <span>Validating configuration...</span>
                `;
                break;
            case 'valid':
                html += `
                    <vscode-icon name="pass-filled"></vscode-icon>
                    <span style="color: var(--vscode-testing-iconPassed);">Configuration is valid</span>
                `;
                break;
            case 'invalid':
                html += `
                    <vscode-icon name="error"></vscode-icon>
                    <span style="color: var(--vscode-testing-iconFailed);">Configuration has errors</span>
                `;
                break;
            case 'saved':
                html += `
                    <vscode-icon name="check"></vscode-icon>
                    <span>Settings saved successfully</span>
                `;
                break;
            default:
                html += `
                    <vscode-icon name="circle-outline"></vscode-icon>
                    <span>Configuration not validated</span>
                `;
        }
        
        html += '</div>';
        statusElement.innerHTML = html;
    }
    
    /**
     * Handle database query
     */
    function handleDatabaseQuery(event) {
        event.preventDefault();
        
        const databaseSelect = document.getElementById('database-select');
        const queryInput = document.getElementById('query-input');
        const limitInput = document.getElementById('limit-input');
        
        if (!databaseSelect || !queryInput || !limitInput) {
            console.error('Database query form elements not found');
            return;
        }
        
        const database = databaseSelect.value;
        const query = queryInput.value.trim();
        const limit = parseInt(limitInput.value) || 10;
        
        if (!query) {
            showNotification('Please enter a query', 'warning');
            return;
        }
        
        const messageId = sendMessage(MessageType.QueryDatabase, {
            database,
            query,
            options: { limit }
        });
        
        // Show progress in results area
        const progressElement = document.getElementById('query-progress');
        const resultsContent = document.getElementById('results-content');
        
        if (progressElement) {
            progressElement.style.display = 'block';
        }
        if (resultsContent) {
            resultsContent.innerHTML = '<p>Searching database...</p>';
        }
        
        state.pendingOperations.set(messageId, {
            type: 'database-query',
            startTime: Date.now()
        });
    }
    
    /**
     * Handle analysis form submission
     */
    function handleAnalysisSubmit(event) {
        event.preventDefault();
        
        const analysisType = document.getElementById('analysis-type').value;
        const filePath = document.getElementById('file-path').value.trim();
        
        // Get analysis-specific parameters
        const parameters = {};
        const optionsContainer = document.getElementById('analysis-options');
        if (optionsContainer) {
            const inputs = optionsContainer.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.id && input.value) {
                    parameters[input.id] = input.value;
                }
            });
        }
        
        // Map analysis type to appropriate message
        if (analysisType === 'validate') {
            const messageId = sendMessage(MessageType.ValidateFile, {
                filePath: filePath || undefined,
                fileType: parameters.fileType || undefined
            });
            
            showAnalysisProgress('Validating file format...');
            state.pendingOperations.set(messageId, {
                type: 'file-validation',
                startTime: Date.now()
            });
        } else {
            const messageId = sendMessage(MessageType.StartAnalysis, {
                analysisType,
                filePath: filePath || undefined,
                parameters
            });
            
            showAnalysisProgress(`Running ${analysisType} analysis...`);
            state.pendingOperations.set(messageId, {
                type: 'analysis',
                analysisType,
                startTime: Date.now()
            });
        }
    }
    
    /**
     * Handle analysis type change
     */
    function handleAnalysisTypeChange(event) {
        const analysisType = event.target.value;
        const optionsContainer = document.getElementById('analysis-options');
        
        if (!optionsContainer) return;
        
        // Clear existing options
        optionsContainer.innerHTML = '';
        
        // Add analysis-specific options
        switch (analysisType) {
            case 'blast':
                optionsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="blast-database">Database:</label>
                        <vscode-dropdown id="blast-database">
                            <vscode-option value="nt">Nucleotide (nt)</vscode-option>
                            <vscode-option value="nr">Protein (nr)</vscode-option>
                            <vscode-option value="refseq_genomic">RefSeq Genomic</vscode-option>
                            <vscode-option value="refseq_protein">RefSeq Protein</vscode-option>
                            <vscode-option value="swissprot">SwissProt</vscode-option>
                        </vscode-dropdown>
                    </div>
                    <div class="form-group">
                        <label for="blast-evalue">E-value threshold:</label>
                        <vscode-text-field id="blast-evalue" type="number" value="0.01" step="0.001"></vscode-text-field>
                    </div>
                `;
                break;
                
            case 'validate':
                optionsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="fileType">File Type (auto-detect if empty):</label>
                        <vscode-dropdown id="fileType">
                            <vscode-option value="">Auto-detect</vscode-option>
                            <vscode-option value="fasta">FASTA</vscode-option>
                            <vscode-option value="fastq">FASTQ</vscode-option>
                            <vscode-option value="vcf">VCF</vscode-option>
                            <vscode-option value="pdb">PDB</vscode-option>
                        </vscode-dropdown>
                    </div>
                `;
                break;
                
            case 'orfs':
                optionsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="min-orf-length">Minimum ORF Length (bp):</label>
                        <vscode-text-field id="min-orf-length" type="number" value="100" min="30"></vscode-text-field>
                    </div>
                `;
                break;
                
            case 'docking':
                optionsContainer.innerHTML = `
                    <div class="form-group">
                        <label for="ligand-file">Ligand File:</label>
                        <vscode-text-field id="ligand-file" placeholder="/path/to/ligand.sdf"></vscode-text-field>
                    </div>
                    <div class="form-group">
                        <label for="receptor-file">Receptor File:</label>
                        <vscode-text-field id="receptor-file" placeholder="/path/to/receptor.pdb"></vscode-text-field>
                    </div>
                `;
                break;
        }
    }
    
    /**
     * Show analysis progress
     */
    function showAnalysisProgress(message) {
        const progressElement = document.getElementById('analysis-progress');
        const contentElement = document.getElementById('analysis-content');
        
        if (progressElement) {
            progressElement.style.display = 'block';
        }
        if (contentElement) {
            contentElement.innerHTML = `<p>${message}</p>`;
        }
    }
    
    /**
     * Handle file validation
     */
    function handleFileValidation() {
        // In a real implementation, you'd get the file path from the active editor
        const filePath = '/path/to/file.fasta';
        
        const messageId = sendMessage(MessageType.ValidateFile, {
            filePath,
            fileType: 'fasta'
        });
        
        showProgressBar('validation-progress', true);
        state.pendingOperations.set(messageId, {
            type: 'file-validation',
            startTime: Date.now()
        });
    }
    
    /**
     * Setup progress indicators
     */
    function setupProgressIndicators() {
        // Create progress container if not exists
        if (!document.getElementById('progress-container')) {
            const container = document.createElement('div');
            container.id = 'progress-container';
            container.className = 'progress-container';
            document.body.appendChild(container);
        }
    }
    
    /**
     * Show progress bar
     */
    function showProgressBar(id, indeterminate = false) {
        const container = document.getElementById('progress-container');
        let progressBar = document.getElementById(id);
        
        if (!progressBar) {
            progressBar = document.createElement('vscode-progress-ring');
            progressBar.id = id;
            progressBar.className = 'progress-indicator';
            container.appendChild(progressBar);
        }
        
        progressBar.style.display = 'block';
        if (!indeterminate) {
            progressBar.setAttribute('value', '0');
        }
    }
    
    /**
     * Update progress bar
     */
    function updateProgressBar(id, value, message) {
        const progressBar = document.getElementById(id);
        if (progressBar) {
            if (value !== undefined) {
                progressBar.setAttribute('value', value.toString());
            }
            if (message) {
                progressBar.setAttribute('title', message);
            }
        }
    }
    
    /**
     * Hide progress bar
     */
    function hideProgressBar(id) {
        const progressBar = document.getElementById(id);
        if (progressBar) {
            progressBar.style.display = 'none';
        }
    }
    
    /**
     * Setup keyboard navigation
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
        
        // Cancel operation with Escape
        if (event.key === 'Escape' && state.pendingOperations.size > 0) {
            const latestOperation = Array.from(state.pendingOperations.entries()).pop();
            if (latestOperation) {
                sendMessage(MessageType.CancelOperation, {
                    operationId: latestOperation[0]
                });
            }
        }
    }
    
    /**
     * Handle messages from the extension
     */
    window.addEventListener('message', event => {
        const message = event.data;
        
        if (!message || !message.type) {
            return;
        }
        
        switch (message.type) {
            case MessageType.Ready:
                handleReadyMessage(message);
                break;
                
            case MessageType.UpdateContent:
                handleUpdateContent(message);
                break;
                
            case MessageType.UpdateProgress:
                handleUpdateProgress(message);
                break;
                
            case MessageType.UpdateStatus:
                handleUpdateStatus(message);
                break;
                
            case MessageType.DeliverData:
                handleDeliverData(message);
                break;
                
            case MessageType.AnalysisResult:
                handleAnalysisResult(message);
                break;
                
            case MessageType.ValidationResult:
                handleValidationResult(message);
                break;
                
            case MessageType.DatabaseResult:
                handleDatabaseResult(message);
                break;
                
            case MessageType.SettingsSaved:
                handleSettingsSaved(message);
                break;
                
            case MessageType.Error:
                handleError(message);
                break;
                
            default:
                console.log('Received unknown message type:', message.type);
        }
    });
    
    /**
     * Handle ready message
     */
    function handleReadyMessage(message) {
        state.isReady = true;
        console.log(`Extension ready. Version: ${message.version}`);
        console.log('Capabilities:', message.capabilities);
    }
    
    /**
     * Handle content update
     */
    function handleUpdateContent(message) {
        const panel = document.getElementById(`${message.tab}-panel`);
        if (panel && message.content) {
            if (typeof message.content === 'string') {
                panel.innerHTML = message.content;
            } else {
                // Handle structured content updates
                updatePanelContent(panel, message.content);
            }
        }
    }
    
    /**
     * Handle progress update
     */
    function handleUpdateProgress(message) {
        updateProgressBar(
            `operation-${message.operationId}`,
            message.progress,
            message.message
        );
        
        if (message.progress >= 100) {
            setTimeout(() => {
                hideProgressBar(`operation-${message.operationId}`);
                state.pendingOperations.delete(message.operationId);
            }, 1000);
        }
    }
    
    /**
     * Handle status update
     */
    function handleUpdateStatus(message) {
        const statusBar = document.getElementById('status-bar');
        if (statusBar) {
            statusBar.className = `status-bar status-${message.status}`;
            statusBar.textContent = message.message || message.status;
        }
        
        // Auto-hide success/error messages after delay
        if (message.status === 'success' || message.status === 'error') {
            setTimeout(() => {
                if (statusBar) {
                    statusBar.className = 'status-bar status-idle';
                    statusBar.textContent = 'Ready';
                }
            }, 3000);
        }
    }
    
    /**
     * Handle data delivery
     */
    function handleDeliverData(message) {
        switch (message.dataType) {
            case 'settings':
                state.settings = message.data;
                updateSettingsForm(message.data);
                break;
                
            case 'recentFiles':
                updateRecentFilesList(message.data);
                break;
                
            case 'analysisHistory':
                state.analysisHistory = message.data;
                updateAnalysisHistory(message.data);
                break;
        }
    }
    
    /**
     * Handle analysis result
     */
    function handleAnalysisResult(message) {
        const operation = state.pendingOperations.get(message.id);
        if (operation) {
            state.pendingOperations.delete(message.id);
        }
        
        if (message.result.success) {
            displayAnalysisResult(message.result);
            showNotification('Analysis completed successfully', 'info');
        } else {
            showNotification(message.result.error || 'Analysis failed', 'error');
        }
    }
    
    /**
     * Handle validation result
     */
    function handleValidationResult(message) {
        const operation = state.pendingOperations.get(message.id);
        if (operation) {
            state.pendingOperations.delete(message.id);
        }
        
        displayValidationResult(message);
        hideProgressBar('validation-progress');
    }
    
    /**
     * Handle database result
     */
    function handleDatabaseResult(message) {
        const operation = state.pendingOperations.get(message.id);
        if (operation) {
            state.pendingOperations.delete(message.id);
        }
        
        displayDatabaseResults(message);
        
        // Hide progress in results area
        const progressElement = document.getElementById('query-progress');
        if (progressElement) {
            progressElement.style.display = 'none';
        }
    }
    
    /**
     * Handle settings saved
     */
    function handleSettingsSaved(message) {
        if (message.success) {
            showNotification('Settings saved successfully', 'info');
            updateSettingsStatus('saved');
            
            // Reset status after 3 seconds
            setTimeout(() => {
                updateSettingsStatus('default');
            }, 3000);
        } else {
            showNotification(message.message || 'Failed to save settings', 'error');
            updateSettingsStatus('invalid');
        }
    }
    
    /**
     * Handle error message
     */
    function handleError(message) {
        console.error('Extension error:', message);
        showNotification(message.error, 'error');
        
        // Clear any pending operation that caused this error
        if (message.details && message.details.includes('Request ID:')) {
            const requestId = message.details.split('Request ID:')[1].trim();
            const operation = state.pendingOperations.get(requestId);
            if (operation && operation.button) {
                resetButton(operation.button, operation.originalContent);
            }
            state.pendingOperations.delete(requestId);
        }
    }
    
    /**
     * Display analysis result
     */
    function displayAnalysisResult(message) {
        const contentElement = document.getElementById('analysis-content');
        const progressElement = document.getElementById('analysis-progress');
        
        if (progressElement) {
            progressElement.style.display = 'none';
        }
        
        if (!contentElement) return;
        
        const result = message.result;
        
        if (!result.success) {
            contentElement.innerHTML = `
                <div class="analysis-error">
                    <vscode-icon name="error"></vscode-icon>
                    <h4>Analysis Failed</h4>
                    <p>${result.error || 'Unknown error occurred'}</p>
                </div>
            `;
            return;
        }
        
        // Build result HTML based on analysis type
        let html = `
            <div class="analysis-result">
                <h4>${message.analysisType.charAt(0).toUpperCase() + message.analysisType.slice(1)} Analysis Complete</h4>
        `;
        
        if (result.data) {
            if (result.data.summary) {
                html += `<p class="result-summary">${result.data.summary}</p>`;
            }
            
            if (result.data.metrics) {
                html += `<div class="metrics-grid">`;
                for (const [key, value] of Object.entries(result.data.metrics)) {
                    html += `
                        <div class="metric-item">
                            <span class="metric-label">${key}:</span>
                            <span class="metric-value">${value}</span>
                        </div>
                    `;
                }
                html += `</div>`;
            }
        }
        
        // Display visualizations if any
        if (result.visualizations) {
            html += `<div class="visualizations">`;
            result.visualizations.forEach(viz => {
                if (viz.type === 'chart') {
                    html += `<div class="chart-container" data-chart='${JSON.stringify(viz.data)}'></div>`;
                } else if (viz.type === 'table') {
                    html += renderTable(viz.data);
                } else if (viz.type === 'alignment') {
                    html += `<pre class="alignment-display">${viz.data}</pre>`;
                }
            });
            html += `</div>`;
        }
        
        html += `
                <div class="result-actions">
                    <vscode-button onclick="exportAnalysisResult('${message.id}')">
                        <vscode-icon name="export"></vscode-icon>
                        Export Results
                    </vscode-button>
                    <vscode-button appearance="secondary" onclick="clearAnalysisResults()">
                        <vscode-icon name="clear-all"></vscode-icon>
                        Clear
                    </vscode-button>
                </div>
            </div>
        `;
        
        contentElement.innerHTML = html;
    }
    
    /**
     * Display validation result
     */
    function displayValidationResult(message) {
        const contentElement = document.getElementById('analysis-content');
        const progressElement = document.getElementById('analysis-progress');
        
        if (progressElement) {
            progressElement.style.display = 'none';
        }
        
        if (!contentElement) return;
        
        let html = `
            <div class="validation-result">
                <h4>File Validation Results</h4>
                <p><strong>File:</strong> ${message.filePath}</p>
        `;
        
        if (message.valid) {
            html += `
                <div class="validation-success">
                    <vscode-icon name="pass"></vscode-icon>
                    <span>File is valid ${message.info?.format ? `(${message.info.format})` : ''}</span>
                </div>
            `;
            
            if (message.info) {
                html += `<div class="file-info">`;
                if (message.info.sequences !== undefined) {
                    html += `<p>Sequences: ${message.info.sequences}</p>`;
                }
                if (message.info.length !== undefined) {
                    html += `<p>Total length: ${message.info.length}</p>`;
                }
                if (message.info.composition) {
                    html += `<h5>Composition:</h5><ul>`;
                    for (const [key, value] of Object.entries(message.info.composition)) {
                        html += `<li>${key}: ${value}</li>`;
                    }
                    html += `</ul>`;
                }
                html += `</div>`;
            }
        } else {
            html += `
                <div class="validation-error">
                    <vscode-icon name="error"></vscode-icon>
                    <span>File validation failed</span>
                </div>
            `;
            
            if (message.errors && message.errors.length > 0) {
                html += `<div class="error-list"><h5>Errors:</h5><ul>`;
                message.errors.forEach(error => {
                    html += `<li>`;
                    if (error.line) html += `Line ${error.line}: `;
                    html += `${error.message}</li>`;
                });
                html += `</ul></div>`;
            }
        }
        
        if (message.warnings && message.warnings.length > 0) {
            html += `<div class="warning-list"><h5>Warnings:</h5><ul>`;
            message.warnings.forEach(warning => {
                html += `<li>${warning}</li>`;
            });
            html += `</ul></div>`;
        }
        
        html += `</div>`;
        contentElement.innerHTML = html;
    }
    
    /**
     * Render table visualization
     */
    function renderTable(data) {
        if (!data || !data.headers || !data.rows) return '';
        
        let html = '<table class="data-table"><thead><tr>';
        data.headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        data.rows.forEach(row => {
            html += '<tr>';
            row.forEach(cell => {
                html += `<td>${cell}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        
        return html;
    }
    
    /**
     * Display database results
     */
    function displayDatabaseResults(result) {
        const resultsContent = document.getElementById('results-content');
        if (!resultsContent) {
            console.error('Results content element not found');
            return;
        }
        
        if (!result.results || result.results.length === 0) {
            resultsContent.innerHTML = `
                <div class="no-results">
                    <vscode-icon name="search-stop"></vscode-icon>
                    <p>No results found for "${result.query}" in ${result.database}</p>
                </div>
            `;
            return;
        }
        
        // Build results HTML
        let html = `
            <div class="results-header">
                <h4>Results from ${result.database.toUpperCase()}</h4>
                <p>Query: "${result.query}" - Found ${result.totalCount} results</p>
            </div>
            <div class="results-list">
        `;
        
        result.results.forEach((item, index) => {
            html += `
                <div class="result-item">
                    <div class="result-header">
                        <strong>#${index + 1}: ${item.id || item.accession || 'Result'}</strong>
                        ${item.name ? `<span class="result-name">${item.name}</span>` : ''}
                    </div>
                    ${item.description ? `<p class="result-description">${item.description}</p>` : ''}
                    ${item.organism ? `<p class="result-meta">Organism: ${item.organism}</p>` : ''}
                    ${item.length ? `<p class="result-meta">Length: ${item.length}</p>` : ''}
                    ${item.sequence ? `
                        <details>
                            <summary>Show Sequence</summary>
                            <pre class="sequence-display">${item.sequence}</pre>
                        </details>
                    ` : ''}
                    <div class="result-actions">
                        ${item.url ? `<vscode-link href="${item.url}">View in Database</vscode-link>` : ''}
                        <vscode-button appearance="secondary" onclick="copyToClipboard('${item.id || item.accession}')">
                            <vscode-icon name="copy"></vscode-icon>
                            Copy ID
                        </vscode-button>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
            ${result.hasMore ? `
                <div class="load-more">
                    <vscode-button onclick="loadMoreResults()">
                        Load More Results
                    </vscode-button>
                </div>
            ` : ''}
        `;
        
        resultsContent.innerHTML = html;
    }
    
    /**
     * Update panel content
     */
    function updatePanelContent(panel, content) {
        // Implementation would handle structured content updates
        console.log('Updating panel content:', content);
    }
    
    /**
     * Update settings form
     */
    function updateSettingsForm(settings) {
        if (!settings) return;
        
        // Populate API keys
        if (settings.apiKeys) {
            const uniprotKey = document.getElementById('uniprot-key');
            if (uniprotKey && settings.apiKeys.uniprot) {
                uniprotKey.value = settings.apiKeys.uniprot;
            }
            
            const pdbKey = document.getElementById('pdb-key');
            if (pdbKey && settings.apiKeys.pdb) {
                pdbKey.value = settings.apiKeys.pdb;
            }
            
            const alphafoldKey = document.getElementById('alphafold-key');
            if (alphafoldKey && settings.apiKeys.alphafold) {
                alphafoldKey.value = settings.apiKeys.alphafold;
            }
            
            const interproKey = document.getElementById('interpro-key');
            if (interproKey && settings.apiKeys.interpro) {
                interproKey.value = settings.apiKeys.interpro;
            }
        }
        
        // Populate preferences
        if (settings.preferences) {
            const defaultDb = document.getElementById('default-database');
            if (defaultDb && settings.preferences.defaultDatabase) {
                defaultDb.value = settings.preferences.defaultDatabase;
            }
            
            const cacheEnabled = document.getElementById('cache-enabled');
            if (cacheEnabled && settings.preferences.cacheEnabled !== undefined) {
                cacheEnabled.checked = settings.preferences.cacheEnabled;
            }
            
            const cacheSize = document.getElementById('cache-size');
            if (cacheSize && settings.preferences.maxCacheSize !== undefined) {
                cacheSize.value = settings.preferences.maxCacheSize.toString();
            }
        }
    }
    
    /**
     * Update recent files list
     */
    function updateRecentFilesList(files) {
        // Implementation would update recent files display
        console.log('Recent files:', files);
    }
    
    /**
     * Update analysis history
     */
    function updateAnalysisHistory(history) {
        // Implementation would update analysis history display
        console.log('Analysis history:', history);
    }
    
    /**
     * Show notification
     */
    function showNotification(text, level = 'info') {
        switch (level) {
            case 'error':
                sendMessage(MessageType.ShowError, { text });
                break;
            case 'warning':
                sendMessage(MessageType.ShowWarning, { text });
                break;
            default:
                sendMessage(MessageType.ShowInfo, { text });
        }
    }
    
    /**
     * Export API for debugging (development only)
     */
    if (typeof window !== 'undefined') {
        window.biomniAPI = {
            state: () => state,
            sendMessage,
            switchToTab,
            showNotification
        };
    }
    
})();