/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - STORAGE MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Handles all file system operations using modern browser APIs.
 * Provides zero-navigation file IO (no dialog spam) and data portability.
 * 
 * KEY FEATURES:
 * - File System Access API for reading/writing JSON files
 * - IndexedDB for persisting file handles between sessions
 * - Drag-and-drop file support
 * - JSON export for data portability
 * - Automatic data migration via Accounts.migrateData()
 * 
 * BROWSER SUPPORT:
 * Requires Chromium-based browsers (Chrome, Edge) for File System Access API
 * 
 * KEY FUNCTIONS:
 * - openFilePicker(): Open file dialog
 * - createNewFile(): Create new expense file
 * - reopenLastFile(): Reopen last used file from IndexedDB
 * - readFile(): Read and parse JSON, auto-migrate to v2 format
 * - writeFile(): Save data to file
 * - handleDrop(): Process drag-and-drop file
 * 
 * DEPENDENCIES: Accounts module (for data migration)
 * USED BY: app.js
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
 *    - Ensure all new functions/classes have standard documentation (Docstrings/JSDoc).
 *    - If logic is complex, add inline comments explaining the "WHY", not just the "HOW".
 * 
 * 3. CONTEXT PRESERVATION:
 *    - Do not remove this Legend.
 *    - Do not remove legacy comments unless explicitly instructed.
 * ==============================================================================
 * 
 * CHANGE LOG:
 * - 2025-12-14: Initial creation with File System Access API
 * - 2025-12-14: Added IndexedDB for file handle persistence
 * - 2025-12-14: Added auto-migration to v2 data format via Accounts module
 * - 2025-12-15: Added optional suggestedName parameter to createNewFile()
 * - 2025-12-15: Added Electron support with Node.js file operations fallback
 */

