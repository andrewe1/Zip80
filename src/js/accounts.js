/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - ACCOUNTS MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Handles account management and currency formatting for a multi-account
 * expense tracking system. Supports multiple checking accounts with 
 * different currencies (USD, MXN).
 * 
 * KEY FEATURES:
 * - Currency definitions with symbols and formatting (USD: $, MXN: $MXN)
 * - Account CRUD operations (create, read, update, delete)
 * - Balance calculation per account
 * - Data migration from v1 (simple array) to v2 (accounts structure)
 * 
 * DATA MODEL:
 * v2 format: { version: 2, accounts: [...], transactions: [...] }
 * Each account: { id, name, currency, createdAt }
 * Each transaction: { id, accountId, desc, amt, date }
 * 
 * DEPENDENCIES: None (standalone module)
 * USED BY: app.js, storage.js
 * 
 * ============================================================================
 * LLM LEGEND - IMPORTANT FOR FUTURE AI ASSISTANTS:
 * All future edits to this file MUST be commented with:
 * 1. Date of change
 * 2. Description of what was changed and why
 * 3. Any new functions should have JSDoc-style comments
 * This ensures human developers and future LLMs can understand the codebase.
 * ============================================================================
 * 
 * CHANGE LOG:
 * - 2025-12-14: Initial creation with USD/MXN currency support
 * - 2025-12-14: Added data migration from v1 to v2 format
 * - 2025-12-14: Added balance calculation and account CRUD
 */

const Accounts = (() => {
    // Currency definitions
    const CURRENCIES = {
        USD: {
            code: 'USD',
            symbol: '$',
            name: 'US Dollar',
            locale: 'en-US'
        },
        MXN: {
            code: 'MXN',
            symbol: '$',
            name: 'Mexican Peso',
            locale: 'es-MX',
            suffix: ' MXN'
        }
    };

    /**
     * Generate a unique account ID
     */
    function generateId() {
        return 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create a new account object
     */
    function createAccount(name, currency = 'USD') {
        return {
            id: generateId(),
            name: name.trim(),
            currency: currency,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Create default account for new files or migration
     */
    function createDefaultAccount() {
        return createAccount('Main Account', 'USD');
    }

    /**
     * Get available currencies
     */
    function getAvailableCurrencies() {
        return Object.values(CURRENCIES);
    }

    /**
     * Get currency info by code
     */
    function getCurrency(code) {
        return CURRENCIES[code] || CURRENCIES.USD;
    }

    /**
     * Format amount with currency symbol
     */
    function formatCurrency(amount, currencyCode) {
        const currency = getCurrency(currencyCode);
        const absAmount = Math.abs(amount).toFixed(2);

        if (currency.suffix) {
            return `${currency.symbol}${absAmount}${currency.suffix}`;
        }
        return `${currency.symbol}${absAmount}`;
    }

    /**
     * Calculate balance for a specific account
     */
    function calculateBalance(transactions, accountId) {
        return transactions
            .filter(t => t.accountId === accountId)
            .reduce((sum, t) => sum + t.amt, 0);
    }

    /**
     * Get transactions for a specific account
     */
    function getAccountTransactions(transactions, accountId) {
        return transactions.filter(t => t.accountId === accountId);
    }

    /**
     * Migrate v1 data (array of transactions) to v2 format (with accounts)
     */
    function migrateData(data) {
        // Already v2 format
        if (data && data.version === 2) {
            return data;
        }

        // v1 format: array of transactions
        if (Array.isArray(data)) {
            const defaultAccount = createDefaultAccount();

            // Assign all existing transactions to the default account
            const migratedTransactions = data.map(t => ({
                ...t,
                accountId: defaultAccount.id
            }));

            return {
                version: 2,
                accounts: [defaultAccount],
                transactions: migratedTransactions
            };
        }

        // Empty or invalid data - create fresh structure
        const defaultAccount = createDefaultAccount();
        return {
            version: 2,
            accounts: [defaultAccount],
            transactions: []
        };
    }

    /**
     * Create empty data structure for new files
     */
    function createEmptyData() {
        const defaultAccount = createDefaultAccount();
        return {
            version: 2,
            accounts: [defaultAccount],
            transactions: []
        };
    }

    // Public API
    return {
        CURRENCIES,
        generateId,
        createAccount,
        createDefaultAccount,
        getAvailableCurrencies,
        getCurrency,
        formatCurrency,
        calculateBalance,
        getAccountTransactions,
        migrateData,
        createEmptyData
    };
})();
