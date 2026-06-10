/**
 * System Info Manager
 * Fetches and displays host system information
 */

(function() {
    'use strict';

    const SystemInfoManager = {
        _initialized: false,

        /**
         * Initialize the System Info page
         */
        init: function() {
            if (this._initialized) {
                this.refresh();
                return;
            }
            this._initialized = true;
            this.refresh();
        },

        /**
         * Fetch and display system information
         */
        async refresh() {
            try {
                this.showLoading();
                this.hideError();

                const response = await fetch('/api/v1/host/info');
                if (!response.ok) {
                    throw new Error('Failed to fetch system info');
                }

                const data = await response.json();
                if (data.success && data.host) {
                    this.renderHostInfo(data.host);
                    this.showContent();
                } else {
                    throw new Error(data.message || 'Invalid response');
                }
            } catch (error) {
                console.error('Failed to load system info:', error);
                this.showError(error.message || 'Failed to load system information');
            }
        },

        /**
         * Render host information to the page
         */
        renderHostInfo: function(host) {
            // OS Info
            this.setElement('hostPrettyName', host.os.prettyName || 'Unknown');
            this.setElement('hostName', host.os.name || 'Unknown');
            this.setElement('hostVersion', host.os.version || 'Unknown');
            this.setElement('hostCodename', host.os.codename || 'Unknown');

            // Platform Info
            this.setElement('hostArch', host.platform.arch || 'Unknown');

            // Kernel Info
            this.setElement('hostKernel', host.kernel.release || 'Unknown');

            // Runtime Info
            this.setElement('hostGoVersion', host.runtime.goVersion || 'Unknown');
            this.setElement('hostGoArch', host.runtime.goArch || 'Unknown');
        },

        /**
         * Set element text content safely
         */
        setElement: function(id, value) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
            }
        },

        /**
         * Show loading state
         */
        showLoading: function() {
            const loading = document.getElementById('systemInfoLoading');
            const grid = document.getElementById('systemInfoGrid');
            if (loading) loading.style.display = 'flex';
            if (grid) grid.style.display = 'none';
        },

        /**
         * Show content
         */
        showContent: function() {
            const loading = document.getElementById('systemInfoLoading');
            const grid = document.getElementById('systemInfoGrid');
            if (loading) loading.style.display = 'none';
            if (grid) grid.style.display = 'grid';
        },

        /**
         * Show error state
         */
        showError: function(message) {
            const loading = document.getElementById('systemInfoLoading');
            const grid = document.getElementById('systemInfoGrid');
            const error = document.getElementById('systemInfoError');
            const errorMsg = document.getElementById('systemInfoErrorMsg');

            if (loading) loading.style.display = 'none';
            if (grid) grid.style.display = 'none';
            if (error) error.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = message;
        },

        /**
         * Hide error state
         */
        hideError: function() {
            const error = document.getElementById('systemInfoError');
            if (error) error.style.display = 'none';
        }
    };

    // Export to window
    window.SystemInfoManager = SystemInfoManager;
})();