const Storage = (() => {
    // Detect Electron environment
    const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

    // In Electron, we store file path instead of handle
    let currentFilePath = null;

    const DB_NAME = 'Zip80DB';
    const STORE_NAME = 'fileHandles';
    const LAST_FILENAME_KEY = 'zip80_lastFilename';  // localStorage backup

    let db = null;

    // --- IndexedDB Operations ---

    async function initDB() {
        if (db) return db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(STORE_NAME);
            };

            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async function saveHandle(handle) {
        // Also save filename to localStorage as backup
        if (handle && handle.name) {
            localStorage.setItem(LAST_FILENAME_KEY, handle.name);
        }

        const database = await initDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(handle, 'lastFile');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get last filename from localStorage (works even when handle fails)
     */
    function getLastFileName() {
        return localStorage.getItem(LAST_FILENAME_KEY);
    }

    async function getLastHandle() {
        const database = await initDB();
        return new Promise((resolve) => {
            const tx = database.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get('lastFile');
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => resolve(null);
        });
    }

    // --- File System Access API Operations ---

    const FILE_OPTIONS = {
        types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] }
        }]
    };

    async function openFilePicker() {
        const lastHandle = await getLastHandle();
        const options = { ...FILE_OPTIONS };

        if (lastHandle) {
            options.startIn = lastHandle;
        }

        const [handle] = await window.showOpenFilePicker(options);
        await saveHandle(handle);
        return handle;
    }

    /**
     * Create new file with save dialog
     * @param {string} suggestedName - Optional suggested filename (without extension)
     */
    async function createNewFile(suggestedName = 'zip80_expenses') {
        // Ensure filename ends with .json
        const filename = suggestedName.endsWith('.json') ? suggestedName : `${suggestedName}.json`;

        const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            ...FILE_OPTIONS
        });
        await saveHandle(handle);
        return handle;
    }

    async function reopenLastFile() {
        console.log('reopenLastFile: getting handle...');
        const handle = await getLastHandle();
        console.log('reopenLastFile: handle =', handle);
        if (!handle) {
            throw new Error('No recent file found');
        }

        // Check/request permissions - need readwrite for full access
        const options = { mode: 'readwrite' };

        // Helper: timeout wrapper to prevent hanging on file:// URLs
        const withTimeout = (promise, ms) => {
            return Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Permission request timed out')), ms)
                )
            ]);
        };

        try {
            console.log('reopenLastFile: querying permission...');
            const permission = await withTimeout(handle.queryPermission(options), 3000);
            console.log('reopenLastFile: permission =', permission);
            if (permission === 'granted') {
                return handle;
            }

            // Request permission (requires user gesture)
            console.log('reopenLastFile: requesting permission...');
            const newPermission = await withTimeout(handle.requestPermission(options), 3000);
            console.log('reopenLastFile: newPermission =', newPermission);
            if (newPermission === 'granted') {
                return handle;
            }

            throw new Error('Permission denied');
        } catch (err) {
            // Handle case where file no longer exists or permission denied
            console.error('Permission error:', err);
            throw new Error('Could not access file. It may have been moved or deleted.');
        }
    }

    async function readFile(handle) {
        const file = await handle.getFile();
        const text = await file.text();
        const rawData = text ? JSON.parse(text) : null;
        // Migrate v1 data to v2 format automatically
        return Accounts.migrateData(rawData);
    }

    async function writeFile(handle, data) {
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    }

    function getFileName(handle) {
        return handle?.name || 'Unknown';
    }

    // --- Data Export (Portability Requirement) ---

    function exportToJSON(data, filename = 'zip80_export.json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // --- Drag and Drop Support ---

    async function handleDrop(dataTransfer) {
        const items = [...dataTransfer.items];
        if (items.length > 0 && items[0].kind === 'file') {
            const handle = await items[0].getAsFileSystemHandle();
            if (handle.kind === 'file') {
                await saveHandle(handle);
                return handle;
            }
        }
        throw new Error('Invalid drop');
    }

    // Public API
    // In Electron mode, we use wrapper functions that use electronAPI
    if (isElectron) {
        return {
            isElectron: true,

            async openFilePicker() {
                const filePath = await window.electronAPI.openFileDialog();
                if (!filePath) throw new Error('No file selected');
                currentFilePath = filePath;
                return filePath;
            },

            async createNewFile(suggestedName = 'zip80_expenses') {
                const filename = suggestedName.endsWith('.json') ? suggestedName : `${suggestedName}.json`;
                const filePath = await window.electronAPI.saveFileDialog(filename);
                if (!filePath) throw new Error('No file selected');
                currentFilePath = filePath;
                return filePath;
            },

            async reopenLastFile() {
                const filePath = await window.electronAPI.getLastFilePath();
                if (!filePath) throw new Error('No recent file found');

                const exists = await window.electronAPI.fileExists(filePath);
                if (!exists) throw new Error('File no longer exists');

                currentFilePath = filePath;
                return filePath;
            },

            async readFile(filePath) {
                const result = await window.electronAPI.readFile(filePath);
                if (!result.success) throw new Error(result.error);
                return Accounts.migrateData(result.data);
            },

            async writeFile(filePath, data) {
                const result = await window.electronAPI.writeFile(filePath, data);
                if (!result.success) throw new Error(result.error);
            },

            async getFileName(filePath) {
                return await window.electronAPI.getFileName(filePath);
            },

            async getLastFileName() {
                const filePath = await window.electronAPI.getLastFilePath();
                if (!filePath) return null;
                return await window.electronAPI.getFileName(filePath);
            },

            getLastHandle: async () => null,  // Not used in Electron

            exportToJSON,
            handleDrop: async () => { throw new Error('Drop not supported in Electron'); }
        };
    }

    // Browser API (original)
    return {
        isElectron: false,
        getLastHandle,
        getLastFileName,
        openFilePicker,
        createNewFile,
        reopenLastFile,
        readFile,
        writeFile,
        getFileName,
        exportToJSON,
        handleDrop
    };
})();
