/**
 * ISO Generator Module
 * Handles ISO file generation, upload, build process, and status monitoring
 */

console.log('ISO generator module loading...');

// Global variables (shared with config-manager.js)
// Note: currentBuildID, buildLogs, and API_BASE are declared in config-manager.js
let buildStatus = 'idle';
let displayedLogCount = 0; // Track how many logs have been displayed to avoid duplicates
// API_BASE is already defined in config-manager.js

console.log('ISO generator module variables initialized');

/**
 * Initialize ISO generation form
 */
function initISOForm() {
    // Initialize source type toggle
    initSourceTypeToggle();
    
    // Initialize file upload handlers
    initFileUploadHandlers();
}

/**
 * Initialize source type toggle
 */
function initSourceTypeToggle() {
    // This function is called by the radio button onchange event
    // No need to add event listeners here
}

/**
 * Toggle source type between local file and download
 */
function toggleSourceType() {
    const sourceType = document.querySelector('input[name="sourceType"]:checked').value;
    const localIsoSection = document.getElementById('localIsoSection');
    const downloadIsoSection = document.getElementById('downloadIsoSection');

    console.log('[ISO-GEN] toggleSourceType - selected:', sourceType);

    if (sourceType === 'local') {
        localIsoSection.style.display = 'block';
        downloadIsoSection.style.display = 'none';
        // Check if a local ISO file has been uploaded
        const sourceISO = document.getElementById('sourceISO')?.value;
        console.log('[ISO-GEN] sourceISO value:', sourceISO);
        if (!sourceISO) {
            // No file uploaded yet, disable generate button
            setGenerateButtonDisabled(true);
        } else {
            setGenerateButtonDisabled(false);
        }
    } else {
        localIsoSection.style.display = 'none';
        downloadIsoSection.style.display = 'block';
        // For download mode, enable generate button
        setGenerateButtonDisabled(false);
    }
}

/**
 * Initialize file upload handlers
 * Note: The file input already uses onchange="handleFileSelect(this)" in HTML
 * So we don't add a duplicate event listener here
 */
function initFileUploadHandlers() {
    // File input is handled via onchange attribute in HTML
    // This function can be used for additional initialization if needed
    console.log('[ISO-GEN] File upload handlers initialized');
}

/**
 * Handle file selection
 */
async function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    console.log('[ISO-GEN] handleFileSelect called');
    console.log('[ISO-GEN] Selected file:', file.name, 'Size:', file.size);

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.iso')) {
        console.error('[ISO-GEN] Invalid file type');
        showStatus('userdataStatus', 'error', 'Please select a valid ISO file');
        return;
    }

    // Validate file size (max 10GB)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (file.size > maxSize) {
        console.error('[ISO-GEN] File too large:', file.size);
        showStatus('userdataStatus', 'error', 'File size exceeds 10GB limit');
        return;
    }

    // Disable generate button during upload
    setGenerateButtonDisabled(true);
    showStatus('userdataStatus', 'info', 'Uploading ISO file...');

    // Show file info
    showFileInfo(file);

    // Upload file
    try {
        console.log('[ISO-GEN] Starting upload to', `${API_BASE}/iso/upload`);
        const uploadResult = await uploadFile(file);
        console.log('[ISO-GEN] Upload result:', uploadResult);

        // Check if upload was successful
        const isSuccess = uploadResult.success === true;

        if (isSuccess) {
            console.log('[ISO-GEN] Upload successful!');
            showStatus('userdataStatus', 'success', 'ISO file uploaded successfully. Click "Generate ISO Image" to start building.');
            // Extraction will happen when Generate ISO is clicked
            window.isoExtracted = false;
            window.mountPath = null;
        } else {
            console.error('[ISO-GEN] Upload failed:', uploadResult.error);
            showStatus('userdataStatus', 'error', `Upload failed: ${uploadResult.error || 'Unknown error'}`);
            window.isoExtracted = false;
        }

        // Store file info for later use (always save filePath if available)
        window.uploadedFileInfo = {
            filename: file.name,
            size: file.size,
            filePath: uploadResult.filePath
        };

        // Update hidden sourceISO input
        const sourceISOInput = document.getElementById('sourceISO');
        if (sourceISOInput) {
            sourceISOInput.value = uploadResult.filePath || '';
            console.log('[ISO-GEN] Updated sourceISO to:', uploadResult.filePath);
        } else {
            console.error('[ISO-GEN] sourceISO input not found!');
        }

        // Complete progress
        updateUploadProgress(100);
        // Update status text immediately
        const uploadStatusText = document.getElementById('uploadStatusText');
        if (uploadStatusText) {
            uploadStatusText.textContent = 'Upload completed';
            uploadStatusText.classList.add('status-success');
        }
        // Hide progress container after a short delay
        setTimeout(() => {
            hideUploadProgress();
        }, 1500);

        // Enable generate button after successful upload (user can now click Generate ISO)
        setGenerateButtonDisabled(!isSuccess);
    } catch (error) {
        console.error('[ISO-GEN] Upload exception:', error);
        showStatus('userdataStatus', 'error', 'File upload failed: ' + error.message);
        setGenerateButtonDisabled(true);
    }
}

