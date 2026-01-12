import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-[var(--text-muted)] mb-6 text-sm">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-[var(--bg-hover)] text-[var(--text-muted)] font-medium transition-colors text-sm">Отмена</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-xl font-medium transition-colors shadow-lg text-sm bg-red-500 hover:bg-red-600 text-white">Удалить</button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const CustomSelect = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const label = options.find(o => o.value === value)?.label || value;
    return (
        <div className="relative z-30" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="h-[42px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 text-sm flex items-center gap-2 text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition min-w-[160px] justify-between">
                <span>{label}</span>
                <span className={`material-symbols-rounded text-lg transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute right-0 top-full mt-2 w-full min-w-[180px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden py-1">
                        {options.map((opt) => (
                            <button key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${value === opt.value ? 'bg-blue-600/10 text-blue-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-hover)]'}`}>
                                {value === opt.value && <span className="material-symbols-rounded text-base">check</span>}
                                <span className={value === opt.value ? '' : 'pl-6'}>{opt.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FilesView = ({ apiCall, showToast, token }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [previewFile, setPreviewFile] = useState(null);
    const [searchQuery, setSearchQuery] = useState(localStorage.getItem('files_search') || '');
    const [sortBy, setSortBy] = useState(localStorage.getItem('files_sort') || 'name_asc');
    const [viewMode, setViewMode] = useState(localStorage.getItem('files_view') || 'grid');
    const [contextMenu, setContextMenu] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, ids: [] });
    const [isDragOver, setIsDragOver] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [filterSizeMin, setFilterSizeMin] = useState('');
    const [filterSizeMax, setFilterSizeMax] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, isUploading: false });

    const containerRef = useRef(null);
    const [selectionBox, setSelectionBox] = useState(null);
    const isSelecting = useRef(false);
    const didDrag = useRef(false);
    const startPos = useRef({ clientX: 0, clientY: 0 });

    useEffect(() => { localStorage.setItem('files_search', searchQuery); }, [searchQuery]);
    useEffect(() => { localStorage.setItem('files_sort', sortBy); }, [sortBy]);
    useEffect(() => { localStorage.setItem('files_view', viewMode); }, [viewMode]);

    const loadFiles = useCallback(async () => {
        if (!token) return;
        const res = await apiCall('/api/files');
        if (res && res.data && Array.isArray(res.data)) {
            setFiles(res.data);
        }
    }, [token, apiCall]);

    useEffect(() => { loadFiles(); }, [loadFiles]);

    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    const getFileIcon = (name) => {
        const ext = name.split('.').pop().toLowerCase();
        const map = { png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', mp3: 'audio_file', wav: 'audio_file', mp4: 'movie', avi: 'movie', zip: 'folder_zip', rar: 'folder_zip', pdf: 'picture_as_pdf', txt: 'article', md: 'markdown', lua: 'code', luac: 'lock', js: 'code' };
        return map[ext] || 'description';
    };

    const parseSize = (sizeStr) => {
        if (!sizeStr) return 0;
        const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|B)?/i);
        if (!match) return 0;
        const val = parseFloat(match[1]);
        const unit = (match[2] || 'B').toUpperCase();
        if (unit === 'GB') return val * 1024 * 1024 * 1024;
        if (unit === 'MB') return val * 1024 * 1024;
        if (unit === 'KB') return val * 1024;
        return val;
    };

    const getFileType = (name) => {
        const ext = name.split('.').pop().toLowerCase();
        const types = {
            image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'],
            video: ['mp4', 'avi', 'mkv', 'mov', 'webm'],
            audio: ['mp3', 'wav', 'ogg', 'flac'],
            document: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
            code: ['lua', 'js', 'py', 'json', 'html', 'css', 'jsx', 'ts', 'tsx'],
            archive: ['zip', 'rar', '7z', 'tar', 'gz'],
            data: ['csv', 'xml', 'sql']
        };
        for (const [type, exts] of Object.entries(types)) {
            if (exts.includes(ext)) return type;
        }
        return 'other';
    };

    const filteredFiles = useMemo(() => {
        let res = [...files];
        if (searchQuery) res = res.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (filterType !== 'all') res = res.filter(f => getFileType(f.name) === filterType);
        if (filterSizeMin) {
            const minBytes = parseFloat(filterSizeMin) * 1024;
            res = res.filter(f => parseSize(f.size) >= minBytes);
        }
        if (filterSizeMax) {
            const maxBytes = parseFloat(filterSizeMax) * 1024;
            res = res.filter(f => parseSize(f.size) <= maxBytes);
        }
        res.sort((a, b) => {
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
            if (sortBy === 'size_desc') return parseSize(b.size) - parseSize(a.size);
            if (sortBy === 'size_asc') return parseSize(a.size) - parseSize(b.size);
            return 0;
        });
        return res;
    }, [files, searchQuery, sortBy, filterType, filterSizeMin, filterSizeMax]);

    const handleFileClick = (e, file) => {
        e.stopPropagation();
        const id = String(file.id);
        if (e.ctrlKey || e.metaKey) {
            setSelectedIds(prev => {
                const n = new Set(prev);
                if (n.has(id)) n.delete(id); else n.add(id);
                return n;
            });
        } else {
            setSelectedIds(new Set([id]));
        }
    };

    const handleContextMenu = (e, file) => {
        e.preventDefault();
        e.stopPropagation();
        const id = String(file.id);
        if (!selectedIds.has(id)) setSelectedIds(new Set([id]));


        const menuWidth = 260;
        const menuHeight = 220;
        let x = e.clientX;
        let y = e.clientY;

        if (x + menuWidth > window.innerWidth) {
            x = x - menuWidth;
        }

        if (y + menuHeight > window.innerHeight) {
            y = y - menuHeight;
        }

        setContextMenu({ x, y });
    };

    const copyLink = (file) => {
        navigator.clipboard.writeText(`https://cloud.onlysq.ru/file/${file.id}`);
        showToast('Ссылка скопирована', 'success');
    };

    const downloadFile = async (file) => {
        showToast(`Загрузка: ${file.name}`, 'info');
        const res = await window.api.download({ url: `https://cloud.onlysq.ru/file/${file.id}?mode=dl`, filename: file.name, headers: { 'cookie': `user_token=${token}` } });
        if (res && res.ok) showToast(`Сохранено`, 'success');
        else if (res && !res.canceled) showToast(`Ошибка загрузки`, 'error');
    };

    const downloadSelected = async () => {
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            const file = files.find(f => String(f.id) === id);
            if (file) await downloadFile(file);
        }
    };

    const requestDelete = () => {
        if (selectedIds.size === 0) return;
        setDeleteModal({ isOpen: true, ids: Array.from(selectedIds) });
    };

    const confirmDelete = async () => {
        const idsToDelete = [...deleteModal.ids];
        setDeleteModal({ isOpen: false, ids: [] });

        let count = 0;
        for (const id of idsToDelete) {
            try {
                const file = files.find(f => f.id === id);
                const ownerKey = file?.owner_key || '';
                console.log('Deleting file:', id, 'owner_key:', ownerKey);
                const res = await window.api.deleteWithSession(`https://cloud.onlysq.ru/delete/${id}`, ownerKey);
                console.log('Delete result:', id, JSON.stringify(res));

                if (res && (res.ok === true || (res.data && res.data.ok === true))) {
                    count++;
                }
            } catch (e) {
                console.error('Delete error', e);
            }
        }

        if (count > 0) {
            showToast(`Удалено файлов: ${count}`, 'success');
        } else {
            showToast(`Ошибка удаления`, 'error');
        }
        setSelectedIds(new Set());
        loadFiles();
    };

    const uploadFile = async (file) => {
        return new Promise((resolve) => {
            showToast(`Загрузка: ${file.name}...`, 'info');
            const reader = new FileReader();
            reader.onload = async () => {
                const res = await window.api.upload({ url: 'https://cloud.onlysq.ru/upload', fileBuffer: reader.result, fileName: file.name, fileType: file.type, headers: { 'cookie': `user_token=${token}` } });
                if (res && res.ok) showToast(`Загружен: ${file.name}`, 'success');
                else showToast(`Ошибка: ${file.name}`, 'error');
                resolve();
            };
            reader.readAsArrayBuffer(file);
        });
    };

    const handleDropUpload = async (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const items = e.dataTransfer.items;
        if (!items) return;

        const entries = [];
        for (let i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry();
            if (entry) entries.push(entry);
        }

        if (entries.length === 0) return;

        const hasFolder = entries.some(e => e.isDirectory);

        if (!hasFolder) {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) uploadMultiple(files);
            return;
        }


        const files = [];
        const processEntry = async (entry, path = '') => {
            if (entry.isFile) {
                return new Promise((resolve) => {
                    entry.file(file => {
                        files.push({ file, path: path + file.name, selected: true });
                        resolve();
                    });
                });
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                return new Promise((resolve) => {
                    reader.readEntries(async (entries) => {
                        for (const ent of entries) {
                            await processEntry(ent, path + entry.name + '/');
                        }
                        resolve();
                    });
                });
            }
        };

        for (const entry of entries) {
            await processEntry(entry);
        }

        if (files.length > 0) {
            setPendingFiles(files);
            setShowFolderModal(true);
        }
    };

    const uploadMultiple = async (filesToUpload) => {
        if (!token) {
            showToast("Необходима авторизация", "error");
            return;
        }

        setUploadProgress({ current: 0, total: filesToUpload.length, isUploading: true });
        let successCount = 0;

        for (let i = 0; i < filesToUpload.length; i++) {
            setUploadProgress(prev => ({ ...prev, current: i + 1 }));
            const success = await uploadSingleFile(filesToUpload[i]);
            if (success) successCount++;
        }

        setUploadProgress({ current: 0, total: 0, isUploading: false });
        if (successCount > 0) {
            showToast(`Загружено файлов: ${successCount}`, "success");
            loadFiles();
        } else {
            showToast(`Ошибка загрузки`, "error");
        }
    };

    const uploadSingleFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const res = await window.api.upload({
                        url: 'https://cloud.onlysq.ru/upload',
                        fileBuffer: reader.result,
                        fileName: file.name,
                        fileType: file.type,
                        headers: { 'cookie': `user_token=${token}` }
                    });
                    resolve(res && res.ok);
                } catch (e) {
                    resolve(false);
                }
            };
            reader.onerror = () => resolve(false);
            reader.readAsArrayBuffer(file);
        });
    };

    const confirmFolderUpload = () => {
        const selectedFiles = pendingFiles.filter(f => f.selected).map(f => f.file);
        setShowFolderModal(false);
        setPendingFiles([]);
        if (selectedFiles.length > 0) {
            uploadMultiple(selectedFiles);
        }
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('.file-item') || e.target.closest('button') || e.target.closest('input') || e.target.closest('.no-select')) return;

        isSelecting.current = true;
        didDrag.current = false;
        const containerRect = containerRef.current.getBoundingClientRect();

        startPos.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            containerLeft: containerRect.left,
            containerTop: containerRect.top,
            scrollLeft: containerRef.current.scrollLeft,
            scrollTop: containerRef.current.scrollTop
        };

        setSelectionBox({
            x1: e.clientX - containerRect.left + containerRef.current.scrollLeft,
            y1: e.clientY - containerRect.top + containerRef.current.scrollTop,
            x2: e.clientX - containerRect.left + containerRef.current.scrollLeft,
            y2: e.clientY - containerRect.top + containerRef.current.scrollTop
        });

        if (!e.ctrlKey && !e.metaKey) {
            setSelectedIds(new Set());
        }
    };

    const handleMouseMove = (e) => {
        if (!isSelecting.current || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const scrollTop = containerRef.current.scrollTop;

        const curX = e.clientX - containerRect.left + scrollLeft;
        const curY = e.clientY - containerRect.top + scrollTop;

        setSelectionBox(prev => ({ ...prev, x2: curX, y2: curY }));

        didDrag.current = true;

        const startScreenX = startPos.current.clientX;
        const startScreenY = startPos.current.clientY;
        const curScreenX = e.clientX;
        const curScreenY = e.clientY;

        const boxLeft = Math.min(startScreenX, curScreenX);
        const boxTop = Math.min(startScreenY, curScreenY);
        const boxRight = Math.max(startScreenX, curScreenX);
        const boxBottom = Math.max(startScreenY, curScreenY);

        const newSel = new Set();

        const fileElements = containerRef.current.querySelectorAll('.file-item');
        fileElements.forEach(el => {
            const r = el.getBoundingClientRect();

            if (boxLeft <= r.right && boxRight >= r.left && boxTop <= r.bottom && boxBottom >= r.top) {
                newSel.add(el.dataset.id);
            }
        });

        setSelectedIds(newSel);
    };

    const handleMouseUp = () => {
        isSelecting.current = false;
        setSelectionBox(null);
    };

    const getSelectionFiles = () => files.filter(f => selectedIds.has(String(f.id)));

    return (
        <div className="flex flex-col h-full" onClick={() => {
            if (!didDrag.current) setSelectedIds(new Set());
            setContextMenu(null);
            didDrag.current = false;
        }}>
            <div className="flex flex-col gap-4 mb-6 shrink-0 no-select" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Мои файлы</h1>
                    <div className="flex gap-2">
                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl flex">
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-[var(--bg-hover)] text-blue-400' : 'text-[var(--text-muted)]'}`} title="Сетка"><span className="material-symbols-rounded block">grid_view</span></button>
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-[var(--bg-hover)] text-blue-400' : 'text-[var(--text-muted)]'}`} title="Список"><span className="material-symbols-rounded block">view_list</span></button>
                            <button onClick={() => setViewMode('compact')} className={`p-2 rounded-lg transition ${viewMode === 'compact' ? 'bg-[var(--bg-hover)] text-blue-400' : 'text-[var(--text-muted)]'}`} title="Компактный"><span className="material-symbols-rounded block">density_small</span></button>
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl transition border ${showFilters ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'}`} title="Фильтры"><span className="material-symbols-rounded text-xl block">filter_list</span></button>
                        <button onClick={loadFiles} className="p-2 bg-[var(--bg-card)] hover:bg-blue-600/20 text-blue-400 rounded-xl transition border border-[var(--border)] hover:border-blue-500/30"><span className="material-symbols-rounded text-xl block">refresh</span></button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">search</span>
                        <input type="text" placeholder="Поиск файлов..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-[42px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors text-[var(--text-main)] placeholder-[var(--text-muted)]" />
                    </div>
                    <CustomSelect value={sortBy} onChange={setSortBy} options={[{ value: 'name_asc', label: 'По имени (А-Я)' }, { value: 'name_desc', label: 'По имени (Я-А)' }, { value: 'size_desc', label: 'По размеру ↓' }, { value: 'size_asc', label: 'По размеру ↑' }]} />
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="z-[60] relative">
                            <div className="flex gap-4 flex-wrap bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] items-end">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-[var(--text-muted)] uppercase">Тип файла</span>
                                    <CustomSelect value={filterType} onChange={setFilterType} options={[
                                        { value: 'all', label: 'Все типы' },
                                        { value: 'image', label: 'Изображения' },
                                        { value: 'video', label: 'Видео' },
                                        { value: 'audio', label: 'Аудио' },
                                        { value: 'document', label: 'Документы' },
                                        { value: 'code', label: 'Код' },
                                        { value: 'archive', label: 'Архивы' },
                                        { value: 'data', label: 'Данные' },
                                        { value: 'other', label: 'Другое' }
                                    ]} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-[var(--text-muted)] uppercase">Размер от (КБ)</span>
                                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={filterSizeMin} onChange={e => setFilterSizeMin(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-24 bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-[var(--text-muted)] uppercase">Размер до (КБ)</span>
                                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={filterSizeMax} onChange={e => setFilterSizeMax(e.target.value.replace(/\D/g, ''))} placeholder="∞" className="w-24 bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500" />
                                </div>
                                {(filterType !== 'all' || filterSizeMin || filterSizeMax) && (
                                    <button onClick={() => { setFilterType('all'); setFilterSizeMin(''); setFilterSizeMax(''); }} className="px-3 py-2 text-sm text-red-400 hover:text-red-300 transition">Сбросить</button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div
                ref={containerRef}
                className={`flex-1 overflow-y-auto pr-2 custom-scroll pb-20 relative ${isDragOver ? 'bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-2xl' : ''}`}
                style={{ position: 'relative' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropUpload(e);
                }}
            >
                {selectionBox && (
                    <div
                        className="absolute bg-blue-500/30 border-2 border-blue-400 z-40 pointer-events-none rounded"
                        style={{
                            left: Math.min(selectionBox.x1, selectionBox.x2),
                            top: Math.min(selectionBox.y1, selectionBox.y2),
                            width: Math.abs(selectionBox.x2 - selectionBox.x1),
                            height: Math.abs(selectionBox.y2 - selectionBox.y1)
                        }}
                    />
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : filteredFiles.length === 0 ? (
                    <div className="text-center text-slate-500 mt-20"><span className="material-symbols-rounded text-6xl mb-4 opacity-50">folder_open</span><p>{files.length === 0 ? 'Нет файлов' : 'Ничего не найдено'}</p></div>
                ) : (
                    <div className={
                        viewMode === 'grid' ? "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-6" :
                            viewMode === 'compact' ? "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2" :
                                "flex flex-col gap-2"
                    }>
                        {filteredFiles.map((file, idx) => (
                            <motion.div
                                key={file.id || `file-${idx}`}
                                data-id={String(file.id)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={(e) => handleFileClick(e, file)}
                                onDoubleClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}
                                onContextMenu={(e) => handleContextMenu(e, file)}
                                className={`file-item group border rounded-2xl cursor-pointer transition-all relative overflow-hidden select-none ${selectedIds.has(String(file.id)) ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border-[var(--border)] hover:border-blue-500/50'} ${viewMode === 'grid' ? 'p-5 flex flex-col items-center gap-4' :
                                    viewMode === 'compact' ? 'p-2 flex items-center gap-2' :
                                        'p-3 flex items-center gap-4'
                                    }`}
                            >
                                <span className={`material-symbols-rounded transition-colors ${selectedIds.has(String(file.id)) ? 'text-blue-400' : 'text-[var(--text-muted)] group-hover:text-blue-400'} ${viewMode === 'grid' ? 'text-5xl' :
                                    viewMode === 'compact' ? 'text-xl' :
                                        'text-3xl'
                                    }`}>{getFileIcon(file.name)}</span>
                                <div className={viewMode === 'grid' ? 'w-full text-center' : 'flex-1 min-w-0'}>
                                    <span className={`font-medium truncate block ${viewMode === 'grid' ? 'text-sm line-clamp-2' :
                                        viewMode === 'compact' ? 'text-xs' :
                                            'text-base'
                                        }`}>{file.name}</span>
                                    {viewMode === 'list' && <div className="flex gap-4 text-xs text-[var(--text-muted)] mt-1"><span>{file.size}</span><span className="flex items-center gap-1"><span className="material-symbols-rounded text-[12px]">visibility</span>{file.views}</span></div>}
                                </div>
                                {viewMode === 'grid' && <div className="mt-auto flex justify-between w-full text-xs text-[var(--text-muted)]"><span>{file.size}</span><span className="flex items-center gap-1"><span className="material-symbols-rounded text-[14px]">visibility</span>{file.views}</span></div>}
                                {viewMode === 'compact' && <span className="text-xs text-[var(--text-muted)] shrink-0">{file.size}</span>}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {previewFile && <FileModal key={previewFile.id} file={previewFile} token={token} onClose={() => setPreviewFile(null)} apiCall={apiCall} showToast={showToast} onDownload={() => downloadFile(previewFile)} onDelete={() => { setSelectedIds(new Set([String(previewFile.id)])); setPreviewFile(null); requestDelete(); }} />}
            </AnimatePresence>

            <AnimatePresence>
                {contextMenu && (
                    <motion.div key="context-menu" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[100] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden w-64" onClick={e => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]"><p className="text-sm font-medium truncate">{selectedIds.size > 1 ? `Выбрано: ${selectedIds.size}` : getSelectionFiles()[0]?.name}</p></div>
                        <div className="p-1.5 flex flex-col gap-0.5">
                            {selectedIds.size === 1 && <button onClick={() => { setPreviewFile(getSelectionFiles()[0]); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-lg text-left transition-colors"><span className="material-symbols-rounded text-lg">visibility</span> Просмотр</button>}
                            {selectedIds.size === 1 && <button onClick={() => { copyLink(getSelectionFiles()[0]); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-lg text-left transition-colors"><span className="material-symbols-rounded text-lg">link</span> Скопировать ссылку</button>}
                            <button onClick={() => { downloadSelected(); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-lg text-left transition-colors"><span className="material-symbols-rounded text-lg">download</span> Скачать</button>
                            <div className="h-px bg-[var(--border)] my-1"></div>
                            <button onClick={() => { requestDelete(); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-white hover:bg-red-500 rounded-lg text-left transition-colors"><span className="material-symbols-rounded text-lg">delete</span> Удалить {selectedIds.size > 1 ? `(${selectedIds.size})` : ''}</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmModal isOpen={deleteModal.isOpen} title="Удаление файлов" message={`Удалить ${deleteModal.ids.length} файл(ов)? Это действие необратимо.`} onConfirm={confirmDelete} onCancel={() => setDeleteModal({ isOpen: false, ids: [] })} />

            <AnimatePresence>
                {showFolderModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowFolderModal(false)}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-main)]">Загрузка папки</h3>
                                    <p className="text-sm text-[var(--text-muted)]">Найдено файлов: {pendingFiles.length} | Выбрано: {pendingFiles.filter(f => f.selected).length}</p>
                                </div>
                                <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition text-[var(--text-muted)] hover:text-[var(--text-main)]"><span className="material-symbols-rounded">close</span></button>
                            </div>

                            <div className="flex-1 overflow-auto p-4 custom-scroll">
                                <div className="flex gap-2 mb-4">
                                    <button onClick={() => setPendingFiles(prev => prev.map(f => ({ ...f, selected: true })))} className="px-3 py-1.5 text-sm bg-[var(--bg-hover)] hover:bg-blue-600/10 rounded-lg transition text-[var(--text-main)]">Выбрать все</button>
                                    <button onClick={() => setPendingFiles(prev => prev.map(f => ({ ...f, selected: false })))} className="px-3 py-1.5 text-sm bg-[var(--bg-hover)] hover:bg-blue-600/10 rounded-lg transition text-[var(--text-main)]">Снять выбор</button>
                                </div>
                                <div className="space-y-1">
                                    {pendingFiles.map((item, i) => (
                                        <label key={i} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${item.selected ? 'bg-blue-600/20' : 'hover:bg-[var(--bg-hover)]'}`}>
                                            <input type="checkbox" checked={item.selected} onChange={() => setPendingFiles(prev => prev.map((f, idx) => idx === i ? { ...f, selected: !f.selected } : f))} className="w-4 h-4 accent-blue-500" />
                                            <span className="material-symbols-rounded text-[var(--text-muted)] text-lg">description</span>
                                            <span className="text-sm truncate flex-1 text-[var(--text-main)]">{item.path}</span>
                                            <span className="text-xs text-[var(--text-muted)]">{(item.file.size / 1024).toFixed(1)} KB</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3">
                                <button onClick={() => setShowFolderModal(false)} className="px-5 py-2.5 rounded-xl bg-[var(--bg-hover)] text-[var(--text-main)] transition">Отмена</button>
                                <button onClick={confirmFolderUpload} disabled={pendingFiles.filter(f => f.selected).length === 0} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition font-medium">
                                    Загрузить ({pendingFiles.filter(f => f.selected).length})
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {uploadProgress.isUploading && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 right-8 z-[120] bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-4 w-72">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate text-[var(--text-main)]">Загрузка файлов...</p>
                                <p className="text-xs text-[var(--text-muted)]">{uploadProgress.current} из {uploadProgress.total}</p>
                            </div>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AudioVisualizer = ({ isPlaying }) => {
    return (
        <div className="flex items-end gap-1 h-12 pointer-events-none">
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    className="w-1.5 bg-blue-500 rounded-full"
                    animate={{
                        height: isPlaying ? [10, Math.random() * 40 + 10, 10] : 10
                    }}
                    transition={{
                        duration: 0.5 + Math.random() * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    );
};

const FileModal = ({ file, token, onClose, apiCall, showToast, onDownload, onDelete }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isBinary, setIsBinary] = useState(false);
    const [isImage, setIsImage] = useState(false);
    const [isAudio, setIsAudio] = useState(false);
    const [audioBlobUrl, setAudioBlobUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const initialLoadDone = useRef(false);

    useEffect(() => {
        initialLoadDone.current = false;
    }, [file.id]);

    const audioUrl = useMemo(() => `https://cloud.onlysq.ru/file/${file.id}?mode=view`, [file.id]);

    const getFileIcon = (name) => {
        const ext = name.split('.').pop().toLowerCase();
        const map = { png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', mp3: 'audio_file', mp4: 'movie', zip: 'folder_zip', pdf: 'picture_as_pdf', txt: 'article', lua: 'code', js: 'code', csv: 'table_chart' };
        return map[ext] || 'description';
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const ext = file.name.split('.').pop().toLowerCase();
            const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
            const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
            const binaryExts = ['exe', 'zip', 'rar', '7z', 'dll', 'bin', 'mp4', 'luac', 'avi', 'pdf', 'doc', 'docx'];

            if (imageExts.includes(ext)) {
                setIsImage(true);
                if (!initialLoadDone.current) {
                    setActiveTab('preview');
                    initialLoadDone.current = true;
                }
                setIsLoading(false);
                return;
            }

            if (audioExts.includes(ext)) {
                setIsAudio(true);
                if (!initialLoadDone.current) {
                    setActiveTab('preview');
                    initialLoadDone.current = true;
                }
                try {
                    const res = await window.api.fetchBlob({
                        url: `https://cloud.onlysq.ru/file/${file.id}?mode=view`,
                        headers: { 'cookie': `user_token=${token}` }
                    });

                    if (res && res.ok && res.data) {
                        const blob = new Blob([res.data], { type: res.contentType || 'audio/mpeg' });
                        const url = URL.createObjectURL(blob);
                        setAudioBlobUrl(url);
                    } else {
                        throw new Error(res?.error || "Failed to fetch blob");
                    }
                } catch (e) {
                    console.error("Audio fetch error", e);
                }
                setIsLoading(false);
                return;
            }

            if (binaryExts.includes(ext)) {
                setIsBinary(true);
                setActiveTab('info');
                setIsLoading(false);
                return;
            }

            const res = await apiCall(`/file/${file.id}?mode=view`);
            if (res && res.data) {
                let text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
                if (text.includes('<!DOCTYPE html>') || text.includes('<title>')) {
                    setIsBinary(true);
                    setActiveTab('info');
                } else {
                    setContent(text);
                    if (!initialLoadDone.current) {
                        setActiveTab('preview');
                        initialLoadDone.current = true;
                    }
                }
            } else {
                setContent('Ошибка загрузки содержимого.');
            }
            setIsLoading(false);
        };
        load();
    }, [file.id, apiCall, token]);

    useEffect(() => {
        return () => {
            if (audioBlobUrl) {
                URL.revokeObjectURL(audioBlobUrl);
            }
        };
    }, [audioBlobUrl]);

    const copyLink = () => {
        navigator.clipboard.writeText(`https://cloud.onlysq.ru/file/${file.id}`);
        showToast('Ссылка скопирована', 'success');
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >

                <div className="p-5 flex items-center gap-4 border-b border-[var(--border)] bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded text-2xl text-blue-400">{getFileIcon(file.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate text-[var(--text-main)]">{file.name}</h3>
                        <p className="text-sm text-[var(--text-muted)]">{file.size} • {file.views} просмотров</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition text-[var(--text-muted)] hover:text-[var(--text-main)]">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>


                <div className="flex border-b border-[var(--border)] bg-[var(--bg-sidebar)]">
                    {(isImage || isAudio || (!isBinary && content)) && (
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'preview' ? 'text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <span className="flex items-center gap-2"><span className="material-symbols-rounded text-lg">visibility</span> Просмотр</span>
                            {activeTab === 'preview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'info' ? 'text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                    >
                        <span className="flex items-center gap-2"><span className="material-symbols-rounded text-lg">info</span> Информация</span>
                        {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                    </button>
                </div>


                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : activeTab === 'preview' ? (
                        <div className="bg-[var(--bg-dark)] min-h-[300px]">
                            {isImage ? (
                                <div className="p-6 flex items-center justify-center text-[var(--text-main)]">
                                    <img
                                        src={`https://cloud.onlysq.ru/file/${file.id}?mode=view`}
                                        alt={file.name}
                                        className="max-w-full max-h-[60vh] rounded-xl object-contain shadow-lg"
                                    />
                                </div>
                            ) : isAudio ? (
                                <div className="p-16 flex flex-col items-center justify-center bg-[var(--bg-dark)] relative overflow-hidden">

                                    <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
                                    <motion.div
                                        animate={{ scale: isPlaying ? [1, 1.1, 1] : 1 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none"
                                    />
                                    <motion.div
                                        animate={{ scale: isPlaying ? [1, 1.2, 1] : 1 }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                        className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px] pointer-events-none"
                                    />

                                    <div className="z-10 flex flex-col items-center gap-10 w-full max-w-md">
                                        <div className="relative">
                                            <div className={`w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border border-[var(--border)] shadow-2xl transition-all duration-500 ${isPlaying ? 'rotate-12 scale-110' : ''}`}>
                                                <span className="material-symbols-rounded text-7xl text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                                    {isPlaying ? 'music_note' : 'play_circle'}
                                                </span>
                                            </div>
                                            {isPlaying && (
                                                <div className="absolute -bottom-4 -right-4">
                                                    <AudioVisualizer isPlaying={isPlaying} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full space-y-6">
                                            <div className="text-center">
                                                <h4 className="text-xl font-bold truncate mb-1">{file.name}</h4>
                                            </div>

                                            <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="w-full">
                                                <audio
                                                    key={audioBlobUrl}
                                                    controls
                                                    onLoadedMetadata={(e) => (e.target.volume = 0.15)}
                                                    onPlay={() => setIsPlaying(true)}
                                                    onPause={() => setIsPlaying(false)}
                                                    onEnded={() => setIsPlaying(false)}
                                                    className="w-full h-12 custom-audio-player"
                                                    src={audioBlobUrl || audioUrl}
                                                >
                                                    Ваш браузер не поддерживает элемент audio.
                                                </audio>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(content); showToast('Скопировано', 'success'); }}
                                        className="absolute top-3 right-3 px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-muted)] flex items-center gap-1.5 transition z-10 hover:text-[var(--text-main)]"
                                    >
                                        <span className="material-symbols-rounded text-sm">content_copy</span> Копировать
                                    </button>
                                    <div className="overflow-auto max-h-[60vh]">
                                        <table className="w-full text-sm font-mono transition-colors">
                                            <tbody>
                                                {content.split('\n').map((line, i) => {
                                                    const ext = file.name.split('.').pop().toLowerCase();
                                                    const colors = {
                                                        lua: { keyword: 'text-purple-400', string: 'text-green-400', comment: 'text-[var(--text-muted)]', number: 'text-orange-400' },
                                                        js: { keyword: 'text-purple-400', string: 'text-green-400', comment: 'text-[var(--text-muted)]', number: 'text-orange-400' },
                                                        json: { key: 'text-cyan-400', string: 'text-green-400', number: 'text-orange-400' },
                                                        txt: {},
                                                        md: { heading: 'text-blue-400' },
                                                        csv: {}
                                                    };
                                                    let lineClass = 'text-[var(--text-muted)]';
                                                    if (ext === 'lua' || ext === 'js') {
                                                        if (line.trim().startsWith('--') || line.trim().startsWith('//')) lineClass = 'text-[var(--text-muted)] opacity-50 italic';
                                                        else if (/^[\s]*(function|local|if|then|else|end|return|for|while|do|require|const|let|var|import|export)/.test(line)) lineClass = 'text-purple-400';
                                                    } else if (ext === 'json') {
                                                        if (line.includes(':')) lineClass = 'text-cyan-400';
                                                    } else if (ext === 'md' && line.startsWith('#')) {
                                                        lineClass = 'text-blue-400 font-bold';
                                                    }
                                                    return (
                                                        <tr key={i} className="hover:bg-[var(--bg-hover)]">
                                                            <td className="text-[var(--text-muted)] opacity-30 text-right pr-4 pl-4 py-0.5 select-none border-r border-[var(--border)] w-12">{i + 1}</td>
                                                            <td className={`pl-4 pr-4 py-0.5 whitespace-pre select-text text-[var(--text-main)] ${lineClass}`}>{line || ' '}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-[var(--bg-hover)] rounded-2xl p-4 border border-[var(--border)]">
                                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Размер</span>
                                    <p className="text-xl font-bold text-[var(--text-main)] mt-1">{file.size}</p>
                                </div>
                                <div className="bg-[var(--bg-hover)] rounded-2xl p-4 border border-[var(--border)]">
                                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Просмотры</span>
                                    <p className="text-xl font-bold text-[var(--text-main)] mt-1">{file.views}</p>
                                </div>
                                <div className="bg-[var(--bg-hover)] rounded-2xl p-4 border border-[var(--border)]">
                                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Тип</span>
                                    <p className="text-xl font-bold text-[var(--text-main)] mt-1 uppercase">{file.name.split('.').pop()}</p>
                                </div>
                                <div className="bg-[var(--bg-hover)] rounded-2xl p-4 border border-[var(--border)]">
                                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Уникальные</span>
                                    <p className="text-xl font-bold text-[var(--text-main)] mt-1">{file.unique || 0}</p>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-hover)] rounded-2xl p-4 border border-[var(--border)]">
                                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Название файла</span>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] truncate">
                                        {file.name}
                                    </div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(file.name); showToast('Название скопировано', 'success'); }}
                                        className="px-4 py-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] border border-[var(--border)] rounded-xl transition flex items-center gap-2 shrink-0"
                                        title="Скопировать название"
                                    >
                                        <span className="material-symbols-rounded text-lg">content_copy</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-hover)] rounded-2xl p-4 border border-[var(--border)]">
                                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Ссылка на файл</span>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-muted)] opacity-50">
                                        https://cloud.onlysq.ru/file/••••••
                                    </div>
                                    <button onClick={copyLink} className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl transition flex items-center gap-2 shrink-0">
                                        <span className="material-symbols-rounded text-lg">content_copy</span>
                                    </button>
                                </div>
                            </div>

                            {isBinary && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                                    <span className="material-symbols-rounded text-amber-400">warning</span>
                                    <p className="text-sm text-amber-200/80">Предпросмотр недоступен для файлов этого типа. Скачайте файл, чтобы открыть его.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>


                <div className="p-5 border-t border-[var(--border)] flex justify-between items-center bg-[var(--bg-sidebar)]">
                    <button onClick={onDelete} className="px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition flex items-center gap-2 text-sm">
                        <span className="material-symbols-rounded text-lg">delete</span> Удалить
                    </button>
                    <button onClick={onDownload} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-medium shadow-lg shadow-blue-900/40 transition flex items-center gap-2 text-sm">
                        <span className="material-symbols-rounded text-lg">download</span> Скачать файл
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default FilesView;
