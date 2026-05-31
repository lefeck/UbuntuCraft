/**
 * Main Application Entry Point
 * Initializes all modules and coordinates functionality
 */

// Global application state
let appState = {
    initialized: false,
    currentTab: 'basic',
    configValid: false
};

/**
 * Main application initialization
 */
async function initApp() {
    try {
        console.log('Initializing UbuntuCraft application...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp);
            return;
        }
        
        // Initialize UI utilities first
        if (window.UIUtils) {
            window.UIUtils.initTabs();
        }
        
        // Initialize all modules
        await initAllModules();
        
        // Set up event listeners
        setupEventListeners();

        // Initialize all configurations first (loads tab DOMs async)
        // This MUST complete before loadDefaultConfiguration so that
        // StorageManager.loadFromConfig / NetworkManager.loadFromConfig
        // can find the DOM elements when applyAutoinstallConfigToUI is called
        if (window.ConfigManager && window.ConfigManager.initializeAllConfigs) {
            await window.ConfigManager.initializeAllConfigs();
        }

        // Load default configuration (depends on DOM elements from above)
        await loadDefaultConfiguration();

        // Mark as initialized
        appState.initialized = true;
        
        console.log('UbuntuCraft application initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Application initialization failed');
    }
}

/**
 * Initialize all modules
 */
async function initAllModules() {
    // Initialize configuration manager
    if (window.ConfigManager) {
        try {
            window.ConfigManager.initBasicConfig();
            console.log('Configuration manager initialized');
        } catch (error) {
            console.error('Failed to initialize configuration manager:', error);
        }
    }
    
    // Initialize storage manager
    if (window.StorageManager) {
        try {
            console.log('Storage manager initialized');
        } catch (error) {
            console.error('Failed to initialize storage manager:', error);
        }
    }
    
    // Initialize network manager
    if (window.NetworkManager) {
        try {
            console.log('Network manager initialized');
        } catch (error) {
            console.error('Failed to initialize network manager:', error);
        }
    }
    
    // Initialize ISO generator
    if (window.ISOGenerator) {
        try {
            window.ISOGenerator.initISOForm();
            console.log('ISO generator initialized');
        } catch (error) {
            console.error('Failed to initialize ISO generator:', error);
        }
    }
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchToTab(tabName);
        });
    });
    
    // Form submission
    const generateButton = document.getElementById('generateBtn');
    if (generateButton) {
        const hasInline = !!generateButton.getAttribute('onclick');
        if (!hasInline) {
            generateButton.addEventListener('click', async function(e) {
                e.preventDefault();
                await handleGenerateISO();
            });
        }
    }
    
    // Configuration validation
    const validateButton = document.getElementById('validateConfig');
    if (validateButton) {
        validateButton.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleValidateConfig();
        });
    }
    
    // Load defaults button
    const loadDefaultsButton = document.getElementById('loadDefaultConfig');
    if (loadDefaultsButton) {
        loadDefaultsButton.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleLoadDefaults();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('resize', debounce(handleWindowResize, 250));
}

/**
 * Switch to specific tab
 */
function switchToTab(tabName) {
    // Update app state
    appState.currentTab = tabName;
    
    // Use UI utilities if available
    if (window.UIUtils && window.UIUtils.switchTab) {
        window.UIUtils.switchTab(tabName);
    } else {
        // Fallback implementation
        switchTab(tabName);
    }
    
    // Load tab-specific content if needed
    loadTabContent(tabName);
}

/**
 * Load tab-specific content
 */
function loadTabContent(tabName) {
    // Use configuration manager to load tab content
    if (window.ConfigManager && window.ConfigManager.loadTabContent) {
        window.ConfigManager.loadTabContent(tabName);
    }
}

/**
 * Handle ISO generation
 */
