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
 */

const Storage = (() => {
    const DB_NAME = 'Zip80DB';
    const STORE_NAME = 'fileHandles';

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
        const database = await initDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(handle, 'lastFile');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
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
        const handle = await getLastHandle();
        if (!handle) {
            throw new Error('No recent file found');
        }

        // Check/request permissions
        const readPerm = await handle.queryPermission({ mode: 'read' });
        if (readPerm !== 'granted') {
            const newPerm = await handle.requestPermission({ mode: 'read' });
            if (newPerm !== 'granted') {
                throw new Error('Permission denied');
            }
        }

        return handle;
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
    return {
        getLastHandle,
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
