/**
 * UI Utilities Module
 * Provides common UI operations, status management, and utility functions
 */

/**
 * Show status message
 */
function showStatus(elementId, type, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.className = `status ${type}`;
    element.textContent = message;
    element.style.display = 'block';
    
    // Auto-hide success and info messages after 10 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 10000);
    }
}

/**
 * Show result data
 */
function showResult(elementId, data) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (typeof data === 'object') {
        element.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    } else {
        element.textContent = data;
    }
    element.style.display = 'block';
}

/**
 * Toggle tab content
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
 * Initialize tab functionality
 */
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

/**
 * Show loading spinner
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    // Save original content and state (only save once)
    if (!element.dataset.originalHtml) {
        element.dataset.originalHtml = element.innerHTML;
    }
    if (!element.dataset.originalDisabled) {
        element.dataset.originalDisabled = element.disabled ? 'true' : 'false';
    }
    element.disabled = true;
    // Show simple loading indicator
    element.innerHTML = '<span class="loading-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:8px;"></span>Processing...';
    element.style.display = 'block';
}

/**
 * Hide loading spinner
 */
function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    // Restore original content and state
    if (element.dataset.originalHtml) {
        element.innerHTML = element.dataset.originalHtml;
        delete element.dataset.originalHtml;
    }
    if (element.dataset.originalDisabled) {
        element.disabled = element.dataset.originalDisabled === 'true';
        delete element.dataset.originalDisabled;
    } else {
        element.disabled = false;
    }
    // Keep visible
    element.style.display = 'block';
}

/**
 * Show confirmation dialog
 */
function showConfirm(message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-content">
            <p>${message}</p>
            <div class="confirm-buttons">
                <button class="btn btn-primary" onclick="this.closest('.confirm-dialog').remove(); ${onConfirm ? onConfirm() : ''}">Confirm</button>
                <button class="btn btn-secondary" onclick="this.closest('.confirm-dialog').remove(); ${onCancel ? onCancel() : ''}">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    return formatBytes(bytes);
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
 * Throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate IP address format
 */
function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

/**
 * Validate CIDR notation
 */
function isValidCIDR(cidr) {
    const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
    return cidrRegex.test(cidr);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showAlert('Text copied to clipboard', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showAlert('Text copied to clipboard', 'success');
    }
}

/**
 * Download data as file
 */
function downloadAsFile(data, filename, mimeType = 'text/plain') {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get element by ID with error handling
 */
function getElement(id, errorMessage = null) {
    const element = document.getElementById(id);
    if (!element && errorMessage) {
        console.error(errorMessage);
    }
    return element;
}

/**
 * Create element with attributes
 */
function createElement(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.keys(attributes).forEach(key => {
        element.setAttribute(key, attributes[key]);
    });
    
    // Set text content
    if (textContent) {
        element.textContent = textContent;
    }
    
    return element;
}

/**
 * Add event listener with error handling
 */
function addEventListenerSafe(element, event, handler, options = {}) {
    if (element && typeof element.addEventListener === 'function') {
        element.addEventListener(event, handler, options);
        return true;
    } else {
        console.error('Cannot add event listener to element:', element);
        return false;
    }
}

/**
 * Remove event listener with error handling
 */
function removeEventListenerSafe(element, event, handler, options = {}) {
    if (element && typeof element.removeEventListener === 'function') {
        element.removeEventListener(event, handler, options);
        return true;
    } else {
        console.error('Cannot remove event listener from element:', element);
        return false;
    }
}

/**
 * Toggle element visibility
 */
function toggleElement(elementId) {
    const element = getElement(elementId);
    if (element) {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Show element
 */
function showElement(elementId) {
    const element = getElement(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

/**
 * Hide element
 */
function hideElement(elementId) {
    const element = getElement(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

/**
 * Enable element
 */
function enableElement(elementId) {
    const element = getElement(elementId);
    if (element) {
        element.disabled = false;
    }
}

/**
 * Disable element
 */
function disableElement(elementId) {
    const element = getElement(elementId);
    if (element) {
        element.disabled = true;
    }
}

/**
 * Set element value safely
 */
function setElementValue(elementId, value) {
    const element = getElement(elementId);
    if (element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
            element.value = value;
        } else {
            element.textContent = value;
        }
    }
}

/**
 * Get element value safely
 */
function getElementValue(elementId) {
    const element = getElement(elementId);
    if (element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
            return element.value;
        } else {
            return element.textContent;
        }
    }
    return null;
}

// Export functions for use in other modules
window.UIUtils = {
    showStatus,
    showResult,
    switchTab,
    initTabs,
    showLoading,
    hideLoading,
    showConfirm,
    showAlert,
    formatBytes,
    formatFileSize,
    debounce,
    throttle,
    isValidEmail,
    isValidIP,
    isValidCIDR,
    copyToClipboard,
    downloadAsFile,
    getElement,
    createElement,
    addEventListenerSafe,
    removeEventListenerSafe,
    toggleElement,
    showElement,
    hideElement,
    enableElement,
    disableElement,
    setElementValue,
    getElementValue
};

/* Simple rotation animation */
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
