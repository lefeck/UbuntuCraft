/**
 * Storage Management Module
 * Fully restores original storage configuration templates
 */

/**
 * Initialize storage configurations with default setup - restored
 */
function initStorageConfigs() {
    console.log('initStorageConfigs called');
    const container = document.getElementById('storageConfigs');
    if (!container) {
        console.error('storageConfigs container not found');
        return;
    }
    
    console.log('Found storageConfigs container, clearing and adding defaults...');
    container.innerHTML = '';
    
    // Add default storage configurations with friendly size values - restored
    console.log('Adding default storage configs...');
    addStorageConfig('disk', 'disk0', true, 'gpt', 'superblock-recursive', 'largest', 0, 0, '', '', '', '', '', '');
    addStorageConfig('partition', 'bios-grub-part', false, '', 'superblock', '', 1, 1, 'G', 'bios_grub', '', '', '', 'disk0');
    addStorageConfig('partition', 'boot-part', false, '', 'superblock', '', 2, 1, 'G', '', '', '', '', 'disk0');
    addStorageConfig('format', 'boot-fs', false, '', '', '', 0, 0, '', '', '', '', '', 'boot-part');
    addStorageConfig('partition', 'pv-part', false, '', 'superblock', '', 3, -1, '', '', '', '', '', 'disk0');
    addStorageConfig('dm_crypt', 'dm_crypt-0', false, '', 'superblock', '', 0, 0, '', '', '', 'crypto', '', '', '', 'pv-part', '', '');
	addStorageConfig('lvm_volgroup', 'vg0', false, '', '', '', 0, 0, '', '', 'ubuntu-vg', '', '', 'dm_crypt-0');
    addStorageConfig('lvm_partition', 'lv-swap', false, '', 'superblock', '', 0, 1, 'G', 'swap', 'ubuntu-swap', 'vg0', '', '');
    addStorageConfig('format', 'fs-swap', false, '', '', '', 0, 0, '', '', '', '', '', 'lv-swap');
    addStorageConfig('lvm_partition', 'lv-root', false, '', 'superblock', '', 0, -1, '', '', 'ubuntu-lv', 'vg0', '', '');
    addStorageConfig('format', 'fs-root', false, '', '', '', 0, 0, '', '', '', '', '', 'lv-root');
    addStorageConfig('mount', 'mount-root', false, '', '', '', 0, 0, '', '', '', '/', '/', 'fs-root');
    addStorageConfig('mount', 'mount-boot', false, '', '', '', 0, 0, '', '', '', '/boot', '/boot', 'boot-fs');
    addStorageConfig('mount', 'mount-swap', false, '', '', '', 0, 0, '', '', '', '', '/swap', 'fs-swap');
    console.log('Default storage configs added successfully');
}

/**
 * Add storage configuration - restored
 */
function addStorageConfig(type = 'disk', id = '', grubDevice = false, ptable = '', wipe = '', match = '', matchValue = '', number = 0, size = 0, unit = '', flag = '', name = '', volgroup = '', path = '', device = '', volume = '', encryptionKey = '', keyfile = '', fstype = 'ext4', raidlevel = 'raid1', devices = [], metadata = 'default') {
    console.log('addStorageConfig called with:', { type, id, grubDevice, ptable, wipe, match, matchValue, number, size, unit, flag, name, volgroup, path, device, volume, encryptionKey, keyfile, fstype, raidlevel, devices, metadata });
    
    const container = document.getElementById('storageConfigs');
    if (!container) {
        console.error('storageConfigs container not found in addStorageConfig');
        return;
    }
    
    const configDiv = document.createElement('div');
    configDiv.className = 'storage-config';
    
    // Convert size to friendly display value
    let displaySize = size;
    let displayUnit = unit || 'B';

    if (unit) {
        // When unit is provided, treat `size` as already in that unit for display
        if (size === -1) {
            displaySize = -1;
        } else {
            displaySize = size;
        }
    } else {
        // When unit is not provided, `size` is in bytes and should be converted for display
        if (size > 0) {
            if (size >= 1099511627776) { // 1TB
                displaySize = Math.round((size / 1099511627776) * 100) / 100;
                displayUnit = 'T';
            } else if (size >= 1073741824) { // 1GB
                displaySize = Math.round((size / 1073741824) * 100) / 100;
                displayUnit = 'M';
            } else if (size >= 1048576) { // 1MB
                displaySize = Math.round((size / 1048576) * 100) / 100;
                displayUnit = 'M';
            } else if (size >= 1024) { // 1KB
                displaySize = Math.round((size / 1024) * 100) / 100;
                displayUnit = 'K';
            } else {
                displayUnit = 'B';
            }
        }
    }
    
    // Common fields for all types
    let commonFields = `
        <div class="form-row">
            <div class="form-group">
                <label>Device Type <span class="hint-icon" data-tooltip="Select the kind of storage item to configure">?</span></label>
                <select class="storage-type-input" onchange="window.StorageManager.updateStorageConfig(this)">
                    <option value="disk" ${type === 'disk' ? 'selected' : ''}>Disk</option>
                    <option value="partition" ${type === 'partition' ? 'selected' : ''}>Partition</option>
                    <option value="format" ${type === 'format' ? 'selected' : ''}>Format</option>
                    <option value="mount" ${type === 'mount' ? 'selected' : ''}>Mount</option>
                    <option value="lvm_volgroup" ${type === 'lvm_volgroup' ? 'selected' : ''}>LVM Volume Group</option>
                    <option value="lvm_partition" ${type === 'lvm_partition' ? 'selected' : ''}>LVM Partition</option>
                    <option value="raid" ${type === 'raid' ? 'selected' : ''}>RAID</option>
                    <option value="device" ${type === 'device' ? 'selected' : ''}>Device</option>
                    <option value="dm_crypt" ${type === 'dm_crypt' ? 'selected' : ''}>DM Crypt</option>
                </select>
            </div>
            <div class="form-group">
                <label>ID <span class="hint-icon" data-tooltip="Identifier for the storage item (e.g. disk0, pv-part, fs-root)">?</span></label>
                <input type="text" class="storage-id-input" value="${id}" required>
            </div>
        </div>`;
    
    // Type-specific fields
    let typeSpecificFields = getStorageTypeSpecificFields(type, ptable, wipe, match, matchValue, number, displaySize, displayUnit, flag, name, volgroup, path, device, volume, grubDevice, encryptionKey, keyfile, fstype, raidlevel, devices, metadata);
    
    configDiv.innerHTML = `
        <div class="storage-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
            <span class="storage-type">${type.charAt(0).toUpperCase() + type.slice(1)} Configuration</span>
            <button type="button" class="remove-btn" onclick="event.stopPropagation(); window.StorageManager.removeStorageConfig(this)">Remove</button>
        </div>
        <div class="storage-body">
            ${commonFields}
            ${typeSpecificFields}
        </div>
    `;
    
    container.appendChild(configDiv);
    console.log('Storage config added successfully:', type, id);

    // Add input/blur events for required fields, highlight empty values with input-error
    try {
        // Ensure fs-swap defaults to swap filesystem when type is format
        if (type === 'format' && id === 'fs-swap') {
            const fsTypeSelect = configDiv.querySelector('.storage-fstype-input');
            if (fsTypeSelect) {
                fsTypeSelect.value = 'swap';
            }
        }

        const requiredInputs = configDiv.querySelectorAll('input[required], select[required], .storage-ptable-input, .storage-grub-input');
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
        console.warn('Failed to attach storage required listeners', e);
    }
}

