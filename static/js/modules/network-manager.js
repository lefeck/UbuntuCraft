/**
 * Network Management Module
 */

/**
 * Initialize network devices with default configuration
 */
function initNetworkDevices() {
    const container = document.getElementById('networkDevices');
    if (!container) return;
    
    // If devices are already rendered, user may have filled them, don't reset to defaults
    if (container.querySelector('.network-device')) {
        return;
    }

    container.innerHTML = '';
    
    // Add default ethernet device with complete configuration
    addNetworkDevice('ethernets', 'eth0', false, false, ['192.168.10.100/24']);
    
    // Set default values for the first device after it's created
    setTimeout(() => {
        const firstDevice = container.querySelector('.network-device');
        if (firstDevice) {
            // Set default nameservers
            const nameserversInput = firstDevice.querySelector('.device-nameservers-input');
            if (nameserversInput) {
                nameserversInput.value = '114.114.114.114\n8.8.8.8';
            }
            
            // Set default gateway in first route
            const firstRouteVia = firstDevice.querySelector('.route-via-input');
            if (firstRouteVia) {
                firstRouteVia.value = '192.168.10.1';
            }
            
            // Default match condition: match by name eth0 (if match container exists)
            const firstMatchRow = firstDevice.querySelector('.network-match-container .disk-match-row');
            if (firstMatchRow) {
                const typeSel = firstMatchRow.querySelector('.disk-match-type');
                const valInp = firstMatchRow.querySelector('.disk-match-value');
                if (typeSel) typeSel.value = 'name';
                if (valInp) valInp.value = '';
            }
            
            // Set default device name
            const deviceNameInput = firstDevice.querySelector('.device-name-input');
            if (deviceNameInput) {
                deviceNameInput.value = 'eth0';
            }
            
            // Set default static IP addresses
            const addressesInput = firstDevice.querySelector('.device-addresses-input');
            if (addressesInput) {
                addressesInput.value = '192.168.10.195/24';
            }
            
            // Set default search domains
            const searchDomainsInput = firstDevice.querySelector('.device-search-domains-input');
            if (searchDomainsInput) {
                searchDomainsInput.value = '';
            }
            
            // Set default MTU
            const mtuInput = firstDevice.querySelector('.device-mtu-input');
            if (mtuInput) {
                mtuInput.value = '';
            }
        }
    }, 100);
}

/**
 * Add network device configuration
 */
function addNetworkDevice(deviceType = 'ethernets', deviceName = '', dhcp4 = true, dhcp6 = false, addresses = [], interfaces = [], bondParams = {}) {
    const container = document.getElementById('networkDevices');
    if (!container) return;
    
    const deviceDiv = document.createElement('div');
    deviceDiv.className = 'network-device';
    
    // Generate unique device name if not provided
    if (!deviceName) {
        const existingDevices = container.querySelectorAll('.network-device');
        const nextNumber = existingDevices.length + 1;
        switch (deviceType) {
            case 'ethernets':
                deviceName = `eth${nextNumber - 1}`;
                break;
            case 'wifis':
                deviceName = `wifi${nextNumber - 1}`;
                break;
            case 'bridges':
                deviceName = `br${nextNumber - 1}`;
                break;
            case 'bonds':
                deviceName = `bond${nextNumber - 1}`;
                break;
            case 'vlans':
                deviceName = `vlan${nextNumber - 1}`;
                break;
            case 'tunnels':
                deviceName = `tun${nextNumber - 1}`;
                break;
            case 'vrfs':
                deviceName = `vrf${nextNumber - 1}`;
                break;
            case 'dummy-devices':
                deviceName = `dummy${nextNumber - 1}`;
                break;
            case 'modems':
                deviceName = `modem${nextNumber - 1}`;
                break;
            case 'nm-devices':
                deviceName = `nm${nextNumber - 1}`;
                break;
            default:
                deviceName = `device${nextNumber - 1}`;
        }
    }
    
    // Common fields for all device types
    let commonFields = `
        <div class="form-row">
            <div class="form-group">
                <label>Device Type <span class="hint-icon" data-tooltip="Select the kind of network interface to configure">?</span></label>
                <select class="device-type-input" onchange="updateNetworkDevice(this)">
                    <option value="ethernets" ${deviceType === 'ethernets' ? 'selected' : ''}>Ethernet</option>
                    <option value="wifis" ${deviceType === 'wifis' ? 'selected' : ''}>Wi‑Fi</option>
                    <option value="bridges" ${deviceType === 'bridges' ? 'selected' : ''}>Bridge</option>
                    <option value="bonds" ${deviceType === 'bonds' ? 'selected' : ''}>Bond</option>
                    <option value="vlans" ${deviceType === 'vlans' ? 'selected' : ''}>VLAN</option>
                    <option value="tunnels" ${deviceType === 'tunnels' ? 'selected' : ''}>Tunnel</option>
                    <option value="vrfs" ${deviceType === 'vrfs' ? 'selected' : ''}>VRF</option>
                    <option value="dummy-devices" ${deviceType === 'dummy-devices' ? 'selected' : ''}>Dummy Device</option>
                    <option value="modems" ${deviceType === 'modems' ? 'selected' : ''}>Modem</option>
                    <option value="nm-devices" ${deviceType === 'nm-devices' ? 'selected' : ''}>NM Device</option>
                </select>
            </div>
            <div class="form-group">
                <label>Device Name <span class="hint-icon" data-tooltip="Logical name for this interface configuration (e.g. eth0, wlan0)">?</span></label>
                <input type="text" class="device-name-input" value="${deviceName}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="optional">DHCP v4 <span class="hint-icon" data-tooltip="Enable IPv4 address via DHCP">?</span></label>
                <select class="device-dhcp4-input">
                    <option value="true" ${dhcp4 ? 'selected' : ''}>Enabled</option>
                    <option value="false" ${!dhcp4 ? 'selected' : ''}>Disabled</option>
                </select>
            </div>
            <div class="form-group">
                <label class="optional">DHCP v6 <span class="hint-icon" data-tooltip="Enable IPv6 address via DHCPv6">?</span></label>
                <select class="device-dhcp6-input">
                    <option value="true" ${dhcp6 ? 'selected' : ''}>Enabled</option>
                    <option value="false" ${!dhcp6 ? 'selected' : ''}>Disabled</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="optional">Static IP Addresses (one per line) <span class="hint-icon" data-tooltip="CIDR format, one per line. Leave empty if using DHCP">?</span></label>
                <textarea class="device-addresses-input" rows="2" placeholder="e.g., 192.168.1.100/24">${addresses.join('\n')}</textarea>
            </div>
            <div class="form-group">
                <label class="optional">DNS Nameservers (one per line) <span class="hint-icon" data-tooltip="IPv4/IPv6 DNS servers, one per line">?</span></label>
                <textarea class="device-nameservers-input" rows="2" placeholder="e.g., 8.8.8.8&#10;1.1.1.1&#10;2001:4860:4860::8888"></textarea>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="optional">DNS Search Domains (one per line) <span class="hint-icon" data-tooltip="Optional search suffixes for DNS queries, one per line">?</span></label>
                <textarea class="device-search-domains-input" rows="2" placeholder="e.g., example.com&#10;corp.local"></textarea>
            </div>
            <div class="form-group">
                <label class="optional">MTU (Maximum Transmission Unit) <span class="hint-icon" data-tooltip="Packet size in bytes. Leave empty for default (e.g. 1500)">?</span></label>
                <input type="number" class="device-mtu-input" min="68" max="65535">
            </div>
        </div>`;
    
    // Collect existing ethernet device names for pre-filling bridges/bonds etc.
    const ethernetNames = Array.from(container.querySelectorAll('.network-device'))
        .filter(d => d.querySelector('.device-type-input')?.value === 'ethernets')
        .map(d => d.querySelector('.device-name-input')?.value)
        .filter(Boolean);

    // Type-specific fields (pass available interfaces for bridges pre-filling and bond params)
    let typeSpecificFields = getDeviceSpecificFields(deviceType, deviceName, ethernetNames, bondParams, interfaces);

    // Routes configuration (default single column)
    let routesConfig = getRoutesConfigHtml();
    
    // Post-fields for Wi-Fi and other types (place Match Condition at the end)
    let postFields = getPostFields(deviceType, deviceName);

    // Combine Routes + Match into the same row (Ethernet/Wi-Fi/Modem)
    const combinedRoutesAndMatch = ['wifis','ethernets','modems'].includes(deviceType) ? getRoutesAndMatchRowHtml(deviceType, deviceName) : '';

    deviceDiv.innerHTML = `
        <div class="device-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
            <span class="device-type">${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Device</span>
                                <button type="button" class="remove-btn" onclick="event.stopPropagation(); window.NetworkManager.removeNetworkDevice(this)">Remove</button>
        </div>
        <div class="device-body">
            ${commonFields}
            ${typeSpecificFields}
            ${combinedRoutesAndMatch || (routesConfig + postFields)}
        </div>
    `;
    
    container.appendChild(deviceDiv);
    
    // Add input/blur events for required fields, highlight empty values with input-error
    try {
        const requiredInputs = deviceDiv.querySelectorAll('input[required], select[required], .device-name-input, .vlan-id-input, .vlan-link-input, .vrf-table-input, .modem-apn-input, .tunnel-remote-input, .bridge-interfaces-input, .bond-interfaces-input, .bond-mode-input');
        requiredInputs.forEach(function(el){
            el.addEventListener('input', function(){ this.classList.remove('input-error'); });
            el.addEventListener('blur', function(){
                if (!this.value || (typeof this.value === 'string' && this.value.trim() === '')) {
                    this.classList.add('input-error');
                } else {
                    this.classList.remove('input-error');
                }
            });
        });
    } catch (e) {
        console.warn('Failed to attach network required listeners', e);
    }
}

