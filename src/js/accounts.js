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
     * Create a new checking account object
     * 2025-12-15: Added type field to differentiate from credit cards
     */
    function createAccount(name, currency = 'USD') {
        return {
            id: generateId(),
            type: 'checking',
            name: name.trim(),
            currency: currency,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Create a new credit card account object
     * 2025-12-15: Added for credit card support with limit and billing dates
     * @param {string} name - Account name
     * @param {string} currency - Currency code (USD, MXN)
     * @param {number} creditLimit - Total credit limit
     * @param {number} paymentDueDay - Day of month payment is due (1-31)
     * @param {number} statementCloseDay - Day of month statement closes (1-31)
     */
    function createCreditCardAccount(name, currency, creditLimit, paymentDueDay, statementCloseDay) {
        return {
            id: generateId(),
            type: 'credit',
            name: name.trim(),
            currency: currency,
            creditLimit: parseFloat(creditLimit) || 0,
            paymentDueDay: parseInt(paymentDueDay) || 1,
            statementCloseDay: parseInt(statementCloseDay) || 1,
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
     * Format amount with currency symbol and thousand separators
     * 2025-12-14: Removed suffix - currency code displayed separately below balance
     * 2025-12-15: Added thousand separators using toLocaleString
     */
    function formatCurrency(amount, currencyCode) {
        const currency = getCurrency(currencyCode);
        const absAmount = Math.abs(amount);
        // Format with thousand separators and 2 decimal places
        const formatted = absAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `${currency.symbol}${formatted}`;
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
     * Calculate available credit for a credit card account
     * 2025-12-15: Added for credit card support
     * For credit cards: balance is negative (amount owed)
     * Available = creditLimit - |balance|
     */
    function calculateAvailableCredit(account, transactions) {
        if (account.type !== 'credit') return 0;
        const balance = calculateBalance(transactions, account.id);
        // Balance is negative (expenses), so we use Math.abs
        return account.creditLimit - Math.abs(balance);
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
        createCreditCardAccount,
        createDefaultAccount,
        getAvailableCurrencies,
        getCurrency,
        formatCurrency,
        calculateBalance,
        calculateAvailableCredit,
        getAccountTransactions,
        migrateData,
        createEmptyData
    };
})();
