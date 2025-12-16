/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - INTERNATIONALIZATION (i18n) MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Manages multi-language support for the application. Currently supports
 * English (en) and Spanish (es) with easy extensibility for more languages.
 * 
 * KEY FEATURES:
 * - Translation dictionaries for all UI strings
 * - Browser language auto-detection on first visit
 * - Language preference persistence via localStorage
 * - Template interpolation for dynamic strings (${variable} syntax)
 * - Real-time UI updates when switching languages
 * 
 * TRANSLATION KEYS ORGANIZED BY:
 * - App title and startup screen
 * - Buttons (open, save, add income/expense, etc.)
 * - Form labels and placeholders
 * - Toast messages (success/error)
 * - Account management
 * - Edit balance modal
 * 
 * HOW TO ADD A NEW LANGUAGE:
 * 1. Add a new object to translations (e.g., 'fr': { ... })
 * 2. Copy all keys from 'en' and translate values
 * 3. The language will auto-appear in the dropdown
 * 
 * DEPENDENCIES: None (standalone module, loads first)
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
 *    - When adding new UI strings, add translations to ALL languages.
 * 
 * 3. CONTEXT PRESERVATION:
 *    - Do not remove this Legend.
 *    - Do not remove legacy comments unless explicitly instructed.
 * ==============================================================================
 * 
 * CHANGE LOG:
 * - 2025-12-14: Initial creation with English/Spanish support
 * - 2025-12-14: Added account management translations
 * - 2025-12-14: Added edit balance modal translations
 * - 2025-12-14: Added adjustment reason field translations
 * - 2025-12-15: Added balance overview widget translations (balanceOverview, totals, amountOwed)
 * - 2025-12-15: Added vault creation modal translations (vaultModalTitle, vaultLanguage, etc.)
 * - 2025-12-15: Changed vault modal to use vaultName instead of vaultAccountName
 * - 2025-12-15: Added LANGUAGES config, LANGUAGE_CURRENCY_MAP, and extensibility helpers
 * - 2025-12-15: Added cash account type translations
 * - 2025-12-15: Added account edit modal translations (accountEditModalTitle, accountEditModalDesc, toastAccountUpdated)
 * - 2025-12-15: Added custom confirm modal translations (confirm, confirmTitle)
 * - 2025-12-15: Added adjustAmount translation, renamed editCreditSettings to 'Edit Account'/'Editar Cuenta'
 */

