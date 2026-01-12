const { app, BrowserWindow, ipcMain, shell, session, net } = require('electron');
const path = require('path');
const https = require('https');

let mainWindow;

function createWindow() {
    const isDev = !app.isPackaged;

    mainWindow = new BrowserWindow({
        width: 1240,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#0a0f1a',
        show: false,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true
        },
        autoHideMenuBar: true,
        frame: false,
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


ipcMain.handle('api:request', async (event, { url, method, headers, body }) => {
    return new Promise((resolve, reject) => {
        const options = {
            method: method || 'GET',
            headers: headers || {},
        };

        const req = https.request(url, options, (res) => {
            let data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(data);
                const strData = buffer.toString('utf8');
                try {
                    const parsed = JSON.parse(strData);
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: strData });
                }
            });
        });

        req.on('error', (e) => resolve({ ok: false, error: e.message }));
        if (body) req.write(body);
        req.end();
    });
});

ipcMain.handle('api:fetch-blob', async (event, { url, headers }) => {
    return new Promise((resolve) => {
        const options = {
            method: 'GET',
            headers: headers || {},
        };

        const req = https.request(url, options, (res) => {
            let chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    data: buffer,
                    contentType: res.headers['content-type']
                });
            });
        });

        req.on('error', (e) => resolve({ ok: false, error: e.message }));
        req.end();
    });
});

ipcMain.handle('api:delete-with-session', async (event, { url, authKey }) => {
    return new Promise((resolve) => {
        const options = {
            method: 'GET',
            headers: {
                'Authorization': authKey || ''
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => resolve({ ok: false, error: e.message }));
        req.end();
    });
});


ipcMain.handle('auth:login-via-site', async () => {
    return new Promise((resolve) => {
        const authWindow = new BrowserWindow({
            width: 500,
            height: 700,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            },
            autoHideMenuBar: true
        });

        const targetUrl = 'https://cloud.onlysq.ru/';
        authWindow.loadURL(targetUrl);

        let resolved = false;

        const tryResolve = (cookieValue) => {
            if (!resolved) {
                resolved = true;
                authWindow.destroy();
                resolve({ success: true, token: cookieValue });
            }
        };


        const cookieHandler = (event, cookie, cause, removed) => {
            if (removed) return;
            if (cookie.name === 'user_token') {
                if (cookie.value && cookie.value.length > 5) {
                    tryResolve(cookie.value);
                }
            }
        };

        session.defaultSession.cookies.on('changed', cookieHandler);


        session.defaultSession.cookies.get({ name: 'user_token' })
            .then((cookies) => {
                if (cookies.length > 0 && cookies[0].value) {

                    tryResolve(cookies[0].value);
                }
            }).catch(console.error);

        authWindow.on('closed', () => {
            session.defaultSession.cookies.removeListener('changed', cookieHandler);
            if (!resolved) {
                resolve({ success: false });
            }
        });
    });
});


ipcMain.handle('api:upload', async (event, { url, fileBuffer, fileName, fileType, headers }) => {
    return new Promise((resolve, reject) => {
        const boundary = '----ElectronFormBoundary' + Math.random().toString(36).substring(2);

        const buffer = Buffer.from(fileBuffer);


        const pre = Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
            `Content-Type: ${fileType || 'application/octet-stream'}\r\n\r\n`
        );


        const post = Buffer.from(`\r\n--${boundary}--\r\n`);

        const bodyLength = pre.length + buffer.length + post.length;

        const options = {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyLength
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => {
            resolve({ ok: false, error: e.message });
        });


        req.write(pre);
        req.write(buffer);
        req.write(post);
        req.end();
    });
});


ipcMain.handle('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
});
ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    }
});
ipcMain.handle('window:close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
});
ipcMain.handle('window:reload', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.reload();
});
ipcMain.handle('window:toggle-devtools', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.toggleDevTools();
});


ipcMain.on('open-external', (e, url) => {
    if (url && url.startsWith('http')) {
        require('electron').shell.openExternal(url);
    }
});


const fs = require('fs');
const { dialog } = require('electron');

ipcMain.handle('api:download', async (event, { url, filename, headers }) => {
    return new Promise(async (resolve, reject) => {
        let savePath;


        const { filePath } = await dialog.showSaveDialog({
            defaultPath: path.join(app.getPath('downloads'), filename),
            title: 'Скачать файл'
        });

        if (!filePath) {
            return resolve({ canceled: true });
        }
        savePath = filePath;

        const urlObj = new URL(url);
        const options = {
            method: 'GET',
            headers: {
                ...headers,
                'User-Agent': 'Mozilla/5.0'
            }
        };

        const req = https.request(url, options, (res) => {
            if (res.statusCode !== 200) {
                resolve({ ok: false, status: res.statusCode });
                return;
            }

            const fileStream = fs.createWriteStream(savePath);
            res.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve({ ok: true, path: savePath });
            });

            fileStream.on('error', (err) => {
                fs.unlink(savePath, () => { });
                resolve({ ok: false, error: err.message });
            });
        });

        req.on('error', (err) => {
            resolve({ ok: false, error: err.message });
        });

        req.end();
    });
});