/**
 * Get storage type-specific configuration fields
 * Distinguish required and optional fields according to documentation
 */
function getStorageTypeSpecificFields(type, ptable, wipe, match, matchValue, number, displaySize, displayUnit, flag, name, volgroup, path, device, volume, grubDevice, encryptionKey, keyfile, fstype, raidlevel, devices, metadata) {
    let specificFields = '';
    
    switch (type) {
        case 'disk':
            specificFields = `
                <!-- Required Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Partition Table <span class="hint-icon" data-tooltip="Disk partition table format (default gpt)">?</span></label>
                        <select class="storage-ptable-input" required>
                            <option value="gpt" ${ptable === 'gpt' ? 'selected' : ''}>gpt</option>
                            <option value="msdos" ${ptable === 'msdos' ? 'selected' : ''}>msdos</option>
                            <option value="vtoc" ${ptable === 'vtoc' ? 'selected' : ''}>vtoc</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>GRUB Device  <span class="hint-icon" data-tooltip="Whether this disk is the boot disk (default true)">?</span></label>
                        <select class="storage-grub-input" required>
                            <option value="false" ${!grubDevice ? 'selected' : ''}>false</option>
                            <option value="true" ${grubDevice ? 'selected' : ''}>true</option>
                        </select>
                    </div>
                </div>

                <!-- Optional Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Preserve <span class="hint-icon" data-tooltip="Keep existing data (default false)">?</span></label>
                        <select class="storage-preserve-input">
                            <option value="false" selected>false</option>
                            <option value="true">true</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Wipe Method <span class="hint-icon" data-tooltip="Cleanup operation method (default superblock-recursive)">?</span></label>
                        <select class="storage-wipe-input">
                            <option value="superblock-recursive" ${wipe === 'superblock-recursive' ? 'selected' : ''}>superblock-recursive</option>
                            <option value="superblock" ${wipe === 'superblock' ? 'selected' : ''}>superblock</option>
                            <option value="pvremove" ${wipe === 'pvremove' ? 'selected' : ''}>pvremove</option>
                            <option value="zero" ${wipe === 'zero' ? 'selected' : ''}>zero</option>
                            <option value="random" ${wipe === 'random' ? 'selected' : ''}>random</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Name <span class="hint-icon" data-tooltip="Friendly disk name (e.g. sda, nvme0n1)">?</span></label>
                        <input type="text" class="storage-name-input" value="${name}">
                    </div>
                    <div class="form-group">
                        <label class="optional">Path <span class="hint-icon" data-tooltip="Device path (e.g. /dev/sda). If set, match conditions are ignored">?</span></label>
                        <input type="text" class="storage-path-input" value="${path}" placeholder="e.g., /dev/sda">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="width:100%">
                        <label class="optional">Match Condition <span class="hint-icon" data-tooltip="Disk matching criteria (ignored if Path is set)">?</span></label>
                        <div class="disk-match-container">
                            <div class="disk-match-row">
                                <select class="disk-match-type" onchange="window.StorageManager.updateDiskMatchPlaceholder(this)">
                                    <option value="size" ${match === 'size' ? 'selected' : ''}>Size</option>
                                    <option value="model" ${match === 'model' ? 'selected' : ''}>Model</option>
                                    <option value="serial" ${match === 'serial' ? 'selected' : ''}>Serial</option>
                                    <option value="path" ${match === 'path' ? 'selected' : ''}>Path</option>
                                    <option value="wwn" ${match === 'wwn' ? 'selected' : ''}>WWN</option>
                                    <option value="firmware_version" ${match === 'firmware_version' ? 'selected' : ''}>Firmware Version</option>
                                    <option value="ssd" ${match === 'ssd' ? 'selected' : ''}>SSD</option>
                                </select>
                                <input type="text" class="disk-match-value" value="${matchValue}" placeholder="e.g., largest, smallest, 100G">
                                <button type="button" class="remove-disk-match-btn" onclick="window.StorageManager.removeDiskMatchRow(this)">Remove</button>
                            </div>
                        </div>
                        <button type="button" class="add-disk-condition-btn" onclick="window.StorageManager.addDiskMatchRow(this)">Add Disk Condition</button>
                    </div>
                </div>`;
            break;
            
        case 'partition':
            specificFields = `
                <!-- Required Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Device <span class="hint-icon" data-tooltip="Target disk ID (e.g. disk0)">?</span></label>
                        <input type="text" class="storage-device-input" value="${device}" required>
                    </div>
                    <div class="form-group">
                        <label>Partition Number <span class="hint-icon" data-tooltip="Numeric partition index on the device (e.g. 1)">?</span></label>
                        <input type="number" class="storage-number-input" value="${number}"  min="1" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Size <span class="hint-icon" data-tooltip="Partition size, -1 for remaining space">?</span></label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="number" class="storage-size-input" value="${displaySize}" step="1" style="flex: 1;" required>
                            <select class="storage-size-unit" style="width: 80px;" required>
                                <option value="B" ${displayUnit === 'B' ? 'selected' : ''}>Bytes</option>
                                <option value="K" ${displayUnit === 'K' ? 'selected' : ''}>KB</option>
                                <option value="M" ${displayUnit === 'M' ? 'selected' : ''}>MB</option>
                                <option value="G" ${displayUnit === 'G' ? 'selected' : ''}>GB</option>
                                <option value="T" ${displayUnit === 'T' ? 'selected' : ''}>TB</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="optional">Flag <span class="hint-icon" data-tooltip="Partition flag (e.g. bios_grub)">?</span></label>
                        <input type="text" class="storage-flag-input" value="${flag}">
                    </div>
                </div>
                <!-- Optional Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Preserve <span class="hint-icon" data-tooltip="Keep existing partition data (default false)">?</span></label>
                        <select class="storage-preserve-input">
                            <option value="false" selected>false</option>
                            <option value="true">true</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>GRUB Device <span class="hint-icon" data-tooltip="Whether this partition should be the GRUB boot partition">?</span></label>
                        <select class="storage-grub-device-input">
                            <option value="false" ${grubDevice === false || grubDevice === 'false' ? 'selected' : ''}>false</option>
                            <option value="true" ${grubDevice === true || grubDevice === 'true' ? 'selected' : ''}>true</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Wipe Method <span class="hint-icon" data-tooltip="Cleanup operation method (default superblock)">?</span></label>
                        <select class="storage-wipe-input">
                            <option value="superblock" ${wipe === 'superblock' ? 'selected' : ''}>superblock</option>
                            <option value="pvremove" ${wipe === 'pvremove' ? 'selected' : ''}>pvremove</option>
                            <option value="zero" ${wipe === 'zero' ? 'selected' : ''}>zero</option>
                            <option value="random" ${wipe === 'random' ? 'selected' : ''}>random</option>
                        </select>
                    </div>
                </div>`;
            break;
            
        case 'format':
            specificFields = `
                <!-- Required Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Volume <span class="hint-icon" data-tooltip="Volume to format (e.g. lv-root)">?</span></label>
                        <input type="text" class="storage-volume-input" value="${volume}" required>
                    </div>
                    <div class="form-group">
                        <label>File System Type <span class="hint-icon" data-tooltip="Filesystem to create (default ext4)">?</span></label>
                        <select class="storage-fstype-input" required>
                            <option value="ext4" ${fstype === 'ext4' ? 'selected' : ''}>ext4</option>
                            <option value="ext3" ${fstype === 'ext3' ? 'selected' : ''}>ext3</option>
                            <option value="xfs" ${fstype === 'xfs' ? 'selected' : ''}>xfs</option>
                            <option value="f2fs" ${fstype === 'f2fs' ? 'selected' : ''}>f2fs</option>
                            <option value="fat32" ${fstype === 'fat32' ? 'selected' : ''}>fat32</option>
                            <option value="fat16" ${fstype === 'fat16' ? 'selected' : ''}>fat16</option>
                            <option value="swap" ${fstype === 'swap' ? 'selected' : ''}>swap</option>
                            <option value="zfsroot" ${fstype === 'zfsroot' ? 'selected' : ''}>zfsroot</option>
                        </select>
                    </div>
                </div>
                <!-- Optional Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Preserve <span class="hint-icon" data-tooltip="Keep existing filesystem and data (default false)">?</span></label>
                        <select class="storage-preserve-input">
                            <option value="false" selected>false</option>
                            <option value="true">true</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Label <span class="hint-icon" data-tooltip="Filesystem label (e.g. rootfs)">?</span></label>
                        <input type="text" class="storage-label-input">
                    </div>
                </div>`;
            break;
            
        case 'mount':
            specificFields = `
                <!-- Required Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Device <span class="hint-icon" data-tooltip="Filesystem ID to mount (e.g. fs-root)">?</span></label>
                        <input type="text" class="storage-device-input" value="${device}"  required>
                    </div>
                    <div class="form-group">
                        <label>Path <span class="hint-icon" data-tooltip="Mount point path (e.g. / or /boot)">?</span></label>
                        <input type="text" class="storage-path-input" value="${path}" required>
                    </div>
                </div>
                <!-- Optional Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Preserve <span class="hint-icon" data-tooltip="Keep existing mount behavior (default false)">?</span></label>
                        <select class="storage-preserve-input">
                            <option value="false" selected>false</option>
                            <option value="true">true</option>
                        </select>
                    </div>
                </div>`;
            break;
            
        case 'lvm_volgroup':
            const lvmDevicesValue = (devices && devices.length) ? devices.join(', ') : (device || '');
            specificFields = `
                <!-- Required Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Name <span class="hint-icon" data-tooltip="Volume group name (e.g. ubuntu-vg)">?</span></label>
                        <input type="text" class="storage-name-input" value="${name}" required>
                    </div>
                    <div class="form-group">
                        <label>Devices <span class="hint-icon" data-tooltip="Physical volumes list, comma separated (e.g. pv-part)">?</span></label>
                        <input type="text" class="storage-devices-input" value="${lvmDevicesValue}" required>
                    </div>
                </div>
                <!-- Optional Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Preserve <span class="hint-icon" data-tooltip="Keep existing VG (default false)">?</span></label>
                        <select class="storage-preserve-input">
                            <option value="false" selected>false</option>
                            <option value="true">true</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Wipe Method <span class="hint-icon" data-tooltip="Cleanup operation method">?</span></label>
                        <select class="storage-wipe-input">
                            <option value="superblock" selected>superblock</option>
                            <option value="pvremove">pvremove</option>
                            <option value="zero">zero</option>
                            <option value="random">random</option>
                        </select>
                    </div>
                </div>`;
            break;
            
        case 'lvm_partition':
            specificFields = `
                <!-- Required Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Name <span class="hint-icon" data-tooltip="Logical volume name (e.g. ubuntu-lv)">?</span></label>
                        <input type="text" class="storage-name-input" value="${name}" required>
                    </div>
                    <div class="form-group">
                        <label>Volume Group <span class="hint-icon" data-tooltip="Target volume group name (e.g. vg0)">?</span></label>
                        <input type="text" class="storage-volgroup-input" value="${volgroup}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Size <span class="hint-icon" data-tooltip="LV size, -1 for remaining space">?</span></label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="number" class="storage-size-input" value="${displaySize}" step="1" style="flex: 1;" required>
                            <select class="storage-size-unit" style="width: 80px;" required>
                                <option value="B" ${displayUnit === 'B' ? 'selected' : ''}>Bytes</option>
                                <option value="K" ${displayUnit === 'K' ? 'selected' : ''}>KB</option>
                                <option value="M" ${displayUnit === 'M' ? 'selected' : ''}>MB</option>
                                <option value="G" ${displayUnit === 'G' ? 'selected' : ''}>GB</option>
                                <option value="T" ${displayUnit === 'T' ? 'selected' : ''}>TB</option>
                            </select>
                        </div>
                    </div>
                    <!-- Optional Fields -->
                    <div class="form-group">
                        <label class="optional">Preserve <span class="hint-icon" data-tooltip="Keep existing logical volume (default false)">?</span></label>
                        <select class="storage-preserve-input">
                            <option value="false" selected>false</option>
                            <option value="true">true</option>
                        </select>
                    </div>
                </div>`;
            break;
            
        case 'dm_crypt':
            specificFields = `
                <!-- Required Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Volume <span class="hint-icon" data-tooltip="The volume key gives the volume that is to be encrypted (e.g. pv-part)">?</span></label>
                        <input type="text" class="storage-volume-input" value="${volume || device || 'pv-part'}" required>
                    </div>
                    <div class="form-group">
                        <label>DM Name <span class="hint-icon" data-tooltip="Device mapper name (e.g. crypto)">?</span></label>
                        <input type="text" class="storage-dm-name-input" value="${name || 'crypto'}" required>
                    </div>
                </div>
                <!-- Key Configuration (Key and Key File are mutually exclusive) -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Key <span class="hint-icon" data-tooltip="Encryption key (cannot be set together with Key File)">?</span></label>
                        <input type="password" class="storage-key-input" value="${encryptionKey || ''}" placeholder="Enter key or leave empty" onchange="window.StorageManager.toggleKeyFields(this)">
                    </div>
                    <div class="form-group">
                        <label class="optional">Key File <span class="hint-icon" data-tooltip="Encryption key file path (e.g. /etc/keys/crypto.key, cannot be set together with Key)">?</span></label>
                        <input type="text" class="storage-keyfile-input" value="${keyfile || ''}" placeholder="e.g. /tmp/luks.key" onchange="window.StorageManager.toggleKeyFields(this)">
                    </div>
                </div>
                <!-- Optional Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Preserve <span class="hint-icon" data-tooltip="Keep existing encrypted device (default false)">?</span></label>
                        <select class="storage-preserve-input">
                            <option value="false" selected>false</option>
                            <option value="true">true</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Wipe Method <span class="hint-icon" data-tooltip="Cleanup operation method (default superblock)">?</span></label>
                        <select class="storage-wipe-input">
                            <option value="superblock" selected>superblock</option>
                            <option value="pvremove">pvremove</option>
                            <option value="zero">zero</option>
                            <option value="random">random</option>
                        </select>
                    </div>
                </div>`;
            break;

        case 'raid':
            specificFields = `
                <!-- Required Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label>RAID Name <span class="hint-icon" data-tooltip="Name of the md device (e.g. md0)">?</span></label>
                        <input type="text" class="storage-raid-name-input" value="${name || ''}" placeholder="e.g. md0" required>
                    </div>
                    <div class="form-group">
                        <label>RAID Level <span class="hint-icon" data-tooltip="RAID level (raid0, raid1, raid5, raid6, raid10)">?</span></label>
                        <select class="storage-raidlevel-input" required>
                            <option value="raid0" ${raidlevel === 'raid0' ? 'selected' : ''}>RAID 0 (Striping)</option>
                            <option value="raid1" ${raidlevel === 'raid1' ? 'selected' : ''}>RAID 1 (Mirroring)</option>
                            <option value="raid5" ${raidlevel === 'raid5' ? 'selected' : ''}>RAID 5 (Parity)</option>
                            <option value="raid6" ${raidlevel === 'raid6' ? 'selected' : ''}>RAID 6 (Dual Parity)</option>
                            <option value="raid10" ${raidlevel === 'raid10' ? 'selected' : ''}>RAID 10 (Striped Mirrors)</option>
                        </select>
                    </div>
                </div>
                <!-- Optional Fields -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="optional">Metadata <span class="hint-icon" data-tooltip="RAID metadata/superblock style">?</span></label>
                        <select class="storage-raid-metadata-input">
                            <option value="default" ${metadata === 'default' ? 'selected' : ''}>default</option>
                            <option value="1.2" ${metadata === '1.2' ? 'selected' : ''}>1.2</option>
                            <option value="1.1" ${metadata === '1.1' ? 'selected' : ''}>1.1</option>
                            <option value="0.90" ${metadata === '0.90' ? 'selected' : ''}>0.90</option>
                            <option value="ddf" ${metadata === 'ddf' ? 'selected' : ''}>ddf</option>
                            <option value="imsm" ${metadata === 'imsm' ? 'selected' : ''}>imsm</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Preserve <span class="hint-icon" data-tooltip="Keep existing RAID device (default false)">?</span></label>
                        <select class="storage-preserve-input">
                            <option value="false" selected>false</option>
                            <option value="true">true</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="optional">Wipe Method <span class="hint-icon" data-tooltip="Cleanup operation method">?</span></label>
                        <select class="storage-wipe-input">
                            <option value="superblock" selected>superblock</option>
                            <option value="superblock-recursive">superblock-recursive</option>
                            <option value="pvremove">pvremove</option>
                            <option value="zero">zero</option>
                            <option value="random">random</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="width:100%">
                        <label>Devices <span class="hint-icon" data-tooltip="List of devices for RAID array (e.g. partition-1, partition-2)">?</span></label>
                        <textarea class="storage-devices-input" rows="2" placeholder="Enter device IDs, one per line">${devices ? devices.join('\n') : ''}</textarea>
                        <small class="hint">Enter one device ID per line (e.g. partition-1)</small>
                    </div>
                </div>`;
            break;
            
        default:
            specificFields = '';
    }
    
    return specificFields;
}