/**
 * Upload file to server
 */
function uploadFile(file) {
    return new Promise((resolve, reject) => {
        console.log('[ISO-GEN] Creating XHR request...');
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('iso', file);

        // Show upload progress
        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                console.log('[ISO-GEN] Upload progress:', percentComplete.toFixed(2) + '%');
                updateUploadProgress(percentComplete);
            }
        };

        xhr.onload = function () {
            console.log('[ISO-GEN] XHR onload - status:', xhr.status);
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('[ISO-GEN] Response parsed:', response);
                    resolve(response);
                } catch (e) {
                    console.error('[ISO-GEN] Failed to parse response:', e);
                    resolve({ success: false, error: 'Invalid response format' });
                }
            } else {
                console.error('[ISO-GEN] XHR error - status:', xhr.status, xhr.statusText);
                resolve({ success: false, error: `HTTP ${xhr.status}: ${xhr.statusText}` });
            }
        };

        xhr.onerror = function () {
            console.error('[ISO-GEN] Network error');
            reject(new Error('Network error during upload'));
        };

        console.log('[ISO-GEN] Sending POST to', `${API_BASE}/iso/upload`);
        xhr.open('POST', `${API_BASE}/iso/upload`);
        xhr.send(formData);
    });
}

/**
 * Update upload progress
 */
function updateUploadProgress(percent) {
    const progressBar = document.getElementById('uploadProgressFill');
    const progressText = document.getElementById('uploadProgressText');
    const progressContainer = document.getElementById('uploadProgressContainer');
    
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
    if (progressText) {
        progressText.textContent = `${Math.round(percent)}%`;
    }
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
}

/**
 * Show file information
 */
function showFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    if (fileInfo && fileName && fileSize) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
    }
}

/**
 * Remove selected file
 */
