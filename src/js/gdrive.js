/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - GOOGLE DRIVE MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Handles Google Drive integration for cloud storage of expense vaults.
 * Provides OAuth2 authentication via Google Identity Services and 
 * file operations via the Google Drive API.
 * 
 * KEY FEATURES:
 * - Google Sign-In with OAuth2 (using GIS library)
 * - Create, read, write, list vault files in user's Drive
 * - Token persistence and automatic refresh
 * - Minimal scope (drive.file) - only accesses files created by this app
 * 
 * DEPENDENCIES:
 * - Google Identity Services script (loaded in index.html)
 * - Accounts module (for data migration)
 * 
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
 * - 2025-12-16: Initial creation with OAuth2 and Drive API integration
 * - 2025-12-16: Updated CLIENT_ID to Web application type for Electron compatibility
 * - 2025-12-16: Added userinfo.profile and userinfo.email scopes for displaying user info
 * - 2025-12-16: Implemented init(), signIn(), signOut(), isSignedIn(), getUser()
 * - 2025-12-16: Implemented listVaults(), createVault(), readVault(), writeVault()
 * - 2025-12-16: Implemented getVaultInfo(), getVaultName() for header badge display
 */

const GDrive = (() => {
    // Google OAuth2 Client ID (Web application type)
    const CLIENT_ID = '905819264850-o400ul0l6po42ghd4fardtspdqlp91i9.apps.googleusercontent.com';

    // Scopes: Drive file access + user profile for displaying user info
    const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

    // Drive API base URL
    const DRIVE_API = 'https://www.googleapis.com/drive/v3';
    const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

    // App-specific properties to identify Zip80 vault files
    const APP_PROPERTY_KEY = 'zip80_vault';
    const APP_PROPERTY_VALUE = 'true';

    // Local storage keys for token persistence
    const TOKEN_KEY = 'zip80_gdrive_token';
    const USER_KEY = 'zip80_gdrive_user';

    // State
    let tokenClient = null;
    let accessToken = null;
    let currentUser = null;
    let isInitialized = false;

    // Callbacks for auth state changes
    let onAuthChangeCallback = null;

    // --- Initialization ---

    /**
     * Initialize the Google Identity Services client
     * Must be called after GIS script is loaded
     * @param {Function} onAuthChange - Callback when auth state changes
     */
    function init(onAuthChange) {
        onAuthChangeCallback = onAuthChange;

        // Try to restore saved session
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedToken && savedUser) {
            accessToken = savedToken;
            currentUser = JSON.parse(savedUser);

            // Verify token is still valid
            verifyToken().then(valid => {
                if (valid) {
                    isInitialized = true;
                    if (onAuthChangeCallback) onAuthChangeCallback(true, currentUser);
                } else {
                    // Token expired, clear state
                    clearSession();
                }
            });
        }

        // Initialize token client (for sign-in flow)
        if (typeof google !== 'undefined' && google.accounts) {
            initTokenClient();
        } else {
            // GIS not loaded yet, wait for it
            window.addEventListener('load', () => {
                setTimeout(initTokenClient, 100);
            });
        }
    }

    /**
     * Initialize the Google token client
     */
    function initTokenClient() {
        if (typeof google === 'undefined' || !google.accounts) {
            console.warn('Google Identity Services not loaded');
            return;
        }

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: handleTokenResponse,
            error_callback: handleTokenError
        });

        isInitialized = true;
    }

    /**
     * Handle token response from Google
     */
    async function handleTokenResponse(response) {
        if (response.error) {
            console.error('Token error:', response.error);
            if (onAuthChangeCallback) onAuthChangeCallback(false, null);
            return;
        }

        accessToken = response.access_token;
        localStorage.setItem(TOKEN_KEY, accessToken);

        // Fetch user info
        try {
            const userInfo = await fetchUserInfo();
            currentUser = userInfo;
            localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

            if (onAuthChangeCallback) onAuthChangeCallback(true, userInfo);
        } catch (err) {
            console.error('Failed to fetch user info:', err);
            if (onAuthChangeCallback) onAuthChangeCallback(true, null);
        }
    }

    /**
     * Handle token error
     */
    function handleTokenError(error) {
        console.error('Token client error:', error);
        if (onAuthChangeCallback) onAuthChangeCallback(false, null);
    }

    /**
     * Verify if stored token is still valid
     */
    async function verifyToken() {
        if (!accessToken) return false;

        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Fetch user info from Google
     */
    async function fetchUserInfo() {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error('Failed to fetch user info');
        return response.json();
    }

    /**
     * Clear session data
     */
    function clearSession() {
        accessToken = null;
        currentUser = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    // --- Auth Methods ---

    /**
     * Trigger Google sign-in flow
     * Opens Google sign-in popup
     */
    function signIn() {
        if (!tokenClient) {
            initTokenClient();
        }

        if (tokenClient) {
            // Request access token
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            console.error('Token client not initialized');
        }
    }

    /**
     * Sign out and clear session
     */
    function signOut() {
        if (accessToken && google.accounts.oauth2) {
            google.accounts.oauth2.revoke(accessToken);
        }
        clearSession();
        if (onAuthChangeCallback) onAuthChangeCallback(false, null);
    }

    /**
     * Check if user is signed in
     */
    function isSignedIn() {
        return !!accessToken && !!currentUser;
    }

    /**
     * Get current user info
     */
    function getUser() {
        return currentUser;
    }

    // --- Drive File Operations ---

    /**
     * Make authenticated request to Drive API
     */
    async function driveRequest(url, options = {}) {
        if (!accessToken) {
            throw new Error('Not authenticated');
        }

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            // Token expired, clear session
            clearSession();
            if (onAuthChangeCallback) onAuthChangeCallback(false, null);
            throw new Error('Session expired. Please sign in again.');
        }

        return response;
    }

    /**
     * List all Zip80 vault files in user's Drive
     * @returns {Array} Array of vault file objects {id, name, modifiedTime}
     */
    async function listVaults() {
        // Query for files with our app property
        const query = `appProperties has { key='${APP_PROPERTY_KEY}' and value='${APP_PROPERTY_VALUE}' } and trashed=false`;

        const url = `${DRIVE_API}/files?` + new URLSearchParams({
            q: query,
            fields: 'files(id,name,modifiedTime,owners)',
            orderBy: 'modifiedTime desc',
            pageSize: '50'
        });

        const response = await driveRequest(url);

        if (!response.ok) {
            throw new Error('Failed to list vaults');
        }

        const data = await response.json();
        return data.files || [];
    }

    /**
     * Create a new vault file in Drive
     * @param {string} name - Vault name (used as filename)
     * @param {object} initialData - Initial vault data
     * @returns {string} File ID of created vault
     */
    async function createVault(name, initialData) {
        const filename = name.endsWith('.json') ? name : `${name}.json`;

        // Metadata for the file
        const metadata = {
            name: filename,
            mimeType: 'application/json',
            appProperties: {
                [APP_PROPERTY_KEY]: APP_PROPERTY_VALUE
            }
        };

        // Create multipart request body
        const boundary = '-------zip80boundary';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const body =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(initialData, null, 2) +
            closeDelimiter;

        const response = await driveRequest(
            `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: body
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create vault: ${error}`);
        }

        const file = await response.json();
        return file.id;
    }

    /**
     * Read vault data from Drive
     * @param {string} fileId - Drive file ID
     * @returns {object} Parsed vault data (migrated to v2 format)
     */
    async function readVault(fileId) {
        const url = `${DRIVE_API}/files/${fileId}?alt=media`;

        const response = await driveRequest(url);

        if (!response.ok) {
            throw new Error('Failed to read vault');
        }

        const text = await response.text();
        const rawData = text ? JSON.parse(text) : null;

        // Migrate to v2 format if needed (uses Accounts module)
        return Accounts.migrateData(rawData);
    }

    /**
     * Write vault data to Drive
     * @param {string} fileId - Drive file ID
     * @param {object} data - Vault data to save
     */
    async function writeVault(fileId, data) {
        const url = `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`;

        const response = await driveRequest(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data, null, 2)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to save vault: ${error}`);
        }
    }

    /**
     * Get vault file metadata (name, etc)
     * @param {string} fileId - Drive file ID
     * @returns {object} File metadata
     */
    async function getVaultInfo(fileId) {
        const url = `${DRIVE_API}/files/${fileId}?fields=id,name,modifiedTime`;

        const response = await driveRequest(url);

        if (!response.ok) {
            throw new Error('Failed to get vault info');
        }

        return response.json();
    }

    /**
     * Get vault filename
     * @param {string} fileId - Drive file ID
     * @returns {string} Filename
     */
    async function getVaultName(fileId) {
        const info = await getVaultInfo(fileId);
        return info.name || 'Unknown';
    }

    // --- Public API ---

    return {
        // Initialization
        init,

        // Auth
        signIn,
        signOut,
        isSignedIn,
        getUser,

        // File Operations
        listVaults,
        createVault,
        readVault,
        writeVault,
        getVaultInfo,
        getVaultName
    };
})();
