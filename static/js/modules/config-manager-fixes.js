/**
 * Configuration Manager Fixes
 * Fixes missing fields collection across configuration modules
 */

// Fix network config collection wrapper
function fixNetworkConfigCollection() {
    // Locate the original buildConfig and extend it to reuse NetworkManager results (avoid rebuilding via wrong selectors)
    const originalBuildConfig = window.buildConfig;
    if (typeof originalBuildConfig !== 'function') return;

    window.buildConfig = function() {
        const config = originalBuildConfig.call(this);

        // Reuse NetworkManager's standard result to avoid missing fields
        try {
            if (window.NetworkManager && typeof window.NetworkManager.getNetworkConfig === 'function') {
                const networkConfig = window.NetworkManager.getNetworkConfig();
                if (networkConfig && typeof networkConfig === 'object') {
                    if (!config.autoinstall) config.autoinstall = {};
                    config.autoinstall.network = networkConfig;
                }
            }
        } catch (e) {
            console.error('fixNetworkConfigCollection wrapper error:', e);
        }

        return config;
    };
}

// Collect basic network configuration
function collectBasicNetworkConfig(device, deviceConfig) {
    // IP addresses
    const addressItems = device.querySelectorAll('.address-item');
    addressItems.forEach(addressItem => {
        const ipInput = addressItem.querySelector('.ip-address-input');
        const prefixInput = addressItem.querySelector('.prefix-length-input');

        if (ipInput && ipInput.value.trim()) {
            const ip = ipInput.value.trim();
            const prefix = prefixInput && prefixInput.value ? prefixInput.value : '24';
            deviceConfig.addresses.push(`${ip}/${prefix}`);
        }
    });

    // DNS servers
    const nameserverItems = device.querySelectorAll('.nameserver-item');
    nameserverItems.forEach(nameserverItem => {
        const nsInput = nameserverItem.querySelector('.nameserver-input');
        if (nsInput && nsInput.value.trim()) {
            deviceConfig.nameservers.addresses.push(nsInput.value.trim());
        }
    });

    // Search domains
    const searchDomainItems = device.querySelectorAll('.search-domain-item');
    searchDomainItems.forEach(searchDomainItem => {
        const domainInput = searchDomainItem.querySelector('.search-domain-input');
        if (domainInput && domainInput.value.trim()) {
            const searchDomains = domainInput.value.trim().split(/[,\s]+/).filter(d => d);
            if (searchDomains.length > 0) {
                deviceConfig.nameservers.search.push(...searchDomains);
            }
        }
    });

    // Routes
    const routeItems = device.querySelectorAll('.route-item');
    const routes = [];
    routeItems.forEach(routeItem => {
        const toInput = routeItem.querySelector('.route-to-input');
        const viaInput = routeItem.querySelector('.route-via-input');
        const metricInput = routeItem.querySelector('.route-metric-input');

        if (toInput && viaInput && toInput.value.trim() && viaInput.value.trim()) {
            const route = {
                to: toInput.value.trim(),
                via: viaInput.value.trim()
            };

            if (metricInput && metricInput.value && parseInt(metricInput.value) > 0) {
                route.metric = parseInt(metricInput.value);
            }

            routes.push(route);
        }
    });

    if (routes.length > 0) {
        deviceConfig.routes = routes;
    }

    // MTU
    const mtuInput = device.querySelector('.device-mtu-input');
    if (mtuInput && mtuInput.value && parseInt(mtuInput.value) > 0) {
        deviceConfig.mtu = parseInt(mtuInput.value);
    }

    // Match conditions
    const matchNameInput = device.querySelector('.device-match-name-input');
    const matchMacInput = device.querySelector('.device-match-mac-input');

    if (matchNameInput && matchNameInput.value && matchNameInput.value.trim()) {
        if (!deviceConfig.match) {
            deviceConfig.match = {};
        }
        deviceConfig.match.name = matchNameInput.value.trim();
    }

    if (matchMacInput && matchMacInput.value && matchMacInput.value.trim()) {
        if (!deviceConfig.match) {
            deviceConfig.match = {};
        }
        deviceConfig.match.macaddress = matchMacInput.value.trim();
    }

    // DHCP settings
    const dhcp4Input = device.querySelector('.device-dhcp4-input');
    if (dhcp4Input) {
        deviceConfig.dhcp4 = dhcp4Input.value === 'true';
    }

    const dhcp6Input = device.querySelector('.device-dhcp6-input');
    if (dhcp6Input) {
        deviceConfig.dhcp6 = dhcp6Input.value === 'true';
    }
}

