/**
 * Storage Module - Handles File System Access API and IndexedDB
 * Requirements: Zero-Navigation File IO, Data Portability
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

    async function createNewFile() {
        const handle = await window.showSaveFilePicker({
            suggestedName: 'zip80_expenses.json',
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
        return text ? JSON.parse(text) : [];
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
