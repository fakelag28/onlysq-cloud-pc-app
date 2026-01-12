import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const UploadView = ({ apiCall, showToast, token, setCurrentTab }) => {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [pendingFiles, setPendingFiles] = useState([]);
    const [showFolderModal, setShowFolderModal] = useState(false);

    const handleDrag = (e) => {
        if (!e) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        if (!e) return;
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const items = e.dataTransfer.items;
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

        const processItems = async () => {
            const entries = [];
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry();
                if (entry) entries.push(entry);
            }

            const hasFolder = entries.some(e => e.isDirectory);

            for (const entry of entries) {
                await processEntry(entry);
            }

            if (hasFolder && files.length > 0) {
                setPendingFiles(files);
                setShowFolderModal(true);
            } else if (files.length > 0) {
                uploadMultiple(files.map(f => f.file));
            }
        };

        processItems();
    };

    const handleChange = (e) => {
        e.preventDefault();
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadMultiple(files);
        }
        e.target.value = '';
    };

    const handleFolderSelect = (e) => {
        e.preventDefault();
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const mapped = files.map(f => ({ file: f, path: f.webkitRelativePath || f.name, selected: true }));
            setPendingFiles(mapped);
            setShowFolderModal(true);
        }
        e.target.value = '';
    };

    const toggleFileSelection = (index) => {
        setPendingFiles(prev => prev.map((f, i) => i === index ? { ...f, selected: !f.selected } : f));
    };

    const confirmFolderUpload = () => {
        const selectedFiles = pendingFiles.filter(f => f.selected).map(f => f.file);
        setShowFolderModal(false);
        setPendingFiles([]);
        if (selectedFiles.length > 0) {
            uploadMultiple(selectedFiles);
        }
    };

    const uploadMultiple = async (files) => {
        if (!token) {
            showToast("Необходима авторизация", "error");
            return;
        }

        setUploading(true);
        setUploadProgress({ current: 0, total: files.length });

        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            setUploadProgress({ current: i + 1, total: files.length });
            const success = await uploadSingleFile(files[i]);
            if (success) successCount++;
        }

        setUploading(false);
        if (successCount === files.length) {
            showToast(`Загружено файлов: ${successCount}`, "success");
        } else {
            showToast(`Загружено: ${successCount} из ${files.length}`, successCount > 0 ? "success" : "error");
        }
        setCurrentTab('files');
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

    return (
        <div className="h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-8">Загрузка файлов</h1>

            <div
                className={`flex-1 border-4 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden
                    ${dragActive ? 'border-blue-500 bg-blue-500/10 scale-[0.99]' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-blue-500/30 hover:bg-[var(--bg-hover)]'}
                `}
                onDragEnter={(e) => handleDrag(e)}
                onDragLeave={(e) => handleDrag(e)}
                onDragOver={(e) => handleDrag(e)}
                onDrop={(e) => handleDrop(e)}
            >
                <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleChange} disabled={uploading} />

                {uploading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xl font-medium">Загрузка {uploadProgress.current} из {uploadProgress.total}</p>
                        <div className="w-64 h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={`w-24 h-24 rounded-full bg-blue-600/20 flex items-center justify-center mb-6 transition-transform duration-300 ${dragActive ? 'scale-110' : ''}`}>
                            <span className="material-symbols-rounded text-5xl text-blue-400">cloud_upload</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Перетащите файлы сюда</h2>
                        <p className="text-[var(--text-muted)] mb-6">или нажмите для выбора нескольких файлов</p>

                        <div className="flex gap-3">
                            <label className="px-5 py-2.5 bg-blue-600/20 text-blue-400 rounded-xl cursor-pointer hover:bg-blue-600/30 transition flex items-center gap-2 font-medium">
                                <span className="material-symbols-rounded">folder_open</span>
                                Выбрать папку
                                <input type="file" webkitdirectory="" directory="" className="hidden" onChange={handleFolderSelect} />
                            </label>
                        </div>
                    </>
                )}
            </div>

            <AnimatePresence>
                {showFolderModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowFolderModal(false)}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-lg">Выберите файлы для загрузки</h3>
                                    <p className="text-sm text-[var(--text-muted)]">Найдено файлов: {pendingFiles.length} | Выбрано: {pendingFiles.filter(f => f.selected).length}</p>
                                </div>
                                <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition"><span className="material-symbols-rounded">close</span></button>
                            </div>

                            <div className="flex-1 overflow-auto p-4">
                                <div className="flex gap-2 mb-4">
                                    <button onClick={() => setPendingFiles(prev => prev.map(f => ({ ...f, selected: true })))} className="px-3 py-1.5 text-sm bg-[var(--bg-hover)] hover:bg-blue-600/10 rounded-lg transition">Выбрать все</button>
                                    <button onClick={() => setPendingFiles(prev => prev.map(f => ({ ...f, selected: false })))} className="px-3 py-1.5 text-sm bg-[var(--bg-hover)] hover:bg-blue-600/10 rounded-lg transition">Снять выбор</button>
                                </div>
                                <div className="space-y-1">
                                    {pendingFiles.map((item, i) => (
                                        <label key={i} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${item.selected ? 'bg-blue-600/20' : 'hover:bg-[var(--bg-hover)]'}`}>
                                            <input type="checkbox" checked={item.selected} onChange={() => toggleFileSelection(i)} className="w-4 h-4 accent-blue-500" />
                                            <span className="material-symbols-rounded text-[var(--text-muted)] text-lg">description</span>
                                            <span className="text-sm truncate flex-1">{item.path}</span>
                                            <span className="text-xs text-[var(--text-muted)]">{(item.file.size / 1024).toFixed(1)} KB</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3">
                                <button onClick={() => setShowFolderModal(false)} className="px-5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition">Отмена</button>
                                <button onClick={confirmFolderUpload} disabled={pendingFiles.filter(f => f.selected).length === 0} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium">
                                    Загрузить ({pendingFiles.filter(f => f.selected).length})
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UploadView;