/**
 * Update storage configuration when type changes
 */
function updateStorageConfig(selectElement) {
    const configDiv = selectElement.closest('.storage-config');
    const container = document.getElementById('storageConfigs');
    const newType = selectElement.value;
    
    // Get current configuration values
    const currentId = configDiv.querySelector('.storage-id-input').value;
    
    // Remove current configuration
    configDiv.remove();
    
    // Add new configuration with the new type
    addStorageConfig(newType, currentId);
}

/**
 * Remove storage configuration
 */
function removeStorageConfig(button) {
    button.closest('.storage-config').remove();
}

/**
 * Add disk match row for disk configurations
 */
function addDiskMatchRow(button) {
    const container = button.previousElementSibling; // disk-match-container
    const row = document.createElement('div');
    row.className = 'disk-match-row';
    row.innerHTML = `
        <select class="disk-match-type" onchange="window.StorageManager.updateDiskMatchPlaceholder(this)">
            <option value="size">Size</option>
            <option value="model">Model</option>
            <option value="serial">Serial</option>
            <option value="path">Path</option>
            <option value="wwn">WWN</option>
            <option value="firmware_version">Firmware Version</option>
            <option value="ssd">SSD</option>
        </select>
        <input type="text" class="disk-match-value" placeholder="e.g., largest, smallest, 100G">
        <button type="button" class="remove-disk-match-btn" onclick="window.StorageManager.removeDiskMatchRow(this)">Remove</button>
    `;
    container.appendChild(row);
}

