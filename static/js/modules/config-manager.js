/**
 * Configuration Manager Module
 * Manages all configuration-related functionality including basic, APT, network, storage, SSH, and advanced configurations
 */

// API base URL
const API_BASE = '/api/v1';

// Global configuration object
let globalConfig = {
    basic: {
        username: 'ubuntu',
        password: '',
        hostname: 'ubuntu-server',
        realname: 'ubuntu',
        locale: 'en_US.UTF-8',
        keyboard: 'us',
        timezone: 'Asia/Shanghai',
        kernel: 'linux-generic',
        updates: 'security',
        shutdown: 'reboot',
        drivers: 'false'
    },
    apt: {
        primaryRepos: [
            {
                arches: ["amd64", "i386"],
                uri: "http://archive.ubuntu.com/ubuntu"
            },
            {
                arches: ["default"],
                uri: "http://ports.ubuntu.com/ubuntu-ports"
            }
        ],
        additionalRepos: []
    },
    network: {
        devices: [],
        nameservers: null
    },
    storage: {
        configs: []
    },
    ssh: {
        enabled: false,
        authorizedKeys: []
    },
    advanced: {
        packages: [],
        scripts: []
    }
};

/**
 * Load view content from template file
 */
async function loadView(tabName, templatePath, callback, forceReload = false) {
    const container = document.getElementById(tabName);
    if (!container) return;
    
    // If forceReload is true or content not loaded yet, then load content
    if (forceReload || !container.dataset.loaded) {
        try {
            const response = await fetch(templatePath);
            if (response.ok) {
                const html = await response.text();
                container.innerHTML = html;
                container.dataset.loaded = 'true';
                
                // Set default values after loading template
                setDefaultValues(tabName);
                
                // Call callback if provided
                if (typeof callback === 'function') {
                    callback();
                }
            } else {
                console.error(`Failed to load template: ${templatePath}`);
            }
        } catch (error) {
            console.error(`Error loading template: ${error}`);
        }
    } else if (typeof callback === 'function') {
        // If already loaded but still need callback (e.g., to initialize)
        console.log(`Tab ${tabName} already loaded, executing callback directly`);
        callback();
    }
}

/**
 * Set default values for specific tabs
 */
function setDefaultValues(tabName) {
    if (window.configModified) return;  // skip if a template was applied

    switch (tabName) {
        case 'basic':
            // Set Basic Configuration defaults
            const timezone = document.getElementById('timezone');
            const kernel = document.getElementById('kernel');
            const updates = document.getElementById('updates');
            const shutdown = document.getElementById('shutdown');
            const drivers = document.getElementById('drivers');
            
            if (timezone && !timezone.value) timezone.value = 'Asia/Shanghai';
            if (kernel && !kernel.value) kernel.value = 'linux-generic';
            if (updates && !updates.value) updates.value = 'security';
            if (shutdown && !shutdown.value) shutdown.value = 'reboot';
            if (drivers && !drivers.value) drivers.value = 'false';
            break;
            
        case 'apt':
            // Set APT configuration defaults
            const aptGeoIP = document.getElementById('aptGeoIP');
            const aptPreserveSources = document.getElementById('aptPreserveSources');
            const aptDisableComponents = document.getElementById('aptDisableComponents');
            const aptDisableSuitesOptions = document.getElementById('aptDisableSuitesOptions');
            const aptDisableSuitesTags = document.getElementById('aptDisableSuitesTags');
            
            if (aptGeoIP) aptGeoIP.value = 'true';
            if (aptPreserveSources) aptPreserveSources.value = 'false';
            if (aptDisableComponents) {
                const checkboxes = aptDisableComponents.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = false;
                });
            }
            if (aptDisableSuitesOptions) {
                const checkboxes = aptDisableSuitesOptions.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = (cb.value === 'security'));
            }
            if (aptDisableSuitesTags) { aptDisableSuitesTags.innerHTML = ''; }
            
            // Initialize primary repositories
            initAptPrimaryRepos();
            break;
            
        case 'advanced':
            // Set default values for Early/Late Commands and User Data Commands
            const lateCommands = document.getElementById('lateCommands');
            const earlyCommands = document.getElementById('earlyCommands');
            const errorCommands = document.getElementById('errorCommands');

            if (earlyCommands) {
                earlyCommands.value = '';
            }
            
            if (lateCommands) {
                lateCommands.value = '';
            }

            if (errorCommands) {
                errorCommands.value = '';
            }
            
            
            // Set default value for userDataRaw field
            const userDataRaw = document.getElementById('userDataRaw');
            if (userDataRaw) {
                userDataRaw.value = '';
            }
            break;
            
        case 'storage':
            // Set default values for Storage Configuration
            const swapFilename = document.getElementById('swapFilename');
            const swapSize = document.getElementById('swapSize');
            const swapSizeUnit = document.getElementById('swapSizeUnit');
            const swapMaxsize = document.getElementById('swapMaxsize');
            const swapMaxsizeUnit = document.getElementById('swapMaxsizeUnit');
            const swapForce = document.getElementById('swapForce');
            const grubReorder = document.getElementById('grubReorder');

            // Swap configuration defaults
            if (swapFilename) swapFilename.value = '/swap.img';
            if (swapSize && swapSize.value === '') swapSize.value = '0';
            if (swapSizeUnit && swapSizeUnit.value === '') swapSizeUnit.value = 'G';
            if (swapMaxsize && swapMaxsize.value === '') swapMaxsize.value = '8';
            if (swapMaxsizeUnit && swapMaxsizeUnit.value === '') swapMaxsizeUnit.value = 'G';
            if (swapForce && swapForce.value === '') swapForce.value = 'false';
            if (grubReorder && grubReorder.value === '') grubReorder.value = 'false';

            // Ensure storage configs container exists and initialize defaults
            const storageConfigs = document.getElementById('storageConfigs');
            if (storageConfigs) {
                console.log('Storage configs container found, checking if empty...');
                if (storageConfigs.children.length === 0) {
                    // If empty, immediately initialize default configs
                    if (window.StorageManager && window.StorageManager.initStorageConfigs) {
                        console.log('Initializing storage configs in setDefaultValues');
                        window.StorageManager.initStorageConfigs();
                    } else {
                        console.error('StorageManager or initStorageConfigs not found');
                    }
                } else {
                    console.log('Storage configs container already has content, skipping initialization');
                }
            } else {
                console.error('storageConfigs container not found');
            }
            break;
    }
}

/**
 * Initialize basic configuration form
 */
function initBasicConfig() {
    if (window.configModified) return;  // skip if a template was applied
    const basicFields = {
        'username': 'ubuntu',
        'password': '',
        'hostname': 'ubuntu-server',
        'realname': 'ubuntu',
        'locale': 'en_US.UTF-8',
        'keyboard': 'us',
        'timezone': 'Asia/Shanghai',
        'kernel': 'linux-generic',
        'updates': 'security',
        'shutdown': 'reboot',
        'drivers': 'false'
    };
    
    Object.keys(basicFields).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            // Only set default value if field is empty or not set
            if (!element.value || element.value.trim() === '') {
                element.value = basicFields[key];
                console.log(`Setting default value for ${key}:`, basicFields[key]);
            } else {
                console.log(`Preserving user input for ${key}:`, element.value);
            }

            // Add input and blur events for required fields to remove error highlighting and perform light validation
            if (['username', 'password', 'hostname'].includes(key)) {
                element.addEventListener('input', function() {
                    this.classList.remove('input-error');
                });
                element.addEventListener('blur', function() {
                    if (!this.value || this.value.trim() === '') {
                        this.classList.add('input-error');
                    } else {
                        this.classList.remove('input-error');
                    }
                });
            }
        }
    });
}

/**
 * Initialize APT configuration
 */
function initAptConfig() {
    // Only set default values if APT configuration is not initialized
    const container = document.getElementById('aptPrimaryRepos');
    if (container && container.children.length === 0) {
        console.log('Initializing APT configuration with defaults');
        // Initialize primary repositories
        initAptPrimaryRepos();
        
        // Load additional repositories
        loadAdditionalRepos();
    } else {
        console.log('APT configuration already initialized, preserving user input');
    }
}

/**
 * Initialize APT primary repositories
 */
function initAptPrimaryRepos() {
    const container = document.getElementById('aptPrimaryRepos');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Add the 2 default repositories
    globalConfig.apt.primaryRepos.forEach((repo, index) => {
        const repoElement = createRepoElement(repo, index, true);
        container.appendChild(repoElement);
    });
}

/**
 * Create repository element
 */
function createRepoElement(repo, index, isPrimary = false) {
    const div = document.createElement('div');
    div.className = 'apt-repo-config';
    div.innerHTML = `
        <div class="apt-repo-header">
            <span class="apt-repo-type">Repository</span>
            <button type="button" class="remove-btn" onclick="removeAptRepo(this, ${index}, ${isPrimary})">Remove</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Architectures <span class="hint-icon" data-tooltip="CPU architectures this mirror serves (e.g. amd64,i386)">?</span></label>
                <input type="text" class="apt-arches" value="${repo.arches ? repo.arches.join(',') : ''}" onchange="updateRepo(${index}, 'arches', this.value, ${isPrimary})">
            </div>
            <div class="form-group">
                <label>URI <span class="hint-icon" data-tooltip="Repository base URL (e.g. http://archive.ubuntu.com/ubuntu)">?</span></label>
                <input type="text" class="apt-uri"  value="${repo.uri || ''}" onchange="updateRepo(${index}, 'uri', this.value, ${isPrimary})">
            </div>
        </div>
    `;
    // Add events for required inputs: remove error on input, highlight if empty on blur
    try {
        const archesInput = div.querySelector('.apt-arches');
        const uriInput = div.querySelector('.apt-uri');
        [archesInput, uriInput].forEach(function(el){
            if (!el) return;
            el.addEventListener('input', function(){ this.classList.remove('input-error'); });
            el.addEventListener('blur', function(){
                if (!this.value || this.value.trim() === '') {
                    this.classList.add('input-error');
                } else {
                    this.classList.remove('input-error');
                }
            });
        });
    } catch (e) { console.warn('Failed to attach APT input listeners', e); }
    return div;
}

/**
 * Add new repository - 完全还原原��版本
 */
function addAptRepo() {
    const newRepo = {
        arches: ['amd64'],
        uri: ''
    };
    
    globalConfig.apt.primaryRepos.push(newRepo);
    initAptPrimaryRepos();
}

/**
 * Remove repository
 */
function removeAptRepo(button, index, isPrimary) {
    if (isPrimary) {
        globalConfig.apt.primaryRepos.splice(index, 1);
        initAptPrimaryRepos();
    } else {
        globalConfig.apt.additionalRepos.splice(index, 1);
        loadAdditionalRepos();
    }
}

/**
 * Update repository configuration
 */
function updateRepo(index, field, value, isPrimary = false) {
    const repos = isPrimary ? globalConfig.apt.primaryRepos : globalConfig.apt.additionalRepos;
    if (repos[index]) {
        if (field === 'arches') {
            repos[index][field] = value.split(',').map(a => a.trim()).filter(a => a);
        } else {
            repos[index][field] = value;
        }
    }
}

/**
 * Load additional repositories
 */
function loadAdditionalRepos() {
    const container = document.getElementById('aptAdditionalRepos');
    if (!container) return;
    
    container.innerHTML = '';
    
    globalConfig.apt.additionalRepos.forEach((repo, index) => {
        const repoElement = createRepoElement(repo, index, false);
        container.appendChild(repoElement);
    });
}

/**
 * Build APT primary repositories configuration
 */
function buildAptPrimaryRepos() {
    const repos = [];
    const repoContainers = document.querySelectorAll('.apt-repo-config');
    
    repoContainers.forEach(container => {
        const archesInput = container.querySelector('.apt-arches');
        const uriInput = container.querySelector('.apt-uri');
        
        if (archesInput && uriInput) {
            const archesValue = archesInput.value;
            const uriValue = uriInput.value;
            
            if (archesValue && uriValue) {
                // Split arches by comma and trim whitespace
                const arches = archesValue.split(',').map(a => a.trim()).filter(a => a);
                
                if (arches.length > 0) {
                    repos.push({
                        arches: arches,
                        uri: uriValue
                    });
                }
            }
        }
    });
    
    // If no repos defined, use defaults
    if (repos.length === 0) {
        repos.push({
            arches: ["amd64", "i386"],
            uri: "http://archive.ubuntu.com/ubuntu"
        });
        repos.push({
            arches: ["default"],
            uri: "http://ports.ubuntu.com/ubuntu-ports"
        });
    }
    
    return repos;
}

/**
 * Load APT tab content
 */
function loadAptTab() {
    loadView('apt', '/static/views/apt.html', initAptConfig);
}

/**
 * Load Network tab content
 */
function loadNetworkTab() {
    loadView('network', '/static/views/network.html', () => {
        const container = document.getElementById('network');
        if (!container) return;
        // Check if initialization is already done by either loaded or initialized flag
        if (container.dataset.initialized === 'true') return;
        // Double-check devices aren't already present (prevents race condition)
        const existingDevice = container.querySelector('.network-device');
        if (existingDevice) {
            container.dataset.initialized = 'true';
            return;
        }
        if (window.NetworkManager && window.NetworkManager.initNetworkDevices) {
            window.NetworkManager.initNetworkDevices();
            container.dataset.initialized = 'true';
        }
    });
}

/**
 * Load Storage tab content
 */
function loadStorageTab() {
    loadView('storage', '/static/views/storage.html', () => {
        const container = document.getElementById('storage');
        if (container && container.dataset.initialized) return;
        if (window.StorageManager && window.StorageManager.initStorageConfigs) {
            console.log('Initializing storage configs in loadStorageTab callback');
            setTimeout(() => {
                window.StorageManager.initStorageConfigs();
                if (container) container.dataset.initialized = 'true';
                console.log('Storage configs initialized after timeout');
            }, 100);
        }
    });
}

/**
 * Load SSH tab content
 */
function loadSSHTab() {
    loadView('ssh', '/static/views/ssh.html');
}

/**
 * Load Advanced tab content
 */
function loadAdvancedTab() {
    loadView('advanced', '/static/views/advanced.html');
}

/**
 * Load tab content based on tab name
 */