async function handleGenerateISO() {
    try {
        // Show loading state
        if (window.UIUtils && window.UIUtils.showLoading) {
            window.UIUtils.showLoading('generateBtn');
        }
        
        // Use ISO generator if available
        if (window.ISOGenerator && window.ISOGenerator.generateISO) {
            await window.ISOGenerator.generateISO();
        } else {
            throw new Error('ISO generator not available');
        }
        
    } catch (error) {
        console.error('ISO generation failed:', error);
        showError('ISO generation failed: ' + error.message);
    } finally {
        // Hide loading state
        if (window.UIUtils && window.UIUtils.hideLoading) {
            window.UIUtils.hideLoading('generateBtn');
        }
    }
}

/**
 * Handle configuration validation
 */
async function handleValidateConfig() {
    try {
        // Show loading state
        if (window.UIUtils && window.UIUtils.showLoading) {
            window.UIUtils.showLoading('validateConfig');
        }
        
        // Validate all configurations
        const results = await validateAllConfigurations();
        
        if (results.allValid) {
            appState.configValid = true;
            showSuccess('Configuration validation passed');
        } else {
            appState.configValid = false;
            showError('Configuration validation failed');
        }
        
    } catch (error) {
        console.error('Configuration validation failed:', error);
        showError('Configuration validation failed: ' + error.message);
    } finally {
        // Hide loading state
        if (window.UIUtils && window.UIUtils.hideLoading) {
            window.UIUtils.hideLoading('validateConfig');
        }
    }
}

/**
 * Validate all configurations
 */
async function validateAllConfigurations() {
    const validations = [];
    
    // Basic configuration validation
    if (window.ConfigManager && window.ConfigManager.validateConfig) {
        validations.push(window.ConfigManager.validateConfig());
    }
    
    // Storage configuration validation
    if (window.StorageManager && window.StorageManager.validateStorageConfig) {
        validations.push(window.StorageManager.validateStorageConfig());
    }
    
    // Network configuration validation
    if (window.NetworkManager && window.NetworkManager.validateNetworkConfig) {
        validations.push(window.NetworkManager.validateNetworkConfig());
    }
    
    // Wait for all validations
    const results = await Promise.all(validations);
    
    // Aggregate results
    const allValid = results.every(result => result.valid);
    const allErrors = results.flatMap(result => result.errors || []);
    
    return {
        allValid,
        allErrors,
        results
    };
}

/**
 * Handle load defaults
 */
async function handleLoadDefaults() {
    try {
        // Show loading state
        if (window.UIUtils && window.UIUtils.showLoading) {
            window.UIUtils.showLoading('loadDefaultConfig');
        }
        
        // Load default configuration
        if (window.ConfigManager && window.ConfigManager.loadDefaultConfig) {
            await window.ConfigManager.loadDefaultConfig();
            showSuccess('Default configuration loaded');
        } else {
            throw new Error('Configuration manager not available');
        }
        
    } catch (error) {
        console.error('Failed to load defaults:', error);
        showError('Failed to load defaults: ' + error.message);
    } finally {
        // Hide loading state
        if (window.UIUtils && window.UIUtils.hideLoading) {
            window.UIUtils.hideLoading('loadDefaultConfig');
        }
    }
}

/**
 * Load default configuration
 */
async function loadDefaultConfiguration() {
    try {
        if (window.ConfigManager && window.ConfigManager.loadDefaultConfig) {
            await window.ConfigManager.loadDefaultConfig();
        }
    } catch (error) {
        console.error('Failed to load default configuration:', error);
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Enter: Generate ISO
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleGenerateISO();
    }
    
    // Ctrl/Cmd + S: Validate configuration
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleValidateConfig();
    }
    
    // Tab navigation with arrow keys
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        const currentTab = document.querySelector('.tab.active');
        if (currentTab) {
            const tabs = Array.from(document.querySelectorAll('.tab'));
            const currentIndex = tabs.indexOf(currentTab);
            let nextIndex;
            
            if (event.key === 'ArrowLeft') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            } else {
                nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            }
            
            switchToTab(tabs[nextIndex].getAttribute('data-tab'));
        }
    }
}

