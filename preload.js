/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - ELECTRON PRELOAD SCRIPT
 * ============================================================================
 * 
 * PURPOSE:
 * Bridge between Electron main process and renderer process.
 * Exposes safe file system APIs via contextBridge.
 * 
 * CHANGE LOG:
 * - 2025-12-22: Added backup APIs (folder selection, binary writes, path helpers)
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

const { contextBridge, ipcRenderer } = require('electron');

// Expose electronAPI to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // File dialogs
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveFileDialog: (suggestedName) => ipcRenderer.invoke('save-file-dialog', suggestedName),

    // File operations
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    readFileRaw: (filePath) => ipcRenderer.invoke('read-file-raw', filePath),  // 2025-12-17: For encryption
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

    // Config
    getLastFilePath: () => ipcRenderer.invoke('get-last-file-path'),
    getFileName: (filePath) => ipcRenderer.invoke('get-file-name', filePath),
    fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

    // Check if running in Electron
    isElectron: true,

    // 2025-12-17: Window controls for custom title bar
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

    // 2025-12-22: Auto-backup support
    getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
    ensureDir: (dirPath) => ipcRenderer.invoke('ensure-dir', dirPath),
    listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    writeFileBinary: (filePath, base64Data) => ipcRenderer.invoke('write-file-binary', filePath, base64Data)
});