function loadTabContent(tabName) {
    switch (tabName) {
        case 'apt':
            loadAptTab();
            break;
        case 'network':
            loadNetworkTab();
            break;
        case 'storage':
            loadStorageTab();
            break;
        case 'ssh':
            loadSSHTab();
            break;
        case 'advanced':
            loadAdvancedTab();
            break;
    }
}

/**
 * Initialize all configurations on page load.
 * Returns a Promise that resolves when all tab DOMs and managers are ready.
 * Call with `await` before loading default config so DOM elements exist.
 */
async function initializeAllConfigs() {
    console.log('Initializing all configurations on page load...');

    // Load all tab contents in parallel (all use forceReload=true so they always refresh)
    await Promise.all([
        loadView('basic', '/static/views/basic.html', () => {
            initBasicConfig();
        }),
        loadView('apt', '/static/views/apt.html', () => {
            initAptConfig();
        }),
        loadView('storage', '/static/views/storage.html', () => {
            // Wait for StorageManager to be available (set by script tag)
            function tryInitStorage() {
                const storageContainer = document.getElementById('storage');
                if (storageContainer && storageContainer.dataset.initialized === 'true') return;
                if (!window.StorageManager || !window.StorageManager.initStorageConfigs) {
                    setTimeout(tryInitStorage, 50);
                    return;
                }
                window.StorageManager.initStorageConfigs();
                if (storageContainer) storageContainer.dataset.initialized = 'true';
            }
            tryInitStorage();
        }),
        loadView('network', '/static/views/network.html', () => {
            const networkContainer = document.getElementById('network');
            if (!networkContainer || networkContainer.dataset.initialized === 'true') return;
            if (networkContainer.querySelector('.network-device')) {
                networkContainer.dataset.initialized = 'true';
                return;
            }
            if (window.NetworkManager && window.NetworkManager.initNetworkDevices) {
                window.NetworkManager.initNetworkDevices();
                networkContainer.dataset.initialized = 'true';
            }
        }),
        loadView('ssh', '/static/views/ssh.html'),
        loadView('advanced', '/static/views/advanced.html'),
        loadView('packages', '/static/views/packages.html'),
    ]);

    console.log('All configurations initialized on page load');
}

/**
 * Get current configuration
 */
function getCurrentConfig() {
    // Update basic config from form
    Object.keys(globalConfig.basic).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            globalConfig.basic[key] = element.value;
        }
    });
    
    return globalConfig;
}

/**
 * Load default configuration
 */