/**
 * Remove disk match row
 */
function removeDiskMatchRow(button) {
    button.closest('.disk-match-row').remove();
}

/**
 * Update disk match placeholder based on type
 */
function updateDiskMatchPlaceholder(select) {
    const input = select.nextElementSibling;
    const row = select.closest('.disk-match-row');

    if (select.value === 'ssd') {
        // Replace text input with bool select for ssd
        if (input.tagName === 'INPUT') {
            const boolSelect = document.createElement('select');
            boolSelect.className = 'disk-match-value';
            boolSelect.innerHTML = '<option value="false" selected>false</option><option value="true">true</option>';
            input.replaceWith(boolSelect);
        }
    } else {
        // Replace bool select back to text input if needed
        if (input.tagName === 'SELECT') {
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'disk-match-value';
            input.replaceWith(textInput);
        }
        const placeholders = {
            'size': 'e.g., largest, smallest, 100G',
            'model': 'e.g., Samsung SSD 860 EVO',
            'serial': 'e.g., S3Z5NF0M819377K',
            'path': 'e.g., /dev/disk/by-path/pci-0000:00:17.0-ata-1',
            'wwn': 'e.g., 0x5000c500a1b2c3d4',
            'firmware_version': 'e.g., 2.1.0'
        };
        const currentInput = row.querySelector('.disk-match-value');
        currentInput.placeholder = placeholders[select.value] || 'Enter value';
    }
}

