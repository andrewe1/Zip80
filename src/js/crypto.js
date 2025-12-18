/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - CRYPTO MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Provides AES-GCM encryption/decryption for vault JSON files using Web Crypto API.
 * Password-based encryption with PBKDF2 key derivation.
 * 
 * KEY FEATURES:
 * - AES-GCM 256-bit encryption
 * - PBKDF2 key derivation (100,000 iterations)
 * - Random salt and IV per encryption
 * - Works in both browser and Electron
 * 
 * SECURITY NOTES:
 * - Password is never stored, only kept in memory during session
 * - If password is forgotten, data is unrecoverable
 * - Each save generates new IV for security
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
 * - 2025-12-17: Initial creation with AES-GCM encryption via Web Crypto API
 */

const Crypto = (() => {
    // PBKDF2 iterations - higher = more secure but slower
    const PBKDF2_ITERATIONS = 100000;
    const SALT_LENGTH = 16;  // 128 bits
    const IV_LENGTH = 12;    // 96 bits for GCM

    /**
     * Convert ArrayBuffer to Base64 string
     * @param {ArrayBuffer} buffer - Buffer to convert
     * @returns {string} Base64 encoded string
     */
    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 string to ArrayBuffer
     * @param {string} base64 - Base64 encoded string
     * @returns {ArrayBuffer} Decoded buffer
     */
    function base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Generate a random salt or IV
     * @param {number} length - Number of bytes
     * @returns {Uint8Array} Random bytes
     */
    function generateRandom(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * Derive an AES-GCM key from a password using PBKDF2
     * @param {string} password - User's password
     * @param {Uint8Array} salt - Random salt
     * @returns {Promise<CryptoKey>} Derived AES-GCM key
     */
    async function deriveKey(password, salt) {
        // Import password as a key
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Derive AES-GCM key from password
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data with password
     * @param {object} data - JSON-serializable data to encrypt
     * @param {string} password - User's password
     * @param {string} hint - Password hint (stored unencrypted)
     * @returns {Promise<object>} Encrypted data envelope
     */
    async function encrypt(data, password, hint = '') {
        const salt = generateRandom(SALT_LENGTH);
        const iv = generateRandom(IV_LENGTH);
        const key = await deriveKey(password, salt);

        // Convert data to JSON string, then to bytes
        const plaintext = new TextEncoder().encode(JSON.stringify(data));

        // Encrypt
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            plaintext
        );

        // Return encrypted envelope (hint is stored unencrypted so it can be shown)
        return {
            encrypted: true,
            hint: hint,  // Stored unencrypted for display after failed attempts
            salt: bufferToBase64(salt),
            iv: bufferToBase64(iv),
            data: bufferToBase64(ciphertext)
        };
    }

    /**
     * Decrypt encrypted data with password
     * @param {object} encryptedEnvelope - Encrypted data envelope from encrypt()
     * @param {string} password - User's password
     * @returns {Promise<object>} Decrypted data
     * @throws {Error} If password is incorrect or data is corrupted
     */
    async function decrypt(encryptedEnvelope, password) {
        const salt = new Uint8Array(base64ToBuffer(encryptedEnvelope.salt));
        const iv = new Uint8Array(base64ToBuffer(encryptedEnvelope.iv));
        const ciphertext = base64ToBuffer(encryptedEnvelope.data);

        const key = await deriveKey(password, salt);

        try {
            // Decrypt
            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                ciphertext
            );

            // Parse JSON
            const jsonString = new TextDecoder().decode(plaintext);
            return JSON.parse(jsonString);
        } catch (e) {
            // AES-GCM decryption fails with wrong password (authentication tag mismatch)
            throw new Error('Decryption failed. Incorrect password or corrupted data.');
        }
    }

    /**
     * Check if data is an encrypted envelope
     * @param {object|string} data - Data to check (can be raw JSON string or parsed object)
     * @returns {boolean} True if encrypted
     */
    function isEncrypted(data) {
        // Handle string input (raw file content)
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return false;  // Not valid JSON, so not encrypted
            }
        }

        if (!data || typeof data !== 'object') return false;
        return data.encrypted === true &&
            typeof data.salt === 'string' &&
            typeof data.iv === 'string' &&
            typeof data.data === 'string';
    }

    // Public API
    return {
        encrypt,
        decrypt,
        isEncrypted
    };
})();