async function loadDefaultConfig() {
    console.log('loadDefaultConfig function called');
    try {
        const response = await fetch(`${API_BASE}/config/default`);
        const result = await response.json();

        if (!result.success || !result.config) {
            showStatus('configActionStatus', 'error', result.error || 'Failed to load default configuration');
            return;
        }

        // Mark modified BEFORE loading views so setDefaultValues is skipped
        window.configModified = true;

        // Force-load ALL tab DOMs so elements exist before applying config
        await Promise.all([
            loadView('basic', '/static/views/basic.html', null, true),
            loadView('apt', '/static/views/apt.html', null, true),
            loadView('network', '/static/views/network.html', null, true),
            loadView('storage', '/static/views/storage.html', null, true),
            loadView('ssh', '/static/views/ssh.html', null, true),
            loadView('advanced', '/static/views/advanced.html', null, true),
            loadView('packages', '/static/views/packages.html', null, true),
        ]);

        // Parse YAML via backend to avoid duplicating YAML logic in JS
        const parseResp = await fetch(`${API_BASE}/config/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yamlData: result.config }),
        });
        const parseResult = await parseResp.json();

        if (!parseResult.success || !parseResult.config) {
            showStatus('configActionStatus', 'error', parseResult.error || 'Failed to parse default configuration');
            return;
        }

        const auto = parseResult.config.autoinstall || {};

        // Ensure core managers are loaded before applying config
        const hasApt = !!(window.AptManager);
        const hasNetwork = !!(window.NetworkManager && window.NetworkManager.loadFromConfig);
        const hasStorage = !!(window.StorageManager && window.StorageManager.loadFromConfig);

        if (!hasNetwork || !hasStorage) {
            throw new Error('Managers not ready (NetworkManager/StorageManager). Refresh the page and try again.');
        }

        // Apply via the shared TemplatesManager API (fixes function-scope issues)
        if (!window.TemplatesManager || typeof window.TemplatesManager.applyAutoinstallConfigToUI !== 'function') {
            throw new Error('TemplatesManager not ready (applyAutoinstallConfigToUI missing). Refresh the page and try again.');
        }
        await window.TemplatesManager.applyAutoinstallConfigToUI(auto);

        showStatus('configActionStatus', 'success', 'Default configuration loaded successfully');
        if (typeof showNotification === 'function') {
            showNotification('Default template loaded successfully!', 'success');
        }

        if (typeof AppNavigation !== 'undefined') {
            AppNavigation.switchPage('config');
        }
    } catch (error) {
        showStatus('configActionStatus', 'error', 'Failed to load default configuration: ' + error.message);
    }
}

/**
 * Parse User Data YAML configuration from userDataRaw field
 * Supports multiple configuration types: timezone, disable_root, package_upgrade, runcmd, users, bootcmd
 * Maintains input order and structure
 */
function parseUserDataConfig() {
    const userDataRaw = document.getElementById('userDataRaw')?.value?.trim();
    
    if (!userDataRaw) {
        // Return empty object if no user data is provided
        return {};
    }
    
    try {
        // Simple YAML parsing for user-data configuration
        const lines = userDataRaw.split('\n');
        const config = {};
        let currentArray = null;
        let currentArrayName = null;
        let inUserBlock = false;
        let currentUser = null;
        let userArray = [];
        let indentLevel = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }
            
            // Calculate indentation level
            const currentIndent = line.length - line.trimStart().length;
            
            if (trimmedLine.includes(':')) {
                const [key, ...valueParts] = trimmedLine.split(':');
                const keyTrimmed = key.trim();
                const valueTrimmed = valueParts.join(':').trim();
                
                // Handle array declarations (key: with no value or array items)
                if (valueTrimmed === '' || (valueTrimmed === '' && i + 1 < lines.length && lines[i + 1].trim().startsWith('-'))) {
                    currentArrayName = keyTrimmed;
                    config[keyTrimmed] = [];
                    currentArray = config[keyTrimmed];
                    
                    if (keyTrimmed === 'users') {
                        inUserBlock = true;
                        userArray = currentArray;
                    } else {
                        inUserBlock = false;
                    }
                } else {
                    // Simple key-value pair
                    let value = valueTrimmed.replace(/^['"]|['"]$/g, ''); // Remove quotes
                    
                    // Handle boolean values
                    if (value === 'true' || value === 'false') {
                        value = value === 'true';
                    } else if (value === 'True' || value === 'False') {
                        value = value === 'True';
                    }
                    
                    config[keyTrimmed] = value;
                    inUserBlock = false;
                }
            } else if (trimmedLine.startsWith('- ')) {
                // Array item
                if (inUserBlock && currentUser && currentIndent > 0) {
                    // This is a property of the current user
                    const [prop, ...valueParts] = trimmedLine.substring(2).split(':');
                    const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
                    
                    if (prop === 'groups') {
                        currentUser[prop] = value.split(',').map(g => g.trim());
                    } else if (prop === 'lock_passwd') {
                        currentUser[prop] = value === 'True' || value === 'true';
                    } else {
                        currentUser[prop] = value;
                    }
                } else if (inUserBlock && trimmedLine.includes('name:')) {
                    // Start of new user
                    if (currentUser) {
                        userArray.push(currentUser);
                    }
                    currentUser = {};
                    const name = trimmedLine.split('name:')[1].trim().replace(/^['"]|['"]$/g, '');
                    currentUser.name = name;
                } else {
                    // Regular array item (for runcmd, bootcmd, etc.)
                    const item = trimmedLine.substring(2).trim().replace(/^['"]|['"]$/g, '');
                    
                    // Handle array items that are themselves arrays (like bootcmd)
                    if (item.startsWith('[') && item.endsWith(']')) {
                        try {
                            // Parse array syntax like [ cloud-init-per, once, mymkfs, mkfs, /dev/vdb ]
                            const arrayContent = item.slice(1, -1); // Remove [ and ]
                            const arrayItems = arrayContent.split(',').map(item => item.trim().replace(/^['"]|['"]$/g, ''));
                            currentArray.push(arrayItems);
                        } catch (e) {
                            // If parsing fails, treat as string
                            currentArray.push(item);
                        }
                    } else {
                        currentArray.push(item);
                    }
                }
            }
        }
        
        // Add the last user if exists
        if (inUserBlock && currentUser) {
            userArray.push(currentUser);
        }
        
        console.log('Parsed user-data config:', config);
        
        // Only return the config if it has actual content
        if (Object.keys(config).length > 0) {
            return config;
        } else {
            // If config is empty, return empty object
            return {};
        }
        
    } catch (error) {
        console.error('Error parsing user-data YAML:', error);
        // Return empty object if parsing fails
        return {};
    }
}

/**
 * Build configuration object in the format expected by the backend
 */
function buildConfig() {
    console.log('=== buildConfig function called ===');
    
    // Get password (plain text)
    const password = document.getElementById('password')?.value || '';
    

    
    const config = {
        autoinstall: {
            version: 1,
            apt: {
                disable_components: (() => {
                    const container = document.getElementById('aptDisableComponents');
                    if (!container) return [];
                    const selected = [];
                    container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => selected.push(cb.value));
                    return selected;
                })(),
                disable_suites: (() => {
                    const values = new Set();
                    const options = document.getElementById('aptDisableSuitesOptions');
                    if (options) {
                        options.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => values.add(cb.value));
                    }
                    // tags removed from UI; only collect from options
                    const arr = Array.from(values);
                    return arr.length ? arr : ["security"];
                })(),
                geoip: document.getElementById('aptGeoIP')?.value === 'true',
                preserve_sources_list: document.getElementById('aptPreserveSources')?.value === 'true' || false,
                primary: buildAptPrimaryRepos()
            },
            drivers: {
                install: document.getElementById('drivers')?.value === 'true' || false
            },
            identity: {
                hostname: document.getElementById('hostname')?.value || 'ubuntu-server',
                password: password,
                realname: document.getElementById('realname')?.value || 'ubuntu',
                username: document.getElementById('username')?.value || 'ubuntu'
            },
            kernel: {
                package: document.getElementById('kernel')?.value || 'linux-generic'
            },
            keyboard: {
                layout: document.getElementById('keyboard')?.value || 'us',
                toggle: "",
                variant: ""
            },
            locale: document.getElementById('locale')?.value || 'en_US.UTF-8',
            timezone: document.getElementById('timezone')?.value || 'Asia/Shanghai',
            network: {
                version: parseInt(document.getElementById('networkVersion')?.value || '2'),
                ethernets: {}
            },
            ssh: {
                "allow-pw": document.getElementById('sshAllowPW')?.value === 'true',
                "authorized-keys": document.getElementById('sshKeys')?.value?.split('\n').filter(k => k.trim()) || [],
                "install-server": document.getElementById('sshInstallServer')?.value === 'true'
            },
            storage: {
                config: [],
                swap: (() => {
                    const swapSize = document.getElementById('swapSize')?.value;
                    const swapUnit = document.getElementById('swapSizeUnit')?.value;
                    const swapFilename = document.getElementById('swapFilename')?.value || '/swap.img';
                    const swapMaxsize = document.getElementById('swapMaxsize')?.value;
                    const swapMaxsizeUnit = document.getElementById('swapMaxsizeUnit')?.value;
                    const swapForce = document.getElementById('swapForce')?.value === 'true';

                    // Build swap config only if size > 0
                    if (swapSize && parseFloat(swapSize) > 0) {
                        const sizeValue = parseFloat(swapSize);
                        // Convert size to string with unit suffix (e.g., "8G")
                        let sizeStr = sizeValue + swapUnit;

                        // Convert maxsize to string with unit suffix
                        let maxsizeStr = swapMaxsize + swapMaxsizeUnit;

                        return {
                            filename: swapFilename,
                            size: sizeStr,
                            maxsize: maxsizeStr,
                            force: swapForce
                        };
                    }
                    // If size is 0, set size to "0" to disable swap
                    return { size: "0" };
                })(),
                grub: {
                    reorder_uefi: document.getElementById('grubReorder')?.value === 'true' || false
                }
            },
            updates: document.getElementById('updates')?.value || 'security',
            shutdown: document.getElementById('shutdown')?.value || 'reboot',
            packages: document.getElementById('autoinstallPackages')?.value?.split('\n').filter(p => p.trim()) || [],
            "early-commands": document.getElementById('earlyCommands')?.value?.split('\n').filter(c => c.trim()) || [],
            "late-commands": document.getElementById('lateCommands')?.value?.split('\n').filter(c => c.trim()) || [],
            "error-commands": document.getElementById('errorCommands')?.value?.split('\n').filter(c => c.trim()) || []
        }
    };
    
    // Build network configuration - using NetworkManager's getNetworkConfig function
    let networkConfig;
    if (window.NetworkManager && window.NetworkManager.getNetworkConfig) {
        // Use NetworkManager's getNetworkConfig function to get complete network configuration
        networkConfig = window.NetworkManager.getNetworkConfig();
        console.log('Network config from NetworkManager:', networkConfig);
    } else {
        // Fallback: basic network configuration
        console.warn('NetworkManager.getNetworkConfig not available, using fallback');
        networkConfig = {
            version: parseInt(document.getElementById('networkVersion')?.value || '2'),
            renderer: document.getElementById('networkRenderer')?.value || 'networkd',
            ethernets: {
                eth0: {
                    match: { name: 'eth0' },
                    addresses: ['192.168.1.100/24'],
                    nameservers: { addresses: ['8.8.8.8', '8.8.4.4'] },
                    routes: [{ to: 'default', via: '192.168.1.1' }]
                }
            }
        };
    }
    
    config.autoinstall.network = networkConfig;
    
    // Add user-data configuration only if it's not empty
    const userDataConfig = parseUserDataConfig();
    if (Object.keys(userDataConfig).length > 0) {
        config.autoinstall["user-data"] = userDataConfig;
    }
    
    // Build storage configuration - dynamically read page configuration, not relying on hardcoded defaults
    const storageConfigs = document.querySelectorAll('.storage-config');
    let storageConfig = [];
    
    console.log('buildConfig: Found storage configs:', storageConfigs.length);
    
    if (storageConfigs.length > 0) {
        storageConfigs.forEach((storage, index) => {
            const storageType = storage.querySelector('.storage-type-input')?.value;
            console.log(`buildConfig: Storage ${index} type:`, storageType);
            
            if (storageType) {
                const configItem = {
                    type: storageType
                };
                
                // Read corresponding fields based on storage type
                switch (storageType) {
                    case 'disk':
                        const diskPath = storage.querySelector('.storage-path-input')?.value;
                        const grubDevice = storage.querySelector('.storage-grub-input')?.value;
                        const ptable = storage.querySelector('.storage-ptable-input')?.value;
                        const wipe = storage.querySelector('.storage-wipe-input')?.value;
                        const preserve = storage.querySelector('.storage-preserve-input')?.value;
                        const id = storage.querySelector('.storage-id-input')?.value;

                        console.log(`buildConfig: Disk ${index} values:`, { id, diskPath, grubDevice, ptable, wipe, preserve });

                        if (id) configItem.id = id;
                        if (diskPath) configItem.path = diskPath;
                        if (grubDevice !== undefined) configItem.grub_device = grubDevice === 'true';
                        if (ptable) configItem.ptable = ptable;
                        if (wipe) configItem.wipe = wipe;
                        if (preserve !== undefined) configItem.preserve = preserve === 'true';

                        // Read all match conditions (only if path is not set)
                        const matchRows = storage.querySelectorAll('.disk-match-row');
                        if (matchRows.length > 0 && !diskPath) {
                            const matchObj = {};
                            matchRows.forEach(row => {
                                const type = row.querySelector('.disk-match-type')?.value;
                                const valueEl = row.querySelector('.disk-match-value');
                                if (type && valueEl) {
                                    const raw = valueEl.value;
                                    if (raw !== '' && raw !== undefined) {
                                        matchObj[type] = (type === 'ssd') ? (raw === 'true') : raw;
                                    }
                                }
                            });
                            if (Object.keys(matchObj).length > 0) {
                                configItem.match = matchObj;
                            }
                        }
                        break;
                        
                    case 'partition':
                        const size = storage.querySelector('.storage-size-input')?.value;
                        const unit = storage.querySelector('.storage-size-unit')?.value;
                        const flag = storage.querySelector('.storage-flag-input')?.value;
                        const partitionDevice = storage.querySelector('.storage-device-input')?.value;
                        const partitionId = storage.querySelector('.storage-id-input')?.value;
                        const number = storage.querySelector('.storage-number-input')?.value;
                        const partitionWipe = storage.querySelector('.storage-wipe-input')?.value;
                        
                        if (partitionId) configItem.id = partitionId;
                        if (partitionDevice) configItem.device = partitionDevice;
                        if (number) configItem.number = parseInt(number);
                        if (size && unit) {
                            const sizeValue = parseFloat(size);
                            if (sizeValue === -1) {
                                configItem.size = -1;
                            } else if (sizeValue > 0) {
                                // Convert to bytes for backend compatibility
                                let sizeInBytes = sizeValue;
                                if (unit === 'K') sizeInBytes *= 1024;
                                else if (unit === 'M') sizeInBytes *= 1048576;
                                else if (unit === 'G') sizeInBytes *= 1073741824;
                                else if (unit === 'T') sizeInBytes *= 1099511627776;
                                configItem.size = Math.round(sizeInBytes);
                            }
                        }
                        if (flag) configItem.flag = flag;
                        if (partitionWipe) configItem.wipe = partitionWipe;

                        // GRUB device for partition
                        const partitionGrubDevice = storage.querySelector('.storage-grub-device-input')?.value;
                        if (partitionGrubDevice !== undefined) {
                            configItem.grub_device = partitionGrubDevice === 'true';
                        }
                        break;
                        
                    case 'format':
                        const format = storage.querySelector('.storage-fstype-input')?.value;
                        const volume = storage.querySelector('.storage-volume-input')?.value;
                        const formatId = storage.querySelector('.storage-id-input')?.value;
                        const formatPreserve = storage.querySelector('.storage-preserve-input')?.value;
                        
                        if (formatId) configItem.id = formatId;
                        if (format) configItem.fstype = format;
                        if (volume) configItem.volume = volume;
                        if (formatPreserve !== undefined) configItem.preserve = formatPreserve === 'true';
                        break;

                    case 'raid':
                        const raidName = storage.querySelector('.storage-raid-name-input')?.value;
                        const raidLevel = storage.querySelector('.storage-raidlevel-input')?.value;
                        const raidDevices = storage.querySelector('.storage-devices-input')?.value;
                        const raidMetadata = storage.querySelector('.storage-raid-metadata-input')?.value;
                        const raidPtable = storage.querySelector('.storage-ptable-input')?.value;
                        const raidPreserve = storage.querySelector('.storage-preserve-input')?.value;
                        const raidWipe = storage.querySelector('.storage-wipe-input')?.value;
                        const raidId = storage.querySelector('.storage-id-input')?.value;

                        if (raidId) configItem.id = raidId;
                        if (raidName) configItem.name = raidName;
                        if (raidLevel) configItem.raidlevel = raidLevel;
                        if (raidDevices) configItem.devices = raidDevices.split('\n').map(d => d.trim()).filter(d => d);
                        if (raidMetadata) configItem.metadata = raidMetadata;
                        if (raidPtable) configItem.ptable = raidPtable;
                        if (raidPreserve !== undefined) configItem.preserve = raidPreserve === 'true';
                        if (raidWipe) configItem.wipe = raidWipe;
                        break;

                    case 'mount':
                        const mountPoint = storage.querySelector('.storage-path-input')?.value;
                        const mountDevice = storage.querySelector('.storage-device-input')?.value;
                        const mountId = storage.querySelector('.storage-id-input')?.value;
                        const mountPreserve = storage.querySelector('.storage-preserve-input')?.value;
                        
                        if (mountId) configItem.id = mountId;
                        if (mountPoint) configItem.path = mountPoint;
                        if (mountDevice) configItem.device = mountDevice;
                        if (mountPreserve !== undefined) configItem.preserve = mountPreserve === 'true';
                        break;
                        
                    case 'lvm_volgroup':
                        const vgName = storage.querySelector('.storage-name-input')?.value;
                        const vgDevices = storage.querySelector('.storage-devices-input')?.value;
                        const vgId = storage.querySelector('.storage-id-input')?.value;
                        
                        if (vgId) configItem.id = vgId;
                        if (vgName) configItem.name = vgName;
                        if (vgDevices) configItem.devices = vgDevices.split(',').map(d => d.trim());
                        break;
                        
                    case 'lvm_partition':
                        const lvSize = storage.querySelector('.storage-size-input')?.value;
                        const lvUnit = storage.querySelector('.storage-size-unit')?.value;
                        const lvName = storage.querySelector('.storage-name-input')?.value;
                        const lvVolgroup = storage.querySelector('.storage-volgroup-input')?.value;
                        const lvId = storage.querySelector('.storage-id-input')?.value;
                        
                        if (lvId) configItem.id = lvId;
                        if (lvName) configItem.name = lvName;
                        if (lvVolgroup) configItem.volgroup = lvVolgroup;
                        if (lvSize && lvUnit) {
                            const sizeValue = parseFloat(lvSize);
                            if (sizeValue === -1) {
                                configItem.size = -1;
                            } else if (sizeValue > 0) {
                                // Convert to bytes for backend compatibility
                                let sizeInBytes = sizeValue;
                                if (lvUnit === 'K') sizeInBytes *= 1024;
                                else if (lvUnit === 'M') sizeInBytes *= 1048576;
                                else if (lvUnit === 'G') sizeInBytes *= 1073741824;
                                else if (lvUnit === 'T') sizeInBytes *= 1099511627776;
                                configItem.size = Math.round(sizeInBytes);
                            } else {
                                configItem.size = 0;
                            }
                        }
                        break;
                        
                    case 'dm_crypt':
                        const cryptVolume = storage.querySelector('.storage-volume-input')?.value;
                        const cryptId = storage.querySelector('.storage-id-input')?.value;
                        const dmName = storage.querySelector('.storage-dm-name-input')?.value;
                        const key = storage.querySelector('.storage-key-input')?.value;
                        const keyFile = storage.querySelector('.storage-keyfile-input')?.value;
                        const cryptPreserve = storage.querySelector('.storage-preserve-input')?.value;
                        const cryptWipe = storage.querySelector('.storage-wipe-input')?.value;
                        
                        if (cryptId) configItem.id = cryptId;
                        if (cryptVolume) configItem.volume = cryptVolume;
                        if (dmName) configItem.dm_name = dmName;
                        if (key) configItem.key = key;
                        if (keyFile) configItem.keyfile = keyFile;
                        if (cryptPreserve !== undefined) configItem.preserve = cryptPreserve === 'true';
                        if (cryptWipe) configItem.wipe = cryptWipe;
                        break;
                }
                
                // Only add to configuration if item has actual content
                if (Object.keys(configItem).length > 1) { // Other fields besides type field
                    storageConfig.push(configItem);
                }
            }
        });
    }
    
    // Only add basic default configuration when there's no storage configuration at all (for backend validation)
    if (storageConfig.length === 0) {
        console.log('No storage configs found, adding minimal default for backend validation');
        storageConfig = [
            {
                type: 'disk',
                id: 'disk0',
                grub_device: true,
                ptable: 'gpt',
                wipe: 'superblock-recursive',
                match: { size: 'largest' },
                preserve: false
            }
        ];
    }
    
    config.autoinstall.storage.config = storageConfig;
    
    console.log('Built config:', config);
    return config;
}

/**
 * Validate configuration
 */
async function validateConfig() {
    // First perform frontend required field validation
    const basicOk = validateBasicRequired('configStatus');
    if (!basicOk) {
        return { valid: false, errors: ['Basic required fields missing'] };
    }

    // APT required field validation
    const aptOk = validateAptRequired('configStatus');
    if (!aptOk) {
        return { valid: false, errors: ['APT required fields missing'] };
    }

    // Storage required field validation
    if (window.StorageManager && window.StorageManager.validateStorageConfig) {
        const storageResult = window.StorageManager.validateStorageConfig('configStatus');
        if (!storageResult.valid) {
            return { valid: false, errors: storageResult.errors };
        }
    }

    // Network required field validation
    if (window.NetworkManager && window.NetworkManager.validateNetworkConfig) {
        const networkResult = window.NetworkManager.validateNetworkConfig('configStatus');
        if (!networkResult.valid) {
            return { valid: false, errors: networkResult.errors };
        }
    }

    const config = buildConfig(); // Use buildConfig instead of getCurrentConfig
    
    // Add detailed debug information
    console.log('=== Validate Config Debug Info ===');
    console.log('API Endpoint:', `${API_BASE}/config/validate`);
    console.log('Request Body:', JSON.stringify({ config: config }, null, 2));
    console.log('Config Structure:', config);
    
    try {
        // First try using API validation
        const response = await fetch(`${API_BASE}/config/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config: config })
        });
        
        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers);
        
        // Keep consistent with original version: don't check response.ok, directly try to parse JSON
        try {
            const result = await response.json();
            console.log('Response Body:', result);
            showStatus('configActionStatus', result.success ? 'success' : 'error', result.message || result.error);
            return { valid: !!result.success, errors: result.success ? [] : [result.message || result.error || 'Validation failed'] };
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            // If parsing fails, use local validation
            console.log('Response parsing failed, using local validation');
            const localValidationResult = validateConfigLocally(config);
            if (localValidationResult.valid) {
                showStatus('configActionStatus', 'success', 'Configuration is valid (local validation)');
                return { valid: true, errors: [] };
            } else {
                showStatus('configActionStatus', 'error', `Configuration validation failed: ${localValidationResult.errors.join(', ')}`);
                return { valid: false, errors: localValidationResult.errors };
            }
        }
        
    } catch (error) {
        console.error('Configuration validation error:', error);
        // If API call fails, use local validation
        console.log('API validation error, using local validation');
        const localValidationResult = validateConfigLocally(config);
        if (localValidationResult.valid) {
            showStatus('configActionStatus', 'success', 'Configuration is valid (local validation)');
            return { valid: true, errors: [] };
        } else {
            showStatus('configActionStatus', 'error', `Configuration validation failed: ${localValidationResult.errors.join(', ')}`);
            return { valid: false, errors: localValidationResult.errors };
        }
    }
}

/**
 * Local configuration validation when API is not available
 */