/**
 * Toggle between Key and Key File fields for DM Crypt (mutually exclusive)
 */
function toggleKeyFields(input) {
    const configDiv = input.closest('.storage-config');
    const keyInput = configDiv.querySelector('.storage-key-input');
    const keyFileInput = configDiv.querySelector('.storage-keyfile-input');
    
    if (input === keyInput && input.value.trim() !== '') {
        // If key is filled, clear key file
        keyFileInput.value = '';
    } else if (input === keyFileInput && input.value.trim() !== '') {
        // If key file is filled, clear key
        keyInput.value = '';
    }
}

/**
 * Get storage configuration for build
 */
function getStorageConfig() {
    const storageConfigs = [];
    document.querySelectorAll('.storage-config').forEach(configDiv => {
        const type = configDiv.querySelector('.storage-type-input').value;
        const id = configDiv.querySelector('.storage-id-input').value;
        const grubDevice = configDiv.querySelector('.storage-grub-input').value === 'true';
        const ptable = configDiv.querySelector('.storage-ptable-input').value;
        const wipe = configDiv.querySelector('.storage-wipe-input').value;
        const match = configDiv.querySelector('.disk-match-value').value;
        const number = parseInt(configDiv.querySelector('.storage-number-input').value);
        const size = parseFloat(configDiv.querySelector('.storage-size-input').value);
        const unit = configDiv.querySelector('.storage-size-unit').value;
        const flag = configDiv.querySelector('.storage-flag-input').value;
        const name = configDiv.querySelector('.storage-name-input').value;
        const volgroup = configDiv.querySelector('.storage-volgroup-input').value;
        const path = configDiv.querySelector('.storage-path-input').value;
        const device = configDiv.querySelector('.storage-device-input').value;

        // Handle -1 for size to indicate fill to end
        if (size === -1) {
            // This case is handled by the display logic, but we need to pass -1 to the build script
            // For now, we'll pass 0 or a large number, depending on how the build script expects it.
            // A more robust solution would involve passing the original size value.
            // For now, let's assume a large number for simplicity, or that the build script handles it.
            // If the build script expects -1, we need to pass it directly.
            // For now, let's assume a large number for simplicity, or that the build script handles it.
            // If the build script expects -1, we need to pass it directly.
        }

        storageConfigs.push({
            type: type,
            id: id,
            grubDevice: grubDevice,
            ptable: ptable,
            wipe: wipe,
            match: match,
            number: number,
            size: size,
            unit: unit,
            flag: flag,
            name: name,
            volgroup: volgroup,
            path: path,
            device: device
        });
    });
    return storageConfigs;
}