// Collect device-type specific configuration
function collectDeviceSpecificConfig(device, deviceType, deviceConfig) {
    switch (deviceType) {
        case 'wifis':
            // WiFi specific fields
            const wifiPassword = device.querySelector('.wifi-password-input')?.value;
            const wifiSSID = device.querySelector('.wifi-ssid-input')?.value;
            const wifiSecurity = device.querySelector('.wifi-security-input')?.value;
            const wifiHidden = device.querySelector('.wifi-hidden-input')?.value;
            const wifiMode = device.querySelector('.wifi-mode-input')?.value;

            if (wifiSSID) {
                deviceConfig['access-points'] = {};
                deviceConfig['access-points'][wifiSSID] = {};

                if (wifiPassword) {
                    deviceConfig['access-points'][wifiSSID].password = wifiPassword;
                }

                if (wifiSecurity) {
                    deviceConfig['access-points'][wifiSSID].mode = wifiSecurity;
                }

                if (wifiHidden === 'true') {
                    deviceConfig['access-points'][wifiSSID].hidden = true;
                }

                if (wifiMode) {
                    deviceConfig['access-points'][wifiSSID]['network-mode'] = wifiMode;
                }
            }
            break;

        case 'bridges':
            // Bridge specific fields
            const bridgePorts = device.querySelector('.bridge-ports-input')?.value;
            if (bridgePorts) {
                deviceConfig.interfaces = bridgePorts.split(',').map(p => p.trim()).filter(p => p);
            }

            const bridgeStp = device.querySelector('.bridge-stp-input')?.value;
            if (bridgeStp !== undefined) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters.stp = bridgeStp === 'true';
            }

            const bridgeForwardDelay = device.querySelector('.bridge-forward-delay-input')?.value;
            if (bridgeForwardDelay) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters['forward-delay'] = parseInt(bridgeForwardDelay);
            }

            const bridgeHelloTime = device.querySelector('.bridge-hello-time-input')?.value;
            if (bridgeHelloTime) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters['hello-time'] = parseInt(bridgeHelloTime);
            }

            const bridgeMaxAge = device.querySelector('.bridge-max-age-input')?.value;
            if (bridgeMaxAge) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters['max-age'] = parseInt(bridgeMaxAge);
            }
            break;

        case 'bonds':
            // Bond specific fields
            const bondInterfaces = device.querySelector('.bond-interfaces-input')?.value;
            if (bondInterfaces) {
                deviceConfig.interfaces = bondInterfaces.split(',').map(i => i.trim()).filter(i => i);
            }

            const bondMode = device.querySelector('.bond-mode-input')?.value;
            if (bondMode) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters.mode = bondMode;
            }

            const bondMiimon = device.querySelector('.bond-miimon-input')?.value;
            if (bondMiimon) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters['mii-monitor-interval'] = parseInt(bondMiimon);
            }

            const bondUpdelay = device.querySelector('.bond-updelay-input')?.value;
            if (bondUpdelay) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters['up-delay'] = parseInt(bondUpdelay);
            }

            const bondDowndelay = device.querySelector('.bond-downdelay-input')?.value;
            if (bondDowndelay) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters['down-delay'] = parseInt(bondDowndelay);
            }

            const bondPrimary = device.querySelector('.bond-primary-input')?.value;
            if (bondPrimary) {
                deviceConfig.parameters = deviceConfig.parameters || {};
                deviceConfig.parameters.primary = bondPrimary;
            }
            break;

        case 'vlans':
            // VLAN specific fields
            const vlanId = device.querySelector('.vlan-id-input')?.value;
            if (vlanId) {
                deviceConfig.id = parseInt(vlanId);
            }

            const vlanLink = device.querySelector('.vlan-link-input')?.value;
            if (vlanLink) {
                deviceConfig.link = vlanLink;
            }
            break;

        case 'tunnels':
            // Tunnel specific fields
            const tunnelMode = device.querySelector('.tunnel-mode-input')?.value;
            if (tunnelMode) {
                deviceConfig.mode = tunnelMode;
            }

            const tunnelLocal = device.querySelector('.tunnel-local-input')?.value;
            if (tunnelLocal) {
                deviceConfig.local = tunnelLocal;
            }

            const tunnelRemote = device.querySelector('.tunnel-remote-input')?.value;
            if (tunnelRemote) {
                deviceConfig.remote = tunnelRemote;
            }

            const tunnelKey = device.querySelector('.tunnel-key-input')?.value;
            if (tunnelKey) {
                deviceConfig.key = tunnelKey;
            }
            break;
    }
}