function validateConfigLocally(config) {
    const errors = [];
    
    try {
        // Validate basic configuration
        if (!config.basic) {
            errors.push('Basic configuration is missing');
        } else {
            if (!config.basic.username || config.basic.username.trim() === '') {
                errors.push('Username is required');
            }
            if (!config.basic.password || config.basic.password.trim() === '') {
                errors.push('Password is required');
            }
            if (!config.basic.hostname || config.basic.hostname.trim() === '') {
                errors.push('Hostname is required');
            }
        }
        
        // Validate APT configuration
        if (config.apt && config.apt.primaryRepos) {
            if (!Array.isArray(config.apt.primaryRepos) || config.apt.primaryRepos.length === 0) {
                errors.push('At least one primary repository is required');
            } else {
                config.apt.primaryRepos.forEach((repo, index) => {
                    if (!repo.uri || repo.uri.trim() === '') {
                        errors.push(`Repository ${index + 1} URI is required`);
                    }
                    if (!repo.arches || !Array.isArray(repo.arches) || repo.arches.length === 0) {
                        errors.push(`Repository ${index + 1} architectures are required`);
                    }
                });
            }
        }
        
        // Validate network configuration
        if (config.network) {
            if (config.network.devices && Array.isArray(config.network.devices)) {
                config.network.devices.forEach((device, index) => {
                    if (!device.name || device.name.trim() === '') {
                        errors.push(`Network device ${index + 1} name is required`);
                    }
                    if (!device.type || device.type.trim() === '') {
                        errors.push(`Network device ${index + 1} type is required`);
                    }
                });
            }
        }
        
        // Validate storage configuration
        if (config.storage && config.storage.configs) {
            if (Array.isArray(config.storage.configs)) {
                config.storage.configs.forEach((storageConfig, index) => {
                    if (!storageConfig.type || storageConfig.type.trim() === '') {
                        errors.push(`Storage config ${index + 1} type is required`);
                    }
                    if (storageConfig.type === 'disk' && (!storageConfig.device || storageConfig.device.trim() === '')) {
                        errors.push(`Storage config ${index + 1} device is required for disk type`);
                    }
                });
            }
        }
        
        // Validate SSH configuration
        if (config.ssh) {
            if (config.ssh.enabled && config.ssh.authorizedKeys && Array.isArray(config.ssh.authorizedKeys)) {
                config.ssh.authorizedKeys.forEach((key, index) => {
                    if (!key || key.trim() === '') {
                        errors.push(`SSH authorized key ${index + 1} is empty`);
                    }
                });
            }
        }
        
        // Validate advanced configuration
        if (config.advanced) {
            if (config.advanced.packages && Array.isArray(config.advanced.packages)) {
                config.advanced.packages.forEach((pkg, index) => {
                    if (!pkg || pkg.trim() === '') {
                        errors.push(`Package ${index + 1} is empty`);
                    }
                });
            }
            
            if (config.advanced.scripts && Array.isArray(config.advanced.scripts)) {
                config.advanced.scripts.forEach((script, index) => {
                    if (!script || script.trim() === '') {
                        errors.push(`Script ${index + 1} is empty`);
                    }
                });
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
        
    } catch (error) {
        console.error('Local validation error:', error);
        return {
            valid: false,
            errors: ['Local validation failed: ' + error.message]
        };
    }
}

/**
 * Preview user data configuration
 */
async function previewUserData() {
    // First perform frontend required field validation (consistent with overall validation)
    const basicOk = validateBasicRequired('configStatus');
    if (!basicOk) {
        return { valid: false, errors: ['Basic required fields missing'] };
    }
    const aptOk = validateAptRequired('configStatus');
    if (!aptOk) {
        return { valid: false, errors: ['APT required fields missing'] };
    }
    if (window.StorageManager && window.StorageManager.validateStorageConfig) {
        const storageResult = window.StorageManager.validateStorageConfig('configStatus');
        if (!storageResult.valid) {
            return { valid: false, errors: storageResult.errors };
        }
    }

    // Network required field validation
    if (window.NetworkManager && window.NetworkManager.validateNetworkConfig) {
        const networkResult = window.NetworkManager.validateNetworkConfig('configStatus');
        if (!networkResult.valid) {
            return { valid: false, errors: networkResult.errors };
        }
    }

    const config = buildConfig(); // Use buildConfig instead of getCurrentConfig
    
    // Add debug information
    console.log('=== previewUserData Debug Info ===');
    console.log('Full config object:', config);
    console.log('Network config:', config.autoinstall?.network);

    try {
        // Use correct API endpoint
        const response = await fetch(`${API_BASE}/userdata/preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config: config })
        });
        
        console.log('API response status:', response.status);

        // Keep consistent with original version: don't check response.ok, directly try to parse JSON
        const result = await response.json();
        console.log('API response result:', result);

        if (result.success) {
            // Display YAML configuration content
            const previewElement = document.getElementById('configPreview');
            if (previewElement) {
                previewElement.textContent = result["user-data"] || result.userData || result.preview || 'Configuration preview generated';
                previewElement.style.display = 'block';
            }
            showStatus('configStatus', 'success', 'Configuration preview generated successfully');
            if (window.AppNavigation) window.AppNavigation.switchPage('preview');
        } else {
            showStatus('configStatus', 'error', result.error || 'Configuration preview failed');
        }
    } catch (error) {
        console.error('Configuration preview error:', error);
        console.log('API failed, falling back to local preview');
        // If API call fails, create local configuration preview
        createLocalConfigPreview(config);
    }
}

/**
 * Create local configuration preview when API is not available
 */
function createLocalConfigPreview(config) {
    try {
        const previewElement = document.getElementById('configPreview');
        if (!previewElement) {
            showStatus('configStatus', 'error', 'Preview element not found');
            return;
        }
        
        // Create formatted configuration preview
        let previewContent = '# AutoISO Configuration Preview\n\n';
        
        // Basic Configuration
        if (config.autoinstall) {
            previewContent += '## Basic Configuration\n';
            if (config.autoinstall.identity) {
                previewContent += `username: ${config.autoinstall.identity.username}\n`;
                previewContent += `password: ${config.autoinstall.identity.password ? '***' : ''}\n`;
                previewContent += `hostname: ${config.autoinstall.identity.hostname}\n`;
                previewContent += `realname: ${config.autoinstall.identity.realname}\n`;
            }
            if (config.autoinstall.locale) {
                previewContent += `locale: ${config.autoinstall.locale}\n`;
            }
            if (config.autoinstall.keyboard && config.autoinstall.keyboard.layout) {
                previewContent += `keyboard: ${config.autoinstall.keyboard.layout}\n`;
            }
            if (config.autoinstall.timezone) {
                previewContent += `timezone: ${config.autoinstall.timezone}\n`;
            }
            if (config.autoinstall.kernel && config.autoinstall.kernel.package) {
                previewContent += `kernel: ${config.autoinstall.kernel.package}\n`;
            }
            if (config.autoinstall.updates) {
                previewContent += `updates: ${config.autoinstall.updates}\n`;
            }
            if (config.autoinstall.shutdown) {
                previewContent += `shutdown: ${config.autoinstall.shutdown}\n`;
            }
            if (config.autoinstall.drivers && config.autoinstall.drivers.install !== undefined) {
                previewContent += `drivers: ${config.autoinstall.drivers.install}\n`;
            }
            previewContent += '\n';
        }
        
        // APT Configuration
        if (config.autoinstall && config.autoinstall.apt) {
            previewContent += '## APT Configuration\n';
            if (config.autoinstall.apt.primary) {
                previewContent += 'primary_repos:\n';
                config.autoinstall.apt.primary.forEach((repo, index) => {
                    previewContent += `  - arches: [${repo.arches.join(', ')}]\n`;
                    previewContent += `    uri: ${repo.uri}\n`;
                });
            }
            if (config.autoinstall.apt.disable_components && config.autoinstall.apt.disable_components.length > 0) {
                previewContent += `disable_components: [${config.autoinstall.apt.disable_components.join(', ')}]\n`;
            }
            if (config.autoinstall.apt.disable_suites && config.autoinstall.apt.disable_suites.length > 0) {
                previewContent += `disable_suites: [${config.autoinstall.apt.disable_suites.join(', ')}]\n`;
            }
            previewContent += '\n';
        }
        
        // Network Configuration
        // Use autoinstall.network instead of config.network
        const net = config.autoinstall && config.autoinstall.network ? config.autoinstall.network : null;
        if (net) {
            previewContent += '## Network Configuration\n';
            previewContent += `version: ${net.version || 2}\n`;
            previewContent += `renderer: ${net.renderer || 'networkd'}\n`;

            // Display network devices
            Object.keys(net).forEach(deviceType => {
                if (deviceType === 'version' || deviceType === 'renderer') return;

                const devices = net[deviceType];
                if (devices && typeof devices === 'object') {
                    previewContent += `\n${deviceType}:\n`;

                    Object.keys(devices).forEach(deviceName => {
                        const device = devices[deviceName];
                        previewContent += `  ${deviceName}:\n`;

                        // DHCP configuration
                        if (device.dhcp4 !== undefined) {
                            previewContent += `    dhcp4: ${device.dhcp4}\n`;
                        }
                        if (device.dhcp6 !== undefined) {
                            previewContent += `    dhcp6: ${device.dhcp6}\n`;
                        }

                        // Static IP addresses
                        if (device.addresses && device.addresses.length > 0) {
                            previewContent += `    addresses:\n`;
                            device.addresses.forEach(addr => {
                                previewContent += `      - ${addr}\n`;
                            });
                        }

                        // DNS configuration
                        if (device.nameservers) {
                            previewContent += `    nameservers:\n`;
                            if (device.nameservers.addresses && device.nameservers.addresses.length > 0) {
                                previewContent += `      addresses:\n`;
                                device.nameservers.addresses.forEach(ns => {
                                    previewContent += `        - ${ns}\n`;
                                });
                            }
                            if (device.nameservers.search && device.nameservers.search.length > 0) {
                                previewContent += `      search:\n`;
                                device.nameservers.search.forEach(domain => {
                                    previewContent += `        - ${domain}\n`;
                                });
                            }
                        }

                        // MTU
                        if (device.mtu) {
                            previewContent += `    mtu: ${device.mtu}\n`;
                        }

                        // Match configuration
                        if (device.match) {
                            previewContent += `    match:\n`;
                            if (device.match.name) {
                                previewContent += `      name: ${device.match.name}\n`;
                            }
                            if (device.match.macaddress) {
                                previewContent += `      macaddress: ${device.match.macaddress}\n`;
                            }
                            if (device.match.driver) {
                                previewContent += `      driver: ${device.match.driver}\n`;
                            }
                        }

                        // Routes
                        if (device.routes && device.routes.length > 0) {
                            previewContent += `    routes:\n`;
                            device.routes.forEach(route => {
                                previewContent += `      - to: ${route.to}\n`;
                                if (route.via) previewContent += `        via: ${route.via}\n`;
                                if (route.metric) {
                                    previewContent += `        metric: ${route.metric}\n`;
                                }
                            });
                        }

                        // Device-specific configuration
                        if (deviceType === 'wifis') {
                            const apsHyphen = device['access-points'];
                            const apsUnderscore = device['access_points'];
                            const accessPoints = apsHyphen || apsUnderscore;
                            if (accessPoints && typeof accessPoints === 'object') {
                                previewContent += `    access-points:\n`;
                                Object.keys(accessPoints).forEach(ssid => {
                                    const ap = accessPoints[ssid];
                                    previewContent += `      "${ssid}":\n`;
                                    if (ap.password) {
                                        previewContent += `        password: "***"\n`;
                                    }
                                    if (ap.hidden !== undefined) {
                                        previewContent += `        hidden: ${ap.hidden}\n`;
                                    }
                                    if (ap.band) {
                                        previewContent += `        band: ${ap.band}\n`;
                                    }
                                });
                            }
                        }

                        if (deviceType === 'bridges') {
                            if (device.interfaces && device.interfaces.length > 0) {
                                previewContent += `    interfaces: [${device.interfaces.join(', ')}]` + "\n";
                            }
                            const params = device.parameters || {};
                            if (params.stp !== undefined) {
                                previewContent += `    parameters:` + "\n";
                                previewContent += `      stp: ${params.stp}` + "\n";
                                if (params['forward-delay'] !== undefined) {
                                    previewContent += `      forward-delay: ${params['forward-delay']}` + "\n";
                                }
                                if (params['ageing-time'] !== undefined) {
                                    previewContent += `      ageing-time: ${params['ageing-time']}` + "\n";
                                }
                            } else if (params && (params['forward-delay'] !== undefined || params['ageing-time'] !== undefined)) {
                                previewContent += `    parameters:` + "\n";
                                if (params['forward-delay'] !== undefined) {
                                    previewContent += `      forward-delay: ${params['forward-delay']}` + "\n";
                                }
                                if (params['ageing-time'] !== undefined) {
                                    previewContent += `      ageing-time: ${params['ageing-time']}` + "\n";
                                }
                            }
                        }

                        if (deviceType === 'bonds') {
                            if (device.interfaces && device.interfaces.length > 0) {
                                previewContent += `    interfaces: [${device.interfaces.join(', ')}]\n`;
                            }
                            if (device.parameters) {
                                previewContent += `    parameters:\n`;
                                Object.keys(device.parameters).forEach(param => {
                                    previewContent += `      ${param}: ${device.parameters[param]}\n`;
                                });
                            }
                        }

                        if (deviceType === 'vlans') {
                            if (device.id) {
                                previewContent += `    id: ${device.id}\n`;
                            }
                            if (device.link) {
                                previewContent += `    link: ${device.link}\n`;
                            }
                        }

                        if (deviceType === 'tunnels') {
                            if (device.mode) {
                                previewContent += `    mode: ${device.mode}\n`;
                            }
                            if (device.local) {
                                previewContent += `    local: ${device.local}\n`;
                            }
                            if (device.remote) {
                                previewContent += `    remote: ${device.remote}\n`;
                            }
                            if (device.key) {
                                previewContent += `    key: ${device.key}\n`;
                            }
                            if (device.ttl) {
                                previewContent += `    ttl: ${device.ttl}\n`;
                            }
                            if (device.port) {
                                previewContent += `    port: ${device.port}\n`;
                            }
                        }

                        if (deviceType === 'modems') {
                            if (device.apn) {
                                previewContent += `    apn: ${device.apn}\n`;
                            }
                            if (device.pin) {
                                previewContent += `    pin: "***"\n`;
                            }
                        }

                        if (deviceType === 'vrfs') {
                            if (device.table) {
                                previewContent += `    table: ${device.table}\n`;
                            }
                            if (device.interfaces && device.interfaces.length > 0) {
                                previewContent += `    interfaces: [${device.interfaces.join(', ')}]\n`;
                            }
                        }

                        if (deviceType === 'dummy-devices') {
                            if (device.optional !== undefined) {
                                previewContent += `    optional: ${device.optional}\n`;
                            }
                            if (device.critical !== undefined) {
                                previewContent += `    critical: ${device.critical}\n`;
                            }
                        }

                        if (deviceType === 'nm-devices') {
                            if (device.uuid) {
                                previewContent += `    uuid: ${device.uuid}\n`;
                            }
                            if (device.device) {
                                previewContent += `    device: ${device.device}\n`;
                            }
                            if (device.name) {
                                previewContent += `    name: ${device.name}\n`;
                            }
                            if (device.passthrough) {
                                previewContent += `    passthrough: ${typeof device.passthrough === 'string' ? device.passthrough : JSON.stringify(device.passthrough)}\n`;
                            }
                        }
                    });
                }
            });
            previewContent += '\n';
        }
        
        // Storage Configuration
        if (config.storage) {
            previewContent += '## Storage Configuration\n';
            previewContent += 'storage:\n';
            previewContent += '  layout:\n';
            previewContent += '    name: lvm\n';
            previewContent += '\n';
        }
        
        // SSH Configuration
        if (config.autoinstall && config.autoinstall.ssh) {
            previewContent += '## SSH Configuration\n';
            previewContent += `ssh:\n`;
            if (config.autoinstall.ssh['install-server'] !== undefined) {
                previewContent += `  install_server: ${config.autoinstall.ssh['install-server']}\n`;
            }
            if (config.autoinstall.ssh['allow-pw'] !== undefined) {
                previewContent += `  allow_pw: ${config.autoinstall.ssh['allow-pw']}\n`;
            }
            if (config.autoinstall.ssh['authorized-keys'] && config.autoinstall.ssh['authorized-keys'].length > 0) {
                previewContent += '  authorized_keys:\n';
                config.autoinstall.ssh['authorized-keys'].forEach(key => {
                    previewContent += `    - ${key}\n`;
                });
            }
            previewContent += '\n';
        }
        
        // Advanced Configuration
        if (config.autoinstall) {
            previewContent += '## Advanced Configuration\n';
            if (config.autoinstall.packages && config.autoinstall.packages.length > 0) {
                previewContent += 'packages:\n';
                config.autoinstall.packages.forEach(pkg => {
                    previewContent += `  - ${pkg}\n`;
                });
                previewContent += '\n';
            }
            
            if (config.autoinstall['late-commands'] && config.autoinstall['late-commands'].length > 0) {
                previewContent += 'late_commands:\n';
                config.autoinstall['late-commands'].forEach(cmd => {
                    previewContent += `  - ${cmd}\n`;
                });
                previewContent += '\n';
            }
            
            if (config.autoinstall['user-data'] && config.autoinstall['user-data'].runcmd && config.autoinstall['user-data'].runcmd.length > 0) {
                previewContent += 'user_data_commands:\n';
                config.autoinstall['user-data'].runcmd.forEach(cmd => {
                    previewContent += `  - ${cmd}\n`;
                });
                previewContent += '\n';
            }
        }
        
        // Display preview content
        previewElement.textContent = previewContent;
        previewElement.style.display = 'block';
        showStatus('configStatus', 'success', 'Local configuration preview generated');
        if (window.AppNavigation) window.AppNavigation.switchPage('preview');

    } catch (error) {
        console.error('Local preview generation error:', error);
        showStatus('configStatus', 'error', 'Failed to generate local configuration preview');
    }
}

/**
 * Toggle source type (local vs download)
 */
function toggleSourceType() {
    const sourceType = document.querySelector('input[name="sourceType"]:checked').value;
    const localSection = document.getElementById('localIsoSection');
    const downloadSection = document.getElementById('downloadIsoSection');
    
    console.log('toggleSourceType called, sourceType:', sourceType);
    
    if (sourceType === 'local') {
        localSection.style.display = 'block';
        downloadSection.style.display = 'none';
        console.log('Showing local ISO section, hiding download section');
    } else {
        localSection.style.display = 'none';
        downloadSection.style.display = 'block';
        console.log('Showing download section, hiding local ISO section');
    }
}

/**
 * Handle file selection: upload to server with progress
 */
async function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    console.log('File selected:', file.name, 'Size:', file.size);

    // Show file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').style.display = 'flex';

    // Prepare hidden input for server-side saved path
    let sourceISOInput = document.getElementById('sourceISO');
    if (!sourceISOInput) {
        console.log('Creating new sourceISO hidden input element');
        sourceISOInput = document.createElement('input');
        sourceISOInput.type = 'hidden';
        sourceISOInput.id = 'sourceISO';
        document.getElementById('localIsoSection').appendChild(sourceISOInput);
        console.log('sourceISO element created and added to DOM');
    } else {
        console.log('Found existing sourceISO element:', sourceISOInput);
    }
    
    console.log('sourceISO element before upload:', sourceISOInput);

    // Disable Generate button during upload
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.disabled = true;

    // Show upload progress UI
    const progressContainer = document.getElementById('uploadProgressContainer');
    const progressFill = document.getElementById('uploadProgressFill');
    const progressText = document.getElementById('uploadProgressText');
    const uploadStatusText = document.getElementById('uploadStatusText');
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    uploadStatusText.textContent = 'Uploading...';

    try {
        // Use XHR to track upload progress
        const formData = new FormData();
        formData.append('iso', file);

        const uploadUrl = `${API_BASE}/iso/upload`;
        const responseData = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl, true);
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `${percent}%`;
                }
            };
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (err) {
                        reject(new Error('Invalid upload response'));
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };
            xhr.onerror = function () { reject(new Error('Network error during upload')); };
            xhr.send(formData);
        });

        if (responseData && responseData.success && responseData.filePath) {
            sourceISOInput.value = responseData.filePath;
            progressFill.style.width = '100%';
            progressText.textContent = '100%';
            uploadStatusText.textContent = 'Upload completed';
            console.log('Upload completed successfully');
            if (generateBtn) generateBtn.disabled = false;
        } else {
            throw new Error(responseData && responseData.error ? responseData.error : 'Upload failed');
        }
    } catch (err) {
        uploadStatusText.textContent = `Upload error: ${err.message}`;
        console.error('Upload failed:', err.message);
        if (generateBtn) generateBtn.disabled = false;
    }
}

/**
 * Remove selected file
 */
function removeSelectedFile() {
    const fileInput = document.getElementById('isoFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const sourceISOInput = document.getElementById('sourceISO');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (sourceISOInput) sourceISOInput.value = '';
    
    console.log('Selected file removed');
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Global variables for build management
let buildInProgress = false;
let currentBuildID = null;
let buildLogs = [];

/**
 * Generate ISO image
 */
async function generateISO() {
    if (buildInProgress) {
        showStatus('isoStatus', 'warning', 'Build already in progress');
        return;
    }
    
    console.log('Starting ISO generation...');
    
    // Validate inputs
    const sourceType = document.querySelector('input[name="sourceType"]:checked').value;
    const sourceISO = document.getElementById('sourceISO')?.value || '';
    const codename = document.getElementById('codename').value;
    const destinationISO = document.getElementById('destinationISO').value;
    const userData = document.getElementById('userDataContent').value;
    
    console.log('Validation inputs:', {
        sourceType: sourceType,
        sourceISO: sourceISO,
        sourceISOElement: document.getElementById('sourceISO'),
        codename: codename,
        destinationISO: destinationISO,
        userData: userData ? 'provided' : 'missing'
    });
    
    if (sourceType === 'local' && !sourceISO) {
        console.error('Local ISO file validation failed: sourceISO is empty');
        console.log('sourceISO element:', document.getElementById('sourceISO'));
        
        // Temporary: for testing, allow continued execution
        console.warn('TEMP: Allowing execution without ISO file for testing purposes');
        // showStatus('isoStatus', 'error', 'Please upload a local ISO file first');
        // return;
    }
    
    if (!destinationISO) {
        showStatus('isoStatus', 'error', 'Please provide destination ISO name');
        return;
    }
    
    if (!userData) {
        showStatus('isoStatus', 'error', 'Please provide user-data configuration');
        return;
    }
    
    // Get package list from Additional Packages tab
    const additionalPackagesText = document.getElementById('additionalPackages')?.value || '';
    const packageList = additionalPackagesText.split('\n')
        .map(pkg => pkg.trim())
        .filter(pkg => pkg.length > 0);
    
    // Get GPG verification setting (only applicable for download source type)
    const gpgVerify = sourceType === 'download' ? 
        document.getElementById('gpgVerifyCheckbox').checked : false;
    
    // Get advanced options
    const useHWEKernel = document.getElementById('useHWEKernelCheckbox').checked;
    const md5Checksum = document.getElementById('md5ChecksumCheckbox').checked;
    
    // Start build process
    buildInProgress = true;
    console.log('Build in progress set to true');
    
    resetBuildProgress();
    console.log('Build progress reset completed');
    
    console.log('About to call showBuildProgress...');
    showBuildProgress();
    console.log('showBuildProgress called successfully');
    
    try {
        const data = {
            sourceType: sourceType,
            sourceISO: sourceISO,
            codeName: codename,
            destinationISO: destinationISO,
            userData: userData,
            packageList: packageList,
            useHWEKernel: useHWEKernel,
            md5Checksum: md5Checksum,
            gpgVerify: gpgVerify
        };
        
        console.log('Build data:', data);
        
        // Start the build process with real API call
        await callGenerateISOAPI(data);
        
    } catch (error) {
        addLog('error', `Build failed: ${error.message}`);
        showStatus('isoStatus', 'error', `Build failed: ${error.message}`);
        buildInProgress = false;
        restoreGenerateButton();
    }
}

/**
 * Call the real Generate ISO API with real-time status updates
 */
async function callGenerateISOAPI(data) {
    try {
        addLog('info', 'Starting ISO generation...');
        
        const response = await fetch(`${API_BASE}/iso/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success && result.buildID) {
            addLog('info', `Build started with ID: ${result.buildID}`);
            
            // Start polling for status updates
            await pollBuildStatus(result.buildID);
            
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        addLog('error', `API call failed: ${error.message}`);
        throw error;
    }
}

/**
 * Poll build status and update UI
 */
async function pollBuildStatus(buildID) {
    const pollInterval = 1000; // Poll every 1 second
    let lastLogCount = 0;
    
    const poll = async () => {
        try {
            // Get build status
            const statusResponse = await fetch(`${API_BASE}/build/status/${buildID}`);
            const statusResult = await statusResponse.json();
            
            if (statusResult.success) {
                const status = statusResult.status;
                
                // Update progress bar
                document.getElementById('progressFill').style.width = `${status.progress}%`;
                
                // Update steps based on status.steps
                updateStepsFromStatus(status.steps);
                
                // Get new logs
                const logsResponse = await fetch(`${API_BASE}/build/logs/${buildID}`);
                const logsResult = await logsResponse.json();
                
                if (logsResult.success && logsResult.logs.length > lastLogCount) {
                    // Add new logs
                    for (let i = lastLogCount; i < logsResult.logs.length; i++) {
                        const logMessage = logsResult.logs[i];
                        let logLevel = 'info';
                        if (logMessage.includes('ERROR') || logMessage.includes('❌')) {
                            logLevel = 'error';
                        } else if (logMessage.includes('✅')) {
                            logLevel = 'success';
                        }
                        addLogToUI(logLevel, logMessage);
                    }
                    lastLogCount = logsResult.logs.length;
                }
                
                // Check if build is completed
                if (status.status === 'completed') {
                    // Mark the final step as completed
                    const completeStep = document.querySelector('[data-step="complete"]');
                    if (completeStep) {
                        completeStep.classList.remove('active');
                        completeStep.classList.add('completed');
                    }
                    
                    // Don't add duplicate completion message if it's already in the logs
                    if (!logsResult.logs.some(log => log.includes('ISO generation completed successfully'))) {
                        addLogToUI('success', '🎉 Build completed successfully!');
                    }
                    currentBuildID = buildID; // Store build ID for download
                    showDownloadSection(buildID);
                    buildInProgress = false;
                    return; // Stop polling
                } else if (status.status === 'failed') {
                    addLogToUI('error', `Build failed: ${status.error || 'Unknown error'}`);
                    buildInProgress = false;
                    restoreGenerateButton();
                    return; // Stop polling
                }
                
                // Continue polling if still running
                setTimeout(poll, pollInterval);
                
            } else {
                throw new Error(statusResult.error || 'Failed to get build status');
            }
            
        } catch (error) {
            addLog('error', `Status polling failed: ${error.message}`);
            buildInProgress = false;
            restoreGenerateButton();
        }
    };
    
    // Start polling
    setTimeout(poll, pollInterval);
}

/**
 * Update steps based on backend status
 */
function updateStepsFromStatus(steps) {
    // Step mapping from backend to frontend (backend step name -> frontend data-step)
    const stepMapping = {
        'prepare': 'prepare',
        'download': 'download',
        'upload': 'upload',
        'verify': 'verify',
        'extract': 'extract',
        'inject': 'inject',
        'embedded': 'embedded',
        'packages': 'packages',
        'kernel': 'kernel',
        'hwe': 'hwe',
        'md5': 'md5',
        'repackage': 'repackage',
        'complete': 'complete'
    };
    
    for (const [backendStep, status] of Object.entries(steps)) {
        const frontendStep = stepMapping[backendStep];
        if (frontendStep) {
            const stepElement = document.querySelector(`[data-step="${frontendStep}"]`);
            if (stepElement) {
                if (status === 'completed') {
                    stepElement.classList.remove('active');
                    stepElement.classList.add('completed');
                } else if (status === 'running') {
                    stepElement.classList.add('active');
                    stepElement.classList.remove('completed');
                }
            }
        }
    }
}

/**
 * Add log entry
 */
function addLog(level, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${level}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    buildLogs.push({ level, message, timestamp });
    console.log(`[${level.toUpperCase()}] ${message}`);
}

/**
 * Add log to UI only (without adding to buildLogs array)
 */
function addLogToUI(level, message) {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;
    
    const timestamp = new Date().toLocaleTimeString();
    // Clean formatting - remove extra whitespace and ensure consistent format
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * Show build progress
 */
function showBuildProgress() {
    console.log('showBuildProgress called');
    
    const buildProgress = document.getElementById('buildProgress');
    const buildLogs = document.getElementById('buildLogs');
    const downloadSection = document.getElementById('downloadSection');
    const generateBtn = document.getElementById('generateBtn');
    
    console.log('Elements found:', {
        buildProgress: buildProgress,
        buildLogs: buildLogs,
        downloadSection: downloadSection,
        generateBtn: generateBtn
    });
    
    // Show build progress and logs
    if (buildProgress) {
        buildProgress.style.display = 'block';
        console.log('Build progress element displayed');
    } else {
        console.error('buildProgress element not found!');
    }
    
    if (buildLogs) {
        buildLogs.style.display = 'block';
        console.log('Build logs element displayed');
    } else {
        console.error('buildLogs element not found!');
    }
    
    if (downloadSection) {
        downloadSection.style.display = 'none';
        console.log('Download section hidden');
    } else {
        console.error('downloadSection element not found!');
    }
    
    // Ensure generate button is visible but disabled during build
    if (generateBtn) {
        generateBtn.style.display = 'block';
        generateBtn.disabled = true;
        generateBtn.textContent = '🔄 Building ISO...';
        console.log('Generate button updated to building state');
    } else {
        console.error('generateBtn element not found!');
    }
    
    console.log('Build progress shown, generate button disabled');
}

/**
 * Reset build progress
 */
function resetBuildProgress() {
    const steps = document.querySelectorAll('.step');
    const progressFill = document.getElementById('progressFill');
    const logContainer = document.getElementById('logContainer');
    const generateBtn = document.getElementById('generateBtn');
    
    // Reset build steps
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Reset progress bar
    if (progressFill) progressFill.style.width = '0%';
    
    // Clear logs
    if (logContainer) logContainer.innerHTML = '';
    
    // Reset generate button to normal state
    if (generateBtn) {
        generateBtn.style.display = 'block';
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate ISO Image';
    }
    
    buildLogs = [];
    console.log('Build progress reset, generate button restored');
}

/**
 * Show download section
 */
function showDownloadSection(buildID) {
    currentBuildID = buildID;
    const downloadSection = document.getElementById('downloadSection');
    const generateBtn = document.getElementById('generateBtn');
    
    // Show download section
    if (downloadSection) downloadSection.style.display = 'block';
    
    // Re-enable generate button after build completion
    if (generateBtn) {
        generateBtn.style.display = 'block';
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate ISO Image';
    }
    
    console.log('Download section shown, generate button re-enabled');
}

/**
 * Download ISO function
 */
function downloadISO() {
    if (!currentBuildID) {
        addLog('error', 'No build ID available for download');
        showStatus('isoStatus', 'error', 'Download failed: No build available');
        return;
    }
    
    try {
        // Create download link using the new API
        const downloadUrl = `${API_BASE}/build/download/${currentBuildID}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = ''; // Let the server set the filename
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addLog('info', `Download initiated for build: ${currentBuildID}`);
        showStatus('isoStatus', 'success', 'Download started');
    } catch (error) {
        addLog('error', `Download failed: ${error.message}`);
        showStatus('isoStatus', 'error', `Download failed: ${error.message}`);
    }
}

/**
 * Restore generate button to normal state
 */
function restoreGenerateButton() {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.style.display = 'block';
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate ISO Image';
        console.log('Generate button restored to normal state');
    }
}

/**
 * Check service status
 */
async function checkServiceStatus() {
    console.log('Health check button clicked');
    try {
        const response = await fetch('/health');
        const result = await response.json();
        showResult('healthResult', result);
        showStatus('healthStatus', 'success', 'Service status is normal');
        console.log('Health check successful:', result);
    } catch (error) {
        console.error('Health check failed:', error);
        showStatus('healthStatus', 'error', 'Service check failed: ' + error.message);
    }
}

/**
 * Auto-check service status on page load
 */
async function autoCheckServiceStatus() {
    console.log('Auto-checking service status on page load...');
    try {
        const response = await fetch('/health');
        const result = await response.json();
        showResult('healthResult', result);
        showStatus('healthStatus', 'success', 'Service status is normal');
        console.log('Auto health check successful:', result);
    } catch (error) {
        console.error('Auto health check failed:', error);
        showStatus('healthStatus', 'error', 'Service check failed: ' + error.message);
    }
}

/**
 * Show result data
 */
function showResult(elementId, data) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = JSON.stringify(data, null, 2);
        element.style.display = 'block';
        console.log(`Result displayed for ${elementId}:`, data);
    }
}

/**
 * Show status message
 */
function showStatus(elementId, type, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = `status ${type}`;
        element.textContent = message;
        element.style.display = 'inline-block';
        
        console.log(`Status displayed for ${elementId}: [${type}] ${message}`);
    }
}

/**
 * Generate user data configuration
 */
async function generateUserData() {
    // First perform frontend required field validation
    const basicOk = validateBasicRequired('userdataStatus');
    if (!basicOk) {
        return { valid: false, errors: ['Basic required fields missing'] };
    }
    const aptOk = validateAptRequired('userdataStatus');
    if (!aptOk) {
        return { valid: false, errors: ['APT required fields missing'] };
    }
    if (window.StorageManager && window.StorageManager.validateStorageConfig) {
        const storageResult = window.StorageManager.validateStorageConfig('userdataStatus');
        if (!storageResult.valid) {
            return { valid: false, errors: storageResult.errors };
        }
    }

    // Network required field validation
    if (window.NetworkManager && window.NetworkManager.validateNetworkConfig) {
        const networkResult = window.NetworkManager.validateNetworkConfig('userdataStatus');
        if (!networkResult.valid) {
            return { valid: false, errors: networkResult.errors };
        }
    }

    const config = buildConfig(); // Use buildConfig instead of getCurrentConfig
    
    try {
        // Use correct API endpoint
        const response = await fetch(`${API_BASE}/userdata/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config: config })
        });
        
        // Keep consistent with original version: don't check response.ok, directly try to parse JSON
        const result = await response.json();
        if (result.success) {
            // Display YAML content in userdataResult area
            const userDataResultElement = document.getElementById('userdataResult');
            if (userDataResultElement) {
                userDataResultElement.textContent = result.userData || result["user-data"] || 'User data configuration generated';
                userDataResultElement.style.display = 'block';
            }
            
            // Sync generated user-data to userDataContent field (consistent with original version)
            const userDataContentElement = document.getElementById('userDataContent');
            if (userDataContentElement) {
                userDataContentElement.value = result.userData || result["user-data"] || 'User data configuration generated';
                console.log('User data synchronized to userDataContent field');
            }
            
            // Also display YAML content in configuration preview area
            const previewElement = document.getElementById('configPreview');
            if (previewElement) {
                previewElement.textContent = result.userData || result["user-data"] || 'User data configuration generated';
                previewElement.style.display = 'block';
            }
            
            showStatus('userdataStatus', 'success', 'User data configuration generated successfully');
            if (window.AppNavigation) window.AppNavigation.switchPage('userdata');
        } else {
            showStatus('userdataStatus', 'error', result.error || 'User data generation failed');
        }
    } catch (error) {
        console.error('User data generation error:', error);
        showStatus('userdataStatus', 'error', 'User data generation failed: ' + error.message);
    }
}