/**
 * Validate storage configuration
 */
function validateStorageConfig(statusId = 'configStatus') {
    const errors = [];
    const configs = Array.from(document.querySelectorAll('.storage-config'));

    // Clear old highlighting
    configs.forEach(function(cfg){
        cfg.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    });

    if (configs.length === 0) {
        errors.push('At least one storage configuration is required');
    }

    const disks = configs.filter(cfg => (cfg.querySelector('.storage-type-input')?.value === 'disk'));
    if (disks.length === 0) {
        errors.push('At least one disk must be configured');
    }

    const grubDevices = configs.filter(cfg => (cfg.querySelector('.storage-grub-input')?.value === 'true'));
    if (grubDevices.length === 0) {
        errors.push('At least one grub device must be specified');
    }

    // Validate required fields item by item
    configs.forEach(function(cfg, idx){
        const type = cfg.querySelector('.storage-type-input')?.value;
        const markError = (selector, message) => {
            const el = cfg.querySelector(selector);
            if (el && (!el.value || (typeof el.value === 'string' && el.value.trim() === ''))) {
                el.classList.add('input-error');
                errors.push(message);
            }
        };

        // Common: ID is required for all device types
        markError('.storage-id-input', `Item ${idx + 1}: ID is required`);

        if (type === 'disk') {
            markError('.storage-ptable-input', `Disk ${idx + 1}: Partition table is required`);
            markError('.storage-grub-input', `Disk ${idx + 1}: GRUB device is required`);
        }
        if (type === 'partition') {
            markError('.storage-device-input', `Partition ${idx + 1}: Device is required`);
            const numEl = cfg.querySelector('.storage-number-input');
            if (numEl && (!numEl.value || parseInt(numEl.value, 10) <= 0)) {
                numEl.classList.add('input-error');
                errors.push(`Partition ${idx + 1}: Invalid partition number`);
            }
            const sizeEl = cfg.querySelector('.storage-size-input');
            if (sizeEl && (sizeEl.value === '' || (parseFloat(sizeEl.value) <= 0 && parseFloat(sizeEl.value) !== -1))) {
                sizeEl.classList.add('input-error');
                errors.push(`Partition ${idx + 1}: Invalid size`);
            }
        }
        if (type === 'format') {
            markError('.storage-volume-input', `Format ${idx + 1}: Volume is required`);
            markError('.storage-fstype-input', `Format ${idx + 1}: Filesystem type is required`);
        }
        if (type === 'mount') {
            markError('.storage-device-input', `Mount ${idx + 1}: Device is required`);
            markError('.storage-path-input', `Mount ${idx + 1}: Path is required`);
        }
        if (type === 'lvm_volgroup') {
            markError('.storage-name-input', `VG ${idx + 1}: Name is required`);
            markError('.storage-devices-input', `VG ${idx + 1}: Devices are required`);
        }
        if (type === 'lvm_partition') {
            markError('.storage-name-input', `LV ${idx + 1}: Name is required`);
            markError('.storage-volgroup-input', `LV ${idx + 1}: Volume group is required`);
            const sizeEl = cfg.querySelector('.storage-size-input');
            if (sizeEl && (sizeEl.value === '' || (parseFloat(sizeEl.value) <= 0 && parseFloat(sizeEl.value) !== -1))) {
                sizeEl.classList.add('input-error');
                errors.push(`LV ${idx + 1}: Invalid size`);
            }
        }
        if (type === 'dm_crypt') {
            markError('.storage-volume-input', `DM-Crypt ${idx + 1}: Volume is required`);
            markError('.storage-dm-name-input', `DM-Crypt ${idx + 1}: DM name is required`);
            
            // Check that either key or keyfile is provided (but not both)
            const keyEl = cfg.querySelector('.storage-key-input');
            const keyFileEl = cfg.querySelector('.storage-keyfile-input');
            const hasKey = keyEl && keyEl.value && keyEl.value.trim() !== '';
            const hasKeyFile = keyFileEl && keyFileEl.value && keyFileEl.value.trim() !== '';
            
            if (!hasKey && !hasKeyFile) {
                errors.push(`DM-Crypt ${idx + 1}: Either Key or Key File must be provided`);
                if (keyEl) keyEl.classList.add('input-error');
                if (keyFileEl) keyFileEl.classList.add('input-error');
            } else if (hasKey && hasKeyFile) {
                errors.push(`DM-Crypt ${idx + 1}: Key and Key File are mutually exclusive`);
                if (keyEl) keyEl.classList.add('input-error');
                if (keyFileEl) keyFileEl.classList.add('input-error');
            }
        }
    });

    if (errors.length > 0) {
        // Switch to Storage tab first
        if (typeof switchTab === 'function') {
            switchTab('storage');
        } else if (window.UIUtils && window.UIUtils.switchTab) {
            window.UIUtils.switchTab('storage');
        }

        // Small delay to allow tab switch animation
        setTimeout(() => {
            // Scroll to first error
            const firstError = document.querySelector('#storageConfigs .input-error');
            if (firstError && firstError.scrollIntoView) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                try { firstError.focus(); } catch (_) {}
            }
        }, 50);

        if (window.ConfigManager && window.ConfigManager.showStatus) {
            window.ConfigManager.showStatus(statusId, 'error', 'Storage validation failed: ' + errors.join(', '));
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Load storage config from parsed YAML and populate the form
 */
function loadFromConfig(storage) {
    const container = document.getElementById('storageConfigs');
    if (!container || !storage) return;
    container.innerHTML = '';

    // Swap configuration (new format: size as string like "8G", "0", etc.)
    if (storage.swap) {
        const swapFilenameEl = document.getElementById('swapFilename');
        const swapSizeEl = document.getElementById('swapSize');
        const swapSizeUnitEl = document.getElementById('swapSizeUnit');
        const swapMaxsizeEl = document.getElementById('swapMaxsize');
        const swapMaxsizeUnitEl = document.getElementById('swapMaxsizeUnit');
        const swapForceEl = document.getElementById('swapForce');

        // Filename
        if (swapFilenameEl && storage.swap.filename) {
            swapFilenameEl.value = storage.swap.filename;
        }

        // Parse size (e.g., "8G", "1GB", "4096M", "0")
        if (storage.swap.size !== undefined) {
            const sizeStr = String(storage.swap.size);
            const sizeMatch = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT])?$/i);
            if (sizeMatch) {
                const value = parseFloat(sizeMatch[1]);
                const unit = sizeMatch[2] ? sizeMatch[2].toUpperCase() : '';
                if (swapSizeEl) swapSizeEl.value = value;
                if (swapSizeUnitEl && unit) swapSizeUnitEl.value = unit;
            } else if (swapSizeEl) {
                swapSizeEl.value = sizeStr;
            }
        }

        // Parse maxsize (e.g., "8G")
        if (storage.swap.maxsize !== undefined) {
            const maxsizeStr = String(storage.swap.maxsize);
            const maxsizeMatch = maxsizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT])?$/i);
            if (maxsizeMatch) {
                const value = parseFloat(maxsizeMatch[1]);
                const unit = maxsizeMatch[2] ? maxsizeMatch[2].toUpperCase() : '';
                if (swapMaxsizeEl) swapMaxsizeEl.value = value;
                if (swapMaxsizeUnitEl && unit) swapMaxsizeUnitEl.value = unit;
            }
        }

        // Force
        if (swapForceEl && storage.swap.force !== undefined) {
            swapForceEl.value = storage.swap.force ? 'true' : 'false';
        }
    }

    // GRUB reorder
    if (storage.grub && storage.grub.reorder_uefi !== undefined) {
        const grubEl = document.getElementById('grubReorder');
        if (grubEl) grubEl.value = storage.grub.reorder_uefi ? 'true' : 'false';
    }

    // Storage config entries
    if (storage.config && Array.isArray(storage.config)) {
        storage.config.forEach(entry => {
            let size = entry.size || 0;
            let unit = 'B';
            if (entry.size === -1) {
                size = -1; unit = '';
            } else if (entry.size >= 1099511627776) { size = Math.round(entry.size / 1099511627776 * 100) / 100; unit = 'T'; }
            else if (entry.size >= 1073741824)     { size = Math.round(entry.size / 1073741824 * 100) / 100; unit = 'G'; }
            else if (entry.size >= 1048576)        { size = Math.round(entry.size / 1048576 * 100) / 100; unit = 'M'; }
            else if (entry.size >= 1024)           { size = Math.round(entry.size / 1024 * 100) / 100; unit = 'K'; }

            // Parse match object to extract type and value
            let matchType = 'size';
            let matchValue = '';
            if (entry.match) {
                if (typeof entry.match === 'string') {
                    matchValue = entry.match;
                } else if (typeof entry.match === 'object') {
                    const keys = Object.keys(entry.match);
                    if (keys.length > 0) {
                        matchType = keys[0];
                        matchValue = entry.match[matchType];
                    }
                }
            }

            addStorageConfig(
                entry.type || 'disk',
                entry.id || '',
                entry.grub_device || false,
                entry.ptable || '',
                entry.wipe || '',
                matchType,
                matchValue,
                entry.number || 0,
                size,
                unit,
                entry.flag || '',
                entry.name || '',
                entry.volgroup || '',
                entry.path || '',
                entry.device || '',
                entry.volume || '',
                entry.key || '',
                entry.keyfile || '',
                entry.fstype || 'ext4',
                entry.raidlevel || 'raid1',
                entry.devices || [],
                entry.metadata || 'default'
            );
        });
    }
}