// Check if device configuration has actual content
function hasNetworkConfigContent(deviceConfig) {
    return deviceConfig.addresses.length > 0 ||
           deviceConfig.nameservers.addresses.length > 0 ||
           (deviceConfig.nameservers.search && deviceConfig.nameservers.search.length > 0) ||
           (deviceConfig.routes && deviceConfig.routes.length > 0) ||
           deviceConfig.mtu ||
           deviceConfig.dhcp4 ||
           deviceConfig.dhcp6 ||
           deviceConfig['access-points'] ||
           deviceConfig.interfaces ||
           deviceConfig.parameters ||
           deviceConfig.id ||
           deviceConfig.link ||
           deviceConfig.mode ||
           deviceConfig.local ||
           deviceConfig.remote ||
           deviceConfig.key ||
           deviceConfig.match;
}

// Fix storage configuration collection (supplement potentially missing fields)
function fixStorageConfigCollection() {
    // Extend storage configuration collection to ensure all fields are collected
    const originalCollectStorageConfig = window.collectStorageConfig || function() {};

    window.collectStorageConfig = function() {
        const storageConfigs = document.querySelectorAll('.storage-config');
        let storageConfig = [];

        if (storageConfigs.length > 0) {
            storageConfigs.forEach((storage, index) => {
                const storageType = storage.querySelector('.storage-type-input')?.value;

                if (storageType) {
                    const configItem = {
                        type: storageType
                    };

                    // Collect common fields
                    const id = storage.querySelector('.storage-id-input')?.value;
                    if (id) configItem.id = id;

                    // Collect specific fields based on storage type
                    switch (storageType) {
                        case 'disk':
                            collectDiskConfig(storage, configItem);
                            break;
                        case 'partition':
                            collectPartitionConfig(storage, configItem);
                            break;
                        case 'format':
                            collectFormatConfig(storage, configItem);
                            break;
                        case 'mount':
                            collectMountConfig(storage, configItem);
                            break;
                        case 'lvm_volgroup':
                            collectLVMVolgroupConfig(storage, configItem);
                            break;
                        case 'lvm_partition':
                            collectLVMPartitionConfig(storage, configItem);
                            break;
                        case 'dm_crypt':
                            collectDMCryptConfig(storage, configItem);
                            break;
                        case 'raid':
                            collectRaidConfig(storage, configItem);
                            break;
                    }

                    // Only add if configuration item has actual content
                    if (Object.keys(configItem).length > 1) {
                        storageConfig.push(configItem);
                    }
                }
            });
        }

        return storageConfig;
    };
}