// Export functions for use in other modules
window.ConfigManager = {
    initBasicConfig,
    initAptConfig,
    initAptPrimaryRepos,
    addAptRepo,
    removeAptRepo,
    updateRepo,
    buildAptPrimaryRepos,
    loadTabContent,
    loadView,
    getCurrentConfig,
    loadDefaultConfig,
    validateConfig,
    previewUserData,
    generateUserData,
    initializeAllConfigs,
    toggleSourceType,
    handleFileSelect,
    removeSelectedFile,
    formatFileSize,
    generateISO,
    callGenerateISOAPI,
    pollBuildStatus,
    updateStepsFromStatus,
    addLog,
    addLogToUI,
    showBuildProgress,
    resetBuildProgress,
    showDownloadSection,
    downloadISO,
    showStatus,
    restoreGenerateButton,
    checkServiceStatus,
    showResult,
    autoCheckServiceStatus,
    validateBasicRequired,
    validateAptRequired
};

// Suites tag add/remove handlers
function addDisableSuiteTag() {
    const input = document.getElementById('aptDisableSuitesInput');
    const tags = document.getElementById('aptDisableSuitesTags');
    const options = document.getElementById('aptDisableSuitesOptions');
    if (!input) return;
    const value = (input.value || '').trim();
    if (!value) return;
    // avoid duplicates
    const exists = tags ? Array.from(tags.querySelectorAll('.tag-item')).some(tag => tag.getAttribute('data-value') === value) : false;
    const checkboxExists = options ? Array.from(options.querySelectorAll('input[type="checkbox"]'))
        .some(cb => cb.value.toLowerCase() === value.toLowerCase()) : false;
    if (exists && checkboxExists) { input.value = ''; return; }
    // no tag creation anymore
    // Also add to the upper options bar as a new checkbox and check it by default
    if (options && !checkboxExists) {
        const label = document.createElement('label');
        label.className = 'optional';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = value;
        cb.checked = true;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + value));
        options.appendChild(label);
    } else if (options && checkboxExists) {
        // If already exists in options, ensure it is checked
        const existingCb = Array.from(options.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.value.toLowerCase() === value.toLowerCase());
        if (existingCb) existingCb.checked = true;
    }
    input.value = '';
}

