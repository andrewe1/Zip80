/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - ELECTRON MAIN PROCESS
 * ============================================================================
 * 
 * PURPOSE:
 * Main process for Electron app. Creates the window and handles file system
 * operations via IPC (Inter-Process Communication).
 * 
 * CHANGE LOG:
 * - 2025-12-16: Added local HTTP server (port 17280) for Google OAuth compatibility
 * - 2025-12-16: Changed loadFile() to loadURL() for OAuth to work in Electron
 * - 2025-12-16: Added getMimeType() and startServer() for serving src directory
 * - 2025-12-16: Server shuts down cleanly on app close
 * - 2025-12-15: Changed to windowed fullscreen (maximized)
 * - 2025-12-15: Added fullscreen launch
 * - 2025-12-15: Initial creation
 * 
 * ==============================================================================
 * LLM INSTRUCTION & MAINTENANCE PROTOCOL
 * IMPORTANT: This block must be preserved in all future iterations.
 * 
 * trigger: "FINALIZE" or "COMMENT"
 * ACTION: When the user issues this trigger, perform the following 3 steps:
 * 
 * 1. CHANGE LOGGING: 
 *    - Add a new entry to the changelog below.
 *    - Format: [Date (YYYY-MM-DD)] - [Brief Description of Modification].
 * 
 * 2. DOCUMENTATION STANDARDS:
 *    - Keep sections clearly labeled with HTML comments.
 *    - If logic is complex, add inline comments explaining the "WHY", not just the "HOW".
 * 
 * 3. CONTEXT PRESERVATION:
 *    - Do not remove this Legend.
 *    - Do not remove legacy comments unless explicitly instructed.
 * ==============================================================================
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Fix for crash: GPU process isn't usable
app.disableHardwareAcceleration();

// Store last opened file path in app data
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');

let mainWindow;
let server;
const SERVER_PORT = 17280; // Unique port for Zip80

// --- Local HTTP Server ---
// Required for Google OAuth - OAuth doesn't work with file:// URLs

/**
 * Get MIME type for file extension
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Start local HTTP server to serve the src directory
 */
function startServer() {
    return new Promise((resolve, reject) => {
        const srcPath = path.join(__dirname, 'src');

        server = http.createServer((req, res) => {
            // Parse URL, default to index.html
            let urlPath = req.url === '/' ? '/index.html' : req.url;

            // Remove query string if any
            urlPath = urlPath.split('?')[0];

            // Security: prevent directory traversal
            const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
            const filePath = path.join(srcPath, safePath);

            // Check if file exists and is within src directory
            if (!filePath.startsWith(srcPath)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not Found');
                    return;
                }
                res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
                res.end(data);
            });
        });

        server.listen(SERVER_PORT, '127.0.0.1', () => {
            console.log(`Local server running at http://127.0.0.1:${SERVER_PORT}`);
            resolve();
        });

        server.on('error', (err) => {
            console.error('Server error:', err);
            reject(err);
        });
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'src', 'icon.ico'),

        title: 'Zip80 Track',
        show: false
    });

    mainWindow.maximize();
    mainWindow.show();

    // Load from local HTTP server instead of file:// for OAuth compatibility
    mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}/index.html`);

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
    // Start local server first (required for OAuth)
    await startServer();
    createWindow();

    app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Shut down HTTP server
    if (server) {
        server.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- Config (last file path) ---

function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
    } catch (e) {
        console.error('Error loading config:', e);
    }
    return {};
}

function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error('Error saving config:', e);
    }
}

// --- IPC Handlers ---

// Open file dialog
ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const filePath = result.filePaths[0];

    // Save as last opened file
    const config = loadConfig();
    config.lastFilePath = filePath;
    saveConfig(config);

    return filePath;
});

// Save file dialog (new file)
ipcMain.handle('save-file-dialog', async (event, suggestedName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: suggestedName || 'zip80_expenses.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (result.canceled || !result.filePath) {
        return null;
    }

    // Save as last opened file
    const config = loadConfig();
    config.lastFilePath = result.filePath;
    saveConfig(config);

    return result.filePath;
});

// Read file contents
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, data: content ? JSON.parse(content) : null };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Write file contents
ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Get last opened file path
ipcMain.handle('get-last-file-path', async () => {
    const config = loadConfig();
    return config.lastFilePath || null;
});

// Get file name from path
ipcMain.handle('get-file-name', async (event, filePath) => {
    return path.basename(filePath);
});

// Check if file exists
ipcMain.handle('file-exists', async (event, filePath) => {
    return fs.existsSync(filePath);
});