// Export functions for use in other modules
window.StorageManager = {
    initStorageConfigs,
    loadFromConfig,
    addStorageConfig,
    updateStorageConfig,
    removeStorageConfig,
    addDiskMatchRow,
    removeDiskMatchRow,
    updateDiskMatchPlaceholder,
    toggleKeyFields,
    cleanupDuplicateAsterisks,
    validateStorageConfig
};

/**
 * Clean up duplicate asterisks in storage configuration labels
 * This function removes any duplicate asterisks that might be added by other scripts
 */
function cleanupDuplicateAsterisks() {
    console.log('Cleaning up duplicate asterisks in storage configuration...');

    // Find all storage configuration labels
    const storageLabels = document.querySelectorAll('#storageConfigs label');

    storageLabels.forEach(label => {
        const originalText = label.innerHTML;

        // Check if label contains both required span and text with asterisk
        if (originalText.includes('<span class="required">*</span>') &&
            originalText.match(/[^>]\s*\*/)) {

            console.log('Found duplicate asterisk in label:', originalText);

            // Remove asterisks that are not inside the required span
            let cleanedText = originalText;

            // Remove standalone asterisks that appear after field names
            cleanedText = cleanedText.replace(/(\w+)\s*\*(?=\s*<span class="required">)/g, '$1');

            if (cleanedText !== originalText) {
                console.log('Cleaned label from:', originalText);
                console.log('Cleaned label to:', cleanedText);
                label.innerHTML = cleanedText;
            }
        }
    });
}

// Auto-run cleanup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(cleanupDuplicateAsterisks, 100);
    });
} else {
    setTimeout(cleanupDuplicateAsterisks, 100);
}