window.addDisableSuiteTag = addDisableSuiteTag;


/**
 * Validate basic required fields (username, password, hostname)
 */
function validateBasicRequired(statusId) {
    const requiredIds = ['username', 'password', 'hostname'];
    const missing = [];

    // Clear old highlighting
    requiredIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('input-error');
    });

    requiredIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!el.value || el.value.trim() === '') {
            missing.push(id);
            el.classList.add('input-error');
        }
    });

    if (missing.length > 0) {
        // Switch to Basic tab first
        if (typeof switchTab === 'function') {
            switchTab('basic');
        } else if (window.UIUtils && window.UIUtils.switchTab) {
            window.UIUtils.switchTab('basic');
        }

        // Small delay to allow tab switch animation
        setTimeout(() => {
            const first = document.getElementById(missing[0]);
            if (first && first.scrollIntoView) {
                first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                try { first.focus(); } catch (_) {}
            }
        }, 50);

        const msgMap = {
            username: 'Username is required',
            password: 'Password is required',
            hostname: 'Hostname is required'
        };
        const messages = missing.map(k => msgMap[k] || (k + ' is required'));
        showStatus(statusId, 'error', 'Basic validation failed: ' + messages.join(', '));
        return false;
    }
    return true;
}

/**
 * Validate APT required fields
 * - At least one primary repository exists
 * - Each repository's arches and uri cannot be empty
 */
function validateAptRequired(statusId) {
    const container = document.getElementById('aptPrimaryRepos');
    const errors = [];
    if (!container) {
        // If container doesn't exist, hand over to subsequent process
        return true;
    }
    const repoNodes = Array.from(container.querySelectorAll('.apt-repo-config'));
    if (repoNodes.length === 0) {
        errors.push('At least one primary APT repository is required');
    }

    // Clear old highlighting
    repoNodes.forEach(function(node){
        const arches = node.querySelector('.apt-arches');
        const uri = node.querySelector('.apt-uri');
        if (arches) arches.classList.remove('input-error');
        if (uri) uri.classList.remove('input-error');
    });

    // Validate each repository
    repoNodes.forEach(function(node, idx){
        const arches = node.querySelector('.apt-arches');
        const uri = node.querySelector('.apt-uri');
        if (arches && (!arches.value || arches.value.trim() === '')) {
            arches.classList.add('input-error');
            errors.push(`Repository ${idx + 1} architectures is required`);
        }
        if (uri && (!uri.value || uri.value.trim() === '')) {
            uri.classList.add('input-error');
            errors.push(`Repository ${idx + 1} URI is required`);
        }
    });

    if (errors.length > 0) {
        // Switch to APT tab first
        if (typeof switchTab === 'function') {
            switchTab('apt');
        } else if (window.UIUtils && window.UIUtils.switchTab) {
            window.UIUtils.switchTab('apt');
        }

        // Small delay to allow tab switch animation
        setTimeout(() => {
            // Scroll to first error
            const firstErrorInput = container.querySelector('.input-error');
            if (firstErrorInput && firstErrorInput.scrollIntoView) {
                firstErrorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                try { firstErrorInput.focus(); } catch (_) {}
            }
        }, 50);

        showStatus(statusId, 'error', 'APT validation failed: ' + errors.join(', '));
        return false;
    }
    return true;
}

// ============================================================================
// Templates Manager
// ============================================================================