function removeSelectedFile() {
    console.log('[ISO-GEN] removeSelectedFile called');

    const fileInput = document.getElementById('isoFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const sourceISOInput = document.getElementById('sourceISO');

    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'none';
    if (sourceISOInput) sourceISOInput.value = '';

    // Clear uploaded file info
    window.uploadedFileInfo = null;
    window.isoExtracted = false;
    window.mountPath = null;

    showStatus('userdataStatus', 'info', 'File selection cleared');
}

/**
 * Hide upload progress bar
 */
function hideUploadProgress() {
    const progressFill = document.getElementById('uploadProgressFill');
    const uploadStatusText = document.getElementById('uploadStatusText');
    const uploadProgressText = document.getElementById('uploadProgressText');
    
    if (progressFill) {
        progressFill.style.width = '100%';
        progressFill.classList.add('completed');
    }
    if (uploadProgressText) {
        uploadProgressText.textContent = '100%';
    }
    if (uploadStatusText) {
        uploadStatusText.textContent = 'Upload completed';
        uploadStatusText.classList.add('status-success');
    }
}

/**
 * Set Generate ISO button disabled state
 */
function setGenerateButtonDisabled(disabled) {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.disabled = disabled;
        if (disabled) {
            generateBtn.classList.add('btn-disabled');
        } else {
            generateBtn.classList.remove('btn-disabled');
            generateBtn.textContent = 'Generate ISO Image';
        }
    }
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate ISO function - main entry point
 */
async function generateISO() {
    try {
        // Validate configuration first
        if (!await validateAllConfigs()) {
            return;
        }
        
        // Build configuration
        const config = buildCompleteConfig();
        if (!config) {
            showStatus('userdataStatus', 'error', 'Failed to build configuration');
            return;
        }
        
        // Show build progress
        isoShowBuildProgress();

        // Start build process
        const buildResult = await startBuildProcess(config);
        if (buildResult.success) {
            currentBuildID = buildResult.buildID;
            showStatus('userdataStatus', 'success', 'Build started successfully');
            
            // Start polling for status
            pollBuildStatus(buildResult.buildID);
        } else {
            showStatus('userdataStatus', 'error', `Build failed: ${buildResult.error}`);
        }
        
    } catch (error) {
        console.error('ISO generation error:', error);
        showStatus('userdataStatus', 'error', 'ISO generation failed');
    }
}

/**
 * Validate all configurations
 */
async function validateAllConfigs() {
    const validations = [];
    
    // Validate basic config
    if (window.ConfigManager && window.ConfigManager.validateConfig) {
        validations.push(window.ConfigManager.validateConfig());
    }
    
    // Validate storage config
    if (window.StorageManager && window.StorageManager.validateStorageConfig) {
        validations.push(window.StorageManager.validateStorageConfig());
    }
    
    // Validate network config
    if (window.NetworkManager && window.NetworkManager.validateNetworkConfig) {
        validations.push(window.NetworkManager.validateNetworkConfig());
    }
    
    // Wait for all validations
    const results = await Promise.all(validations);
    
    // Check if all validations passed
    const allValid = results.every(result => result.valid);
    if (!allValid) {
        const allErrors = results.flatMap(result => result.errors || []);
        showStatus('userdataStatus', 'error', `Configuration validation failed: ${allErrors.join(', ')}`);
        return false;
    }
    
    return true;
}

/**
 * Build complete configuration
 */
function buildCompleteConfig() {
    try {
        const config = {
            basic: {},
            apt: {},
            network: {},
            storage: {},
            ssh: {},
            advanced: {}
        };
        
        // Get basic config
        if (window.ConfigManager && window.ConfigManager.getCurrentConfig) {
            const basicConfig = window.ConfigManager.getCurrentConfig();
            config.basic = basicConfig.basic || {};
            config.apt = basicConfig.apt || {};
        }
        
        // Get storage config
        if (window.StorageManager && window.StorageManager.getStorageConfig) {
            config.storage = window.StorageManager.getStorageConfig();
        }
        
        // Get network config
        if (window.NetworkManager && window.NetworkManager.getNetworkConfig) {
            const networkConfig = window.NetworkManager.getNetworkConfig();
            config.network = networkConfig;
        }
        
        // Add source information
        const sourceType = document.querySelector('input[name="sourceType"]:checked').value;
        config.source = {
            type: sourceType,
            file: window.uploadedFileInfo || null,
            codename: document.getElementById('codename')?.value || 'jammy'
        };
        
        // Add other form data
        config.destinationISO = document.getElementById('destinationISO')?.value || '';
        config.packageList = document.getElementById('additionalPackages')?.value || '';
        config.userDataContent = document.getElementById('userDataContent')?.value || '';
        config.useHWEKernel = document.getElementById('useHWEKernelCheckbox')?.checked || false;
        config.md5Checksum = document.getElementById('md5ChecksumCheckbox')?.checked || true;
        config.gpgVerify = document.getElementById('gpgVerifyCheckbox')?.checked ?? false;
        
        return config;
        
    } catch (error) {
        console.error('Configuration build error:', error);
        return null;
    }
}

/**
 * Start build process
 */
async function startBuildProcess(config) {
    try {
        // Transform frontend config format to backend expected format
        const requestData = {
            sourceType: config.source?.type || 'download',
            sourceISO: config.source?.file?.filePath || '',
            codeName: config.source?.codename || 'jammy',
            destinationISO: config.destinationISO || '',
            userData: config.userDataContent || '',
            packageList: config.packageList ? config.packageList.split('\n').filter(p => p.trim()) : [],
            useHWEKernel: config.useHWEKernel || false,
            md5Checksum: config.md5Checksum !== false,
            gpgVerify: config.gpgVerify ?? false
        };

        const response = await fetch(`${API_BASE}/iso/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            const result = await response.json();
            return { success: true, buildID: result.buildID };
        } else {
            const error = await response.text();
            return { success: false, error: error };
        }
    } catch (error) {
        console.error('Build start error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Poll build status
 */
async function pollBuildStatus(buildID) {
    try {
        const response = await fetch(`${API_BASE}/build/status/${buildID}`);
        if (response.ok) {
            const result = await response.json();
            
            // Backend returns { success, status: { id, status, progress, ... }, message }
            const status = result.status;
            
            // Update build progress
            updateBuildProgress(status);
            
            // Check if build is complete
            if (status && status.status === 'completed') {
                showStatus('userdataStatus', 'success', 'Build completed successfully!');
                showDownloadSection(buildID);
            } else if (status && status.status === 'failed') {
                showStatus('userdataStatus', 'error', `Build failed: ${status.error || 'Unknown error'}`);
            } else {
                // Continue polling
                setTimeout(() => pollBuildStatus(buildID), 2000);
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Status polling error:', error);
        showStatus('userdataStatus', 'error', 'Failed to get build status');
    }
}

/**
 * Update build progress
 */
function updateBuildProgress(status) {
    // Update progress bar
    if (status.progress !== undefined) {
        const progressBar = document.getElementById('progressFill');
        if (progressBar) {
            progressBar.style.width = `${status.progress}%`;
        }
    }
    
    // Update steps
    if (status.steps) {
        updateStepsFromStatus(status.steps);
    }
    
    // Add log entries - backend returns []string, each string contains the full message
    // Only process new logs that haven't been displayed yet (avoid duplicates from polling)
    if (status.logs && status.logs.length > displayedLogCount) {
        const newLogs = status.logs.slice(displayedLogCount);
        newLogs.forEach(logEntry => {
            // Backend logs are strings, each string contains the full message
            if (typeof logEntry === 'string') {
                // Parse log level from the message prefix (e.g., "📦 Extracting ISO contents...")
                let level = 'info';
                if (logEntry.includes('ERROR') || logEntry.includes('❌')) {
                    level = 'error';
                } else if (logEntry.includes('✅')) {
                    level = 'success';
                } else if (logEntry.includes('🔄') || logEntry.includes('running')) {
                    level = 'active';
                }
                isoAddLogToUI(level, logEntry);
            } else if (logEntry.level && logEntry.message) {
                isoAddLogToUI(logEntry.level, logEntry.message);
            }
        });
        displayedLogCount = status.logs.length;
    }
}

/**
 * Update steps from status
 * Backend returns steps as map[string]string: {"prepare": "completed", "download": "running"}
 */
function updateStepsFromStatus(steps) {
    // Backend steps is a map: { "stepName": "status" }
    for (const [stepName, stepStatus] of Object.entries(steps)) {
        const stepElement = document.querySelector(`[data-step="${stepName}"]`);
        if (stepElement) {
            stepElement.classList.remove('active', 'completed');
            if (stepStatus === 'running' || stepStatus === 'active') {
                stepElement.classList.add('active');
            } else if (stepStatus === 'completed') {
                stepElement.classList.add('completed');
            }
        }
    }
}

/**
 * Add log to UI
 */
function isoAddLogToUI(level, message) {
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
}

/**
 * Show build progress
 */
function isoShowBuildProgress() {
    const buildProgress = document.getElementById('buildProgress');
    const buildLogsEl = document.getElementById('buildLogs');

    if (buildProgress) buildProgress.style.display = 'block';
    if (buildLogsEl) buildLogsEl.style.display = 'block';

    // Reset progress
    isoResetBuildProgress();
}

/**
 * Hide build progress
 */
function isoHideBuildProgress() {
    const buildProgress = document.getElementById('buildProgress');
    const buildLogsEl = document.getElementById('buildLogs');

    if (buildProgress) buildProgress.style.display = 'none';
    if (buildLogsEl) buildLogsEl.style.display = 'none';
}

/**
 * Reset build progress
 */
function isoResetBuildProgress() {
    // Reset steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Reset progress bar
    const progressBar = document.getElementById('progressFill');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
    
    // Clear logs
    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        logContainer.innerHTML = '';
    }
    
    buildLogs = [];
    displayedLogCount = 0; // Reset displayed log counter
}

/**
 * Show download section
 */
function showDownloadSection(buildID) {
    currentBuildID = buildID;
    const downloadSection = document.getElementById('downloadSection');
    if (downloadSection) {
        downloadSection.style.display = 'block';
    }
}

/**
 * Download ISO function
 */
function downloadISO() {
    if (!currentBuildID) {
        showStatus('userdataStatus', 'error', 'No build ID available for download');
        return;
    }
    
    try {
        // Create download link
        const downloadUrl = `${API_BASE}/build/download/${currentBuildID}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = ''; // Let the server set the filename
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatus('userdataStatus', 'success', 'Download started');
    } catch (error) {
        console.error('Download error:', error);
        showStatus('userdataStatus', 'error', `Download failed: ${error.message}`);
    }
}

/**
 * Show a simple confirm modal using the global confirmModal from templates.html
 */
function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    if (!modal) {
        if (window.confirm(message)) onConfirm();
        return;
    }
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    const actionBtn = document.getElementById('confirmModalAction');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (actionBtn) actionBtn.onclick = () => {
        modal.style.display = 'none';
        if (typeof onConfirm === 'function') onConfirm();
    };
    modal.style.display = 'block';
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Reset build configuration
 */
async function resetBuildConfig() {
    console.log('resetBuildConfig called');

    showConfirmModal(
        'Reset Configuration',
        'Reset all build configuration? This will clear source selection and destination path.',
        async function() {
            console.log('User confirmed reset, calling backend API...');

            try {
                const response = await fetch(`${API_BASE}/build/reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.warn('Backend reset warning:', error.message);
                } else {
                    console.log('Backend build configuration reset successfully');
                }
            } catch (error) {
                console.warn('Failed to call backend reset API:', error);
            }

            console.log('Resetting frontend state...');
            const sourceTypeRadios = document.querySelectorAll('input[name="sourceType"]');
            sourceTypeRadios.forEach(r => r.checked = r.value === 'download');

            const localIsoSection = document.getElementById('localIsoSection');
            if (localIsoSection) {
                const fileNameDisplay = localIsoSection.querySelector('.file-name-display');
                if (fileNameDisplay) fileNameDisplay.textContent = '';
                const fileInput = localIsoSection.querySelector('input[type="file"]');
                if (fileInput) fileInput.value = '';
            }

            const destPathInput = document.getElementById('destinationPath');
            if (destPathInput) destPathInput.value = 'custom-iso.iso';

            toggleSourceType();
            isoResetBuildProgress();

            const statusEl = document.getElementById('userdataStatus');
            if (statusEl) {
                statusEl.className = 'status';
                statusEl.textContent = 'Build configuration reset';
                statusEl.style.display = 'block';
            }

            console.log('Frontend build configuration reset completed');
        }
    );
}

// Export functions for use in other modules
window.ISOGenerator = {
    initISOForm,
    toggleSourceType,
    handleFileSelect,
    removeSelectedFile,
    generateISO,
    downloadISO,
    resetBuildConfig,
    showBuildProgress: isoShowBuildProgress,
    hideBuildProgress: isoHideBuildProgress,
    resetBuildProgress: isoResetBuildProgress,
    showConfirmModal,
    closeConfirmModal
};