/**
 * Get device-specific configuration fields
 */
function getDeviceSpecificFields(deviceType, deviceName, bridgeInterfaces = [], bondParams = {}, bondInterfaces = []) {
    let specificFields = '';
    
    switch (deviceType) {
        case 'ethernets':
            // Ethernet Match changed to same row as Routes with equal width, no longer rendered here
            specificFields = ``;
            break;
            
        case 'wifis':
            // Restore Wi-Fi access point fields but don't show top "Access Points" label
            specificFields = `
                <div class="wifi-access-points">
                    <div class="access-point-item">
                        <div class="form-row">
                            <div class="form-group">
                                <label>SSID <span class="hint-icon" data-tooltip="Wireless network name (e.g. MyWiFi)">?</span></label>
                                <input type="text" class="ap-ssid-input" value="MyWiFi">
                            </div>
                            <div class="form-group">
                                <label class="optional">Password <span class="hint-icon" data-tooltip="Wi‑Fi password (e.g. 123456)">?</span></label>
                                <input type="password" class="ap-password-input" value="password">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="optional">Hidden Network <span class="hint-icon" data-tooltip="Whether SSID is broadcasted or hidden">?</span></label>
                                <select class="ap-hidden-input">
                                    <option value="false" selected>No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="optional">Band <span class="hint-icon" data-tooltip="Prefer 2.4GHz or 5GHz; or Auto">?</span></label>
                                <select class="ap-band-input">
                                    <option value="" selected>Auto</option>
                                    <option value="2.4">2.4GHz</option>
                                    <option value="5">5GHz</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="add-item-btn" onclick="window.NetworkManager.addAccessPoint(this)">Add Access Point</button>
                </div>`;
            break;
            
        case 'bridges':
            // Pre-fill existing ethernet interface names (if they exist)
            const prefillIfaces = (bridgeInterfaces && bridgeInterfaces.length) ? bridgeInterfaces.join(', ') : '';
            specificFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Bridge Interfaces (comma separated) <span class="hint-icon" data-tooltip="Member interfaces to bridge (e.g. eth0, eth1)">?</span></label>
                        <input type="text" class="bridge-interfaces-input" value="${prefillIfaces}">
                    </div>
                    <div class="form-group">
                        <label class="optional">STP (Spanning Tree Protocol) <span class="hint-icon" data-tooltip="Enable loop prevention on bridge">?</span></label>
                        <select class="bridge-stp-input">
                            <option value="false">Disabled</option>
                            <option value="true">Enabled</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Forward Delay <span class="hint-icon" data-tooltip="STP forwarding delay (e.g. 15 seconds)">?</span></label>
                        <input type="number" class="bridge-forward-delay-input" min="2" max="30">
                    </div>
                    <div class="form-group">
                        <label class="optional">Ageing Time <span class="hint-icon" data-tooltip="Time before MAC entries expire (e.g. 300 seconds)">?</span></label>
                        <input type="number" class="bridge-ageing-time-input"  min="0">
                    </div>
                </div>`;
            break;
            
        case 'bonds':
            const prefillBondIfaces = (bondInterfaces && bondInterfaces.length) ? bondInterfaces.join(', ') : '';
            const bondMode = bondParams.mode || '';
            const bondLacpRate = bondParams['lacp-rate'] || '';
            const bondMinLinks = bondParams['min-links'] || '';
            specificFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Bond Interfaces (comma separated) <span class="hint-icon" data-tooltip="Member interfaces to bond (e.g. eth0, eth1)">?</span></label>
                        <input type="text" class="bond-interfaces-input" value="${prefillBondIfaces}">
                    </div>
                    <div class="form-group">
                        <label>Bond Mode <span class="hint-icon" data-tooltip="Bonding policy / strategy">?</span></label>
                        <select class="bond-mode-input">
                            <option value="active-backup" ${bondMode === 'active-backup' ? 'selected' : ''}>Active-Backup</option>
                            <option value="balance-rr" ${bondMode === 'balance-rr' ? 'selected' : ''}>Balance Round-Robin</option>
                            <option value="balance-xor" ${bondMode === 'balance-xor' ? 'selected' : ''}>Balance XOR</option>
                            <option value="broadcast" ${bondMode === 'broadcast' ? 'selected' : ''}>Broadcast</option>
                            <option value="802.3ad" ${bondMode === '802.3ad' ? 'selected' : ''}>802.3ad (LACP)</option>
                            <option value="balance-tlb" ${bondMode === 'balance-tlb' ? 'selected' : ''}>Adaptive TLB</option>
                            <option value="balance-alb" ${bondMode === 'balance-alb' ? 'selected' : ''}>Adaptive ALB</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Primary Interface <span class="hint-icon" data-tooltip="Primary slave for active-backup mode (e.g. eth0)">?</span></label>
                        <input type="text" class="bond-primary-input" value="${bondParams.primary || ''}">
                    </div>
                    <div class="form-group">
                        <label class="optional">MII Monitor Interval <span class="hint-icon" data-tooltip="Link monitoring frequency (e.g. 100) ms">?</span></label>
                        <input type="number" class="bond-mii-input" value="${bondParams['mii-monitor-interval'] || ''}" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">LACP Rate <span class="hint-icon" data-tooltip="Negotiation rate for 802.3ad">?</span></label>
                        <select class="bond-lacp-rate-input">
                            <option value="" ${bondLacpRate === '' ? 'selected' : ''}>Default</option>
                            <option value="slow" ${bondLacpRate === 'slow' ? 'selected' : ''}>Slow</option>
                            <option value="fast" ${bondLacpRate === 'fast' ? 'selected' : ''}>Fast</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Minimum Links <span class="hint-icon" data-tooltip="Minimum active links required">?</span></label>
                        <input type="number" class="bond-min-links-input" value="${bondMinLinks}" placeholder="e.g., 1" min="0">
                    </div>
                </div>`;
            break;
            
        case 'vlans':
            specificFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>VLAN ID <span class="hint-icon" data-tooltip="VLAN tag (1-4094)">?</span></label>
                        <input type="number" class="vlan-id-input" min="1" max="4094" required>
                    </div>
                    <div class="form-group">
                        <label>Parent Interface <span class="hint-icon" data-tooltip="Underlying physical or logical interface (e.g. eth0)">?</span></label>
                        <input type="text" class="vlan-link-input" required>
                    </div>
                </div>`;
            break;
            
        case 'tunnels':
            specificFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Tunnel Mode <span class="hint-icon" data-tooltip="Encapsulation type for the tunnel">?</span></label>
                        <select class="tunnel-mode-input">
                            <option value="gre">GRE</option>
                            <option value="ipip">IPIP</option>
                            <option value="sit">SIT (IPv6 over IPv4)</option>
                            <option value="gretap">GRETAP</option>
                            <option value="ip6gre">IP6GRE</option>
                            <option value="ip6gretap">IP6GRETAP</option>
                            <option value="vti">VTI</option>
                            <option value="vti6">VTI6</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Local IP <span class="hint-icon" data-tooltip="Local tunnel endpoint address (e.g. 192.168.1.1)">?</span></label>
                        <input type="text" class="tunnel-local-input">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Remote IP <span class="hint-icon" data-tooltip="Remote tunnel endpoint address (e.g. 192.168.2.1)">?</span></label>
                        <input type="text" class="tunnel-remote-input">
                    </div>
                    <div class="form-group">
                        <label class="optional">Tunnel Key <span class="hint-icon" data-tooltip="Optional key/ID for GRE-like tunnels (e.g. 42)">?</span></label>
                        <input type="number" class="tunnel-key-input" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">TTL <span class="hint-icon" data-tooltip="Packet time-to-live (e.g. 64)">?</span></label>
                        <input type="number" class="tunnel-ttl-input"  min="1" max="255">
                    </div>
                    <div class="form-group">
                        <label class="optional">Port <span class="hint-icon" data-tooltip="UDP port if applicable (e.g. 4789)">?</span></label>
                        <input type="number" class="tunnel-port-input" min="1" max="65535">
                    </div>
                </div>`;
            break;
            
        case 'vrfs':
            specificFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>VRF Table ID <span class="hint-icon" data-tooltip="Routing table number for this VRF (e.g. 100)">?</span></label>
                        <input type="number" class="vrf-table-input" min="1" max="4294967295" required>
                    </div>
                    <div class="form-group">
                        <label class="optional">VRF Interfaces (comma separated) <span class="hint-icon" data-tooltip="Interfaces assigned to this VRF  (e.g. eth1, eth2)">?</span></label>
                        <input type="text" class="vrf-interfaces-input">
                    </div>
                </div>`;
            break;
            
        case 'dummy-devices':
            specificFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Optional <span class="hint-icon" data-tooltip="Whether this device is optional at boot">?</span></label>
                        <select class="device-optional-input">
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Critical <span class="hint-icon" data-tooltip="Treat this device as critical for networking">?</span></label>
                        <select class="device-critical-input">
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                </div>`;
            break;
            
        case 'modems':
            // Keep APN/PIN, remove old Match block (changed to same row as Routes with equal width)
            specificFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label>APN <span class="hint-icon" data-tooltip="Carrier APN for mobile data">?</span></label>
                        <input type="text" class="modem-apn-input" placeholder="e.g., internet.provider.com" required>
                    </div>
                    <div class="form-group">
                        <label class="optional">PIN <span class="hint-icon" data-tooltip="SIM PIN (if required)">?</span></label>
                        <input type="password" class="modem-pin-input" placeholder="SIM PIN (if required)">
                    </div>
                </div>`;
            break;
            
        case 'nm-devices':
            specificFields = `
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Connection UUID <span class="hint-icon" data-tooltip="NetworkManager connection UUID">?</span></label>
                        <input type="text" class="nm-uuid-input" placeholder="e.g., 12345678-1234-5678-9abc-123456789abc">
                    </div>
                    <div class="form-group">
                        <label class="optional">Device</label>
                        <input type="text" class="nm-device-input" placeholder="e.g., eth0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Raw NetworkManager Config (JSON)</label>
                        <textarea class="nm-passthrough-input" rows="3" placeholder='{"connection": {"type": "ethernet"}}'></textarea>
                    </div>
                    <div class="form-group">
                        <label class="optional">Connection Name</label>
                        <input type="text" class="nm-name-input" placeholder="e.g., My Connection">
                    </div>
                </div>`;
            break;
            
        default:
            specificFields = '';
    }
    
    return specificFields;
}

/**
 * Get common routes configuration HTML
 */
function getRoutesConfigHtml() {
    return `
        <div class="form-row">
            <div class="form-group">
                <label class="optional">Routes <span class="hint-icon" data-tooltip="Static routes for this interface">?</span></label>
                <div class="routes-container">
                    <div class="route-item">
                        <input type="text" class="route-to-input" placeholder="Destination (e.g., default, 10.0.0.0/8)" value="default">
                        <input type="text" class="route-via-input" placeholder="Gateway (e.g., 192.168.1.1)">
                        <input type="number" class="route-metric-input" placeholder="Metric (optional)" min="0">
                                                        <button type="button" class="remove-route-btn" onclick="window.NetworkManager.removeDeviceRoute(this)">Remove</button>
                            </div>
                        </div>
                        <button type="button" class="add-item-btn" onclick="window.NetworkManager.addDeviceRoute(this)">Add Route</button>
            </div>
        </div>`;
}

/**
 * Update network device when type changes
 */
function updateNetworkDevice(selectElement) {
    const deviceDiv = selectElement.closest('.network-device');
    const newType = selectElement.value;
    
    // Get current device name
    const currentName = deviceDiv.querySelector('.device-name-input').value;
    
    // Remove current device
    deviceDiv.remove();
    
    // Add new device with the new type
    addNetworkDevice(newType, currentName);
}

/**
 * Remove network device
 */
function removeNetworkDevice(button) {
    button.closest('.network-device').remove();
}

/**
 * Add access point for WiFi devices
 */
function addAccessPoint(button) {
    const wifiContainer = button.previousElementSibling;
    const apDiv = document.createElement('div');
    apDiv.className = 'access-point-item';
    apDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>SSID</label>
                <input type="text" class="ap-ssid-input" placeholder="e.g., MyWiFi" value="MyWiFi">
            </div>
            <div class="form-group">
                <label class="optional">Password</label>
                <input type="password" class="ap-password-input" placeholder="WiFi password" value="password">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="optional">Hidden Network</label>
                <select class="ap-hidden-input">
                    <option value="false" selected>No</option>
                    <option value="true">Yes</option>
                </select>
            </div>
            <div class="form-group">
                <label class="optional">Band</label>
                <select class="ap-band-input">
                    <option value="" selected>Auto</option>
                    <option value="2.4GHz">2.4GHz</option>
                    <option value="5GHz">5GHz</option>
                </select>
            </div>
        </div>
                            <button type="button" class="remove-btn" onclick="window.NetworkManager.removeAccessPoint(this)">Remove Access Point</button>
    `;
    wifiContainer.appendChild(apDiv);
}

/**
 * Remove access point
 */
function removeAccessPoint(button) {
    button.closest('.access-point-item').remove();
}

/**
 * Add route for network device
 */
function addDeviceRoute(button) {
    const routesContainer = button.previousElementSibling;
    const routeDiv = document.createElement('div');
    routeDiv.className = 'route-item';
    routeDiv.innerHTML = `
        <input type="text" class="route-to-input" placeholder="Destination (e.g., default, 10.0.0.0/8)">
        <input type="text" class="route-via-input" placeholder="Gateway (e.g., 192.168.1.1)">
        <input type="number" class="route-metric-input" placeholder="Metric (optional)" min="0">
        <button type="button" class="remove-route-btn" onclick="window.NetworkManager.removeDeviceRoute(this)">Remove</button>
    `;
    routesContainer.appendChild(routeDiv);
}

/**
 * Remove route from network device
 */
function removeDeviceRoute(button) {
    button.closest('.route-item').remove();
}

/**
 * Network match conditions: add/remove hints
 */
function addNetworkMatchRow(button) {
    // Find the correct container to add the match row
    const row = button.closest('.form-row');
    const container = row ? row.querySelector('.network-match-container') : button.previousElementSibling;
    if (!container) return;

    // Select more appropriate placeholder based on current device type
    const deviceDiv = button.closest('.network-device') || (row && row.closest('.network-device'));
    const deviceType = deviceDiv?.querySelector('.device-type-input')?.value || 'ethernets';
    const placeholders = {
        'ethernets': 'e.g., eth*, en*',
        'wifis': 'e.g., wlan*, wlp*',
        'modems': 'e.g., cdc-wdm*'
    };
    const namePlaceholder = placeholders[deviceType] || 'e.g., eth*';

    const item = document.createElement('div');
    item.className = 'disk-match-row';
    item.innerHTML = `
        <select class="disk-match-type" onchange="window.NetworkManager.updateNetworkMatchPlaceholder(this)">
            <option value="name">Name</option>
            <option value="macaddress">MAC Address</option>
            <option value="driver">Driver</option>
            <option value="pci">PCI Address</option>
        </select>
        <input type="text" class="disk-match-value" placeholder="${namePlaceholder}">
        <button type="button" class="remove-disk-match-btn" onclick="window.NetworkManager.removeNetworkMatchRow(this)">Remove</button>
    `;
    container.appendChild(item);
}
function removeNetworkMatchRow(button) {
    button.closest('.disk-match-row').remove();
}
function updateNetworkMatchPlaceholder(select) {
    const input = select.nextElementSibling;
    const placeholders = {
        'name': 'e.g., eth*, en*, wlan*',
        'macaddress': 'e.g., 00:11:22:33:44:55',
        'driver': 'e.g., e1000e, iwlwifi',
        'pci': 'e.g., 0000:03:00.0'
    };
    if (input) input.placeholder = placeholders[select.value] || 'Enter value';
}

/**
 * Get network configuration data - fixed version
 */
function getNetworkConfig() {
    console.log('=== getNetworkConfig called ===');

    const networkVersion = document.getElementById('networkVersion')?.value || 2;
    const networkRenderer = document.getElementById('networkRenderer')?.value || 'networkd';

    const config = {
        version: parseInt(networkVersion),
        renderer: networkRenderer
    };

    // Get all network devices
    const devices = document.querySelectorAll('.network-device');
    console.log('Found network devices:', devices.length);

    devices.forEach((device, index) => {
        console.log(`Processing device ${index}:`);

        const deviceType = device.querySelector('.device-type-input')?.value;
        const deviceName = device.querySelector('.device-name-input')?.value;

        console.log(`  Device type: ${deviceType}, name: ${deviceName}`);

        if (!deviceType || !deviceName) return;

        // Initialize device type section in config
        if (!config[deviceType]) {
            config[deviceType] = {};
        }

        const deviceConfig = {};

        // DHCP configuration - fixed logic
        const dhcp4Input = device.querySelector('.device-dhcp4-input');
        const dhcp6Input = device.querySelector('.device-dhcp6-input');

        console.log(`  DHCP4 input found: ${!!dhcp4Input}, value: ${dhcp4Input?.value}`);
        console.log(`  DHCP6 input found: ${!!dhcp6Input}, value: ${dhcp6Input?.value}`);

        if (dhcp4Input && dhcp4Input.value) {
            deviceConfig.dhcp4 = dhcp4Input.value === 'true';
            console.log(`  DHCP v4: ${deviceConfig.dhcp4}`);
        }

        if (dhcp6Input && dhcp6Input.value) {
            deviceConfig.dhcp6 = dhcp6Input.value === 'true';
            console.log(`  DHCP v6: ${deviceConfig.dhcp6}`);
        }

        // Static IP addresses
        const addressesInput = device.querySelector('.device-addresses-input');
        console.log(`  Addresses input found: ${!!addressesInput}, value: "${addressesInput?.value}"`);

        if (addressesInput && addressesInput.value && addressesInput.value.trim()) {
            const addressesText = addressesInput.value.trim();
            const addresses = addressesText.split('\n').map(addr => addr.trim()).filter(addr => addr);
            if (addresses.length > 0) {
                deviceConfig.addresses = addresses;
                console.log(`  Addresses collected: ${JSON.stringify(addresses)}`);
            }
        }

        // DNS nameservers
        const nameserversInput = device.querySelector('.device-nameservers-input');
        console.log(`  Nameservers input found: ${!!nameserversInput}, value: "${nameserversInput?.value}"`);

        if (nameserversInput && nameserversInput.value && nameserversInput.value.trim()) {
            const nameserversText = nameserversInput.value.trim();
            const nameservers = nameserversText.split('\n').map(ns => ns.trim()).filter(ns => ns);
            if (nameservers.length > 0) {
                if (!deviceConfig.nameservers) {
                    deviceConfig.nameservers = {};
                }
                deviceConfig.nameservers.addresses = nameservers;
                console.log(`  Nameservers collected: ${JSON.stringify(nameservers)}`);
            }
        }

        // DNS search domains
        const searchDomainsInput = device.querySelector('.device-search-domains-input');
        console.log(`  Search domains input found: ${!!searchDomainsInput}, value: "${searchDomainsInput?.value}"`);

        if (searchDomainsInput && searchDomainsInput.value && searchDomainsInput.value.trim()) {
            const searchDomainsText = searchDomainsInput.value.trim();
            const searchDomains = searchDomainsText.split('\n').map(domain => domain.trim()).filter(domain => domain);
            if (searchDomains.length > 0) {
                if (!deviceConfig.nameservers) {
                    deviceConfig.nameservers = {};
                }
                deviceConfig.nameservers.search = searchDomains;
                console.log(`  Search domains collected: ${JSON.stringify(searchDomains)}`);
            }
        }

        // MTU
        const mtuInput = device.querySelector('.device-mtu-input');
        if (mtuInput && mtuInput.value && parseInt(mtuInput.value) > 0) {
            deviceConfig.mtu = parseInt(mtuInput.value);
            console.log(`  MTU: ${deviceConfig.mtu}`);
        }

        // Match configuration (row-based, optional)
        const matchRows = device.querySelectorAll('.network-match-container .disk-match-row');
        if (matchRows && matchRows.length > 0) {
            const matchObj = {};
            matchRows.forEach(row => {
                const typeSel = row.querySelector('.disk-match-type');
                const valInp = row.querySelector('.disk-match-value');
                const key = typeSel?.value;
                const val = valInp?.value?.trim();
                if (key && val) {
                    // Duplicate keys overwrite, conforming to Netplan's expectation for single-value keys
                    matchObj[key] = val;
                }
            });
            if (Object.keys(matchObj).length > 0) {
                deviceConfig.match = matchObj;
                console.log(`  Match: ${JSON.stringify(deviceConfig.match)}`);
            }
        }

        // Bridge-specific parameters
        if (deviceType === 'bridges') {
            const bridgeInterfacesInput = device.querySelector('.bridge-interfaces-input');
            const bridgeStpInput = device.querySelector('.bridge-stp-input');
            const bridgeForwardDelayInput = device.querySelector('.bridge-forward-delay-input');
            const bridgeAgeingTimeInput = device.querySelector('.bridge-ageing-time-input');

            if (bridgeInterfacesInput && bridgeInterfacesInput.value && bridgeInterfacesInput.value.trim()) {
                const interfaces = bridgeInterfacesInput.value.split(',').map(i => i.trim()).filter(i => i);
                if (interfaces.length) {
                    deviceConfig.interfaces = interfaces;
                    console.log(`  Bridge interfaces: ${JSON.stringify(interfaces)}`);
                }
            } else {
                // Fallback: if not filled, try to use the first ethernet device name
                const firstEthernet = Array.from(document.querySelectorAll('.network-device'))
                    .find(d => d.querySelector('.device-type-input')?.value === 'ethernets');
                const firstEthName = firstEthernet?.querySelector('.device-name-input')?.value;
                if (firstEthName) {
                    deviceConfig.interfaces = [firstEthName];
                    console.log(`  Bridge interfaces fallback to: ${firstEthName}`);
                }
            }

            const parameters = {};
            let hasParameters = false;
            if (bridgeStpInput) {
                parameters.stp = bridgeStpInput.value === 'true';
                hasParameters = true;
            }
            if (bridgeForwardDelayInput && bridgeForwardDelayInput.value) {
                parameters['forward-delay'] = parseInt(bridgeForwardDelayInput.value);
                hasParameters = true;
            }
            if (bridgeAgeingTimeInput && bridgeAgeingTimeInput.value) {
                parameters['ageing-time'] = parseInt(bridgeAgeingTimeInput.value);
                hasParameters = true;
            }
            if (hasParameters) {
                deviceConfig.parameters = parameters;
                console.log(`  Bridge parameters: ${JSON.stringify(parameters)}`);
            }
        }

        // WiFi-specific parameters
        if (deviceType === 'wifis') {
            const apItems = device.querySelectorAll('.access-point-item');
            const accessPoints = {};
            let hasAP = false;
            apItems.forEach(ap => {
                const ssid = ap.querySelector('.ap-ssid-input')?.value?.trim();
                const password = ap.querySelector('.ap-password-input')?.value;
                const hiddenVal = ap.querySelector('.ap-hidden-input')?.value;
                const band = ap.querySelector('.ap-band-input')?.value;
                if (ssid) {
                    accessPoints[ssid] = {};
                    if (password) accessPoints[ssid].password = password;
                    if (hiddenVal === 'true') accessPoints[ssid].hidden = true;
                    if (band) accessPoints[ssid].band = band;
                    hasAP = true;
                }
            });
            if (hasAP) {
                // Use Netplan standard hyphenated key names
                deviceConfig['access-points'] = accessPoints;
                console.log(`  WiFi access-points: ${JSON.stringify(accessPoints)}`);
            }
        }

        // Bond-specific parameters
        if (deviceType === 'bonds') {
            const ifacesInput = device.querySelector('.bond-interfaces-input');
            const modeInput = device.querySelector('.bond-mode-input');
            const primaryInput = device.querySelector('.bond-primary-input');
            const miiInput = device.querySelector('.bond-mii-input');
            const lacpRateInput = device.querySelector('.bond-lacp-rate-input');
            const minLinksInput = device.querySelector('.bond-min-links-input');

            if (ifacesInput && ifacesInput.value && ifacesInput.value.trim()) {
                const interfaces = ifacesInput.value.split(',').map(i => i.trim()).filter(i => i);
                if (interfaces.length) deviceConfig.interfaces = interfaces;
            }
            const parameters = {};
            let hasParameters = false;
            if (modeInput && modeInput.value) { parameters.mode = modeInput.value; hasParameters = true; }
            if (primaryInput && primaryInput.value && primaryInput.value.trim()) { parameters.primary = primaryInput.value.trim(); hasParameters = true; }
            if (miiInput && miiInput.value) { parameters['mii-monitor-interval'] = parseInt(miiInput.value); hasParameters = true; }
            if (lacpRateInput && lacpRateInput.value) { parameters['lacp-rate'] = lacpRateInput.value; hasParameters = true; }
            if (minLinksInput && minLinksInput.value) { parameters['min-links'] = parseInt(minLinksInput.value); hasParameters = true; }
            if (hasParameters) deviceConfig.parameters = parameters;
        }

        // VLAN-specific parameters
        if (deviceType === 'vlans') {
            const vlanIdInput = device.querySelector('.vlan-id-input');
            const vlanLinkInput = device.querySelector('.vlan-link-input');
            if (vlanIdInput && vlanIdInput.value) deviceConfig.id = parseInt(vlanIdInput.value);
            if (vlanLinkInput && vlanLinkInput.value && vlanLinkInput.value.trim()) deviceConfig.link = vlanLinkInput.value.trim();
        }

        // Tunnel-specific parameters
        if (deviceType === 'tunnels') {
            const modeInput = device.querySelector('.tunnel-mode-input');
            const localInput = device.querySelector('.tunnel-local-input');
            const remoteInput = device.querySelector('.tunnel-remote-input');
            const keyInput = device.querySelector('.tunnel-key-input');
            const ttlInput = device.querySelector('.tunnel-ttl-input');
            const portInput = device.querySelector('.tunnel-port-input');
            if (modeInput && modeInput.value) deviceConfig.mode = modeInput.value;
            if (localInput && localInput.value && localInput.value.trim()) deviceConfig.local = localInput.value.trim();
            if (remoteInput && remoteInput.value && remoteInput.value.trim()) deviceConfig.remote = remoteInput.value.trim();
            if (keyInput && keyInput.value) deviceConfig.key = parseInt(keyInput.value);
            if (ttlInput && ttlInput.value) deviceConfig.ttl = parseInt(ttlInput.value);
            if (portInput && portInput.value) deviceConfig.port = parseInt(portInput.value);
        }

        // VRF-specific parameters
        if (deviceType === 'vrfs') {
            const tableInput = device.querySelector('.vrf-table-input');
            const ifacesInput = device.querySelector('.vrf-interfaces-input');
            if (tableInput && tableInput.value) deviceConfig.table = parseInt(tableInput.value);
            if (ifacesInput && ifacesInput.value && ifacesInput.value.trim()) {
                const interfaces = ifacesInput.value.split(',').map(i => i.trim()).filter(i => i);
                if (interfaces.length) deviceConfig.interfaces = interfaces;
            }
        }

        // Dummy device parameters
        if (deviceType === 'dummy-devices') {
            const optionalInput = device.querySelector('.device-optional-input');
            const criticalInput = device.querySelector('.device-critical-input');
            if (optionalInput) deviceConfig.optional = optionalInput.value === 'true';
            if (criticalInput) deviceConfig.critical = criticalInput.value === 'true';
        }

        // Modem-specific parameters
        if (deviceType === 'modems') {
            const apnInput = device.querySelector('.modem-apn-input');
            const pinInput = device.querySelector('.modem-pin-input');
            if (apnInput && apnInput.value && apnInput.value.trim()) deviceConfig.apn = apnInput.value.trim();
            if (pinInput && pinInput.value) deviceConfig.pin = pinInput.value;
        }

        // NM device passthrough
        if (deviceType === 'nm-devices') {
            const uuidInput = device.querySelector('.nm-uuid-input');
            const nmDeviceInput = device.querySelector('.nm-device-input');
            const nmNameInput = device.querySelector('.nm-name-input');
            const nmPassInput = device.querySelector('.nm-passthrough-input');
            if (uuidInput && uuidInput.value && uuidInput.value.trim()) deviceConfig.uuid = uuidInput.value.trim();
            if (nmDeviceInput && nmDeviceInput.value && nmDeviceInput.value.trim()) deviceConfig.device = nmDeviceInput.value.trim();
            if (nmNameInput && nmNameInput.value && nmNameInput.value.trim()) deviceConfig.name = nmNameInput.value.trim();
            if (nmPassInput && nmPassInput.value && nmPassInput.value.trim()) {
                try {
                    deviceConfig.passthrough = JSON.parse(nmPassInput.value);
                } catch (e) {
                    console.warn('Invalid NM passthrough JSON, storing as string');
                    deviceConfig.passthrough = nmPassInput.value;
                }
            }
        }

        // Routes
        const routeItems = device.querySelectorAll('.route-item');
        const routes = [];
        routeItems.forEach(routeItem => {
            const toInput = routeItem.querySelector('.route-to-input');
            const viaInput = routeItem.querySelector('.route-via-input');
            const metricInput = routeItem.querySelector('.route-metric-input');

            if (toInput && viaInput && toInput.value && toInput.value.trim() && viaInput.value && viaInput.value.trim()) {
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
            console.log(`  Routes: ${JSON.stringify(routes)}`);
        }

        console.log(`  Final device config: ${JSON.stringify(deviceConfig, null, 2)}`);
        config[deviceType][deviceName] = deviceConfig;
    });

    console.log('=== Final network config ===');
    console.log(JSON.stringify(config, null, 2));
    return config;
}

/** New: Return post-appended fields based on device type (for placing Wi-Fi Match Condition at the end) */
function getPostFields(deviceType, deviceName) {
    if (deviceType === 'wifis') {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label class="optional">Match Condition <span class="hint-icon" data-tooltip="Netplan interface match: name, macaddress, driver, pci (optional)">?</span></label>
                    <div class="disk-match-container network-match-container">
                        <div class="disk-match-row">
                            <select class="disk-match-type" onchange="window.NetworkManager.updateNetworkMatchPlaceholder(this)">
                                <option value="name" selected>Name</option>
                                <option value="macaddress">MAC Address</option>
                                <option value="driver">Driver</option>
                                <option value="pci">PCI Address</option>
                            </select>
                            <input type="text" class="disk-match-value" placeholder="e.g., wlan*, wlp*" value="${deviceName}">
                            <button type="button" class="remove-disk-match-btn" onclick="window.NetworkManager.removeNetworkMatchRow(this)">Remove</button>
                        </div>
                    </div>
                    <button type="button" class="add-disk-condition-btn" onclick="window.NetworkManager.addNetworkMatchRow(this)">Add Match Condition</button>
                </div>
            </div>`;
    }
    return '';
}

/**
 * General: Routes + Match combined into same row (two columns, equal width)
 */
function getRoutesAndMatchRowHtml(deviceType, deviceName) {
    const placeholders = {
        'ethernets': 'e.g., eth*, en*',
        'wifis': 'e.g., wlan*, wlp*',
        'modems': 'e.g., cdc-wdm*'
    };
    const namePlaceholder = placeholders[deviceType] || 'e.g., eth*';
    return `
        <div class="form-row">
            <div class="form-group" style="flex:1">
                <label class="optional">Routes <span class="hint-icon" data-tooltip="Static routes for this interface">?</span></label>
                <div class="routes-container">
                    <div class="route-item">
                        <input type="text" class="route-to-input" placeholder="Destination (e.g., default, 10.0.0.0/8)" value="default">
                        <input type="text" class="route-via-input" placeholder="Gateway (e.g., 192.168.1.1)">
                        <input type="number" class="route-metric-input" placeholder="Metric (optional)" min="0">
                        <button type="button" class="remove-route-btn" onclick="window.NetworkManager.removeDeviceRoute(this)">Remove</button>
                    </div>
                </div>
                <button type="button" class="add-item-btn" onclick="window.NetworkManager.addDeviceRoute(this)">Add Route</button>
            </div>
            <div class="form-group" style="flex:1">
                <label class="optional">Match Condition <span class="hint-icon" data-tooltip="Netplan interface match: name, macaddress, driver, pci (optional)">?</span></label>
                <div class="disk-match-container network-match-container">
                    <div class="disk-match-row">
                        <select class="disk-match-type" onchange="window.NetworkManager.updateNetworkMatchPlaceholder(this)">
                            <option value="name" selected>Name</option>
                            <option value="macaddress">MAC Address</option>
                            <option value="driver">Driver</option>
                            <option value="pci">PCI Address</option>
                        </select>
                        <input type="text" class="disk-match-value" placeholder="${namePlaceholder}" value="${deviceName}">
                        <button type="button" class="remove-disk-match-btn" onclick="window.NetworkManager.removeNetworkMatchRow(this)">Remove</button>
                    </div>
                </div>
                <button type="button" class="add-disk-condition-btn" onclick="window.NetworkManager.addNetworkMatchRow(this)">Add Match Condition</button>
            </div>
        </div>`;
}

/**
 * Validate network configuration
 */
function validateNetworkConfig(statusId = 'configStatus') {
    const errors = [];
    const devices = Array.from(document.querySelectorAll('.network-device'));

    // Clear old highlighting
    devices.forEach(function(device){
        device.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    });

    if (devices.length === 0) {
        errors.push('At least one network device is required');
    }

    // Validate required fields item by item
    devices.forEach(function(device, idx){
        const deviceType = device.querySelector('.device-type-input')?.value;
        const deviceName = device.querySelector('.device-name-input')?.value;
        
        const markError = (selector, message) => {
            const el = device.querySelector(selector);
            if (el && (!el.value || (typeof el.value === 'string' && el.value.trim() === ''))) {
                el.classList.add('input-error');
                errors.push(message);
            }
        };

        // Common required fields
        markError('.device-name-input', `Device ${idx + 1}: Device name is required`);

        // Device type specific validation
        if (deviceType === 'vlans') {
            markError('.vlan-id-input', `VLAN ${idx + 1}: VLAN ID is required`);
            markError('.vlan-link-input', `VLAN ${idx + 1}: Parent interface is required`);
        }
        
        if (deviceType === 'vrfs') {
            markError('.vrf-table-input', `VRF ${idx + 1}: VRF Table ID is required`);
        }
        
        if (deviceType === 'modems') {
            markError('.modem-apn-input', `Modem ${idx + 1}: APN is required`);
        }
        
        if (deviceType === 'tunnels') {
            markError('.tunnel-remote-input', `Tunnel ${idx + 1}: Remote IP is required`);
        }
        
        if (deviceType === 'bridges') {
            markError('.bridge-interfaces-input', `Bridge ${idx + 1}: Bridge interfaces are required`);
        }
        
        if (deviceType === 'bonds') {
            markError('.bond-interfaces-input', `Bond ${idx + 1}: Bond interfaces are required`);
            markError('.bond-mode-input', `Bond ${idx + 1}: Bond mode is required`);
        }
        
        // Wi-Fi specific validation
        if (deviceType === 'wifis') {
            const apItems = device.querySelectorAll('.access-point-item');
            if (apItems.length === 0) {
                errors.push(`WiFi ${idx + 1}: At least one access point is required`);
            } else {
                apItems.forEach((ap, apIdx) => {
                    const ssid = ap.querySelector('.ap-ssid-input')?.value?.trim();
                    if (!ssid) {
                        const ssidInput = ap.querySelector('.ap-ssid-input');
                        if (ssidInput) ssidInput.classList.add('input-error');
                        errors.push(`WiFi ${idx + 1} Access Point ${apIdx + 1}: SSID is required`);
                    }
                });
            }
        }
    });

    if (errors.length > 0) {
        // Switch to Network tab first
        if (typeof switchTab === 'function') {
            switchTab('network');
        } else if (window.UIUtils && window.UIUtils.switchTab) {
            window.UIUtils.switchTab('network');
        }

        // Small delay to allow tab switch animation
        setTimeout(() => {
            // Scroll to first error
            const firstError = document.querySelector('#networkDevices .input-error');
            if (firstError && firstError.scrollIntoView) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                try { firstError.focus(); } catch (_) {}
            }
        }, 50);

        if (window.ConfigManager && window.ConfigManager.showStatus) {
            window.ConfigManager.showStatus(statusId, 'error', 'Network validation failed: ' + errors.join(', '));
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Load network config from parsed YAML and populate the form
 */
function loadFromConfig(network) {
    const container = document.getElementById('networkDevices');
    if (!container || !network) return;
    container.innerHTML = '';

    // Version and renderer
    if (network.version !== undefined) setFormValue('networkVersion', String(network.version));
    if (network.renderer) setSelectValue('networkRenderer', network.renderer);

    // Iterate all device types
    const deviceTypes = [
        'ethernets', 'wifis', 'bridges', 'bonds',
        'vlans', 'tunnels', 'vrfs',
        'dummy-devices', 'modems', 'nm-devices'
    ];
    deviceTypes.forEach(type => {
        const devices = network[type];
        if (!devices || typeof devices !== 'object') return;
        Object.entries(devices).forEach(([name, device]) => {
            const dhcp4 = device.dhcp4 !== undefined ? device.dhcp4 : false;
            const dhcp6 = device.dhcp6 !== undefined ? device.dhcp6 : false;
            const addresses = device.addresses || [];
            // Pass interfaces for bonds/bridges and bond parameters
            const interfaces = device.interfaces || [];
            const bondParams = (type === 'bonds' && device.parameters) ? device.parameters : {};
            addNetworkDevice(type, name, dhcp4, dhcp6, addresses, interfaces, bondParams);
        });
    });

    // Fill device details after DOM is rendered
    setTimeout(() => {
        const deviceEls = container.querySelectorAll('.network-device');
        deviceEls.forEach(el => {
            const nameInput = el.querySelector('.device-name-input');
            if (!nameInput) return;
            const deviceName = nameInput.value;

            // Find matching YAML device data
            let deviceData = null;
            for (const type of deviceTypes) {
                if (network[type] && network[type][deviceName]) {
                    deviceData = network[type][deviceName];
                    break;
                }
            }
            if (!deviceData) return;

            // Nameservers
            if (deviceData.nameservers) {
                const nsInput = el.querySelector('.device-nameservers-input');
                if (nsInput && deviceData.nameservers.addresses) {
                    nsInput.value = deviceData.nameservers.addresses.join('\n');
                }
                const searchInput = el.querySelector('.device-search-domains-input');
                if (searchInput && deviceData.nameservers.search) {
                    searchInput.value = deviceData.nameservers.search.join(', ');
                }
            }

            // Static addresses (addresses were set via addNetworkDevice, but if dhcp is on/off overrides, fill it)
            if (!deviceData.dhcp4 && deviceData.addresses) {
                const addrInput = el.querySelector('.device-addresses-input');
                if (addrInput) addrInput.value = deviceData.addresses.join('\n');
            }

            // Routes
            if (deviceData.routes && Array.isArray(deviceData.routes)) {
                deviceData.routes.forEach((route, i) => {
                    if (i > 0) addDeviceRoute(el);
                });
                setTimeout(() => {
                    const routeEls = el.querySelectorAll('.route-item');
                    deviceData.routes.forEach((route, i) => {
                        const r = routeEls[i];
                        if (!r) return;
                        if (route.to) {
                            const to = r.querySelector('.route-to-input');
                            if (to) to.value = route.to;
                        }
                        if (route.via) {
                            const via = r.querySelector('.route-via-input');
                            if (via) via.value = route.via;
                        }
                        if (route.metric !== undefined) {
                            const metric = r.querySelector('.route-metric-input');
                            if (metric) metric.value = route.metric;
                        }
                    });
                }, 100);
            }

            // MTU
            if (deviceData.mtu !== undefined) {
                const mtu = el.querySelector('.device-mtu-input');
                if (mtu) mtu.value = deviceData.mtu;
            }

            // Optional flag
            if (deviceData.optional !== undefined) {
                const opt = el.querySelector('.device-optional-select');
                if (opt) opt.value = deviceData.optional ? 'true' : 'false';
            }

            // WiFi access points
            if (deviceData['access-points']) {
                Object.entries(deviceData['access-points']).forEach(([ssid, ap], i) => {
                    if (i > 0) addAccessPoint(el);
                });
                setTimeout(() => {
                    const apEls = el.querySelectorAll('.wifi-ap-row');
                    Object.entries(deviceData['access-points']).forEach(([ssid, ap], i) => {
                        const row = apEls[i];
                        if (!row) return;
                        const ssidInput = row.querySelector('.ap-ssid-input');
                        if (ssidInput) ssidInput.value = ssid;
                        const pwInput = row.querySelector('.ap-password-input');
                        if (pwInput && ap.password) pwInput.value = ap.password;
                    });
                }, 100);
            }
        });
    }, 150);
}

/**
 * Set select element value helper
 */
function setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

/**
 * Set input/textarea element value helper
 */
function setFormValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// Export functions for use in other modules
window.NetworkManager = {
    initNetworkDevices,
    loadFromConfig,
    addNetworkDevice,
    updateNetworkDevice,
    removeNetworkDevice,
    addAccessPoint,
    removeAccessPoint,
    addDeviceRoute,
    removeDeviceRoute,
    getNetworkConfig,
    // New: network match conditions
    addNetworkMatchRow,
    removeNetworkMatchRow,
    updateNetworkMatchPlaceholder,
    // New: network validation
    validateNetworkConfig
};