// Collect configurations for various storage types
function collectDiskConfig(storage, configItem) {
    const device = storage.querySelector('.storage-device-input')?.value;
    const grubDevice = storage.querySelector('.storage-grub-input')?.value;
    const ptable = storage.querySelector('.storage-ptable-input')?.value;
    const wipe = storage.querySelector('.storage-wipe-input')?.value;
    const preserve = storage.querySelector('.storage-preserve-input')?.value;

    if (device) configItem.device = device;
    if (grubDevice !== undefined) configItem.grub_device = grubDevice === 'true';
    if (ptable) configItem.ptable = ptable;
    if (wipe) configItem.wipe = wipe;
    if (preserve !== undefined) configItem.preserve = preserve === 'true';

    // Read all match conditions
    const matchRows = storage.querySelectorAll('.disk-match-row');
    if (matchRows.length > 0) {
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
}

function collectPartitionConfig(storage, configItem) {
    const size = storage.querySelector('.storage-size-input')?.value;
    const unit = storage.querySelector('.storage-size-unit')?.value;
    const flag = storage.querySelector('.storage-flag-input')?.value;
    const device = storage.querySelector('.storage-device-input')?.value;
    const number = storage.querySelector('.storage-number-input')?.value;
    const wipe = storage.querySelector('.storage-wipe-input')?.value;

    if (device) configItem.device = device;
    if (number) configItem.number = parseInt(number);
    if (size && unit) {
        configItem.size = convertSizeToBytes(size, unit);
    }
    if (flag) configItem.flag = flag;
    if (wipe) configItem.wipe = wipe;
}

function collectFormatConfig(storage, configItem) {
    const fstype = storage.querySelector('.storage-fstype-input')?.value;
    const volume = storage.querySelector('.storage-volume-input')?.value;
    const preserve = storage.querySelector('.storage-preserve-input')?.value;
    const label = storage.querySelector('.storage-label-input')?.value;

    if (fstype) configItem.fstype = fstype;
    if (volume) configItem.volume = volume;
    if (preserve !== undefined) configItem.preserve = preserve === 'true';
    if (label) configItem.label = label;
}

function collectMountConfig(storage, configItem) {
    const path = storage.querySelector('.storage-path-input')?.value;
    const device = storage.querySelector('.storage-device-input')?.value;
    const preserve = storage.querySelector('.storage-preserve-input')?.value;
    const options = storage.querySelector('.storage-options-input')?.value;

    if (path) configItem.path = path;
    if (device) configItem.device = device;
    if (preserve !== undefined) configItem.preserve = preserve === 'true';
    if (options) configItem.options = options;
}

function collectLVMVolgroupConfig(storage, configItem) {
    const name = storage.querySelector('.storage-name-input')?.value;
    const devices = storage.querySelector('.storage-devices-input')?.value;

    if (name) configItem.name = name;
    if (devices) configItem.devices = devices.split(',').map(d => d.trim());
}

function collectLVMPartitionConfig(storage, configItem) {
    const size = storage.querySelector('.storage-size-input')?.value;
    const unit = storage.querySelector('.storage-size-unit')?.value;
    const name = storage.querySelector('.storage-name-input')?.value;
    const volgroup = storage.querySelector('.storage-volgroup-input')?.value;

    if (name) configItem.name = name;
    if (volgroup) configItem.volgroup = volgroup;
    if (size && unit) {
        configItem.size = convertSizeToBytes(size, unit);
    }
}

function collectDMCryptConfig(storage, configItem) {
    const volume = storage.querySelector('.storage-volume-input')?.value;
    const dmName = storage.querySelector('.storage-dm-name-input')?.value;
    const key = storage.querySelector('.storage-key-input')?.value;
    const cipher = storage.querySelector('.storage-cipher-input')?.value;

    if (volume) configItem.volume = volume;
    if (dmName) configItem.dm_name = dmName;
    if (key) configItem.key = key;
    if (cipher) configItem.cipher = cipher;
}

function collectRaidConfig(storage, configItem) {
    const name = storage.querySelector('.storage-name-input')?.value;
    const raidlevel = storage.querySelector('.storage-raidlevel-input')?.value;
    const devices = storage.querySelector('.storage-devices-input')?.value;
    const spares = storage.querySelector('.storage-spares-input')?.value;

    if (name) configItem.name = name;
    if (raidlevel) configItem.raidlevel = raidlevel;
    if (devices) configItem.devices = devices.split(',').map(d => d.trim());
    if (spares) configItem.spares = parseInt(spares);
}

// Helper function: size conversion
function convertSizeToBytes(size, unit) {
    const sizeValue = parseFloat(size);
    if (sizeValue === -1) {
        return -1;
    } else if (sizeValue > 0) {
        let sizeInBytes = sizeValue;
        if (unit === 'K') sizeInBytes *= 1024;
        else if (unit === 'M') sizeInBytes *= 1048576;
        else if (unit === 'G') sizeInBytes *= 1073741824;
        else if (unit === 'T') sizeInBytes *= 1099511627776;
        return Math.round(sizeInBytes);
    } else {
        return 0;
    }
}

// Check SSH configuration collection (ensure completeness)
function checkSSHConfigCollection() {
    // SSH configuration looks complete, but can add some additional validation
    const originalCollectSSHConfig = window.collectSSHConfig || function() {};

    window.collectSSHConfig = function() {
        const sshConfig = {
            "allow-pw": document.getElementById('sshAllowPW')?.value === 'true',
            "authorized-keys": document.getElementById('sshKeys')?.value?.split('\n').filter(k => k.trim()) || [],
            "install-server": document.getElementById('sshInstallServer')?.value === 'true'
        };

        // Add additional SSH field collection
        const sshPort = document.getElementById('sshPort')?.value;
        if (sshPort && parseInt(sshPort) !== 22) {
            sshConfig.port = parseInt(sshPort);
        }

        const sshPasswordAuth = document.getElementById('sshPasswordAuth')?.value;
        if (sshPasswordAuth !== undefined) {
            sshConfig['password-authentication'] = sshPasswordAuth === 'true';
        }

        return sshConfig;
    };
}

// Check Advanced configuration collection (ensure completeness)
function checkAdvancedConfigCollection() {
    // Advanced configuration looks complete, but can add some additional validation
    const originalCollectAdvancedConfig = window.collectAdvancedConfig || function() {};

    window.collectAdvancedConfig = function() {
        const advancedConfig = {
            packages: document.getElementById('autoinstallPackages')?.value?.split('\n').filter(p => p.trim()) || [],
            "late-commands": document.getElementById('lateCommands')?.value?.split('\n').filter(c => c.trim()) || [],
            "error-commands": document.getElementById('errorCommands')?.value?.split('\n').filter(c => c.trim()) || [],
            "user-data": {
                runcmd: document.getElementById('userDataCommands')?.value?.split('\n').filter(c => c.trim()) || []
            }
        };

        // Add potentially missing advanced fields
        const earlyCommands = document.getElementById('earlyCommands')?.value;
        if (earlyCommands) {
            advancedConfig['early-commands'] = earlyCommands.split('\n').filter(c => c.trim());
        }

        const errorCommands = document.getElementById('errorCommands')?.value;
        if (errorCommands) {
            advancedConfig['error-commands'] = errorCommands.split('\n').filter(c => c.trim());
        }

        const snapPackages = document.getElementById('snapPackages')?.value;
        if (snapPackages) {
            advancedConfig.snaps = snapPackages.split('\n').filter(p => p.trim()).map(p => ({name: p.trim()}));
        }

        return advancedConfig;
    };
}

// Initialize all fixes
function initializeConfigFixes() {
    console.log('Initializing configuration collection fixes...');

    // Apply network configuration fixes
    fixNetworkConfigCollection();

    // Apply storage configuration fixes
    fixStorageConfigCollection();

    // Check SSH configuration collection
    checkSSHConfigCollection();

    // Check Advanced configuration collection
    checkAdvancedConfigCollection();

    console.log('Configuration collection fixes applied successfully');
}

// Apply fixes when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConfigFixes);
} else {
    initializeConfigFixes();
}

// Export fix functions for external use
window.ConfigFixes = {
    initializeConfigFixes,
    fixNetworkConfigCollection,
    fixStorageConfigCollection,
    checkSSHConfigCollection,
    checkAdvancedConfigCollection
};
