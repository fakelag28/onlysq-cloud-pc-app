const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    request: (args) => ipcRenderer.invoke('api:request', args),
    fetchBlob: (args) => ipcRenderer.invoke('api:fetch-blob', args),
    upload: (args) => ipcRenderer.invoke('api:upload', args),
    deleteWithSession: (url, authKey) => ipcRenderer.invoke('api:delete-with-session', { url, authKey }),
    loginViaSite: () => ipcRenderer.invoke('auth:login-via-site'),
    openExternal: (url) => ipcRenderer.send('open-external', url),


    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    reload: () => ipcRenderer.invoke('window:reload'),
    toggleDevTools: () => ipcRenderer.invoke('window:toggle-devtools'),

    download: (args) => ipcRenderer.invoke('api:download', args),
});

contextBridge.exposeInMainWorld('app', {
    version: '1.0.0',
    platform: process.platform
});