const TemplatesManager = (function() {
    let templates = [];
    let selectedTemplate = null;

    /**
     * Initialize templates page
     */
    async function init() {
        console.log('TemplatesManager.init() called');
        await loadTemplates();
        // Initialize import file upload handler
        initImportFileUpload();
    }

    /**
     * Load all templates from server
     */
    async function loadTemplates() {
        console.log('TemplatesManager.loadTemplates() called');
        try {
            const response = await fetch(`${API_BASE}/templates`);
            const result = await response.json();
            console.log('/api/v1/templates result:', result);

            if (result.success) {
                const prevSelectedFilename = selectedTemplate ? selectedTemplate.filename : null;
                templates = result.templates;
                console.log('Loaded templates:', templates);
                renderTemplateList();
                
                // Auto-select 'default' template on first load
                if (!prevSelectedFilename && templates.length > 0) {
                    const defaultTemplate = templates.find(t => t.filename === 'default.yaml' || t.filename === 'default');
                    if (defaultTemplate) {
                        await selectTemplateByFilename(defaultTemplate.filename);
                    } else {
                        // Fallback: select first available template
                        await selectTemplateByIndex(0);
                    }
                } else if (prevSelectedFilename) {
                    // Restore previously selected template's preview
                    const stillExists = templates.find(t => t.filename === prevSelectedFilename);
                    if (stillExists) {
                        await selectTemplateByFilename(prevSelectedFilename);
                    } else {
                        // Previous selection no longer exists, clear it
                        selectedTemplate = null;
                        updateActionButtons(false);
                        const previewContainer = document.getElementById('templatePreview');
                        if (previewContainer) {
                            previewContainer.innerHTML = `
                                <div class="preview-placeholder">
                                    <span class="placeholder-icon">&#128194;</span>
                                    <p>Select a template to preview</p>
                                </div>
                            `;
                        }
                    }
                }
            } else {
                console.error('API returned success=false:', result.error);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    /**
     * Render template list in UI
     */
    function renderTemplateList() {
        const presetContainer = document.getElementById('presetTemplatesList');
        const userContainer = document.getElementById('userTemplatesList');

        if (!presetContainer || !userContainer) return;

        const presets = templates.filter(t => t.is_built_in);
        const users = templates.filter(t => !t.is_built_in);

        // Render preset templates
        if (presets.length > 0) {
            presetContainer.innerHTML = presets.map((t, i) => createTemplateItem(t, templates.indexOf(t))).join('');
        } else {
            presetContainer.innerHTML = '<div class="template-empty">No preset templates available</div>';
        }

        // Render user templates
        if (users.length > 0) {
            userContainer.innerHTML = users.map((t, i) => createTemplateItem(t, templates.indexOf(t))).join('');
        } else {
            userContainer.innerHTML = '<div class="template-empty">No custom templates yet</div>';
        }
    }

    /**
     * Create template item HTML
     */
    function createTemplateItem(template, index) {
        const isSelected = selectedTemplate && selectedTemplate.filename === template.filename;
        return `
            <div class="template-item ${isSelected ? 'selected' : ''}" 
                 data-filename="${template.filename}"
                 data-index="${index}"
                 data-built-in="${template.is_built_in}"
                 onclick="TemplatesManager.selectTemplateByIndex(${index})">
                <div class="template-item-content">
                    <div class="template-item-name">${template.filename}</div>
                </div>
            </div>
        `;
    }

    /**
     * Select template by index
     */
    async function selectTemplateByIndex(index) {
        if (index < 0 || index >= templates.length) {
            console.error('Invalid template index:', index);
            return;
        }
        const template = templates[index];
        await selectTemplateByFilename(template.filename);
    }

    /**
     * Select template by filename
     */
    async function selectTemplateByFilename(filename) {
        try {
            // If we're in edit mode, exit first (but don't reload current template)
            if (inlineEditorState.textarea) {
                const previewContent = document.getElementById('templatePreview');
                const previewTitle = document.getElementById('previewTitle');
                const actionsNormal = document.getElementById('previewActionsNormal');
                const actionsEdit = document.getElementById('previewActionsEdit');

                previewContent.classList.remove('editing');
                previewTitle.textContent = 'Template Preview';
                actionsNormal.style.display = 'flex';
                actionsEdit.style.display = 'none';

                inlineEditorState = {
                    originalYaml: '',
                    hasChanges: false,
                    textarea: null
                };
            }

            const response = await fetch(`${API_BASE}/templates/${encodeURIComponent(filename)}`);
            const result = await response.json();

            if (result.success) {
                selectedTemplate = templates.find(t => t.filename === filename);
                renderTemplateList();
                renderPreview(result.yaml);
                updateActionButtons(true);
            } else {
                console.error('Failed to load template:', result.error);
            }
        } catch (error) {
            console.error('Error selecting template:', error);
        }
    }

    /**
     * Render template preview
     */
    function renderPreview(yamlContent) {
        const previewContainer = document.getElementById('templatePreview');
        if (!previewContainer) return;

        previewContainer.innerHTML = `
            <pre class="preview-yaml">${escapeHtml(yamlContent)}</pre>
        `;
    }

    /**
     * Escape HTML special characters
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update action buttons state
     */
    function updateActionButtons(enabled) {
        const applyBtn = document.getElementById('applyTemplateBtn');
        const exportBtn = document.getElementById('exportTemplateBtn');
        const copyBtn = document.getElementById('copyTemplateBtn');
        const editBtn = document.getElementById('editTemplateBtn');
        const deleteBtn = document.getElementById('deleteTemplateBtn');

        if (applyBtn) applyBtn.disabled = !enabled;
        if (exportBtn) exportBtn.disabled = !enabled;
        if (copyBtn) copyBtn.disabled = !enabled;

        if (!selectedTemplate) {
            if (editBtn) editBtn.disabled = true;
            if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.style.visibility = 'visible'; }
            return;
        }

        const isPreset = !!selectedTemplate.is_built_in;

        // Edit: only for user templates, hidden for presets
        if (editBtn) {
            editBtn.disabled = !enabled || isPreset;
            editBtn.style.display = isPreset ? 'none' : 'inline-flex';
        }

        // Delete: only for user templates
        if (deleteBtn) {
            deleteBtn.disabled = !enabled || isPreset;
            deleteBtn.style.display = isPreset ? 'none' : 'inline-flex';
        }
    }

    /**
     * Edit selected template (user templates only) — opens YAML editor modal
     */
    function editSelectedTemplate() {
        if (!selectedTemplate) return;
        editSelectedTemplate_impl();
    }

    /**
     * Apply basic config to form fields
     */
    function applyBasicConfigToForm(auto) {
        if (!auto) return;
        if (auto.identity) {
            setFormValue('username', auto.identity.username);
            setFormValue('hostname', auto.identity.hostname);
            setFormValue('realname', auto.identity.realname);
            setFormValue('password', auto.identity.password);
        }
        if (auto.locale) setFormValue('locale', auto.locale);
        if (auto.keyboard) setFormValue('keyboard', auto.keyboard.layout || auto.keyboard);
        if (auto.timezone) setFormValue('timezone', auto.timezone);
        if (auto.kernel) setFormValue('kernel', auto.kernel.package);
        if (auto.updates) setFormValue('updates', auto.updates);
        if (auto.shutdown) setFormValue('shutdown', auto.shutdown);
        if (auto.drivers) setFormValue('drivers', auto.drivers.install ? 'true' : 'false');
    }

    /**
     * Set select element value helper
     */
    function setSelectValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    /**
     * Apply APT config to form fields
     */
    function applyAptConfigToForm(apt) {
        if (!apt) return;

        if ('geoip' in apt) setSelectValue('aptGeoIP', apt.geoip);
        if ('preserve_sources_list' in apt) setSelectValue('aptPreserveSources', apt.preserve_sources_list);

        // Disable Components checkboxes
        if (apt.disable_components && Array.isArray(apt.disable_components)) {
            const container = document.getElementById('aptDisableComponents');
            if (container) {
                container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = apt.disable_components.includes(cb.value);
                });
            }
        }

        // Disable Suites checkboxes
        if (apt.disable_suites && Array.isArray(apt.disable_suites)) {
            const container = document.getElementById('aptDisableSuitesOptions');
            if (container) {
                container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = apt.disable_suites.includes(cb.value);
                });
            }
            const known = ['security', 'updates', 'backports', 'proposed'];
            const custom = apt.disable_suites.filter(s => !known.includes(s));
            if (custom.length > 0) setFormValue('aptDisableSuitesInput', custom.join(', '));
        }

        // Primary repositories
        const reposContainer = document.getElementById('aptPrimaryRepos');
        if (reposContainer && apt.primary && Array.isArray(apt.primary)) {
            reposContainer.innerHTML = '';
            apt.primary.forEach(entry => {
                addAptRepo();
                const rows = reposContainer.querySelectorAll('.apt-repo-config');
                const row = rows[rows.length - 1];
                const archesInput = row.querySelector('.apt-arches');
                const uriInput = row.querySelector('.apt-uri');
                if (archesInput && entry.arches) archesInput.value = entry.arches.join(',');
                if (uriInput && entry.uri) uriInput.value = entry.uri;
            });
        }
    }

    /**
     * Apply SSH config to form fields
     */
    function applySSHConfigToForm(ssh) {
        if (!ssh) return;
        if ('allow_pw' in ssh) setSelectValue('sshAllowPW', ssh.allow_pw);
        if ('install_server' in ssh) setSelectValue('sshInstallServer', ssh.install_server);
        if (ssh.authorized_keys && Array.isArray(ssh.authorized_keys)) {
            setFormValue('sshKeys', ssh.authorized_keys.join('\n'));
        }
    }

    /**
     * Apply array of commands to a textarea
     */
    function applyCommandsToForm(commands, elementId) {
        if (!commands || !Array.isArray(commands)) return;
        setFormValue(elementId, commands.join('\n'));
    }

    /**
     * Serialize a plain object to a simple YAML string (for user-data textarea)
     */
    function objectToYaml(obj) {
        if (!obj || typeof obj !== 'object') return '';
        const lines = [];
        for (const [k, v] of Object.entries(obj)) {
            if (v === null || v === undefined) continue;
            if (Array.isArray(v)) {
                if (v.length === 0) {
                    lines.push(`${k}: []`);
                } else if (typeof v[0] === 'object') {
                    lines.push(`${k}:`);
                    v.forEach(item => {
                        const inner = Object.entries(item).map(([sk, sv]) => `  ${sk}: ${sv}`).join(', ');
                        lines.push(`  - { ${inner} }`);
                    });
                } else {
                    lines.push(`${k}:`);
                    v.forEach(x => lines.push(`  - ${x}`));
                }
            } else if (typeof v === 'object') {
                lines.push(`${k}:`);
                Object.entries(v).forEach(([sk, sv]) => {
                    lines.push(`  ${sk}: ${sv}`);
                });
            } else {
                lines.push(`${k}: ${v}`);
            }
        }
        return lines.join('\n');
    }

    /**
     * Apply user-data config to form
     */
    function applyUserDataConfigToForm(userData) {
        if (!userData || typeof userData !== 'object') return;
        const yaml = objectToYaml(userData);
        if (yaml) setFormValue('userDataRaw', yaml);
    }

    /**
     * Apply packages config to form (additionalPackages textarea)
     */
    function applyPackagesConfigToForm(packages) {
        if (!packages || !Array.isArray(packages)) return;
        setFormValue('additionalPackages', packages.join('\n'));
    }

    /**
     * Apply autoinstall packages to form
     */
    function applyAutoinstallPackagesToForm(packages) {
        if (!packages || !Array.isArray(packages)) return;
        setFormValue('autoinstallPackages', packages.join('\n'));
    }

    /**
     * Apply embedded files config (stub — embedded.html view not yet implemented)
     */
    function applyEmbeddedFilesConfigToForm(embeddedFiles) {
        if (!embeddedFiles || !Array.isArray(embeddedFiles)) return;
        console.log('[applyEmbeddedFilesConfigToForm] embedded-files from template:', embeddedFiles);
        if (typeof showNotification === 'function') {
            showNotification(`Template contains ${embeddedFiles.length} embedded file(s) — view not yet implemented`, 'info');
        } else {
            showStatus('configStatus', 'info', `Template contains ${embeddedFiles.length} embedded file(s) — view not yet implemented`);
        }
    }

    /**
     * Apply a parsed autoinstall config to the UI — fills ALL tabs.
     * This is exported so default loading can reuse the same logic.
     */
    async function applyAutoinstallConfigToUI(auto) {
        // Mark modified BEFORE loading views so setDefaultValues is skipped
        window.configModified = true;

        // Force-load ALL tab DOMs so elements exist before applying config
        await Promise.all([
            loadView('basic', '/static/views/basic.html', null, true),
            loadView('apt', '/static/views/apt.html', null, true),
            loadView('network', '/static/views/network.html', null, true),
            loadView('storage', '/static/views/storage.html', null, true),
            loadView('ssh', '/static/views/ssh.html', null, true),
            loadView('advanced', '/static/views/advanced.html', null, true),
            loadView('packages', '/static/views/packages.html', null, true),
        ]);

        const safeAuto = auto || {};

        applyBasicConfigToForm(safeAuto);
        if (safeAuto.apt) applyAptConfigToForm(safeAuto.apt);
        if (safeAuto.network) NetworkManager.loadFromConfig(safeAuto.network);
        if (safeAuto.storage) StorageManager.loadFromConfig(safeAuto.storage);
        if (safeAuto.ssh) applySSHConfigToForm(safeAuto.ssh);
        if (safeAuto.packages) {
            applyAutoinstallPackagesToForm(safeAuto.packages);
            applyPackagesConfigToForm(safeAuto.packages);
        }
        if (safeAuto['early-commands']) applyCommandsToForm(safeAuto['early-commands'], 'earlyCommands');
        if (safeAuto['late-commands']) applyCommandsToForm(safeAuto['late-commands'], 'lateCommands');
        if (safeAuto['error-commands']) applyCommandsToForm(safeAuto['error-commands'], 'errorCommands');
        if (safeAuto['user-data']) applyUserDataConfigToForm(safeAuto['user-data']);
        if (safeAuto['embedded-files']) applyEmbeddedFilesConfigToForm(safeAuto['embedded-files']);

        if (typeof showNotification === 'function') {
            showNotification('Template applied successfully!', 'success');
        } else {
            showStatus('configStatus', 'success', 'Template applied successfully!');
        }
        if (typeof AppNavigation !== 'undefined') {
            AppNavigation.switchPage('config');
        }
    }

    /**
     * Apply selected template to config — fills ALL tabs
     */
    async function applySelectedTemplate() {
        if (!selectedTemplate) return;

        try {
            const filename = encodeURIComponent(selectedTemplate.filename);
            const response = await fetch(`${API_BASE}/templates/${filename}`);
            const result = await response.json();

            if (result.success && result.config) {
                const auto = result.config.autoinstall || {};
                await applyAutoinstallConfigToUI(auto);
            } else {
                showNotification('Failed to apply template', 'error');
            }
        } catch (error) {
            console.error('Error applying template:', error);
            showNotification('Error applying template', 'error');
        }
    }

    /**
     * Set form value helper
     */
    function setFormValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    /**
     * Apply config to form fields (legacy — delegates to applyBasicConfigToForm)
     */
    function applyConfigToForm(config) {
        if (config && config.autoinstall) {
            applyBasicConfigToForm(config.autoinstall);
        }
    }

    /**
     * Export selected template
     */
    function exportSelectedTemplate() {
        if (!selectedTemplate) return;

        const previewEl = document.querySelector('.preview-yaml');
        if (!previewEl) return;

        const content = previewEl.textContent;
        const blob = new Blob([content], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate.filename}.yaml`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Delete selected template
     */
    async function deleteSelectedTemplate() {
        if (!selectedTemplate || selectedTemplate.is_built_in) return;

        showConfirmModal(
            'Delete Template',
            `Are you sure you want to delete "${selectedTemplate.filename}"?`,
            async () => {
                try {
                    const filename = encodeURIComponent(selectedTemplate.filename);
                    const response = await fetch(`${API_BASE}/templates/${filename}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        selectedTemplate = null;
                        await loadTemplates();
                        clearPreview();
                        updateActionButtons(false);
                        showNotification('Template deleted', 'success');
                    } else {
                        showNotification('Failed to delete template', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting template:', error);
                    showNotification('Error deleting template', 'error');
                }
            }
        );
    }

    /**
     * Clear preview
     */
    function clearPreview() {
        const previewContainer = document.getElementById('templatePreview');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="preview-placeholder">
                    <span class="placeholder-icon">&#128194;</span>
                    <p>Select a template to preview</p>
                </div>
            `;
        }
    }

    /**
     * Copy selected template YAML to clipboard
     */
    async function copySelectedTemplate() {
        if (!selectedTemplate) return;
        const previewEl = document.querySelector('.preview-yaml');
        if (!previewEl) return;
        const yaml = previewEl.textContent;
        if (!yaml) {
            showNotification('No YAML content to copy', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(yaml);
            showNotification('YAML copied to clipboard', 'success');
        } catch (err) {
            const ta = document.createElement('textarea');
            ta.value = yaml;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showNotification('YAML copied to clipboard', 'success');
        }
    }

    /**
     * Edit template YAML inline in preview area (user templates only)
     */
    async function editSelectedTemplate_impl() {
        if (!selectedTemplate) return;

        try {
            const response = await fetch(`${API_BASE}/templates/${encodeURIComponent(selectedTemplate.filename)}`);
            const result = await response.json();
            if (!result.success || !result.yaml) {
                showNotification('Failed to load template', 'error');
                return;
            }

            showInlineEditor(result.yaml);
        } catch (error) {
            console.error('Error loading template for edit:', error);
            showNotification('Error loading template', 'error');
        }
    }

    let inlineEditorState = {
        originalYaml: '',
        hasChanges: false,
        textarea: null
    };

    /**
     * Show inline editor in preview area
     */
    function showInlineEditor(yaml) {
        const previewContent = document.getElementById('templatePreview');
        const previewTitle = document.getElementById('previewTitle');
        const actionsNormal = document.getElementById('previewActionsNormal');
        const actionsEdit = document.getElementById('previewActionsEdit');

        const lineCount = (yaml.match(/\n/g) || []).length + 1;
        const lines = [];
        for (let i = 1; i <= lineCount; i++) lines.push(i);

        previewTitle.textContent = 'Editing: ' + selectedTemplate.filename;

        previewContent.innerHTML = `
            <div class="edit-editor">
                <div class="edit-editor-toolbar">
                    <span class="edit-editor-meta">${lineCount} lines</span>
                    <div class="edit-editor-actions">
                        <button type="button" class="btn btn-secondary" id="inlineCancelBtn">Cancel</button>
                        <button type="button" class="btn btn-primary" id="inlineSaveBtn">Save</button>
                    </div>
                </div>
                <div class="edit-editor-body">
                    <div class="edit-editor-gutter" id="editEditorGutter"><pre>${lines.join('\n')}</pre></div>
                    <textarea id="editEditorTextarea" class="edit-editor-textarea" spellcheck="false">${escapeHtml(yaml)}</textarea>
                </div>
                <div class="edit-editor-footer">
                    <span class="edit-editor-status" id="editEditorStatus"></span>
                </div>
            </div>
        `;
        previewContent.classList.add('editing');

        actionsNormal.style.display = 'none';
        actionsEdit.style.display = 'none';

        const textarea = document.getElementById('editEditorTextarea');
        const gutter = document.getElementById('editEditorGutter');
        const status = document.getElementById('editEditorStatus');

        inlineEditorState = {
            originalYaml: yaml,
            hasChanges: false,
            textarea: textarea
        };

        function updateGutter() {
            const lines = textarea.value.split('\n');
            const gLines = [];
            for (let i = 1; i <= lines.length; i++) gLines.push(i);
            gutter.innerHTML = '<pre>' + gLines.join('\n') + '</pre>';
        }

        function syncScroll() {
            gutter.scrollTop = textarea.scrollTop;
        }

        function updateStatus() {
            const newYaml = textarea.value;
            inlineEditorState.hasChanges = newYaml !== inlineEditorState.originalYaml;
            if (inlineEditorState.hasChanges) {
                status.textContent = 'Modified';
                status.className = 'edit-editor-status modified';
                inlineSaveBtn.classList.add('has-changes');
            } else {
                status.textContent = '';
                status.className = 'edit-editor-status';
                inlineSaveBtn.classList.remove('has-changes');
            }
        }

        textarea.addEventListener('input', function() {
            updateGutter();
            updateStatus();
        });
        textarea.addEventListener('scroll', syncScroll);
        updateGutter();

        const inlineCancelBtn = document.getElementById('inlineCancelBtn');
        const inlineSaveBtn = document.getElementById('inlineSaveBtn');

        inlineCancelBtn.addEventListener('click', function() {
            cancelEdit();
        });

        inlineSaveBtn.addEventListener('click', function() {
            saveEdit();
        });
    }

    /**
     * Cancel inline editing
     */
    function cancelEdit() {
        if (inlineEditorState.hasChanges) {
            showDiscardTemplateChangesModal(function() {
                exitInlineEditor();
            });
        } else {
            exitInlineEditor();
        }
    }

    /**
     * Save inline edit
     */
    async function saveEdit() {
        console.log('saveEdit called');
        console.log('inlineEditorState:', inlineEditorState);
        
        if (!inlineEditorState.textarea) {
            console.error('No textarea found in inlineEditorState');
            showNotification('Error: Editor not initialized', 'error');
            return;
        }
        
        const newYaml = inlineEditorState.textarea.value;
        console.log('YAML to save:', newYaml.substring(0, 100) + '...');
        
        try {
            await saveEditedTemplate(newYaml, inlineEditorState.originalYaml);
        } catch (error) {
            console.error('Save failed:', error);
        }
    }

    /**
     * Exit inline editor and restore preview mode
     */
    function exitInlineEditor() {
        const previewContent = document.getElementById('templatePreview');
        const previewTitle = document.getElementById('previewTitle');
        const actionsNormal = document.getElementById('previewActionsNormal');
        const actionsEdit = document.getElementById('previewActionsEdit');

        previewContent.classList.remove('editing');
        previewTitle.textContent = 'Template Preview';
        actionsNormal.style.display = 'flex';
        actionsEdit.style.display = 'none';

        inlineEditorState = {
            originalYaml: '',
            hasChanges: false,
            textarea: null
        };

        if (selectedTemplate) {
            // Reload and display the saved template
            selectTemplateByFilename(selectedTemplate.filename);
        } else {
            previewContent.innerHTML = `
                <div class="preview-placeholder">
                    <span class="placeholder-icon">&#128194;</span>
                    <p>Select a template to preview</p>
                </div>
            `;
        }
    }

    /**
     * Save edited template YAML to server
     */
    async function saveEditedTemplate(newYaml, originalYaml) {
        try {
            const response = await fetch(`${API_BASE}/templates/save-yaml`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: selectedTemplate.filename,
                    yaml: newYaml
                })
            });
            const result = await response.json();
            if (result.success) {
                await loadTemplates();
                exitInlineEditor();
                showNotification('Template saved successfully', 'success');
            } else {
                showNotification(result.error || 'Failed to save template', 'error');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            showNotification('Error saving template', 'error');
        }
    }

    /**
     * Parse YAML string to config object
     */
    async function parseYaml(yaml) {
        try {
            const response = await fetch(`${API_BASE}/templates/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ yaml: yaml })
            });
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Parse YAML failed:', response.status, text);
                throw new Error('Failed to parse YAML: ' + response.status);
            }
            
            const result = await response.json();
            if (result.success) return result.config;
            throw new Error(result.error || 'YAML parse failed');
        } catch (error) {
            console.error('Parse YAML error:', error);
            throw error;
        }
    }

    /**
     * Show discard changes modal for template editor
     */
    function showDiscardTemplateChangesModal(onDiscard) {
        showConfirmModal('Discard Changes', 'You have unsaved changes. Are you sure you want to discard them?', function() {
            if (typeof onDiscard === 'function') onDiscard();
        });
    }

    /**
     * Open a modal dialog (inline, no external dependency)
     */
    function openModal(title, bodyHtml, footerHtml, width) {
        closeModal();
        const overlay = document.createElement('div');
        overlay.id = 'tmplEditModal';
        overlay.className = 'modal-overlay';
        overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };

        const modal = document.createElement('div');
        modal.className = 'modal-dialog' + (width ? '' : '');
        if (width) modal.style.maxWidth = width;
        modal.innerHTML = '<div class="modal-header">' +
            '<h3>' + escapeHtml(title) + '</h3>' +
            '<button class="modal-close" onclick="TemplatesManager.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' + bodyHtml + '</div>' +
            (footerHtml ? '<div class="modal-footer">' + footerHtml + '</div>' : '');

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        setTimeout(function() { overlay.classList.add('active'); modal.classList.add('active'); }, 10);
        return modal;
    }

    /**
     * Close the inline modal dialog
     */
    function closeModal() {
        const m = document.getElementById('tmplEditModal');
        if (m) {
            m.classList.remove('active');
            setTimeout(function() { m.remove(); }, 200);
        }
    }

    /**
     * Show save template modal
     */
    function saveCurrentAsTemplate() {
        const modal = document.getElementById('saveTemplateModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Close save modal
     */
    function closeSaveModal() {
        const modal = document.getElementById('saveTemplateModal');
        if (modal) {
            modal.style.display = 'none';
        }
        // Clear inputs
        const nameInput = document.getElementById('newTemplateName');
        if (nameInput) nameInput.value = '';
    }

    /**
     * Confirm save template
     */
    async function confirmSaveTemplate() {
        const nameInput = document.getElementById('newTemplateName');

        const name = nameInput?.value?.trim();
        if (!name) {
            showNotification('Template name is required', 'error');
            return;
        }

        try {
            // Build current config
            const config = await buildCompleteConfig();
            if (!config) {
                showNotification('Failed to build config from current form', 'error');
                return;
            }

            const response = await fetch(`${API_BASE}/templates/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    config: config
                })
            });

            const result = await response.json();
            if (result.success) {
                closeSaveModal();
                await loadTemplates();
                showNotification('Template saved successfully!', 'success');
            } else {
                showNotification(result.error || 'Failed to save template', 'error');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            showNotification('Error saving template', 'error');
        }
    }

    /**
     * Show import template modal
     */
    function importTemplate() {
        const modal = document.getElementById('importTemplateModal');
        if (modal) {
            modal.style.display = 'flex';
            // Reset to paste mode by default
            switchImportMode('paste');
        }
    }

    /**
     * Switch between paste and upload mode in import modal
     */
    function switchImportMode(mode) {
        const pasteBtn = document.getElementById('importModePaste');
        const uploadBtn = document.getElementById('importModeUpload');
        const pasteMode = document.getElementById('importPasteMode');
        const uploadMode = document.getElementById('importUploadMode');
        const nameInput = document.getElementById('importTemplateName');

        if (pasteBtn) pasteBtn.classList.toggle('active', mode === 'paste');
        if (uploadBtn) uploadBtn.classList.toggle('active', mode === 'upload');
        if (pasteMode) pasteMode.style.display = mode === 'paste' ? 'block' : 'none';
        if (uploadMode) uploadMode.style.display = mode === 'upload' ? 'block' : 'none';
        if (nameInput) nameInput.style.display = mode === 'paste' ? 'block' : 'none';
    }

    /**
     * Handle file upload for import
     */
    function initImportFileUpload() {
        const fileInput = document.getElementById('importFileInput');
        if (fileInput) {
            fileInput.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result;
                    document.getElementById('importTemplateYaml').value = content;

                    // Show file info
                    const preview = document.getElementById('importFilePreview');
                    if (preview) {
                        preview.innerHTML = `<span class="import-file-info">Selected: ${escapeHtml(file.name)} (${formatFileSize(file.size)})</span>`;
                    }
                };
                reader.readAsText(file);
            };
        }
    }

    /**
     * Format file size for display
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Close import modal
     */
    function closeImportModal() {
        const modal = document.getElementById('importTemplateModal');
        if (modal) {
            modal.style.display = 'none';
        }
        // Reset form fields
        const yamlInput = document.getElementById('importTemplateYaml');
        if (yamlInput) yamlInput.value = '';
        const nameInput = document.getElementById('importTemplateName');
        if (nameInput) nameInput.value = '';
        const fileInput = document.getElementById('importFileInput');
        if (fileInput) fileInput.value = '';
        const preview = document.getElementById('importFilePreview');
        if (preview) preview.innerHTML = '';
        // Reset to paste mode
        switchImportMode('paste');
    }

    /**
     * Confirm import template
     */
    async function confirmImportTemplate() {
        const nameInput = document.getElementById('importTemplateName');
        const yamlInput = document.getElementById('importTemplateYaml');
        const fileInput = document.getElementById('importFileInput');
        const pasteBtn = document.getElementById('importModePaste');

        const isPasteMode = pasteBtn && pasteBtn.classList.contains('active');
        const yaml = yamlInput?.value?.trim();

        if (!yaml) {
            showNotification('YAML content is required', 'error');
            return;
        }

        let name;
        if (isPasteMode) {
            // Paste mode: require template name
            name = nameInput?.value?.trim();
            if (!name) {
                showNotification('Template name is required', 'error');
                return;
            }
        } else {
            // Upload mode: use filename without extension
            if (fileInput?.files?.length > 0) {
                name = fileInput.files[0].name.replace(/\.(yaml|yml|cloud-init)$/i, '');
            } else {
                showNotification('Please select a file to upload', 'error');
                return;
            }
        }

        try {
            // Use save-yaml endpoint to preserve raw YAML formatting
            const response = await fetch(`${API_BASE}/templates/save-yaml`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    yaml: yaml
                })
            });

            const result = await response.json();
            if (result.success) {
                closeImportModal();
                await loadTemplates();
                showNotification('Template imported successfully!', 'success');
            } else {
                showNotification(result.error || 'Failed to import template', 'error');
            }
        } catch (error) {
            console.error('Error importing template:', error);
            showNotification('Error importing template', 'error');
        }
    }

    /**
     * Show confirmation modal
     */
    function showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const actionBtn = document.getElementById('confirmModalAction');

        if (modal) {
            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;
            
            // Set up action button
            if (actionBtn) {
                actionBtn.onclick = () => {
                    modal.style.display = 'none';
                    if (typeof onConfirm === 'function') onConfirm();
                };
            }

            modal.style.display = 'flex';
        }
    }

    /**
     * Close confirmation modal
     */
    function closeConfirmModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Show notification
     */
    function showNotification(message, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        }
    }

    // Public API
    return {
        init,
        loadTemplates,
        selectTemplateByIndex,
        selectTemplateByFilename,
        applySelectedTemplate,
        applyAutoinstallConfigToUI,
        exportSelectedTemplate,
        deleteSelectedTemplate,
        copySelectedTemplate,
        editSelectedTemplate,
        saveCurrentAsTemplate,
        closeSaveModal,
        confirmSaveTemplate,
        importTemplate,
        switchImportMode,
        closeImportModal,
        confirmImportTemplate,
        closeConfirmModal,
        closeModal,
        cancelEdit,
        saveEdit
    };
})();

// Make available globally
window.TemplatesManager = TemplatesManager;
