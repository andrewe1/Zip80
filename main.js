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

// Fix for crash: GPU process isn't usable
app.disableHardwareAcceleration();

// Store last opened file path in app data
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');

let mainWindow;

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
        title: 'Zip80 Track'
    });

    mainWindow.loadFile('src/index.html');

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
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
