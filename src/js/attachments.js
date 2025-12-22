/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - ATTACHMENTS MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Handles file attachment validation, ID generation, and utility functions
 * for transaction attachments (images, PDFs, documents).
 * 
 * KEY FEATURES:
 * - File type validation (images, PDF, DOCX, XLSX)
 * - Size limit enforcement (15 MB max)
 * - Attachment count limit (5 per transaction)
 * - File type icons and size formatting
 * 
 * DEPENDENCIES: None (pure utility module)
 * 
 * USED BY: app.js, gdrive.js, storage.js
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
 * - 2025-12-22: Initial creation with validation, ID generation, and utility functions
 */

const Attachments = (() => {
    // --- Constants ---

    /**
     * Maximum file size in bytes (15 MB)
     */
    const MAX_SIZE = 15 * 1024 * 1024;

    /**
     * Maximum attachments per transaction
     */
    const MAX_PER_TRANSACTION = 5;

    /**
     * Allowed MIME types for attachments
     * Includes: images, PDF, Word documents, Excel spreadsheets
     */
    const ALLOWED_TYPES = {
        // Images
        'image/jpeg': { ext: '.jpg', icon: '🖼️', category: 'image' },
        'image/png': { ext: '.png', icon: '🖼️', category: 'image' },
        'image/gif': { ext: '.gif', icon: '🖼️', category: 'image' },
        'image/webp': { ext: '.webp', icon: '🖼️', category: 'image' },

        // PDF
        'application/pdf': { ext: '.pdf', icon: '📄', category: 'pdf' },

        // Word documents
        'application/msword': { ext: '.doc', icon: '📝', category: 'document' },
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', icon: '📝', category: 'document' },

        // Excel spreadsheets
        'application/vnd.ms-excel': { ext: '.xls', icon: '📊', category: 'spreadsheet' },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', icon: '📊', category: 'spreadsheet' }
    };

    /**
     * File extensions accepted by file input (for accept attribute)
     */
    const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx';

    // --- Validation Functions ---

    /**
     * Validate a file for attachment
     * Checks type, size, and returns validation result
     * @param {File} file - File object to validate
     * @param {number} currentCount - Current number of attachments on transaction
     * @returns {Object} { valid: boolean, error?: string }
     */
    function validateFile(file, currentCount = 0) {
        // Check attachment count limit
        if (currentCount >= MAX_PER_TRANSACTION) {
            return {
                valid: false,
                error: 'attachmentLimitReached'  // i18n key
            };
        }

        // Check file type
        if (!ALLOWED_TYPES[file.type]) {
            return {
                valid: false,
                error: 'attachmentInvalidType'
            };
        }

        // Check file size
        if (file.size > MAX_SIZE) {
            return {
                valid: false,
                error: 'attachmentTooLarge'
            };
        }

        return { valid: true };
    }

    /**
     * Validate multiple files for attachment
     * @param {FileList|Array} files - Files to validate
     * @param {number} currentCount - Current attachment count on transaction
     * @returns {Object} { validFiles: File[], errors: string[] }
     */
    function validateFiles(files, currentCount = 0) {
        const validFiles = [];
        const errors = [];
        let count = currentCount;

        for (const file of files) {
            const result = validateFile(file, count);
            if (result.valid) {
                validFiles.push(file);
                count++;
            } else {
                errors.push(result.error);
            }
        }

        // Deduplicate errors
        return {
            validFiles,
            errors: [...new Set(errors)]
        };
    }

    // --- ID Generation ---

    /**
     * Generate a unique attachment ID
     * Format: att_{transactionId}_{index}
     * @param {number} transactionId - Parent transaction ID
     * @param {number} index - Index of attachment (0-based)
     * @returns {string} Attachment ID
     */
    function generateId(transactionId, index) {
        return `att_${transactionId}_${index}`;
    }

    /**
     * Generate a local filename for attachment storage
     * Format: att_{transactionId}_{index}_{originalFilename}
     * @param {string} attachmentId - Attachment ID
     * @param {string} originalFilename - Original file name
     * @returns {string} Storage filename
     */
    function generateLocalFilename(attachmentId, originalFilename) {
        // Sanitize filename: remove special chars, keep extension
        const sanitized = originalFilename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 50);  // Limit length
        return `${attachmentId}_${sanitized}`;
    }

    // --- Utility Functions ---

    /**
     * Get icon for file type
     * @param {string} mimeType - MIME type of file
     * @returns {string} Emoji icon
     */
    function getIcon(mimeType) {
        const typeInfo = ALLOWED_TYPES[mimeType];
        return typeInfo ? typeInfo.icon : '📎';
    }

    /**
     * Get category for file type (image, pdf, document, spreadsheet)
     * @param {string} mimeType - MIME type of file
     * @returns {string} Category name
     */
    function getCategory(mimeType) {
        const typeInfo = ALLOWED_TYPES[mimeType];
        return typeInfo ? typeInfo.category : 'unknown';
    }

    /**
     * Check if file type supports inline preview
     * @param {string} mimeType - MIME type of file
     * @returns {boolean} True if previewable inline
     */
    function isPreviewable(mimeType) {
        const category = getCategory(mimeType);
        return category === 'image' || category === 'pdf';
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size (e.g., "2.5 MB")
     */
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    }

    /**
     * Create attachment metadata object
     * @param {File} file - File object
     * @param {number} transactionId - Parent transaction ID
     * @param {number} index - Attachment index
     * @returns {Object} Attachment metadata
     */
    function createMetadata(file, transactionId, index) {
        const id = generateId(transactionId, index);
        return {
            id: id,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            // These will be set after upload:
            driveFileId: null,      // For cloud storage
            localFilename: null     // For local storage
        };
    }

    /**
     * Get file extension from filename
     * @param {string} filename - File name
     * @returns {string} Extension with dot (e.g., ".pdf")
     */
    function getExtension(filename) {
        const idx = filename.lastIndexOf('.');
        return idx !== -1 ? filename.substring(idx).toLowerCase() : '';
    }

    // --- Public API ---

    return {
        // Constants (exposed for UI)
        MAX_SIZE,
        MAX_PER_TRANSACTION,
        ALLOWED_TYPES,
        ACCEPTED_EXTENSIONS,

        // Validation
        validateFile,
        validateFiles,

        // ID generation
        generateId,
        generateLocalFilename,

        // Utilities
        getIcon,
        getCategory,
        isPreviewable,
        formatSize,
        createMetadata,
        getExtension
    };
})();