/**
 * Handle before unload
 */
function handleBeforeUnload(event) {
    if (appState.configValid) {
        // Allow navigation if configuration is valid
        return;
    }
    
    // Warn user about unsaved changes
    const message = 'You have unsaved configuration changes. Are you sure you want to leave?';
    event.returnValue = message;
    return message;
}

/**
 * Handle window resize
 */
function handleWindowResize() {
    // Adjust UI elements for different screen sizes
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    
    // Update CSS classes for responsive design
    document.body.classList.toggle('mobile', isMobile);
    document.body.classList.toggle('tablet', isTablet);
    document.body.classList.toggle('desktop', !isMobile && !isTablet);
}

/**
 * Show success message
 */
function showSuccess(message) {
    if (window.UIUtils && window.UIUtils.showAlert) {
        window.UIUtils.showAlert(message, 'success');
    } else {
        console.log('Success:', message);
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (window.UIUtils && window.UIUtils.showAlert) {
        window.UIUtils.showAlert(message, 'error');
    } else {
        console.error('Error:', message);
    }
}

/**
 * Show info message
 */
function showInfo(message) {
    if (window.UIUtils && window.UIUtils.showAlert) {
        window.UIUtils.showAlert(message, 'info');
    } else {
        console.log('Info:', message);
    }
}

/**
 * Debounce function
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
 * Fallback tab switching (if UIUtils not available)
 */
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(tabName);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

/**
 * Get application state
 */
function getAppState() {
    return { ...appState };
}

/**
 * Set application state
 */
function setAppState(newState) {
    appState = { ...appState, ...newState };
}

// Export main functions
window.UbuntuCraft = {
    initApp,
    getAppState,
    setAppState,
    switchToTab,
    handleGenerateISO,
    handleValidateConfig,
    handleLoadDefaults
};

// Page-level navigation
var AppNavigation = {
    switchPage: function(page) {
        console.log('AppNavigation.switchPage called with:', page);
        var pages = document.querySelectorAll('.content-page');
        pages.forEach(function(p) { p.classList.remove('active'); });
        var target = document.querySelector('.content-page[data-page="' + page + '"]');
        console.log('Target element:', target);
        if (target) target.classList.add('active');

        var sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(function(s) { s.classList.remove('active'); });
        var activeSidebar = document.querySelector('.sidebar-item[data-page="' + page + '"]');
        if (activeSidebar) activeSidebar.classList.add('active');

        // Load templates content if switching to templates page
        if (page === 'templates') {
            console.log('Switching to templates page, calling loadTemplatesPage()');
            loadTemplatesPage();
        }
    }
};
window.AppNavigation = AppNavigation;

// Load templates page content
async function loadTemplatesPage() {
    const container = document.getElementById('templatesContent');
    if (!container) {
        console.error('templatesContent container not found');
        return;
    }

    console.log('loadTemplatesPage called, loaded:', container.dataset.loaded);

    // Force reload by removing the flag
    // if (container.dataset.loaded) {
    //     container.dataset.loaded = '';
    // }

    try {
        const response = await fetch('/static/views/templates.html');
        console.log('fetch templates.html status:', response.status);
        if (response.ok) {
            const html = await response.text();
            console.log('templates.html loaded, length:', html.length);
            container.innerHTML = html;
            container.dataset.loaded = 'true';

            // Initialize TemplatesManager
            if (window.TemplatesManager) {
                console.log('Calling TemplatesManager.init()');
                TemplatesManager.init();
            } else {
                console.error('TemplatesManager not found on window');
            }
        } else {
            console.error('Failed to load templates.html:', response.status);
        }
    } catch (error) {
        console.error('Failed to load templates page:', error);
    }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already loaded
    initApp();
}
