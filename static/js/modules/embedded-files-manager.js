/**
 * Embedded Files Manager Module
 *
 * Manages custom files for injection into the ISO image.
 * The embedded files directory is at /tmp/tmp.xxxxx/mnt/build/<folderName>/
 * (separate from ISO extraction at /tmp/tmp.xxxxx/mnt/build/<files>)
 * This module lets you create subdirectories and upload/create files inside them.
 * - Left: subdirectory (folder) list panel
 * - Right: file browser with Name / Last Modified / Size columns
 * - Click folder: shows files inside that folder
 * - Click file: shows Actions panel below
 * - Toolbar: New Folder + New File + Upload buttons
 */

(function() {
    'use strict';

    var currentFolder = null;
    var selectedFile = null;
    var allFiles = [];
    var allDirs = [];
    var pendingFile = null;
    var isLoadingFiles = false;
    var rootDir = null;

    function api() { return '/api/v1'; }

    function escapeHtml(text) {
        if (!text) return '';
        var d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        var k = 1024;
        var sizes = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function formatDate(isoStr) {
        try {
            var d = new Date(isoStr);
            var y = d.getFullYear();
            var mo = String(d.getMonth() + 1).padStart(2, '0');
            var day = String(d.getDate()).padStart(2, '0');
            var h = String(d.getHours()).padStart(2, '0');
            var mi = String(d.getMinutes()).padStart(2, '0');
            return y + '-' + mo + '-' + day + ' ' + h + ':' + mi;
        } catch(e) { return isoStr || ''; }
    }

    function alert(msg, type) {
        var el = document.getElementById('embeddedStatus');
        if (!el) return;
        el.className = 'alert alert-' + (type || 'info');
        el.textContent = msg;
        el.style.display = 'block';
        clearTimeout(el._timer);
        el._timer = setTimeout(function() { el.style.display = 'none'; }, 4000);
    }

    function loading(msg) {
        var el = document.getElementById('embeddedFileBrowser');
        if (el) el.innerHTML = '<div class="browser-loading">' + (msg || 'Loading...') + '</div>';
    }

    // =====================================================
    //  Left: Folder List Panel
    // =====================================================

    function loadDirList() {
        var list = document.getElementById('embeddedDirList');
        if (!list) return;

        list.innerHTML = '<div class="browser-loading" style="padding:20px;">Loading...</div>';

        fetch(api() + '/embedded/dir?path=/')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) {
                    list.innerHTML = '<div class="browser-empty" style="padding:20px;">' + escapeHtml(data.error || 'Failed to load') + '</div>';
                    return;
                }
                if (data.rootDir) rootDir = data.rootDir;
                var rawDirs = data.dirs || [];
                var dirs = rawDirs.map(function(d) { return typeof d === 'string' ? d : d.name; });
                if (dirs.length === 0) {
                    list.innerHTML = '<div class="browser-empty" style="padding:20px;">No folders yet.<br><small>Click "+ New Folder" to create one.</small></div>';
                    return;
                }
                dirs.sort();
                var html = '';
                rawDirs.forEach(function(d) {
                    var name = typeof d === 'string' ? d : d.name;
                    var count = typeof d === 'object' ? d.fileCount : null;
                    var countStr = count !== null ? ' <span style="color:#888;font-size:12px;">(' + count + ' files)</span>' : '';
                    var esc = escapeHtml(name);
                    html += '<div class="dir-item' + (currentFolder === name ? ' active' : '') + '" ' +
                        'onclick="EmbeddedFilesManager.selectFolder(\'' + esc + '\')">' +
                        '<span class="dir-item-icon">&#128194;</span>' +
                        '<span class="dir-item-name">' + esc + countStr + '</span>' +
                        '<span class="dir-item-delete" onclick="event.stopPropagation(); EmbeddedFilesManager.deleteFolder(\'' + esc + '\')">&times;</span>' +
                        '</div>';
                });
                list.innerHTML = html;

                // Auto-select first if none selected
                if (!currentFolder || dirs.indexOf(currentFolder) === -1) {
                    selectFolder(dirs[0]);
                }
            })
            .catch(function(err) {
                list.innerHTML = '<div class="browser-empty" style="padding:20px;">Network error: ' + escapeHtml(err.message) + '</div>';
            });
    }

    function selectFolder(folder) {
        if (currentFolder === folder) return;
        currentFolder = folder;
        selectedFile = null;
        hideActionsPanel();
        loadDirList();
        loadFileBrowser(folder, false);
        updatePathDisplay(folder);
    }

    function updatePathDisplay(folder) {
        var el = document.getElementById('embeddedCurrentPath');
        if (el) {
            var base = rootDir || '/build/mnt';
            el.textContent = base + (folder ? '/' + folder + '/' : '/');
        }
    }

    // =====================================================
    //  Right: File Browser
    // =====================================================

    function loadFileBrowser(folder, keepSelection) {
        var browser = document.getElementById('embeddedFileBrowser');
        if (!browser) return;

        if (!folder) {
            browser.innerHTML = '<div class="browser-empty">Select a folder from the left panel.</div>';
            return;
        }

        var prevSelected = keepSelection ? selectedFile : null;
        pendingFile = null;
        isLoadingFiles = true;

        // Immediately show table structure with previous data (or empty)
        renderFileTable(allFiles.length ? allFiles : null, allDirs.length ? allDirs : null);

        fetch(api() + '/embedded/dir?path=' + encodeURIComponent(folder))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                isLoadingFiles = false;
                if (!data.success) {
                    browser.innerHTML = '<div class="browser-empty">' + escapeHtml(data.error || 'Failed to load') + '</div>';
                    return;
                }
                allFiles = (data.files || []).sort(function(a, b) { return a.name.localeCompare(b.name); });
                allDirs = (data.dirs || []).sort(function(a, b) {
                    var na = typeof a === 'string' ? a : a.name;
                    var nb = typeof b === 'string' ? b : b.name;
                    return na.localeCompare(nb);
                });
                if (data.rootDir) rootDir = data.rootDir;
                renderFileTable(allFiles, allDirs.length > 0 ? allDirs : null);
                if (pendingFile && allFiles.some(function(f) { return f.name === pendingFile; })) {
                    selectedFile = pendingFile;
                    showActionsPanel(pendingFile);
                } else if (prevSelected) {
                    selectedFile = prevSelected;
                    showActionsPanel(selectedFile);
                } else {
                    selectedFile = null;
                    hideActionsPanel();
                }
                pendingFile = null;
            })
            .catch(function(err) {
                isLoadingFiles = false;
                browser.innerHTML = '<div class="browser-empty">Network error: ' + escapeHtml(err.message) + '</div>';
                pendingFile = null;
            });
    }

    function toggleUploadMenu() {
        var menu = document.getElementById('uploadDropdownMenu');
        if (!menu) return;
        var isOpen = menu.style.display === 'block';
        menu.style.display = isOpen ? 'none' : 'block';
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        var menu = document.getElementById('uploadDropdownMenu');
        var btn = document.getElementById('uploadDropdownBtn');
        if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    function renderFileTable(files, dirs) {
        var browser = document.getElementById('embeddedFileBrowser');
        if (!browser) return;

        var html = '<table class="embedded-file-table"><thead><tr>' +
            '<th>Name</th><th>Last Modified</th><th>Size</th><th></th>' +
            '</tr></thead><tbody>';

        var hasDirs = dirs && dirs.length > 0;
        var hasFiles = files && files.length > 0;

        if (files === null && dirs === null) {
            html += '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:50px 0;font-size:14px;">Loading...</td></tr>';
        } else if (!hasDirs && !hasFiles) {
            html += '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:50px 0;font-size:14px;">No files in this folder.<br><small>Use the Upload button or New File button to add files.</small></td></tr>';
        } else {
            if (hasDirs) {
                dirs.forEach(function(d) {
                    var name = typeof d === 'string' ? d : d.name;
                    var escaped = escapeHtml(name);
                    html += '<tr class="dir-row" onclick="EmbeddedFilesManager.enterSubDir(\'' + escaped + '\')">';
                    html += '<td><div class="file-table-name"><span>&#128194;</span><span class="file-name-text">' + escaped + '</span></div></td>';
                    html += '<td class="file-table-date">-</td>';
                    html += '<td class="file-table-size">-</td>';
                    html += '<td class="file-table-actions-col">' +
                        '<button class="row-action-btn danger" onclick="event.stopPropagation(); EmbeddedFilesManager.deleteDir(\'' + escaped + '\')" title="Delete">Delete</button>' +
                        '</td>';
                    html += '</tr>';
                });
            }
            if (hasFiles) {
                files.forEach(function(f) {
                    var escaped = escapeHtml(f.name);
                    var escapedPath = (currentFolder + '/' + f.name).replace(/'/g, "\\'");
                    html += '<tr' + (selectedFile === f.name ? ' class="selected"' : '') + ' ' +
                        'onclick="EmbeddedFilesManager.selectFile(\'' + escaped + '\')">';
                    html += '<td><div class="file-table-name">' +
                        '<span>&#128196;</span>' +
                        '<span class="file-name-text" onclick="event.stopPropagation(); EmbeddedFilesManager.loadInlineEditor(\'' + escaped + '\')">' + escaped + '</span>' +
                        '</div></td>';
                    html += '<td class="file-table-date">' + formatDate(f.modified) + '</td>';
                    html += '<td class="file-table-size">' + formatSize(f.size) + '</td>';
                    html += '<td class="file-table-actions-col">' +
                        '<button class="row-action-btn" onclick="event.stopPropagation(); EmbeddedFilesManager.loadInlineEditor(\'' + escaped + '\')" title="Edit">Edit</button> ' +
                        '<button class="row-action-btn danger" onclick="event.stopPropagation(); EmbeddedFilesManager.deleteFile(\'' + escapedPath + '\')" title="Delete">Delete</button>' +
                        '</td>';
                    html += '</tr>';
                });
            }
        }

        html += '</tbody></table>';
        browser.innerHTML = html;
    }

    function selectFile(fileName) {
        pendingFile = fileName;
        if (isLoadingFiles) return;
        if (selectedFile === fileName) return;
        renderFileTable(allFiles, allDirs);
        showActionsPanel(fileName);
    }

    function clearSelection() {
        selectedFile = null;
        hideActionsPanel();
        renderFileTable(allFiles, allDirs);
    }

    // =====================================================
    //  Actions Panel
    // =====================================================

    function showActionsPanel(fileName) {
        var panel = document.getElementById('embeddedActionsPanel');
        var nameEl = document.getElementById('embeddedSelectedFileName');
        var grid = document.getElementById('embeddedActionsGrid');
        var preview = document.getElementById('embeddedFilePreview');
        if (!panel) return;

        selectedFile = fileName;
        nameEl.textContent = fileName;

        var actions = [
            { label: 'Download', action: 'download' },
            { label: 'Properties', action: 'properties' },
            { label: 'Rename', action: 'rename' },
            { label: 'Delete', action: 'delete', danger: true },
        ];

        var html = '';
        actions.forEach(function(a) {
            html += '<div class="embedded-action-card' + (a.danger ? ' danger' : '') + '" ' +
                'onclick="EmbeddedFilesManager.doAction(\'' + a.action + '\')">';
            html += '<span>' + a.label + '</span></div>';
        });
        grid.innerHTML = html;

        // Load properties by default
        showFileProperties(fileName);

        panel.style.display = 'block';
    }

    function hideActionsPanel() {
        var panel = document.getElementById('embeddedActionsPanel');
        if (panel) panel.style.display = 'none';
    }

    function showFileProperties(fileName) {
        var preview = document.getElementById('embeddedFilePreview');
        if (!preview) return;
        preview.innerHTML = '<div class="browser-loading" style="padding:10px 0;">Loading...</div>';

        var path = currentFolder + '/' + fileName;
        fetch(api() + '/embedded/read?path=' + encodeURIComponent(path))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) {
                    preview.innerHTML = '<div style="color:#dc3545;font-size:12px;">Failed: ' + escapeHtml(data.error) + '</div>';
                    return;
                }
                var content = data.content || '';
                var lines = content.split('\n').length;
                preview.innerHTML = '<div class="file-props">' +
                    '<div class="file-props-row"><span class="file-props-label">Name</span><span class="file-props-value">' + escapeHtml(fileName) + '</span></div>' +
                    '<div class="file-props-row"><span class="file-props-label">Path</span><span class="file-props-value">' + escapeHtml(path) + '</span></div>' +
                    '<div class="file-props-row"><span class="file-props-label">Size</span><span class="file-props-value">' + formatSize(content.length) + '</span></div>' +
                    '<div class="file-props-row"><span class="file-props-label">Lines</span><span class="file-props-value">' + lines + '</span></div>' +
                    '<div class="file-props-row"><span class="file-props-label">Words</span><span class="file-props-value">' + content.split(/\s+/).filter(Boolean).length + '</span></div>' +
                    '</div>';
            })
            .catch(function(err) { preview.innerHTML = '<div style="color:#dc3545;font-size:12px;">Network error: ' + escapeHtml(err.message) + '</div>'; });
    }

    function showFileContent(fileName) {
        var preview = document.getElementById('embeddedFilePreview');
        if (!preview) return;
        preview.innerHTML = '<div class="browser-loading" style="padding:10px 0;">Loading...</div>';

        var path = currentFolder + '/' + fileName;
        fetch(api() + '/embedded/read?path=' + encodeURIComponent(path))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) {
                    preview.innerHTML = '<div style="color:#dc3545;font-size:12px;">Failed: ' + escapeHtml(data.error) + '</div>';
                    return;
                }
                var content = data.content || '';
                var escaped = escapeHtml(content);
                preview.innerHTML = '<div class="file-content-preview"><pre>' + escaped + '</pre></div>';
            })
            .catch(function(err) { preview.innerHTML = '<div style="color:#dc3545;font-size:12px;">Network error: ' + escapeHtml(err.message) + '</div>'; });
    }

    function loadInlineEditor(fileName) {
        var preview = document.getElementById('embeddedFilePreview');
        if (!preview) return;

        selectedFile = fileName;
        showActionsPanel(fileName);

        var path = currentFolder + '/' + fileName;
        fetch(api() + '/embedded/read?path=' + encodeURIComponent(path))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) {
                    preview.innerHTML = '<div style="color:#dc3545;font-size:12px;">Failed: ' + escapeHtml(data.error) + '</div>';
                    return;
                }
                var content = data.content || '';
                var lines = content.split('\n').length;

                preview.innerHTML = '<div class="inline-editor">' +
                    '<div class="inline-editor-toolbar">' +
                    '<span class="inline-editor-meta">' + lines + ' lines &middot; ' + content.length + ' bytes</span>' +
                    '<div class="inline-editor-actions">' +
                    '<button type="button" class="inline-btn inline-btn-cancel" id="inlineCancelBtn">Cancel</button>' +
                    '<button type="button" class="inline-btn inline-btn-save" id="inlineSaveBtn">Save</button>' +
                    '</div>' +
                    '</div>' +
                    '<div class="inline-editor-body">' +
                    '<div class="inline-editor-gutter" id="inlineGutter"></div>' +
                    '<textarea id="inlineEditorContent" class="inline-editor-textarea" spellcheck="false">' + escapeHtml(content) + '</textarea>' +
                    '</div>' +
                    '<div class="inline-editor-status" id="inlineEditorStatus"></div>' +
                    '</div>';

                var textarea = document.getElementById('inlineEditorContent');
                var gutter = document.getElementById('inlineGutter');
                var status = document.getElementById('inlineEditorStatus');
                var cancelBtn = document.getElementById('inlineCancelBtn');
                var saveBtn = document.getElementById('inlineSaveBtn');

                var originalContent = content;
                var hasChanges = false;

                function updateGutter() {
                    var l = (textarea.value.match(/\n/g) || []).length + 1;
                    var html = '';
                    for (var i = 1; i <= l; i++) { html += i + '\n'; }
                    gutter.textContent = html;
                }

                function syncScroll() {
                    gutter.scrollTop = textarea.scrollTop;
                }

                function updateStatus() {
                    var newContent = textarea.value;
                    hasChanges = newContent !== originalContent;
                    if (hasChanges) {
                        status.textContent = 'Modified';
                        status.className = 'inline-editor-status modified';
                        saveBtn.classList.add('has-changes');
                    } else {
                        status.textContent = 'No changes';
                        status.className = 'inline-editor-status';
                        saveBtn.classList.remove('has-changes');
                    }
                }

                textarea.addEventListener('input', function() {
                    updateGutter();
                    updateStatus();
                });
                textarea.addEventListener('scroll', syncScroll);
                updateGutter();

                cancelBtn.onclick = function() {
                    if (hasChanges) {
                        showDiscardChangesModal(function() {
                            showFileContent(fileName);
                        });
                    } else {
                        showFileContent(fileName);
                    }
                };

                saveBtn.onclick = function() {
                    var newContent = textarea.value;
                    doWriteFile(path, newContent, false, fileName);
                    originalContent = newContent;
                    updateStatus();
                };

                textarea.focus();
            })
            .catch(function(err) {
                preview.innerHTML = '<div style="color:#dc3545;font-size:12px;">Network error: ' + escapeHtml(err.message) + '</div>';
            });
    }

    function doAction(action) {
        if (!selectedFile) return;
        var path = currentFolder + '/' + selectedFile;

        switch (action) {
            case 'download':
                doDownload(path, selectedFile);
                break;
            case 'properties':
                showFileProperties(selectedFile);
                break;
            case 'rename':
                showRenameModal(selectedFile, path);
                break;
            case 'delete':
                deleteFile(path);
                break;
        }
    }

    function doDownload(path, fileName) {
        fetch(api() + '/embedded/read?path=' + encodeURIComponent(path))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) { alert('Download failed: ' + data.error, 'error'); return; }
                var blob = new Blob([data.content || ''], { type: 'text/plain' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                alert('Downloaded: ' + fileName, 'success');
            })
            .catch(function(err) { alert('Network error: ' + err.message, 'error'); });
    }

    // =====================================================
    //  Rename File
    // =====================================================

    function showRenameModal(oldName, path) {
        var body = '<div class="form-group"><label>New Name</label>' +
            '<input type="text" id="renameInput" value="' + escapeHtml(oldName) + '" style="width:100%;padding:8px;border:1px solid #ced4da;border-radius:4px;font-size:14px;"></div>';
        var footer = '<button class="btn btn-secondary" onclick="EmbeddedFilesManager.closeModal()">Cancel</button>' +
            '<button class="btn" id="doRenameBtn">Rename</button>';
        openModal('Rename: ' + escapeHtml(oldName), body, footer);

        document.getElementById('doRenameBtn').onclick = function() {
            var newName = document.getElementById('renameInput').value.trim();
            if (!newName) { alert('Name cannot be empty.'); return; }
            if (newName === oldName) { closeModal(); return; }
            doRename(path, newName);
        };
    }

    function doRename(oldPath, newName) {
        fetch(api() + '/embedded/read?path=' + encodeURIComponent(oldPath))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) { alert('Read failed: ' + data.error, 'error'); return; }
                var dir = oldPath.substring(0, oldPath.lastIndexOf('/'));
                var newPath = dir + '/' + newName;
                fetch(api() + '/embedded/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: newPath, content: data.content || '', encoding: 'text' })
                })
                .then(function(r) { return r.json(); })
                    .then(function(written) {
                        if (!written.success) { alert('Write new file failed: ' + written.error, 'error'); return; }
                        fetch(api() + '/embedded/delete', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: oldPath })
                        })
                        .then(function(r) { return r.json(); })
                        .then(function(deleted) {
                            closeModal();
                            if (deleted.success) {
                                alert('Renamed to: ' + newName, 'success');
                                selectedFile = null;
                                hideActionsPanel();
                                loadFileBrowser(currentFolder, false);
                            } else {
                                alert('Rename done but delete old failed: ' + deleted.error, 'error');
                            }
                        });
                    });
            })
            .catch(function(err) { alert('Network error: ' + err.message, 'error'); });
    }

    // =====================================================
    //  Write File
    // =====================================================

    function doWriteFile(path, content, keepEditor, editorFileName) {
        fetch(api() + '/embedded/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path, content: content, encoding: 'text' })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                closeModal();
                if (keepEditor && editorFileName) {
                    loadInlineEditor(editorFileName);
                } else if (editorFileName) {
                    showFileContent(editorFileName);
                } else {
                    loadFileBrowser(currentFolder, true);
                }
            } else {
                alert('Save failed: ' + (data.error || 'unknown'), 'error');
            }
        })
        .catch(function(err) { alert('Network error: ' + err.message, 'error'); });
    }

    // =====================================================
    //  Modals
    // =====================================================

    function openModal(title, bodyHtml, footerHtml, width) {
        closeModal();
        var overlay = document.createElement('div');
        overlay.id = 'embeddedModal';
        overlay.className = 'modal-overlay';
        overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };

        var modal = document.createElement('div');
        modal.className = 'modal-dialog embedded-file-modal';
        if (width) modal.style.width = width;
        modal.innerHTML = '<div class="modal-header">' +
            '<h3>' + escapeHtml(title) + '</h3>' +
            '<button class="modal-close" onclick="EmbeddedFilesManager.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' + bodyHtml + '</div>' +
            '<div class="modal-footer">' + footerHtml + '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        setTimeout(function() { overlay.classList.add('active'); modal.classList.add('active'); }, 10);
        return modal;
    }

    function closeModal() {
        var m = document.getElementById('embeddedModal');
        if (m) {
            m.classList.remove('active');
            setTimeout(function() { m.remove(); }, 200);
        }
    }

    // =====================================================
    //  Create Folder
    // =====================================================

    function showCreateDirModal() {
        var body = '<div class="form-group"><label>Folder Name</label>' +
            '<input type="text" id="newDirName" placeholder="e.g. scripts, configs, data" style="width:100%;padding:8px;border:1px solid #ced4da;border-radius:4px;font-size:14px;">' +
            '<small style="color:#888;display:block;margin-top:4px;">Enter folder name (e.g. scripts, configs, data)</small></div>';
        var footer = '<button class="btn btn-secondary" onclick="EmbeddedFilesManager.closeModal()">Cancel</button>' +
            '<button class="btn" id="doCreateDirBtn">Create</button>';
        openModal('New Folder', body, footer);

        setTimeout(function() {
            var input = document.getElementById('newDirName');
            input.focus();
            input.addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('doCreateDirBtn').click(); });
        }, 30);

        document.getElementById('doCreateDirBtn').onclick = function() {
            var name = document.getElementById('newDirName').value.trim();
            if (!name) { alert('Folder name cannot be empty.'); return; }
            if (/[.\/\\]/.test(name)) { alert('Name cannot contain /, \\ or ..'); return; }
            fetch(api() + '/embedded/mkdir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: name })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success) {
                    closeModal();
                    alert('Folder "' + name + '" created', 'success');
                    selectFolder(name);
                } else {
                    alert('Failed: ' + (data.error || 'unknown'), 'error');
                }
            })
            .catch(function(err) { alert('Network error: ' + err.message, 'error'); });
        };
    }

    function deleteFolder(name) {
        showDeleteFolderModal(name);
    }

    function showDeleteFolderModal(name) {
        var body = '<p style="margin:0;font-size:14px;">Are you sure you want to delete the folder <strong>' + escapeHtml(name) + '</strong> and all its contents?</p>';
        var footer = '<button class="btn btn-secondary" onclick="EmbeddedFilesManager.closeModal()">Cancel</button>' +
            '<button class="btn btn-danger" id="doDeleteFolderBtn">Delete</button>';
        openModal('Delete Folder', body, footer);

        document.getElementById('doDeleteFolderBtn').onclick = function() {
            closeModal();
            doDeleteFolderConfirmed(name);
        };
    }

    function doDeleteFolderConfirmed(name) {
        fetch(api() + '/embedded/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: name })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                alert('Folder deleted', 'success');
                if (currentFolder === name) currentFolder = null;
                loadDirList();
            } else {
                alert('Delete failed: ' + (data.error || 'unknown'), 'error');
            }
        })
        .catch(function(err) { alert('Network error: ' + err.message, 'error'); });
    }

    // =====================================================
    //  Upload File
    // =====================================================

    function triggerUpload() {
        if (!currentFolder) {
            alert('Please select a folder first.', 'error');
            return;
        }
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        input.multiple = true;
        input.onchange = function(e) {
            var files = e.target.files;
            if (files.length === 0) return;
            showUploadModal(files);
        };
        input.click();
    }

    function triggerUploadDir() {
        if (!currentFolder) {
            alert('Please select a folder first.', 'error');
            return;
        }
        var input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.onchange = function(e) {
            var files = e.target.files;
            if (files.length === 0) return;
            showUploadModal(files);
        };
        input.click();
    }

    function showUploadModal(files) {
        var fileRows = '';
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var displayPath = escapeHtml(f.webkitRelativePath || f.name);
            var sizeStr = formatSize(f.size);
            fileRows += '<div class="upload-file-row" id="uploadRow' + i + '">' +
                '<span class="upload-file-name">' + displayPath + '</span>' +
                '<span class="upload-file-size">' + sizeStr + '</span>' +
                '<span class="upload-file-status" id="uploadStatus' + i + '"></span>' +
                '</div>';
        }
        var body = '<div class="upload-files-list">' + fileRows + '</div>' +
            '<div id="uploadProgress" style="margin-top:10px;font-size:13px;color:#666;display:none;"></div>';
        var footer = '<button class="btn btn-secondary" id="uploadCancelBtn">Cancel</button>' +
            '<button class="btn" id="uploadStartBtn">Upload ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '</button>';
        openModal('Upload to /' + escapeHtml(currentFolder), body, footer, '520px');

        document.getElementById('uploadStartBtn').onclick = function() {
            this.disabled = true;
            document.getElementById('uploadCancelBtn').disabled = true;
            var progress = document.getElementById('uploadProgress');
            progress.style.display = 'block';
            uploadNext(0, files, progress);
        };

        document.getElementById('uploadCancelBtn').onclick = function() {
            closeModal();
        };
    }

    function uploadNext(index, files, progressEl) {
        if (index >= files.length) {
            progressEl.textContent = 'All files uploaded successfully.';
            progressEl.style.color = '#28a745';
            setTimeout(function() {
                closeModal();
                loadFileBrowser(currentFolder, true);
                loadDirList();
            }, 500);
            return;
        }
        var f = files[index];
        var relPath = f.webkitRelativePath || f.name;
        var statusEl = document.getElementById('uploadStatus' + index);
        progressEl.textContent = 'Uploading ' + (index + 1) + ' of ' + files.length + '...';
        statusEl.innerHTML = '<span class="upload-spinner">&#8987;</span>';

        doUpload(f, currentFolder + '/' + relPath, function(success, errMsg) {
            if (success) {
                statusEl.innerHTML = '<span style="color:#28a745;">&#10003;</span>';
                uploadNext(index + 1, files, progressEl);
            } else {
                statusEl.innerHTML = '<span style="color:#dc3545;" title="' + escapeHtml(errMsg) + '">&#10007; ' + escapeHtml(errMsg) + '</span>';
                progressEl.textContent = 'Failed: ' + errMsg;
                progressEl.style.color = '#dc3545';
                document.getElementById('uploadStartBtn').disabled = false;
                document.getElementById('uploadCancelBtn').disabled = false;
            }
        });
    }

    function doUpload(file, targetPath, callback) {
        var reader = new FileReader();
        reader.onload = function(e) {
            fetch(api() + '/embedded/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: targetPath, content: e.target.result, encoding: 'text' })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                callback(data.success, data.error || 'Upload failed');
            })
            .catch(function(err) { callback(false, err.message); });
        };
        reader.onerror = function() { callback(false, 'Read error'); };
        reader.readAsText(file);
    }

    // =====================================================
    //  New File
    // =====================================================

    function createFileInDir() {
        if (!currentFolder) {
            alert('Please select a folder first.', 'error');
            return;
        }
        var body = '<div class="form-group"><label>File Name</label>' +
            '<input type="text" id="newFileName" placeholder="e.g. setup.sh" style="width:100%;padding:8px;border:1px solid #ced4da;border-radius:4px;font-size:14px;"></div>' +
            '<div class="form-group"><label>Content</label>' +
            '<textarea id="newFileContent" rows="16" style="font-family:monospace;font-size:13px;resize:vertical;width:100%;padding:8px;border:1px solid #ced4da;border-radius:4px;background:#1e1e1e;color:#d4d4d4;" placeholder="Enter file content..."></textarea></div>';
        var footer = '<button class="btn btn-secondary" onclick="EmbeddedFilesManager.closeModal()">Cancel</button>' +
            '<button class="btn" id="doCreateFileBtn">Create</button>';
        openModal('New File', body, footer, '680px');

        setTimeout(function() { document.getElementById('newFileName').focus(); }, 30);

        document.getElementById('doCreateFileBtn').onclick = function() {
            var fileName = document.getElementById('newFileName').value.trim();
            if (!fileName) { alert('File name cannot be empty.'); return; }
            if (/(\.\.|\/|\\)/.test(fileName)) { alert('File name cannot contain /, \\ or ..'); return; }
            var content = document.getElementById('newFileContent').value;
            var targetPath = currentFolder + '/' + fileName;
            doWriteFile(targetPath, content);
        };
    }

    function showDiscardChangesModal(onDiscard) {
        var body = '<p style="margin:0;font-size:14px;">You have unsaved changes. Are you sure you want to discard them?</p>';
        var footer = '<button class="btn btn-secondary" onclick="EmbeddedFilesManager.closeModal()">Cancel</button>' +
            '<button class="btn btn-danger" id="doDiscardChangesBtn">Discard</button>';
        openModal('Discard Changes', body, footer);

        document.getElementById('doDiscardChangesBtn').onclick = function() {
            closeModal();
            if (typeof onDiscard === 'function') onDiscard();
        };
    }

    function deleteFile(path) {
        showDeleteFileModal(path);
    }

    function showDeleteFileModal(path) {
        var fileName = path.split('/').pop();
        var body = '<p style="margin:0 0 12px;font-size:14px;">Are you sure you want to delete <strong>' + escapeHtml(fileName) + '</strong>?</p>';
        var footer = '<button class="btn btn-secondary" onclick="EmbeddedFilesManager.closeModal()">Cancel</button>' +
            '<button class="btn btn-danger" id="doDeleteFileBtn">Delete</button>';
        openModal('Delete File', body, footer);

        document.getElementById('doDeleteFileBtn').onclick = function() {
            doDeleteFileConfirmed(path);
        };
    }

    function doDeleteFileConfirmed(path) {
        closeModal();
        fetch(api() + '/embedded/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                alert('File deleted', 'success');
                selectedFile = null;
                hideActionsPanel();
                loadFileBrowser(currentFolder, false);
            } else {
                alert('Delete failed: ' + (data.error || 'unknown'), 'error');
            }
        })
        .catch(function(err) { alert('Network error: ' + err.message, 'error'); });
    }

    // =====================================================
    //  Public API
    // =====================================================

    function enterSubDir(dirName) {
        selectFolder(currentFolder + '/' + dirName);
    }

    function deleteDir(dirName) {
        showDeleteSubFolderModal(dirName);
    }

    function showDeleteSubFolderModal(dirName) {
        var body = '<p style="margin:0;font-size:14px;">Are you sure you want to delete the folder <strong>' + escapeHtml(dirName) + '</strong> and all its contents?</p>';
        var footer = '<button class="btn btn-secondary" onclick="EmbeddedFilesManager.closeModal()">Cancel</button>' +
            '<button class="btn btn-danger" id="doDeleteSubFolderBtn">Delete</button>';
        openModal('Delete Folder', body, footer);

        document.getElementById('doDeleteSubFolderBtn').onclick = function() {
            closeModal();
            doDeleteSubFolderConfirmed(dirName);
        };
    }

    function doDeleteSubFolderConfirmed(dirName) {
        fetch(api() + '/embedded/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentFolder + '/' + dirName })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                alert('Folder deleted', 'success');
                loadFileBrowser(currentFolder, false);
                loadDirList();
            } else {
                alert('Delete failed: ' + (data.error || 'unknown'), 'error');
            }
        })
        .catch(function(err) { alert('Network error: ' + err.message, 'error'); });
    }

    window.EmbeddedFilesManager = {
        init: function() {
            var container = document.getElementById('embeddedDirList');
            if (container && !document.getElementById('embeddedStatus')) {
                var status = document.createElement('div');
                status.id = 'embeddedStatus';
                status.className = 'alert';
                status.style.display = 'none';
                status.style.margin = '0 0 10px 0';
                var parent = container.parentElement;
                if (parent) parent.insertBefore(status, container);
            }
        },

        loadDirList: function() {
            loadDirList();
        },

        refreshCurrentDir: function() {
            loadDirList();
            if (currentFolder) {
                loadFileBrowser(currentFolder, false);
            }
        },

        selectFolder: function(folder) {
            selectFolder(folder);
        },

        showCreateDirModal: function() {
            showCreateDirModal();
        },

        deleteFolder: function(name) {
            deleteFolder(name);
        },

        enterSubDir: function(dirName) {
            enterSubDir(dirName);
        },

        deleteDir: function(dirName) {
            deleteDir(dirName);
        },

        toggleUploadMenu: function() {
            toggleUploadMenu();
        },

        triggerUpload: function() {
            triggerUpload();
        },

        triggerUploadDir: function() {
            triggerUploadDir();
        },

        uploadFileInDir: function() {
            triggerUpload();
        },

        createFileInDir: function() {
            createFileInDir();
        },

        selectFile: function(fileName) {
            selectFile(fileName);
        },

        clearSelection: function() {
            clearSelection();
        },

        doAction: function(action) {
            doAction(action);
        },

        loadInlineEditor: function(fileName) {
            loadInlineEditor(fileName);
        },

        deleteFile: function(path) {
            deleteFile(path);
        },

        closeModal: function() {
            closeModal();
        }
    };

    // Auto-load when tab is shown
    document.addEventListener('DOMContentLoaded', function() {
        EmbeddedFilesManager.init();

        var tab = document.querySelector('[data-tab="embedded"]');
        if (tab) {
            tab.addEventListener('click', function() {
                setTimeout(function() { loadDirList(); }, 100);
            });
        }
    });

})();