const I18n = (() => {
    const STORAGE_KEY = 'zip80_language';

    // Default language
    let currentLang = 'en';

    /**
     * =========================================================================
     * LANGUAGE CONFIGURATION
     * =========================================================================
     * To add a new language:
     * 1. Add entry to LANGUAGES object below with code, name, locale, direction
     * 2. Add entry to LANGUAGE_CURRENCY_MAP with default currency for that language
     * 3. Add translation dictionary to 'translations' object with all keys
     * =========================================================================
     */
    const LANGUAGES = {
        en: {
            code: 'en',
            name: 'English',
            locale: 'en-US',
            direction: 'ltr'  // left-to-right (for future RTL support)
        },
        es: {
            code: 'es',
            name: 'Español',
            locale: 'es-MX',
            direction: 'ltr'
        }
        // To add more languages:
        // fr: { code: 'fr', name: 'Français', locale: 'fr-FR', direction: 'ltr' },
        // ar: { code: 'ar', name: 'العربية', locale: 'ar-SA', direction: 'rtl' }
    };

    /**
     * Default currency for each language
     * Used when creating new vaults or accounts
     */
    const LANGUAGE_CURRENCY_MAP = {
        en: 'USD',
        es: 'MXN'
        // fr: 'EUR',
        // ar: 'SAR'
    };

    // Translation dictionaries
    const translations = {
        en: {
            // App title
            appTitle: '💸 Zip80',
            appSubtitle: 'Your simple expense tracker.',
            appSubtitleDrag: 'Open a file or drag it here to begin.',

            // Startup buttons
            btnOpen: 'Open File',
            btnNew: 'New Data File',
            btnReopen: "Re-open '${filename}'",
            btnReopenBase: 'Re-open last file',

            // Header
            fileBadge: '📄 ${filename}',
            btnSave: '💾 Save',
            btnCloseVault: '🚪 Close',

            // Balance
            balanceLabel: 'Current Balance',

            // Form
            addTransactionTitle: 'Add Transaction',
            inputDescPlaceholder: 'Description (e.g. Rent, Groceries)',
            inputAmountPlaceholder: 'Amount (0.00)',
            btnIncome: '➕ Add Income',
            btnExpense: '➖ Add Expense',

            // History
            historyTitle: 'History',
            btnExport: '📥 Export JSON',
            emptyState: 'No transactions yet. Add one above!',

            // Toast messages
            toastSaved: '✅ Saved!',
            toastNewFile: '✨ New file created!',
            toastExported: '📥 Export downloaded!',
            toastErrorOpen: 'Could not open file',
            toastErrorCreate: 'Could not create file',
            toastErrorReopen: 'Could not reopen file. It may have moved.',
            toastErrorRead: 'Error reading file',
            toastErrorSave: 'Could not save. Try using Open File button.',
            toastErrorDrop: 'Could not open dropped file',
            toastErrorDesc: 'Please enter a description',
            toastErrorAmount: 'Please enter a valid amount',

            // Dialogs
            confirmDelete: 'Delete this transaction?',
            confirmCloseVault: 'Close this vault? Make sure you\'ve saved your changes.',

            // Buttons
            btnCalendarTitle: 'Add to Calendar',
            btnDeleteTitle: 'Delete',

            // Language switcher
            languageLabel: 'Language',

            // Accounts
            accountsTitle: 'Accounts',
            newAccount: '+ New Account',
            accountName: 'Account Name',
            accountNamePlaceholder: 'e.g. Checking, Savings',
            currency: 'Currency',
            createAccount: 'Create Account',
            cancel: 'Cancel',
            deleteAccount: 'Delete Account',
            confirmDeleteAccount: 'Delete this account and all its transactions?',
            currencyUSD: 'USD - US Dollar',
            currencyMXN: 'MXN - Mexican Peso',
            noAccounts: 'No accounts yet',
            toastAccountCreated: '✅ Account created!',
            toastAccountDeleted: 'Account deleted',
            toastErrorAccountName: 'Please enter an account name',

            // Edit Balance
            editBalance: 'Edit Balance',
            editBalanceDesc: 'Set the new balance. An adjustment transaction will be created.',
            newBalance: 'New Balance',
            applyBalance: 'Apply',
            balanceAdjustment: 'Balance Adjustment',
            adjustmentReason: 'Reason for Adjustment',
            adjustmentReasonPlaceholder: 'e.g. Bank reconciliation, Error correction',
            toastBalanceUpdated: '✅ Balance updated!',

            // Credit Card Accounts (2025-12-15)
            accountType: 'Account Type',
            accountTypeChecking: 'Checking Account',
            accountTypeCash: 'Cash',
            accountTypeCreditCard: 'Credit Card',
            creditLimit: 'Credit Limit',
            creditLimitPlaceholder: 'e.g. 5000',
            paymentDueDay: 'Payment Due Day',
            statementCloseDay: 'Statement Close Day',
            availableCredit: 'Available Credit',
            currentBalance: 'Current Balance',
            dueDay: 'Due',
            closesDay: 'Closes',

            // Balance Overview Widget (2025-12-15)
            balanceOverview: 'Balance Overview',
            totalPositive: 'Positive:',
            totalNegative: 'Negative:',
            totalNet: 'Net:',
            amountOwed: 'Owed',
            accountsBank: 'Bank/Cash',
            accountsCredit: 'Credit Cards',

            // Credit Card Edit Modal (2025-12-15)
            editCreditSettings: 'Edit Account',
            adjustAmount: 'Adjust Amount',
            creditModalTitle: '⚙️ Credit Card Settings',
            creditModalDesc: 'Edit your credit card account settings.',
            saveChanges: 'Save Changes',
            toastCreditUpdated: '✅ Credit card settings updated!',

            // New Vault Modal (2025-12-15)
            vaultModalTitle: '✨ Create New Vault',
            vaultModalDesc: 'Set your preferences for this expense tracker.',
            vaultLanguage: 'Default Language',
            vaultCurrency: 'Default Currency',
            vaultName: 'Vault Name',
            vaultNamePlaceholder: 'e.g. Personal, Business, Savings',
            createVault: 'Create Vault',

            // Account Edit Modal (2025-12-15)
            accountEditModalTitle: '⚙️ Account Settings',
            accountEditModalDesc: 'Edit your account settings.',
            toastAccountUpdated: '✅ Account updated!',

            // Custom Confirm Modal (2025-12-15)
            confirm: 'Confirm',
            confirmTitle: '⚠️ Confirm'
        },

        es: {
            // App title
            appTitle: '💸 Zip80',
            appSubtitle: 'Tu rastreador de gastos simple.',
            appSubtitleDrag: 'Abre un archivo o arrástralo aquí para comenzar.',

            // Startup buttons
            btnOpen: 'Abrir Archivo',
            btnNew: 'Nuevo Archivo',
            btnReopen: "Reabrir '${filename}'",
            btnReopenBase: 'Reabrir último archivo',

            // Header
            fileBadge: '📄 ${filename}',
            btnSave: '💾 Guardar',
            btnCloseVault: '🚪 Cerrar',

            // Balance
            balanceLabel: 'Saldo Actual',

            // Form
            addTransactionTitle: 'Agregar Transacción',
            inputDescPlaceholder: 'Descripción (ej. Renta, Comida)',
            inputAmountPlaceholder: 'Monto (0.00)',
            btnIncome: '➕ Agregar Ingreso',
            btnExpense: '➖ Agregar Gasto',

            // History
            historyTitle: 'Historial',
            btnExport: '📥 Exportar JSON',
            emptyState: '¡No hay transacciones aún. Agrega una arriba!',

            // Toast messages
            toastSaved: '✅ ¡Guardado!',
            toastNewFile: '✨ ¡Archivo creado!',
            toastExported: '📥 ¡Exportación descargada!',
            toastErrorOpen: 'No se pudo abrir el archivo',
            toastErrorCreate: 'No se pudo crear el archivo',
            toastErrorReopen: 'No se pudo reabrir. El archivo pudo haberse movido.',
            toastErrorRead: 'Error al leer archivo',
            toastErrorSave: 'No se pudo guardar. Intenta usar el botón Abrir.',
            toastErrorDrop: 'No se pudo abrir el archivo arrastrado',
            toastErrorDesc: 'Por favor ingresa una descripción',
            toastErrorAmount: 'Por favor ingresa un monto válido',

            // Dialogs
            confirmDelete: '¿Eliminar esta transacción?',
            confirmCloseVault: '¿Cerrar esta bóveda? Asegúrate de haber guardado tus cambios.',

            // Buttons
            btnCalendarTitle: 'Agregar al Calendario',
            btnDeleteTitle: 'Eliminar',

            // Language switcher
            languageLabel: 'Idioma',

            // Accounts
            accountsTitle: 'Cuentas',
            newAccount: '+ Nueva Cuenta',
            accountName: 'Nombre de Cuenta',
            accountNamePlaceholder: 'ej. Cheques, Ahorros',
            currency: 'Moneda',
            createAccount: 'Crear Cuenta',
            cancel: 'Cancelar',
            deleteAccount: 'Eliminar Cuenta',
            confirmDeleteAccount: '¿Eliminar esta cuenta y todas sus transacciones?',
            currencyUSD: 'USD - Dólar Americano',
            currencyMXN: 'MXN - Peso Mexicano',
            noAccounts: 'No hay cuentas aún',
            toastAccountCreated: '✅ ¡Cuenta creada!',
            toastAccountDeleted: 'Cuenta eliminada',
            toastErrorAccountName: 'Por favor ingresa un nombre de cuenta',

            // Edit Balance
            editBalance: 'Editar Saldo',
            editBalanceDesc: 'Establece el nuevo saldo. Se creará una transacción de ajuste.',
            newBalance: 'Nuevo Saldo',
            applyBalance: 'Aplicar',
            balanceAdjustment: 'Ajuste de Saldo',
            adjustmentReason: 'Razón del Ajuste',
            adjustmentReasonPlaceholder: 'ej. Conciliación bancaria, Corrección de error',
            toastBalanceUpdated: '✅ ¡Saldo actualizado!',

            // Credit Card Accounts (2025-12-15)
            accountType: 'Tipo de Cuenta',
            accountTypeChecking: 'Cuenta de Cheques',
            accountTypeCash: 'Efectivo',
            accountTypeCreditCard: 'Tarjeta de Crédito',
            creditLimit: 'Límite de Crédito',
            creditLimitPlaceholder: 'ej. 5000',
            paymentDueDay: 'Día de Pago',
            statementCloseDay: 'Día de Corte',
            availableCredit: 'Crédito Disponible',
            currentBalance: 'Saldo Actual',
            dueDay: 'Pago',
            closesDay: 'Corte',

            // Balance Overview Widget (2025-12-15)
            balanceOverview: 'Resumen de Saldos',
            totalPositive: 'Positivo:',
            totalNegative: 'Negativo:',
            totalNet: 'Neto:',
            amountOwed: 'Deuda',
            accountsBank: 'Banco/Efectivo',
            accountsCredit: 'Tarjetas',

            // Credit Card Edit Modal (2025-12-15)
            editCreditSettings: 'Editar Cuenta',
            adjustAmount: 'Ajustar Monto',
            creditModalTitle: '⚙️ Configuración de Tarjeta',
            creditModalDesc: 'Edita la configuración de tu tarjeta de crédito.',
            saveChanges: 'Guardar Cambios',
            toastCreditUpdated: '✅ ¡Configuración actualizada!',

            // New Vault Modal (2025-12-15)
            vaultModalTitle: '✨ Crear Nueva Bóveda',
            vaultModalDesc: 'Configura tus preferencias para este rastreador de gastos.',
            vaultLanguage: 'Idioma Predeterminado',
            vaultCurrency: 'Moneda Predeterminada',
            vaultName: 'Nombre de la Bóveda',
            vaultNamePlaceholder: 'ej. Personal, Negocio, Ahorros',
            createVault: 'Crear Bóveda',

            // Account Edit Modal (2025-12-15)
            accountEditModalTitle: '⚙️ Configuración de Cuenta',
            accountEditModalDesc: 'Edita la configuración de tu cuenta.',
            toastAccountUpdated: '✅ ¡Cuenta actualizada!',

            // Custom Confirm Modal (2025-12-15)
            confirm: 'Confirmar',
            confirmTitle: '⚠️ Confirmar'
        }
    };

    /**
     * Initialize the i18n module
     */
    function init() {
        // Try to load saved language preference
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && translations[saved]) {
            currentLang = saved;
        } else {
            // Detect browser language
            const browserLang = navigator.language.split('-')[0];
            if (translations[browserLang]) {
                currentLang = browserLang;
            }
        }
    }

    /**
     * Get a translated string
     * @param {string} key - Translation key
     * @param {object} params - Optional parameters for interpolation
     */
    function t(key, params = {}) {
        const dict = translations[currentLang] || translations.en;
        let text = dict[key] || translations.en[key] || key;

        // Simple template interpolation: ${varname}
        Object.keys(params).forEach(param => {
            text = text.replace(`\${${param}}`, params[param]);
        });

        return text;
    }

    /**
     * Set the current language
     * @param {string} lang - Language code ('en' or 'es')
     */
    function setLanguage(lang) {
        if (translations[lang]) {
            currentLang = lang;
            localStorage.setItem(STORAGE_KEY, lang);
            return true;
        }
        return false;
    }

    /**
     * Get the current language
     */
    function getLanguage() {
        return currentLang;
    }

    /**
     * Get language info by code
     * @param {string} code - Language code (e.g., 'en', 'es')
     * @returns {object} Language metadata or default (en)
     */
    function getLanguageInfo(code) {
        return LANGUAGES[code] || LANGUAGES.en;
    }

    /**
     * Get available languages from config
     * @returns {Array} Array of language objects with code and name
     */
    function getAvailableLanguages() {
        return Object.values(LANGUAGES).map(lang => ({
            code: lang.code,
            name: lang.name
        }));
    }

    /**
     * Get the default currency for a language
     * @param {string} langCode - Language code
     * @returns {string} Currency code (defaults to USD)
     */
    function getDefaultCurrency(langCode) {
        return LANGUAGE_CURRENCY_MAP[langCode] || 'USD';
    }

    /**
     * Get the current locale (e.g., 'en-US', 'es-MX')
     * Useful for date/number formatting
     */
    function getLocale() {
        const lang = LANGUAGES[currentLang];
        return lang ? lang.locale : 'en-US';
    }

    // Initialize on load
    init();

    // Public API
    return {
        // Config objects (for extension reference)
        LANGUAGES,
        LANGUAGE_CURRENCY_MAP,

        // Core functions
        t,
        setLanguage,
        getLanguage,
        getLanguageInfo,
        getAvailableLanguages,
        getDefaultCurrency,
        getLocale
    };
})();
