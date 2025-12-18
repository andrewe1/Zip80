/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - MAIN APPLICATION
 * ============================================================================
 * 
 * PURPOSE:
 * Core application logic for the Zip80 expense tracker. Orchestrates all
 * modules (i18n, accounts, storage, calendar) and handles user interactions.
 * 
 * KEY FEATURES:
 * - Multi-account expense tracking with account switching
 * - Internationalization (English/Spanish) with real-time language switching
 * - Autosave on all operations (add/delete transactions, account changes)
 * - File System Access API integration for local file storage
 * - Drag-and-drop file loading
 * - Balance editing with adjustment transactions
 * - Toast notifications for user feedback
 * - Google Calendar integration for expense reminders
 * 
 * STATE MANAGEMENT:
 * - fileHandle: Current file handle from File System Access API
 * - data: { version, accounts, transactions } - main data structure
 * - currentAccountId: Active account for viewing/editing
 * 
 * DEPENDENCIES: I18n, Accounts, Storage, Calendar modules
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
 * - 2025-12-14: Initial creation with basic expense tracking
 * - 2025-12-14: Added i18n integration for English/Spanish
 * - 2025-12-14: Added multi-account support with account tabs
 * - 2025-12-14: Added edit balance feature with adjustment transactions
 * - 2025-12-14: Added "reason for adjustment" field to balance editing
 * - 2025-12-15: Added balance overview sidebar widget with renderBalanceOverview()
 * - 2025-12-15: Added calendar widget integration via Calendar.renderCalendarWidget()
 * - 2025-12-15: Added vault creation modal with language/currency defaults
 * - 2025-12-15: Added dark/light theme toggle with setupTheme()
 * - 2025-12-15: Added currency default based on language, vault name as filename
 * - 2025-12-15: Added CC edit modal, account type icons, toast dark mode fix
 * - 2025-12-15: Refactored to use I18n.getDefaultCurrency() for extensibility
 * - 2025-12-15: Added cash account type support
 * - 2025-12-15: Updated resume button and workspace handling for Electron compatibility
 * - 2025-12-15: Added comma formatting for number inputs (setupCommaFormatting, formatWithCommas, parseFormattedNumber)
 * - 2025-12-15: Added account edit modal for checking/cash accounts (name and currency editing)
 * - 2025-12-15: Replaced native confirm() dialogs with custom styled showConfirm() modal
 * - 2025-12-15: UI improvements: account tabs wrap instead of scroll, wider sidebar, adjusted button labels
 * - 2025-12-15: Restructured balance overview into two separate Bank/Cash and Credit Cards widgets
 * - 2025-12-16: Added Google Drive integration with setupGoogleDrive() and related handlers
 * - 2025-12-16: Added storageBackend state for local/gdrive switching
 * - 2025-12-16: Updated handleSave() to support both local and cloud backends
 * - 2025-12-16: Added handleGoogleAuthChange(), handleOpenCloudVault(), handleNewCloudVault()
 * - 2025-12-16: Added createCloudVault(), loadCloudVault(), renderVaultPicker()
 * - 2025-12-16: Updated showWorkspace() to show cloud badge for Drive vaults
 * - 2025-12-17: Added Menu Bar and Undo/Redo button translations to updateUILanguage()
 * - 2025-12-17: Replaced account type dropdown with stylized icon buttons and updated modal logic
 * - 2025-12-17: Added Activity Log widget with user attribution for shared vaults
 * - 2025-12-17: Added getCurrentUserInfo(), renderActivityLog(), formatRelativeTime() for activity tracking
 * - 2025-12-17: Transaction creation now includes createdBy field for user attribution
 * - 2025-12-17: Added vaultOwnerEmail tracking when loading cloud vaults for "(owner)" badge
 */

(() => {
    // State
    let fileHandle = null;
    let data = { version: 2, accounts: [], transactions: [] };
    let currentAccountId = null;

    // 2025-12-16: Google Drive state
    let storageBackend = 'local';  // 'local' or 'gdrive'
    let gdriveFileId = null;       // Current cloud vault file ID

    // 2025-12-17: Encryption state
    let vaultPassword = null;      // Current vault password (memory only, never persisted)
    let isVaultEncrypted = false;  // Whether current vault is encrypted
    let vaultHint = null;          // Current vault's password hint
    let failedAttempts = 0;        // Track failed unlock attempts

    // 2025-12-17: Activity Log state - track vault owner for attribution
    let vaultOwnerEmail = null;    // Email of the vault owner (for showing "owner" badge)

    // DOM Elements
    const elements = {
        // Theme & Language (2025-12-15)
        themeToggle: document.getElementById('theme-toggle'),
        langSelect: document.getElementById('lang-select'),

        // Startup
        startupScreen: document.getElementById('startup-screen'),
        appTitle: document.getElementById('app-title'),
        appSubtitle: document.getElementById('app-subtitle'),
        btnOpen: document.getElementById('btn-open'),
        btnNew: document.getElementById('btn-new'),
        btnResume: document.getElementById('btn-resume'),

        // Workspace
        workspace: document.getElementById('app-workspace'),
        fileBadge: document.getElementById('file-badge'),
        headerTitle: document.getElementById('header-title'),
        btnCloseVault: document.getElementById('btn-close-vault'),
        saveStatus: document.getElementById('save-status'),  // 2025-12-17: Replaced btnSave with status indicator

        // Accounts
        accountsTitle: document.getElementById('accounts-title'),
        btnNewAccount: document.getElementById('btn-new-account'),
        accountTabs: document.getElementById('account-tabs'),

        // Balance
        balanceLabel: document.getElementById('balance-label'),
        balanceDisplay: document.getElementById('balance-display'),
        accountCurrency: document.getElementById('account-currency'),
        btnEditBalance: document.getElementById('btn-edit-balance'),

        // Credit Card Balance Info (2025-12-15)
        creditCardInfo: document.getElementById('credit-card-info'),
        creditAvailableLabel: document.getElementById('credit-available-label'),
        creditAvailableValue: document.getElementById('credit-available-value'),
        creditLimitLabel: document.getElementById('credit-limit-label'),
        creditLimitValue: document.getElementById('credit-limit-value'),
        creditDatesLabel: document.getElementById('credit-dates-label'),
        creditDatesValue: document.getElementById('credit-dates-value'),

        // Account Settings Info (2025-12-15: for checking/cash accounts)
        accountSettingsInfo: document.getElementById('account-settings-info'),
        btnEditAccountSettings: document.getElementById('btn-edit-account-settings'),

        // 2025-12-16: Crypto account info (for crypto accounts)
        cryptoAccountInfo: document.getElementById('crypto-account-info'),
        cryptoBalanceValue: document.getElementById('crypto-balance-value'),

        // Form
        addTransactionTitle: document.getElementById('add-transaction-title'),
        inputDesc: document.getElementById('input-desc'),
        inputAmount: document.getElementById('input-amount'),
        btnModeExpense: document.getElementById('btn-mode-expense'),
        btnModeIncome: document.getElementById('btn-mode-income'),
        categoryIcons: document.getElementById('category-icons'),
        btnAddTransaction: document.getElementById('btn-add-transaction'),

        // Recurring (2025-12-15)
        recurringToggleRow: document.getElementById('recurring-toggle-row'),
        checkboxRecurring: document.getElementById('checkbox-recurring'),
        recurringFrequencyRow: document.getElementById('recurring-frequency-row'),
        inputRecurringMonths: document.getElementById('input-recurring-months'),
        recurringWidgetTitle: document.getElementById('recurring-widget-title'),
        recurringList: document.getElementById('recurring-list'),
        recurringEmpty: document.getElementById('recurring-empty'),
        recurringTotal: document.getElementById('recurring-total'),  // 2025-12-16

        // Exchange Rate Widget (2025-12-16)
        exchangeWidgetTitle: document.getElementById('exchange-widget-title'),
        rateUsdMxn: document.getElementById('rate-usd-mxn'),
        rateMxnUsd: document.getElementById('rate-mxn-usd'),
        exchangeUpdated: document.getElementById('exchange-updated'),

        // Calendar Widget (2025-12-16)
        calendarWidgetTitle: document.getElementById('calendar-widget-title'),

        // History
        historyTitle: document.getElementById('history-title'),
        historyList: document.getElementById('history-list'),
        emptyState: document.getElementById('empty-state'),
        btnExport: document.getElementById('btn-export'),

        // Account Modal
        accountModal: document.getElementById('account-modal'),
        modalTitle: document.getElementById('modal-title'),
        selectAccountType: document.getElementById('select-account-type'),
        accountTypeGrid: document.getElementById('account-type-grid'), // 2025-12-17: New button grid
        labelAccountType: document.getElementById('label-account-type'),
        labelAccountName: document.getElementById('label-account-name'),
        inputAccountName: document.getElementById('input-account-name'),
        labelCurrency: document.getElementById('label-currency'),
        selectCurrency: document.getElementById('select-currency'),

        // Credit Card Modal Fields (2025-12-15)
        creditCardFields: document.getElementById('credit-card-fields'),
        labelCreditLimit: document.getElementById('label-credit-limit'),
        inputCreditLimit: document.getElementById('input-credit-limit'),
        labelPaymentDueDay: document.getElementById('label-payment-due-day'),
        selectPaymentDueDay: document.getElementById('select-payment-due-day'),
        labelStatementCloseDay: document.getElementById('label-statement-close-day'),
        selectStatementCloseDay: document.getElementById('select-statement-close-day'),

        btnCancelAccount: document.getElementById('btn-cancel-account'),
        btnCreateAccount: document.getElementById('btn-create-account'),

        // Balance Modal
        balanceModal: document.getElementById('balance-modal'),
        balanceModalTitle: document.getElementById('balance-modal-title'),
        balanceModalDesc: document.getElementById('balance-modal-desc'),
        labelNewBalance: document.getElementById('label-new-balance'),
        inputNewBalance: document.getElementById('input-new-balance'),
        labelAdjustmentReason: document.getElementById('label-adjustment-reason'),
        inputAdjustmentReason: document.getElementById('input-adjustment-reason'),
        btnCancelBalance: document.getElementById('btn-cancel-balance'),
        btnApplyBalance: document.getElementById('btn-apply-balance'),

        // Toast
        toast: document.getElementById('toast'),

        // Balance Widgets (2025-12-15: Two separate widgets for Bank/Cash and Credit Cards)
        // 2025-12-16: Added crypto widget
        bankWidgetTitle: document.getElementById('bank-widget-title'),
        bankAccountsList: document.getElementById('bank-accounts-list'),
        creditWidgetTitle: document.getElementById('credit-widget-title'),
        creditAccountsList: document.getElementById('credit-accounts-list'),
        cryptoWidgetCard: document.getElementById('crypto-widget-card'),
        cryptoWidgetTitle: document.getElementById('crypto-widget-title'),
        cryptoAccountsList: document.getElementById('crypto-accounts-list'),

        // Vault Modal (2025-12-15)
        vaultModal: document.getElementById('vault-modal'),
        vaultModalTitle: document.getElementById('vault-modal-title'),
        vaultModalDesc: document.getElementById('vault-modal-desc'),
        labelVaultLanguage: document.getElementById('label-vault-language'),
        selectVaultLanguage: document.getElementById('select-vault-language'),
        labelVaultCurrency: document.getElementById('label-vault-currency'),
        selectVaultCurrency: document.getElementById('select-vault-currency'),
        labelVaultName: document.getElementById('label-vault-name'),
        inputVaultName: document.getElementById('input-vault-name'),
        btnCancelVault: document.getElementById('btn-cancel-vault'),
        btnCreateVault: document.getElementById('btn-create-vault'),

        // Credit Card Edit Modal (2025-12-15)
        btnEditCredit: document.getElementById('btn-edit-credit'),
        creditModal: document.getElementById('credit-modal'),
        creditModalTitle: document.getElementById('credit-modal-title'),
        creditModalDesc: document.getElementById('credit-modal-desc'),
        labelEditCreditLimit: document.getElementById('label-edit-credit-limit'),
        inputEditCreditLimit: document.getElementById('input-edit-credit-limit'),
        labelEditPaymentDue: document.getElementById('label-edit-payment-due'),
        selectEditPaymentDue: document.getElementById('select-edit-payment-due'),
        labelEditStatementClose: document.getElementById('label-edit-statement-close'),
        selectEditStatementClose: document.getElementById('select-edit-statement-close'),
        btnCancelCredit: document.getElementById('btn-cancel-credit'),
        btnSaveCredit: document.getElementById('btn-save-credit'),

        // Account Edit Modal (2025-12-15: for checking/cash accounts)
        accountEditModal: document.getElementById('account-edit-modal'),
        accountEditModalTitle: document.getElementById('account-edit-modal-title'),
        accountEditModalDesc: document.getElementById('account-edit-modal-desc'),
        labelEditAccountName: document.getElementById('label-edit-account-name'),
        inputEditAccountName: document.getElementById('input-edit-account-name'),
        labelEditAccountCurrency: document.getElementById('label-edit-account-currency'),
        selectEditAccountCurrency: document.getElementById('select-edit-account-currency'),
        btnCancelAccountEdit: document.getElementById('btn-cancel-account-edit'),
        btnSaveAccountEdit: document.getElementById('btn-save-account-edit'),

        // Custom Confirm Modal (2025-12-15)
        confirmModal: document.getElementById('confirm-modal'),
        confirmModalTitle: document.getElementById('confirm-modal-title'),
        confirmModalMessage: document.getElementById('confirm-modal-message'),
        btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
        btnConfirmOk: document.getElementById('btn-confirm-ok'),

        // Google Drive (2025-12-16)
        btnGoogleSignIn: document.getElementById('btn-google-signin'),
        btnGoogleSignOut: document.getElementById('btn-google-signout'),
        googleUserSection: document.getElementById('google-user-section'),
        googleUserAvatar: document.getElementById('google-user-avatar'),
        googleUserName: document.getElementById('google-user-name'),
        btnGoogleOpen: document.getElementById('btn-google-open'),
        btnGoogleNew: document.getElementById('btn-google-new'),
        gdrivePickerModal: document.getElementById('gdrive-picker-modal'),
        gdrivePickerTitle: document.getElementById('gdrive-picker-title'),
        gdriveVaultList: document.getElementById('gdrive-vault-list'),
        btnGdriveCancel: document.getElementById('btn-gdrive-cancel'),
        linkGoogleReopen: document.getElementById('link-google-reopen'),
        googleReopenFilename: document.getElementById('google-reopen-filename'),

        // Encryption (2025-12-17)
        checkboxEncryptVault: document.getElementById('checkbox-encrypt-vault'),
        encryptionFields: document.getElementById('encryption-fields'),
        inputVaultPassword: document.getElementById('input-vault-password'),
        inputVaultConfirmPassword: document.getElementById('input-vault-confirm-password'),
        inputVaultHint: document.getElementById('input-vault-hint'),
        passwordModal: document.getElementById('password-modal'),
        inputUnlockPassword: document.getElementById('input-unlock-password'),
        btnCancelUnlock: document.getElementById('btn-cancel-unlock'),
        btnUnlockVault: document.getElementById('btn-unlock-vault'),
        passwordHintDisplay: document.getElementById('password-hint-display'),
        hintText: document.getElementById('hint-text'),

        // Change Password Modal (2025-12-17)
        btnChangePassword: document.getElementById('btn-change-password'),
        changePasswordModal: document.getElementById('change-password-modal'),
        inputCurrentPassword: document.getElementById('input-current-password'),
        inputNewPassword: document.getElementById('input-new-password'),
        inputConfirmNewPassword: document.getElementById('input-confirm-new-password'),
        inputNewHint: document.getElementById('input-new-hint'),
        btnCancelChangePassword: document.getElementById('btn-cancel-change-password'),
        btnConfirmChangePassword: document.getElementById('btn-confirm-change-password'),

        // Activity Log (2025-12-17)
        activityLogTitle: document.getElementById('activity-log-title'),
        activityLogList: document.getElementById('activity-log-list')
    };

    // --- Initialization ---

    async function init() {
        setupTheme();  // 2025-12-15: Theme toggle
        setupLanguage();
        setupEventListeners();
        setupDragAndDrop();
        setupCreditCardUI();  // 2025-12-15: Credit card setup
        setupAccountTypeSelector(); // 2025-12-17: Account type buttons
        setupCreditEditModal();  // 2025-12-15: Credit edit modal
        setupAccountEditModal();  // 2025-12-15: Account edit modal
        setupVaultLanguageSync();  // 2025-12-15: Vault language-currency sync
        setupCommaFormatting();  // 2025-12-15: Comma separators for number inputs
        setupGoogleDrive();  // 2025-12-16: Google Drive integration
        setupUndoRedo();  // 2025-12-17: Undo/Redo button handlers
        await checkForRecentFile();
        updateUILanguage();
        fetchExchangeRates();  // 2025-12-16: Load exchange rates
    }

    /**
     * Setup account type selection buttons
     * 2025-12-17: Handles click events on the new icon buttons
     */
    function setupAccountTypeSelector() {
        if (!elements.accountTypeGrid) return;

        elements.accountTypeGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.account-type-btn');
            if (!btn) return;

            // Visual update
            elements.accountTypeGrid.querySelectorAll('.account-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic update
            const newValue = btn.dataset.value;
            elements.selectAccountType.value = newValue;

            // Trigger change event for listeners (like credit card fields toggle)
            const event = new Event('change');
            elements.selectAccountType.dispatchEvent(event);
        });
    }

    /**
 * Setup credit card UI elements
 * 2025-12-15: Populates day dropdowns (1-31) for payment due and statement close
 * 2025-12-16: Added crypto currency switching logic
 */
    function setupCreditCardUI() {
        // Populate day dropdowns (1-31)
        for (let day = 1; day <= 31; day++) {
            const option1 = document.createElement('option');
            option1.value = day;
            option1.textContent = day;
            elements.selectPaymentDueDay.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = day;
            option2.textContent = day;
            elements.selectStatementCloseDay.appendChild(option2);
        }

        // Default: due day 15, statement close day 28
        elements.selectPaymentDueDay.value = '15';
        elements.selectStatementCloseDay.value = '28';

        // Toggle credit card fields and currency options based on account type
        elements.selectAccountType.addEventListener('change', () => {
            const accountType = elements.selectAccountType.value;
            const isCredit = accountType === 'credit';
            elements.creditCardFields.style.display = isCredit ? 'block' : 'none';

            // Update currency options based on account type
            updateCurrencyOptions();
        });
    }

    /**
     * Update currency dropdown based on selected account type
     * 2025-12-16: Shows crypto currencies for crypto accounts, fiat for others
     */
    function updateCurrencyOptions() {
        const t = I18n.t;
        const accountType = elements.selectAccountType.value;
        const isCrypto = accountType === 'crypto';

        if (isCrypto) {
            // Show crypto currencies
            elements.selectCurrency.innerHTML = `
            <option value="BTC">${t('currencyBTC')}</option>
            <option value="ETH">${t('currencyETH')}</option>
            <option value="SOL">${t('currencySOL')}</option>
        `;
        } else {
            // Show fiat currencies
            elements.selectCurrency.innerHTML = `
            <option value="USD">${t('currencyUSD')}</option>
            <option value="MXN">${t('currencyMXN')}</option>
        `;
        }
    }

    /**
     * Setup dark/light theme toggle
     * 2025-12-15: Loads saved preference or system preference, toggles on click
     */
    function setupTheme() {
        const THEME_KEY = 'zip80_theme';

        // Load saved theme or detect system preference
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // Auto-detect system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            }
        }

        // Toggle theme on click
        elements.themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        });
    }

    function setupLanguage() {
        elements.langSelect.value = I18n.getLanguage();
        elements.langSelect.addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
            updateUILanguage();
            render();
        });
    }

    function updateUILanguage() {
        const t = I18n.t;

        // Startup screen
        // 2025-12-17: Removed appTitle.textContent - now uses SVG logo instead of text
        elements.appSubtitle.innerHTML = `${t('appSubtitle')}<br>${t('appSubtitleDrag')}`;
        elements.btnOpen.querySelector('[data-i18n="btnOpen"]').textContent = t('btnOpen');
        elements.btnNew.querySelector('[data-i18n="btnNew"]').textContent = t('btnNew');

        // Header
        // 2025-12-17: Removed headerTitle.textContent - now uses SVG logo instead of text
        document.querySelector('.vault-label').textContent = t('vaultLabel');
        elements.btnCloseVault.querySelector('[data-i18n="btnCloseVault"]').textContent = t('btnCloseVault');

        // Accounts
        elements.accountsTitle.textContent = t('accountsTitle');
        elements.btnNewAccount.querySelector('[data-i18n="newAccount"]').textContent = t('newAccount');

        // Balance
        elements.balanceLabel.textContent = t('balanceLabel');

        // Form
        elements.addTransactionTitle.textContent = t('addTransactionTitle');
        elements.inputDesc.placeholder = t('inputDescPlaceholder');
        elements.inputAmount.placeholder = t('inputAmountPlaceholder');

        // Transaction mode buttons (2025-12-16)
        elements.btnModeExpense.querySelector('[data-i18n="modeExpense"]').textContent = t('modeExpense');
        elements.btnModeIncome.querySelector('[data-i18n="modeIncome"]').textContent = t('modeIncome');

        // Update add button based on current mode
        const currentMode = getCurrentMode();
        elements.btnAddTransaction.querySelector('span').textContent =
            currentMode === 'income' ? t('btnAddIncome') : t('btnAddExpense');

        // Recurring toggle (2025-12-15)
        elements.recurringToggleRow.querySelector('[data-i18n="recurringToggle"]').textContent = t('recurringToggle');
        elements.recurringFrequencyRow.querySelector('[data-i18n="recurringEvery"]').textContent = t('recurringEvery');
        elements.recurringFrequencyRow.querySelector('[data-i18n="recurringMonths"]').textContent = t('recurringMonths');
        elements.recurringEmpty.textContent = t('recurringEmpty');

        // Exchange Rate Widget (2025-12-16)
        if (elements.exchangeWidgetTitle) {
            elements.exchangeWidgetTitle.textContent = '💱 ' + t('exchangeWidgetTitle');
        }

        // Calendar Widget (2025-12-16)
        if (elements.calendarWidgetTitle) {
            elements.calendarWidgetTitle.textContent = '📅 ' + t('calendarWidgetTitle');
        }

        // History
        elements.historyTitle.textContent = t('historyTitle');
        elements.btnExport.querySelector('[data-i18n="btnExport"]').textContent = t('btnExport');
        elements.emptyState.textContent = t('emptyState');

        // Modal
        elements.modalTitle.textContent = t('newAccount');
        elements.labelAccountType.textContent = t('accountType');
        elements.labelAccountName.textContent = t('accountName');
        elements.inputAccountName.placeholder = t('accountNamePlaceholder');
        elements.labelCurrency.textContent = t('currency');
        elements.btnCancelAccount.querySelector('[data-i18n="cancel"]').textContent = t('cancel');
        elements.btnCreateAccount.querySelector('[data-i18n="createAccount"]').textContent = t('createAccount');

        // Account type options (2025-12-15, 2025-12-16: Added crypto) - 2025-12-17: Render as buttons
        const accountTypes = [
            { value: 'checking', icon: '🏦', label: t('accountTypeChecking') },
            { value: 'cash', icon: '💵', label: t('accountTypeCash') },
            { value: 'credit', icon: '💳', label: t('accountTypeCreditCard') },
            { value: 'crypto', icon: '🪙', label: t('accountTypeCrypto') }
        ];

        if (elements.accountTypeGrid) {
            elements.accountTypeGrid.innerHTML = '';
            const currentType = elements.selectAccountType.value || 'checking';

            accountTypes.forEach(type => {
                const btn = document.createElement('div');
                btn.className = `account-type-btn ${type.value === currentType ? 'active' : ''}`;
                btn.dataset.value = type.value;
                btn.innerHTML = `
                <div class="account-type-icon">${type.icon}</div>
                <div class="account-type-label">${type.label}</div>
            `;
                elements.accountTypeGrid.appendChild(btn);
            });
        }

        // Currency options (updated based on account type selection)
        updateCurrencyOptions();

        // Credit card modal labels (2025-12-15)
        elements.labelCreditLimit.textContent = t('creditLimit');
        elements.inputCreditLimit.placeholder = t('creditLimitPlaceholder');
        elements.labelPaymentDueDay.textContent = t('paymentDueDay');
        elements.labelStatementCloseDay.textContent = t('statementCloseDay');

        // Balance Modal
        elements.balanceModalTitle.textContent = t('editBalance');
        elements.balanceModalDesc.textContent = t('editBalanceDesc');
        elements.labelNewBalance.textContent = t('newBalance');
        elements.labelAdjustmentReason.textContent = t('adjustmentReason');
        elements.inputAdjustmentReason.placeholder = t('adjustmentReasonPlaceholder');
        elements.btnCancelBalance.querySelector('[data-i18n="cancel"]').textContent = t('cancel');
        elements.btnApplyBalance.querySelector('[data-i18n="applyBalance"]').textContent = t('applyBalance');


        // Resume button
        if (elements.btnResume.style.display !== 'none' && fileHandle) {
            // getFileName may be async in Electron
            Promise.resolve(Storage.getFileName(fileHandle)).then(name => {
                if (name) updateResumeButton(name);
            });
        }

        // 2025-12-16: Cloud storage section translations
        const cloudDivider = document.querySelector('[data-i18n="cloudDivider"]');
        if (cloudDivider) cloudDivider.textContent = t('cloudDivider');

        const btnGoogleSignIn = document.querySelector('[data-i18n="btnGoogleSignIn"]');
        if (btnGoogleSignIn) btnGoogleSignIn.textContent = t('btnGoogleSignIn');

        const btnGoogleSignOut = document.querySelector('[data-i18n="btnGoogleSignOut"]');
        if (btnGoogleSignOut) btnGoogleSignOut.textContent = t('btnGoogleSignOut');

        const btnOpenCloudVault = document.querySelector('[data-i18n="btnOpenCloudVault"]');
        if (btnOpenCloudVault) btnOpenCloudVault.textContent = t('btnOpenCloudVault');

        const btnNewCloudVault = document.querySelector('[data-i18n="btnNewCloudVault"]');
        if (btnNewCloudVault) btnNewCloudVault.textContent = t('btnNewCloudVault');

        // 2025-12-17: Menu Bar translations
        const menuBar = document.getElementById('menu-bar');
        if (menuBar) {
            const vaultLabel = menuBar.querySelector('.vault-label');
            if (vaultLabel) vaultLabel.textContent = t('vaultLabel');

            const viewModeLabel = menuBar.querySelector('.view-mode-label');
            if (viewModeLabel) viewModeLabel.textContent = t('viewMode');

            const btnStandard = document.getElementById('btn-view-standard');
            if (btnStandard) {
                btnStandard.title = t('viewStandard');
                const span = btnStandard.querySelector('[data-i18n="viewStandard"]');
                if (span) span.textContent = t('viewStandard');
            }

            const btnCompact = document.getElementById('btn-view-compact');
            if (btnCompact) {
                btnCompact.title = t('viewCompact');
                const span = btnCompact.querySelector('[data-i18n="viewCompact"]');
                if (span) span.textContent = t('viewCompact');
            }

            const btnOptions = document.getElementById('btn-options');
            if (btnOptions) {
                const span = btnOptions.querySelector('[data-i18n="options"]');
                if (span) span.textContent = t('options');
            }

            // Dropdown items
            const dropdown = document.getElementById('options-dropdown');
            if (dropdown) {
                const items = {
                    'exportCSV': 'export-csv',
                    'exportJSON': 'export-json',
                    'changePassword': 'change-password',
                    'settings': 'settings',
                    'about': 'about'
                };
                Object.entries(items).forEach(([key, action]) => {
                    const el = dropdown.querySelector(`[data-i18n="${key}"]`);
                    if (el) el.textContent = t(key);
                });
            }

            // Undo/Redo titles
            const btnUndo = document.getElementById('btn-undo');
            const btnRedo = document.getElementById('btn-redo');
            if (btnUndo) btnUndo.title = t('undoTitle');
            if (btnRedo) btnRedo.title = t('redoTitle');
        }

        document.documentElement.lang = I18n.getLanguage();
    }

    function updateResumeButton(filename) {
        if (filename) {
            elements.btnResume.textContent = I18n.t('btnReopen', { filename });
        } else {
            elements.btnResume.textContent = `↻ ${I18n.t('btnReopenBase')}`;
        }
    }

    async function checkForRecentFile() {
        try {
            const lastHandle = await Storage.getLastHandle();
            if (lastHandle) {
                elements.btnResume.style.display = 'block';
                updateResumeButton(lastHandle.name);
                return;
            }
        } catch (e) {
            console.log('IndexedDB handle not available:', e);
        }

        // Fallback: check localStorage for filename (works even when handle fails)
        const lastFilename = await Storage.getLastFileName();
        if (lastFilename) {
            elements.btnResume.style.display = 'block';
            updateResumeButton(lastFilename);
        }
    }

    // --- Event Listeners ---

    function setupEventListeners() {
        // Startup buttons
        elements.btnOpen.addEventListener('click', handleOpenFile);
        elements.btnNew.addEventListener('click', handleNewFile);
        elements.btnResume.addEventListener('click', handleReopen);

        // Workspace buttons
        elements.btnCloseVault.addEventListener('click', handleCloseVault);
        elements.btnAddTransaction.addEventListener('click', handleAddTransaction);
        elements.btnExport.addEventListener('click', handleExport);

        // Transaction mode buttons (2025-12-16)
        elements.btnModeExpense.addEventListener('click', () => setTransactionMode('expense'));
        elements.btnModeIncome.addEventListener('click', () => setTransactionMode('income'));

        // Category icon selection
        elements.categoryIcons.addEventListener('click', (e) => {
            const icon = e.target.closest('.category-icon');
            if (icon) {
                // Remove active from all, add to clicked
                elements.categoryIcons.querySelectorAll('.category-icon').forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
            }
        });

        // Recurring toggle (2025-12-15)
        elements.checkboxRecurring.addEventListener('change', (e) => {
            elements.recurringFrequencyRow.style.display = e.target.checked ? 'flex' : 'none';
        });

        // Account buttons
        elements.btnNewAccount.addEventListener('click', openAccountModal);
        elements.btnCancelAccount.addEventListener('click', closeAccountModal);
        elements.btnCreateAccount.addEventListener('click', handleCreateAccount);
        elements.accountModal.querySelector('.modal-backdrop').addEventListener('click', closeAccountModal);

        // Enter key on inputs
        elements.inputAmount.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddTransaction();
        });

        elements.inputAccountName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCreateAccount();
        });

        // Balance edit
        elements.btnEditBalance.addEventListener('click', openBalanceModal);
        elements.btnCancelBalance.addEventListener('click', closeBalanceModal);
        elements.btnApplyBalance.addEventListener('click', handleApplyBalance);
        elements.balanceModal.querySelector('.modal-backdrop').addEventListener('click', closeBalanceModal);

        elements.inputNewBalance.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleApplyBalance();
        });

        // Vault modal (2025-12-15)
        elements.btnCancelVault.addEventListener('click', closeVaultModal);
        elements.btnCreateVault.addEventListener('click', handleCreateVault);
        elements.vaultModal.querySelector('.modal-backdrop').addEventListener('click', closeVaultModal);

        elements.inputVaultName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCreateVault();
        });

        // 2025-12-17: Encryption checkbox toggle
        elements.checkboxEncryptVault.addEventListener('change', (e) => {
            elements.encryptionFields.style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) {
                elements.inputVaultPassword.focus();
            }
        });

        // 2025-12-17: Password modal for opening encrypted vaults
        elements.btnCancelUnlock.addEventListener('click', closePasswordModal);
        elements.btnUnlockVault.addEventListener('click', handleUnlockVault);
        elements.passwordModal.querySelector('.modal-backdrop').addEventListener('click', closePasswordModal);
        elements.inputUnlockPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleUnlockVault();
        });

        // 2025-12-17: Change password modal
        if (elements.btnChangePassword) {
            elements.btnChangePassword.addEventListener('click', openChangePasswordModal);
        }
        if (elements.btnCancelChangePassword) {
            elements.btnCancelChangePassword.addEventListener('click', closeChangePasswordModal);
        }
        if (elements.btnConfirmChangePassword) {
            elements.btnConfirmChangePassword.addEventListener('click', handleChangePassword);
        }
        if (elements.changePasswordModal) {
            elements.changePasswordModal.querySelector('.modal-backdrop').addEventListener('click', closeChangePasswordModal);
        }

        // Credit card edit modal (2025-12-15)
        elements.btnEditCredit.addEventListener('click', openCreditModal);
        elements.btnCancelCredit.addEventListener('click', closeCreditModal);
        elements.btnSaveCredit.addEventListener('click', handleSaveCredit);
        elements.creditModal.querySelector('.modal-backdrop').addEventListener('click', closeCreditModal);

        // Account settings edit button (2025-12-15: for checking/cash accounts)
        elements.btnEditAccountSettings.addEventListener('click', openAccountEditModal);

        // 2025-12-15: Background click to deselect accounts
        // Uses closest() to detect clicks outside of any card or interactive element
        elements.workspace.addEventListener('click', (e) => {
            // Don't deselect if clicking inside a card, button, or modal
            const clickedInsideCard = e.target.closest('.card, .account-tab, button, .modal, .header');
            if (!clickedInsideCard) {
                deselectAccount();
            }
        });

        // 2025-12-15: Also handle clicks on body (outside workspace) for side areas
        document.body.addEventListener('click', (e) => {
            // Only deselect if clicking directly on body (the dark side areas)
            // and workspace is visible
            if (e.target === document.body && elements.workspace.style.display !== 'none') {
                deselectAccount();
            }
        });

        // 2025-12-16: Exchange rate chart range buttons
        document.querySelectorAll('.chart-range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('.chart-range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Fetch new data for selected range
                const days = parseInt(btn.dataset.days);
                fetchExchangeHistory(days);
            });
        });
    }

    function setupDragAndDrop() {
        const dropZone = elements.startupScreen;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'));
        dropZone.addEventListener('dragover', () => dropZone.classList.add('drag-over'));
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

        dropZone.addEventListener('drop', async (e) => {
            dropZone.classList.remove('drag-over');
            try {
                fileHandle = await Storage.handleDrop(e.dataTransfer);
                await loadFileAndShow();
            } catch (err) {
                showToast(I18n.t('toastErrorDrop'), false);
            }
        });
    }

    // --- File Operations ---

    async function handleOpenFile() {
        try {
            fileHandle = await Storage.openFilePicker();
            await loadFileAndShow();
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast(I18n.t('toastErrorOpen'), false);
            }
        }
    }

    async function handleNewFile() {
        // 2025-12-15: Show vault modal instead of directly creating file
        openVaultModal();
    }

    // --- Vault Modal Operations (2025-12-15) ---

    function openVaultModal() {
        const t = I18n.t;
        const currentLang = I18n.getLanguage();

        // Set current language as default selection
        elements.selectVaultLanguage.value = currentLang;

        // Set default currency based on language (2025-12-15)
        // Spanish -> MXN, English -> USD
        elements.selectVaultCurrency.value = I18n.getDefaultCurrency(currentLang);

        // Clear vault name and set placeholder
        elements.inputVaultName.value = '';
        elements.inputVaultName.placeholder = t('vaultNamePlaceholder');

        // Update modal labels
        elements.vaultModalTitle.textContent = t('vaultModalTitle');
        elements.vaultModalDesc.textContent = t('vaultModalDesc');
        elements.labelVaultLanguage.textContent = t('vaultLanguage');
        elements.labelVaultCurrency.textContent = t('vaultCurrency');
        elements.labelVaultName.textContent = t('vaultName');
        elements.btnCancelVault.querySelector('[data-i18n="cancel"]').textContent = t('cancel');
        elements.btnCreateVault.querySelector('[data-i18n="createVault"]').textContent = t('createVault');

        // Update currency options
        elements.selectVaultCurrency.innerHTML = `
            <option value="USD">${t('currencyUSD')}</option>
            <option value="MXN">${t('currencyMXN')}</option>
        `;

        // Set default currency AFTER options are populated (2025-12-15)
        elements.selectVaultCurrency.value = I18n.getDefaultCurrency(currentLang);

        // 2025-12-17: Reset and translate encryption fields
        elements.checkboxEncryptVault.checked = false;
        elements.encryptionFields.style.display = 'none';
        elements.inputVaultPassword.value = '';
        elements.inputVaultConfirmPassword.value = '';

        // Update encryption labels
        document.getElementById('label-encrypt-vault').textContent = t('encryptVault');
        document.getElementById('encryption-warning').textContent = t('encryptionWarning');
        document.getElementById('label-vault-password').textContent = t('passwordLabel');
        document.getElementById('label-vault-confirm-password').textContent = t('confirmPasswordLabel');
        document.getElementById('label-vault-hint').textContent = t('hintLabel');
        elements.inputVaultPassword.placeholder = t('passwordPlaceholder');
        elements.inputVaultConfirmPassword.placeholder = t('confirmPasswordPlaceholder');
        elements.inputVaultHint.value = '';
        elements.inputVaultHint.placeholder = t('hintPlaceholder');

        elements.vaultModal.style.display = 'flex';
        elements.inputVaultName.focus();
    }

    /**
     * Setup vault modal language-currency sync
     * 2025-12-15: When user changes language in vault modal, update currency default
     */
    function setupVaultLanguageSync() {
        elements.selectVaultLanguage.addEventListener('change', (e) => {
            const lang = e.target.value;
            elements.selectVaultCurrency.value = I18n.getDefaultCurrency(lang);
        });
    }

    function closeVaultModal() {
        elements.vaultModal.style.display = 'none';
    }

    async function handleCreateVault() {
        const selectedLanguage = elements.selectVaultLanguage.value;
        const selectedCurrency = elements.selectVaultCurrency.value;

        // 2025-12-15: Vault name is used as suggested filename
        const vaultName = elements.inputVaultName.value.trim() || 'zip80_expenses';

        // 2025-12-17: Check if encryption is enabled
        const encryptionEnabled = elements.checkboxEncryptVault.checked;
        let password = null;

        if (encryptionEnabled) {
            password = elements.inputVaultPassword.value;
            const confirmPassword = elements.inputVaultConfirmPassword.value;
            const hint = elements.inputVaultHint.value.trim();

            // Validate password
            if (!password) {
                showToast(I18n.t('passwordRequired'), false);
                elements.inputVaultPassword.focus();
                return;
            }

            if (password !== confirmPassword) {
                showToast(I18n.t('passwordMismatch'), false);
                elements.inputVaultConfirmPassword.focus();
                return;
            }

            // Validate hint (required)
            if (!hint) {
                showToast(I18n.t('hintRequired'), false);
                elements.inputVaultHint.focus();
                return;
            }

            // Store hint for passing to encrypt
            vaultHint = hint;
        }

        // Apply language selection
        I18n.setLanguage(selectedLanguage);
        elements.langSelect.value = selectedLanguage;

        // 2025-12-16: Check if creating cloud vault
        if (storageBackend === 'gdrive') {
            await createCloudVault(vaultName, selectedLanguage, selectedCurrency);
            return;
        }

        // Default account name based on language
        const defaultAccountName = selectedLanguage === 'es' ? 'Cuenta Principal' : 'Main Account';

        try {
            // Pass vault name as suggested filename
            fileHandle = await Storage.createNewFile(vaultName);

            // Create data with selected settings
            data = Accounts.createEmptyData();

            // Update the default account with selected currency and default name
            if (data.accounts.length > 0) {
                data.accounts[0].name = defaultAccountName;
                data.accounts[0].currency = selectedCurrency;
            }

            // 2025-12-17: Set encryption state
            isVaultEncrypted = encryptionEnabled;
            vaultPassword = encryptionEnabled ? password : null;

            // 2025-12-15: Start with no account selected (deselected state is default)
            currentAccountId = null;

            // 2025-12-17: Write file with encryption and hint if enabled
            await Storage.writeFile(fileHandle, data, vaultPassword, vaultHint);

            closeVaultModal();
            updateUILanguage();
            showWorkspace();
            render();
            showToast(I18n.t('toastNewFile'));
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast(I18n.t('toastErrorCreate'), false);
            }
        }
    }

    async function handleReopen() {
        // Fallback filename for error message (await needed for Electron)
        const filename = (await Storage.getLastFileName()) || 'file';

        try {
            fileHandle = await Storage.reopenLastFile();
            await loadFileAndShow();
        } catch (err) {
            console.error('Reopen error:', err);
            // Show descriptive error with filename hint
            showToast(`${I18n.t('toastErrorReopen')} (${filename})`, false);
        }
    }

    /**
     * Load file and show workspace
     * 2025-12-17: Added encryption detection and password prompt
     */
    async function loadFileAndShow() {
        try {
            // First, read raw file content to check if encrypted
            const rawContent = await Storage.readFileRaw(fileHandle);

            // Check if file is encrypted
            if (Crypto.isEncrypted(rawContent)) {
                // Store pending file info and show password modal
                pendingEncryptedFile = { handle: fileHandle, content: rawContent };
                openPasswordModal();
                return;
            }

            // Not encrypted - parse and load normally
            const parsed = rawContent ? JSON.parse(rawContent) : null;
            data = Accounts.migrateData(parsed);
            isVaultEncrypted = false;
            vaultPassword = null;
            currentAccountId = null;
            showWorkspace();
            render();
        } catch (err) {
            console.error('Load file error:', err);
            showToast(I18n.t('toastErrorRead'), false);
        }
    }

    // 2025-12-17: Pending encrypted file state for password modal
    let pendingEncryptedFile = null;

    /**
     * Open password modal for encrypted vault
     * 2025-12-17: Prompts user for password to decrypt vault
     */
    function openPasswordModal() {
        const t = I18n.t;

        // Update modal labels
        document.getElementById('password-modal-title').textContent = t('passwordModalTitle');
        document.getElementById('password-modal-desc').textContent = t('passwordModalDesc');
        document.getElementById('label-unlock-password').textContent = t('passwordLabel');
        elements.inputUnlockPassword.placeholder = t('passwordPlaceholder');

        // Update buttons
        document.querySelector('#btn-cancel-unlock [data-i18n="cancel"]').textContent = t('cancel');
        document.querySelector('#btn-unlock-vault [data-i18n="unlockVault"]').textContent = t('unlockVault');

        // Reset failed attempts and hide hint
        failedAttempts = 0;
        elements.passwordHintDisplay.style.display = 'none';

        // Clear and focus password input
        elements.inputUnlockPassword.value = '';
        elements.passwordModal.style.display = 'flex';
        elements.inputUnlockPassword.focus();
    }

    function closePasswordModal() {
        elements.passwordModal.style.display = 'none';
        elements.passwordHintDisplay.style.display = 'none';
        pendingEncryptedFile = null;
        failedAttempts = 0;
    }

    /**
     * Handle unlock vault button click
     * 2025-12-17: Attempts to decrypt vault with entered password
     * Shows hint after 2 failed attempts
     */
    async function handleUnlockVault() {
        if (!pendingEncryptedFile) return;

        const password = elements.inputUnlockPassword.value;
        if (!password) {
            showToast(I18n.t('passwordRequired'), false);
            return;
        }

        try {
            const encryptedData = JSON.parse(pendingEncryptedFile.content);
            const decrypted = await Crypto.decrypt(encryptedData, password);

            data = Accounts.migrateData(decrypted);
            isVaultEncrypted = true;
            vaultPassword = password;
            vaultHint = encryptedData.hint || '';  // Store hint for future saves
            fileHandle = pendingEncryptedFile.handle;
            failedAttempts = 0;  // Reset counter on success

            closePasswordModal();
            currentAccountId = null;
            showWorkspace();
            render();
        } catch (err) {
            console.error('Decryption failed:', err);
            failedAttempts++;
            console.log('Failed attempts:', failedAttempts);

            // Show hint after 2 failed attempts
            if (failedAttempts >= 2) {
                const encryptedData = JSON.parse(pendingEncryptedFile.content);
                const hint = encryptedData.hint;
                console.log('Hint from file:', hint);
                if (hint) {
                    elements.hintText.textContent = hint;
                    document.getElementById('hint-label').textContent = I18n.t('hintDisplayLabel');
                    elements.passwordHintDisplay.style.display = 'block';
                }
            }

            showToast(I18n.t('wrongPassword'), false);
            elements.inputUnlockPassword.value = '';
            elements.inputUnlockPassword.focus();
        }
    }

    // --- Change Password (2025-12-17) ---

    /**
     * Update visibility of change password button in options menu
     * Only show for encrypted vaults
     */
    function updateChangePasswordVisibility() {
        if (elements.btnChangePassword) {
            elements.btnChangePassword.style.display = isVaultEncrypted ? 'flex' : 'none';
        }
    }

    /**
     * Open change password modal
     */
    function openChangePasswordModal() {
        if (!isVaultEncrypted) {
            showToast(I18n.t('toastError'), false);
            return;
        }

        const t = I18n.t;

        // Reset fields
        elements.inputCurrentPassword.value = '';
        elements.inputNewPassword.value = '';
        elements.inputConfirmNewPassword.value = '';
        elements.inputNewHint.value = vaultHint || '';

        // Apply translations
        document.getElementById('change-password-modal-title').textContent = t('changePasswordTitle');
        document.getElementById('change-password-modal-desc').textContent = t('changePasswordDesc');
        document.getElementById('label-current-password').textContent = t('currentPasswordLabel');
        document.getElementById('label-new-password').textContent = t('newPasswordLabel');
        document.getElementById('label-confirm-new-password').textContent = t('confirmNewPasswordLabel');
        document.getElementById('label-new-hint').textContent = t('newHintLabel');
        elements.inputCurrentPassword.placeholder = t('currentPasswordPlaceholder');
        elements.inputNewPassword.placeholder = t('newPasswordPlaceholder');
        elements.inputConfirmNewPassword.placeholder = t('confirmNewPasswordPlaceholder');
        elements.inputNewHint.placeholder = t('newHintPlaceholder');

        elements.changePasswordModal.style.display = 'flex';
        elements.inputCurrentPassword.focus();
    }

    /**
     * Close change password modal
     */
    function closeChangePasswordModal() {
        elements.changePasswordModal.style.display = 'none';
        elements.inputCurrentPassword.value = '';
        elements.inputNewPassword.value = '';
        elements.inputConfirmNewPassword.value = '';
    }

    /**
     * Handle change password form submission
     * Verifies current password, validates new password, re-encrypts vault
     */
    async function handleChangePassword() {
        const currentPassword = elements.inputCurrentPassword.value;
        const newPassword = elements.inputNewPassword.value;
        const confirmPassword = elements.inputConfirmNewPassword.value;
        const newHint = elements.inputNewHint.value.trim();

        // Validate current password is provided
        if (!currentPassword) {
            showToast(I18n.t('passwordRequired'), false);
            elements.inputCurrentPassword.focus();
            return;
        }

        // Validate new password is provided
        if (!newPassword) {
            showToast(I18n.t('passwordRequired'), false);
            elements.inputNewPassword.focus();
            return;
        }

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            showToast(I18n.t('passwordMismatch'), false);
            elements.inputConfirmNewPassword.focus();
            return;
        }

        // Validate hint is provided
        if (!newHint) {
            showToast(I18n.t('hintRequired'), false);
            elements.inputNewHint.focus();
            return;
        }

        // Verify current password is correct
        if (currentPassword !== vaultPassword) {
            showToast(I18n.t('wrongCurrentPassword'), false);
            elements.inputCurrentPassword.value = '';
            elements.inputCurrentPassword.focus();
            return;
        }

        // Update password and hint
        vaultPassword = newPassword;
        vaultHint = newHint;

        // Save vault with new encryption
        try {
            if (storageBackend === 'gdrive') {
                // For cloud vaults, need to encrypt and save
                await GDrive.writeVault(gdriveFileId, data);
            } else {
                // For local vaults
                await Storage.writeFile(fileHandle, data, vaultPassword, vaultHint);
            }

            closeChangePasswordModal();
            showToast(I18n.t('passwordChanged'));
        } catch (err) {
            console.error('Failed to save with new password:', err);
            showToast(I18n.t('toastError'), false);
        }
    }

    async function handleSave() {
        // 2025-12-16: Support both local and cloud backends
        // 2025-12-17: Use flash status indicator instead of toast
        if (storageBackend === 'gdrive') {
            if (!gdriveFileId) return;
            try {
                await GDrive.writeVault(gdriveFileId, data);
                if (typeof MenuBar !== 'undefined') MenuBar.setSaveStatus('saved');
            } catch (err) {
                if (typeof MenuBar !== 'undefined') MenuBar.setSaveStatus('error');
            }
        } else {
            if (!fileHandle) return;
            try {
                // 2025-12-17: Pass vaultPassword and vaultHint for encrypted vaults
                await Storage.writeFile(fileHandle, data, vaultPassword, vaultHint);
                if (typeof MenuBar !== 'undefined') MenuBar.setSaveStatus('saved');
            } catch (err) {
                if (typeof MenuBar !== 'undefined') MenuBar.setSaveStatus('error');
            }
        }
    }

    function handleExport() {
        const timestamp = new Date().toISOString().split('T')[0];
        Storage.exportToJSON(data, `zip80_export_${timestamp}.json`);
        showToast(I18n.t('toastExported'));
    }

    /**
     * Close the current vault and return to startup screen
     * 2025-12-15: Added close vault functionality
     * 2025-12-17: Removed confirmation since auto-save means changes are always saved
     * 2025-12-17: Added History.clear() to reset undo/redo stack
     */
    function handleCloseVault() {
        // Reset state
        fileHandle = null;
        gdriveFileId = null;  // 2025-12-16: Reset cloud file ID
        storageBackend = 'local';  // 2025-12-16: Reset to local backend
        data = { version: 2, accounts: [], transactions: [] };
        currentAccountId = null;

        // 2025-12-17: Clear undo/redo history
        if (typeof History !== 'undefined') History.clear();

        // Show startup screen
        elements.workspace.style.display = 'none';
        elements.startupScreen.style.display = 'flex';

        // 2025-12-17: Update cloud reopen link
        updateCloudReopenLink();
    }

    /**
     * Update cloud reopen link visibility
     * 2025-12-17: Shows or hides the reopen link based on saved last vault
     */
    function updateCloudReopenLink() {
        if (!elements.linkGoogleReopen) return;

        if (typeof GDrive !== 'undefined' && GDrive.isSignedIn()) {
            const lastVault = GDrive.getLastVault();
            if (lastVault && lastVault.id && lastVault.name) {
                elements.googleReopenFilename.textContent = lastVault.name.replace('.json', '');
                elements.linkGoogleReopen.style.display = 'block';
            } else {
                elements.linkGoogleReopen.style.display = 'none';
            }
        } else {
            elements.linkGoogleReopen.style.display = 'none';
        }
    }

    // --- Undo/Redo (2025-12-17) ---

    /**
     * Setup undo/redo button event listeners
     */
    function setupUndoRedo() {
        const btnUndo = document.getElementById('btn-undo');
        const btnRedo = document.getElementById('btn-redo');

        if (btnUndo) {
            btnUndo.addEventListener('click', handleUndo);
        }
        if (btnRedo) {
            btnRedo.addEventListener('click', handleRedo);
        }
    }

    /**
     * Handle undo action
     */
    function handleUndo() {
        if (typeof History === 'undefined' || !History.canUndo()) return;

        const previousState = History.undo(data);
        if (previousState) {
            data = previousState;
            render();
            handleSave();
        }
    }

    /**
     * Handle redo action
     */
    function handleRedo() {
        if (typeof History === 'undefined' || !History.canRedo()) return;

        const nextState = History.redo(data);
        if (nextState) {
            data = nextState;
            render();
            handleSave();
        }
    }

    /**
     * Save current state to history before making changes
     * Call this BEFORE modifying data
     */
    function saveToHistory() {
        if (typeof History !== 'undefined') {
            History.pushState(data);
        }
    }

    // --- Activity Log (2025-12-17) ---

    /**
     * Get current user info for transaction attribution
     * Returns email and name from Google account, or null for local vaults
     */
    function getCurrentUserInfo() {
        if (storageBackend === 'gdrive' && typeof GDrive !== 'undefined' && GDrive.isSignedIn()) {
            const user = GDrive.getUser();
            if (user) {
                return {
                    email: user.email,
                    name: user.name || user.email.split('@')[0]
                };
            }
        }
        return null;  // Local vault - no attribution
    }

    /**
     * Render the activity log widget showing recent transactions with user attribution
     */
    function renderActivityLog() {
        if (!elements.activityLogList) return;

        // Update widget title
        if (elements.activityLogTitle) {
            elements.activityLogTitle.textContent = '📋 ' + I18n.t('activityLogTitle');
        }

        // Get last 10 transactions, sorted by date descending
        const recentTransactions = [...(data.transactions || [])]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        if (recentTransactions.length === 0) {
            elements.activityLogList.innerHTML = `
                <div class="activity-empty">${I18n.t('activityEmpty')}</div>
            `;
            return;
        }

        // Get current user for "You" label
        const currentUser = getCurrentUserInfo();
        const currentEmail = currentUser ? currentUser.email : null;

        elements.activityLogList.innerHTML = recentTransactions.map(tx => {
            // Get account info
            const account = data.accounts.find(a => a.id === tx.accountId);
            const accountName = account ? account.name : 'Unknown';

            // Format amount
            const isIncome = tx.amt > 0;
            const amountClass = isIncome ? 'income' : 'expense';
            const amountPrefix = isIncome ? '+' : '';
            const currency = account ? account.currency : 'USD';
            const amountStr = `${amountPrefix}${Accounts.formatCurrency(Math.abs(tx.amt), currency)}`;

            // Format time (relative)
            const timeStr = formatRelativeTime(tx.date);

            // User attribution
            let userBadge = '';
            if (tx.createdBy && tx.createdBy.email) {
                if (tx.createdBy.email === vaultOwnerEmail) {
                    // Vault owner
                    userBadge = `<span class="activity-user owner">${I18n.t('activityOwner')}</span>`;
                } else if (tx.createdBy.email === currentEmail) {
                    // Current user (not owner)
                    userBadge = `<span class="activity-user">${I18n.t('activityYou')}</span>`;
                } else {
                    // Other collaborator - show first name
                    const displayName = tx.createdBy.name || tx.createdBy.email.split('@')[0];
                    userBadge = `<span class="activity-user">${displayName}</span>`;
                }
            }

            return `
                <div class="activity-log-item">
                    <span class="activity-icon">${isIncome ? '💰' : '💸'}</span>
                    <div class="activity-content">
                        <div class="activity-desc">${tx.desc}</div>
                        <div class="activity-meta">
                            ${userBadge}
                            <span class="activity-time">${timeStr}</span>
                        </div>
                    </div>
                    <span class="activity-amount ${amountClass}">${amountStr}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Format a date as relative time (e.g. "2h ago", "Yesterday")
     */
    function formatRelativeTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString(I18n.getLocale(), {
            month: 'short',
            day: 'numeric'
        });
    }

    // --- Google Drive Integration (2025-12-16) ---

    /**
     * Setup Google Drive integration
     * Initializes GDrive module and sets up event listeners
     */
    function setupGoogleDrive() {
        // Initialize GDrive module with auth change callback
        if (typeof GDrive !== 'undefined') {
            GDrive.init(handleGoogleAuthChange);
        }

        // Event listeners for Google buttons
        if (elements.btnGoogleSignIn) {
            elements.btnGoogleSignIn.addEventListener('click', handleGoogleSignIn);
        }
        if (elements.btnGoogleSignOut) {
            elements.btnGoogleSignOut.addEventListener('click', handleGoogleSignOut);
        }
        if (elements.btnGoogleOpen) {
            elements.btnGoogleOpen.addEventListener('click', handleOpenCloudVault);
        }
        if (elements.btnGoogleNew) {
            elements.btnGoogleNew.addEventListener('click', handleNewCloudVault);
        }
        if (elements.btnGdriveCancel) {
            elements.btnGdriveCancel.addEventListener('click', closeVaultPickerModal);
        }
        if (elements.linkGoogleReopen) {
            elements.linkGoogleReopen.addEventListener('click', handleReopenCloudVault);
        }
        if (elements.gdrivePickerModal) {
            elements.gdrivePickerModal.querySelector('.modal-backdrop')
                .addEventListener('click', closeVaultPickerModal);
        }
    }

    /**
     * Handle Google auth state changes
     * Called when user signs in or out
     */
    function handleGoogleAuthChange(isSignedIn, user) {
        if (isSignedIn && user) {
            // Show signed-in state
            elements.btnGoogleSignIn.style.display = 'none';
            elements.googleUserSection.style.display = 'flex';
            elements.googleUserAvatar.src = user.picture || '';
            elements.googleUserName.textContent = user.name || user.email || '';

            // 2025-12-17: Show reopen link if there's a last cloud vault
            updateCloudReopenLink();
        } else {
            // Show signed-out state
            elements.btnGoogleSignIn.style.display = 'flex';
            elements.googleUserSection.style.display = 'none';
            elements.linkGoogleReopen.style.display = 'none';
        }
    }

    /**
     * Handle Google sign-in button click
     */
    function handleGoogleSignIn() {
        if (typeof GDrive !== 'undefined') {
            GDrive.signIn();
        }
    }

    /**
     * Handle Google sign-out button click
     */
    function handleGoogleSignOut() {
        if (typeof GDrive !== 'undefined') {
            GDrive.signOut();
            showToast(I18n.t('toastGoogleSignedOut'));
        }
    }

    /**
     * Handle opening a cloud vault
     * Shows vault picker modal with list of user's vaults
     */
    async function handleOpenCloudVault() {
        if (!GDrive.isSignedIn()) {
            showToast(I18n.t('toastGoogleError'), false);
            return;
        }

        // Show loading state
        elements.gdriveVaultList.innerHTML = `
            <div class="gdrive-loading">${I18n.t('gdriveLoading')}</div>
        `;
        elements.gdrivePickerModal.style.display = 'flex';

        try {
            const vaults = await GDrive.listVaults();
            renderVaultPicker(vaults);
        } catch (err) {
            console.error('Failed to list vaults:', err);
            elements.gdriveVaultList.innerHTML = `
                <div class="gdrive-empty">${I18n.t('toastGoogleError')}</div>
            `;
        }
    }

    /**
     * Render vault picker list
     */
    function renderVaultPicker(vaults) {
        if (!vaults || vaults.length === 0) {
            elements.gdriveVaultList.innerHTML = `
                <div class="gdrive-empty">${I18n.t('gdriveNoVaults')}</div>
            `;
            return;
        }

        const user = GDrive.getUser();
        const userEmail = user ? user.email : '';

        elements.gdriveVaultList.innerHTML = vaults.map(vault => {
            const date = new Date(vault.modifiedTime);
            const dateStr = date.toLocaleDateString(I18n.getLocale(), {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Check if vault is shared (owner is not current user)
            const isShared = vault.owners && vault.owners[0] &&
                vault.owners[0].emailAddress !== userEmail;
            const sharedBadge = isShared ?
                `<span class="gdrive-vault-shared">${I18n.t('gdriveShared')}</span>` : '';

            return `
                <div class="gdrive-vault-item" data-file-id="${vault.id}">
                    <span class="gdrive-vault-icon">📁</span>
                    <div class="gdrive-vault-info">
                        <div class="gdrive-vault-name">${vault.name}</div>
                        <div class="gdrive-vault-date">${dateStr}</div>
                    </div>
                    ${sharedBadge}
                </div>
            `;
        }).join('');

        // Add click handlers to vault items
        elements.gdriveVaultList.querySelectorAll('.gdrive-vault-item').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = item.dataset.fileId;
                loadCloudVault(fileId);
            });
        });
    }

    /**
     * Load a cloud vault by file ID
     * 2025-12-17: Added saveLastVault for reopen feature
     * 2025-12-17: Added vaultOwnerEmail tracking for Activity Log
     */
    async function loadCloudVault(fileId) {
        closeVaultPickerModal();

        try {
            const vaultInfo = await GDrive.getVaultInfo(fileId);
            data = await GDrive.readVault(fileId);
            gdriveFileId = fileId;
            storageBackend = 'gdrive';
            currentAccountId = null;

            // 2025-12-17: Track vault owner for Activity Log attribution
            if (vaultInfo.owners && vaultInfo.owners[0]) {
                vaultOwnerEmail = vaultInfo.owners[0].emailAddress;
            } else {
                vaultOwnerEmail = null;
            }

            // 2025-12-17: Save for reopen feature
            GDrive.saveLastVault(fileId, vaultInfo.name || 'Unknown');

            showWorkspace();
            render();
        } catch (err) {
            console.error('Failed to load cloud vault:', err);
            showToast(I18n.t('toastGoogleError'), false);
        }
    }

    /**
     * Handle reopen last cloud vault link click
     * 2025-12-17: Added for quick reopen of last used cloud vault
     */
    async function handleReopenCloudVault(e) {
        e.preventDefault();

        if (!GDrive.isSignedIn()) {
            showToast(I18n.t('toastGoogleError'), false);
            return;
        }

        const lastVault = GDrive.getLastVault();
        if (!lastVault || !lastVault.id) {
            showToast(I18n.t('toastGoogleError'), false);
            return;
        }

        await loadCloudVault(lastVault.id);
    }

    /**
     * Handle creating a new cloud vault
     * Opens vault creation modal, then creates vault in Drive
     */
    async function handleNewCloudVault() {
        if (!GDrive.isSignedIn()) {
            showToast(I18n.t('toastGoogleError'), false);
            return;
        }

        // Use the same vault modal as local files
        // but set a flag to indicate cloud creation
        storageBackend = 'gdrive';
        openVaultModal();
    }

    /**
     * Create cloud vault after vault modal submission
     * Called from handleCreateVault when storageBackend is 'gdrive'
     */
    async function createCloudVault(vaultName, selectedLanguage, selectedCurrency) {
        const defaultAccountName = selectedLanguage === 'es' ? 'Cuenta Principal' : 'Main Account';

        // Create initial data
        data = Accounts.createEmptyData();
        if (data.accounts.length > 0) {
            data.accounts[0].name = defaultAccountName;
            data.accounts[0].currency = selectedCurrency;
        }

        try {
            // Create file in Google Drive
            gdriveFileId = await GDrive.createVault(vaultName, data);
            currentAccountId = null;

            closeVaultModal();
            updateUILanguage();
            showWorkspace();
            render();
            showToast(I18n.t('toastNewFile'));
        } catch (err) {
            console.error('Failed to create cloud vault:', err);
            showToast(I18n.t('toastGoogleError'), false);
            storageBackend = 'local';  // Reset on failure
        }
    }

    /**
     * Close vault picker modal
     */
    function closeVaultPickerModal() {
        elements.gdrivePickerModal.style.display = 'none';
    }

    // --- Account Operations ---

    function openAccountModal() {
        // Reset form fields
        elements.selectAccountType.value = 'checking';

        // 2025-12-17: Reset visual button state
        if (elements.accountTypeGrid) {
            elements.accountTypeGrid.querySelectorAll('.account-type-btn').forEach(b => {
                if (b.dataset.value === 'checking') b.classList.add('active');
                else b.classList.remove('active');
            });
        }

        elements.inputAccountName.value = '';

        // 2025-12-15: Default currency based on current language
        const currentLang = I18n.getLanguage();
        elements.selectCurrency.value = I18n.getDefaultCurrency(currentLang);

        elements.creditCardFields.style.display = 'none';  // 2025-12-15: Hide credit fields
        elements.inputCreditLimit.value = '';
        elements.selectPaymentDueDay.value = '15';
        elements.selectStatementCloseDay.value = '28';

        elements.accountModal.style.display = 'flex';
        elements.inputAccountName.focus();
    }

    function closeAccountModal() {
        elements.accountModal.style.display = 'none';
    }

    // --- Balance Edit Operations ---

    function openBalanceModal() {
        const currentAccount = data.accounts.find(a => a.id === currentAccountId);
        if (!currentAccount) return;

        const currentBalance = Accounts.calculateBalance(data.transactions, currentAccountId);
        elements.inputNewBalance.value = currentBalance.toFixed(2);
        elements.inputAdjustmentReason.value = '';
        elements.balanceModal.style.display = 'flex';
        elements.inputNewBalance.focus();
        elements.inputNewBalance.select();
    }

    function closeBalanceModal() {
        elements.balanceModal.style.display = 'none';
    }

    function handleApplyBalance() {
        const newBalanceStr = elements.inputNewBalance.value.replace(/,/g, '');
        const newBalance = parseFloat(newBalanceStr);

        if (isNaN(newBalance)) {
            showToast(I18n.t('toastErrorAmount'), false);
            return;
        }

        const currentBalance = Accounts.calculateBalance(data.transactions, currentAccountId);
        const adjustment = newBalance - currentBalance;

        if (adjustment === 0) {
            closeBalanceModal();
            return;
        }

        // Create an adjustment transaction
        // 2025-12-17: Include createdBy for Activity Log attribution
        const reason = elements.inputAdjustmentReason.value.trim();
        const desc = reason
            ? `${I18n.t('balanceAdjustment')}: ${reason}`
            : I18n.t('balanceAdjustment');
        const userInfo = getCurrentUserInfo();

        const transaction = {
            id: Date.now(),
            accountId: currentAccountId,
            desc: desc,
            amt: adjustment,
            date: new Date().toISOString(),
            createdBy: userInfo
        };

        saveToHistory();  // 2025-12-17: Save state before modifying data
        data.transactions.push(transaction);
        closeBalanceModal();
        render();
        handleSave();  // 2025-12-17: handleSave now shows flash indicator
    }

    // --- Credit Card Edit Operations (2025-12-15) ---

    /**
     * Setup credit modal day dropdowns (1-31)
     * Called during init
     */
    function setupCreditEditModal() {
        // Populate day dropdowns
        for (let day = 1; day <= 31; day++) {
            const option1 = document.createElement('option');
            option1.value = day;
            option1.textContent = day;
            elements.selectEditPaymentDue.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = day;
            option2.textContent = day;
            elements.selectEditStatementClose.appendChild(option2);
        }
    }

    function openCreditModal() {
        const currentAccount = data.accounts.find(a => a.id === currentAccountId);
        if (!currentAccount || currentAccount.type !== 'credit') return;

        const t = I18n.t;

        // Update modal labels
        elements.creditModalTitle.textContent = t('creditModalTitle');
        elements.creditModalDesc.textContent = t('creditModalDesc');
        elements.labelEditCreditLimit.textContent = t('creditLimit');
        elements.labelEditPaymentDue.textContent = t('paymentDueDay');
        elements.labelEditStatementClose.textContent = t('statementCloseDay');
        elements.btnCancelCredit.querySelector('[data-i18n="cancel"]').textContent = t('cancel');
        elements.btnSaveCredit.querySelector('[data-i18n="saveChanges"]').textContent = t('saveChanges');

        // Populate current values
        elements.inputEditCreditLimit.value = currentAccount.creditLimit || '';
        elements.selectEditPaymentDue.value = currentAccount.paymentDueDay || '15';
        elements.selectEditStatementClose.value = currentAccount.statementCloseDay || '28';

        elements.creditModal.style.display = 'flex';
        elements.inputEditCreditLimit.focus();
        elements.inputEditCreditLimit.select();
    }

    function closeCreditModal() {
        elements.creditModal.style.display = 'none';
    }

    function handleSaveCredit() {
        const currentAccount = data.accounts.find(a => a.id === currentAccountId);
        if (!currentAccount) return;

        const newLimit = parseFloat(elements.inputEditCreditLimit.value) || 0;
        const newDueDay = parseInt(elements.selectEditPaymentDue.value) || 15;
        const newCloseDay = parseInt(elements.selectEditStatementClose.value) || 28;

        saveToHistory();  // 2025-12-17: Save state before modifying data
        // Update account
        currentAccount.creditLimit = newLimit;
        currentAccount.paymentDueDay = newDueDay;
        currentAccount.statementCloseDay = newCloseDay;

        closeCreditModal();
        render();
        handleSave();  // 2025-12-17: handleSave now shows flash indicator
    }

    // --- Account Edit Operations (2025-12-15: for checking/cash accounts) ---

    /**
     * Setup account edit modal event listeners
     */
    function setupAccountEditModal() {
        elements.btnCancelAccountEdit.addEventListener('click', closeAccountEditModal);
        elements.btnSaveAccountEdit.addEventListener('click', handleSaveAccountEdit);
        elements.accountEditModal.querySelector('.modal-backdrop').addEventListener('click', closeAccountEditModal);
    }

    /**
     * Open account edit modal for checking/cash accounts
     */
    function openAccountEditModal() {
        const currentAccount = data.accounts.find(a => a.id === currentAccountId);
        if (!currentAccount || currentAccount.type === 'credit') return;

        const t = I18n.t;

        // Update modal labels
        elements.accountEditModalTitle.textContent = t('accountEditModalTitle');
        elements.accountEditModalDesc.textContent = t('accountEditModalDesc');
        elements.labelEditAccountName.textContent = t('accountName');
        elements.labelEditAccountCurrency.textContent = t('currency');
        elements.btnCancelAccountEdit.querySelector('[data-i18n="cancel"]').textContent = t('cancel');
        elements.btnSaveAccountEdit.querySelector('[data-i18n="saveChanges"]').textContent = t('saveChanges');

        // Update currency options with translations
        elements.selectEditAccountCurrency.innerHTML = `
            <option value="USD">${t('currencyUSD')}</option>
            <option value="MXN">${t('currencyMXN')}</option>
        `;

        // Populate current values
        elements.inputEditAccountName.value = currentAccount.name || '';
        elements.selectEditAccountCurrency.value = currentAccount.currency || 'USD';

        elements.accountEditModal.style.display = 'flex';
        elements.inputEditAccountName.focus();
        elements.inputEditAccountName.select();
    }

    function closeAccountEditModal() {
        elements.accountEditModal.style.display = 'none';
    }

    function handleSaveAccountEdit() {
        const currentAccount = data.accounts.find(a => a.id === currentAccountId);
        if (!currentAccount) return;

        const newName = elements.inputEditAccountName.value.trim();
        const newCurrency = elements.selectEditAccountCurrency.value;

        if (!newName) {
            showToast(I18n.t('toastErrorAccountName'), false);
            elements.inputEditAccountName.focus();
            return;
        }

        saveToHistory();  // 2025-12-17: Save state before modifying data
        // Update account
        currentAccount.name = newName;
        currentAccount.currency = newCurrency;

        closeAccountEditModal();
        render();
        handleSave();  // 2025-12-17: handleSave now shows flash indicator
    }

    // --- Comma Formatting (2025-12-15) ---

    /**
     * Setup comma formatting for number input fields
     * Applies to: balance input, transaction amount, credit limit inputs
     * Uses a text input with formatting to show commas while maintaining number value
     */
    function setupCommaFormatting() {
        // Apply to edit balance input
        applyCommaFormatting(elements.inputNewBalance);

        // Apply to transaction amount input
        applyCommaFormatting(elements.inputAmount);

        // Apply to credit limit inputs
        applyCommaFormatting(elements.inputCreditLimit);
        applyCommaFormatting(elements.inputEditCreditLimit);
    }

    /**
     * Apply comma formatting to a number input
     * Shows formatted number with commas while editing
     * @param {HTMLInputElement} input - The input element to format
     */
    function applyCommaFormatting(input) {
        if (!input) return;

        // Store the raw value as a data attribute
        input.addEventListener('input', (e) => {
            const cursorPosition = e.target.selectionStart;
            const oldValue = e.target.value;
            const oldLength = oldValue.length;

            // Remove all non-numeric characters except decimal and minus
            let rawValue = oldValue.replace(/[^0-9.\-]/g, '');

            // Handle multiple decimals - keep only first
            const parts = rawValue.split('.');
            if (parts.length > 2) {
                rawValue = parts[0] + '.' + parts.slice(1).join('');
            }

            // Format with commas
            const formatted = formatWithCommas(rawValue);

            // Update the input value
            e.target.value = formatted;

            // Adjust cursor position based on added/removed characters
            const newLength = formatted.length;
            const diff = newLength - oldLength;
            const newCursorPos = Math.max(0, cursorPosition + diff);
            e.target.setSelectionRange(newCursorPos, newCursorPos);
        });

        // On focus, select all for easy editing
        input.addEventListener('focus', (e) => {
            // Short delay to ensure selection works
            setTimeout(() => e.target.select(), 10);
        });

        // On blur, clean up formatting
        input.addEventListener('blur', (e) => {
            const rawValue = parseFormattedNumber(e.target.value);
            if (!isNaN(rawValue) && rawValue !== 0) {
                e.target.value = formatWithCommas(rawValue.toString());
            }
        });
    }

    /**
     * Format a number string with commas as thousand separators
     * @param {string} numStr - Number string to format
     * @returns {string} Formatted string with commas
     */
    function formatWithCommas(numStr) {
        if (!numStr) return '';

        // Split on decimal
        const parts = numStr.split('.');
        let intPart = parts[0] || '';
        const decPart = parts[1];

        // Handle negative
        const isNegative = intPart.startsWith('-');
        if (isNegative) intPart = intPart.substring(1);

        // Add commas to integer part
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        // Reconstruct
        let result = isNegative ? '-' + intPart : intPart;
        if (decPart !== undefined) {
            result += '.' + decPart;
        }

        return result;
    }

    /**
     * Parse a formatted number string back to a float
     * @param {string} formattedStr - Formatted string with commas
     * @returns {number} Parsed number
     */
    function parseFormattedNumber(formattedStr) {
        if (!formattedStr) return 0;
        // Remove commas and parse
        const cleaned = formattedStr.replace(/,/g, '');
        return parseFloat(cleaned) || 0;
    }

    // --- Custom Confirm Modal (2025-12-15) ---

    /**
     * Show a custom confirmation dialog that matches the app's design
     * @param {string} message - The confirmation message to display
     * @param {object} options - Optional settings { title, confirmText, cancelText, isDanger }
     * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
     */
    function showConfirm(message, options = {}) {
        return new Promise((resolve) => {
            const t = I18n.t;
            const title = options.title || t('confirmTitle');
            const confirmText = options.confirmText || t('confirm');
            const cancelText = options.cancelText || t('cancel');
            const isDanger = options.isDanger !== false; // Default to danger style

            // Set modal content
            elements.confirmModalTitle.textContent = title;
            elements.confirmModalMessage.textContent = message;
            elements.btnConfirmCancel.querySelector('span').textContent = cancelText;
            elements.btnConfirmOk.querySelector('span').textContent = confirmText;

            // Set button style (danger or primary)
            elements.btnConfirmOk.className = isDanger
                ? 'btn btn-danger'
                : 'btn btn-primary';

            // Clean up any previous handlers
            const newCancelBtn = elements.btnConfirmCancel.cloneNode(true);
            const newOkBtn = elements.btnConfirmOk.cloneNode(true);
            const newBackdrop = elements.confirmModal.querySelector('.modal-backdrop').cloneNode(true);

            elements.btnConfirmCancel.parentNode.replaceChild(newCancelBtn, elements.btnConfirmCancel);
            elements.btnConfirmOk.parentNode.replaceChild(newOkBtn, elements.btnConfirmOk);
            elements.confirmModal.querySelector('.modal-backdrop').replaceWith(newBackdrop);

            // Update element references
            elements.btnConfirmCancel = newCancelBtn;
            elements.btnConfirmOk = newOkBtn;

            // Add handlers
            const handleCancel = () => {
                elements.confirmModal.style.display = 'none';
                resolve(false);
            };

            const handleConfirm = () => {
                elements.confirmModal.style.display = 'none';
                resolve(true);
            };

            elements.btnConfirmCancel.addEventListener('click', handleCancel);
            elements.btnConfirmOk.addEventListener('click', handleConfirm);
            elements.confirmModal.querySelector('.modal-backdrop').addEventListener('click', handleCancel);

            // Show modal
            elements.confirmModal.style.display = 'flex';
            elements.btnConfirmOk.focus();
        });
    }

    function handleCreateAccount() {
        const accountType = elements.selectAccountType.value;
        const name = elements.inputAccountName.value.trim();
        const currency = elements.selectCurrency.value;

        if (!name) {
            showToast(I18n.t('toastErrorAccountName'), false);
            elements.inputAccountName.focus();
            return;
        }

        let newAccount;

        // 2025-12-15: Create account based on type selection
        // 2025-12-16: Added crypto account type
        if (accountType === 'credit') {
            // Strip commas from credit limit before parsing
            const creditLimitRaw = elements.inputCreditLimit.value.replace(/,/g, '');
            const creditLimit = parseFloat(creditLimitRaw) || 0;
            const paymentDueDay = elements.selectPaymentDueDay.value;
            const statementCloseDay = elements.selectStatementCloseDay.value;

            newAccount = Accounts.createCreditCardAccount(
                name, currency, creditLimit, paymentDueDay, statementCloseDay
            );
        } else if (accountType === 'cash') {
            newAccount = Accounts.createCashAccount(name, currency);
        } else if (accountType === 'crypto') {
            // Create crypto account with type 'crypto'
            newAccount = {
                id: Date.now().toString(),
                name: name,
                currency: currency,
                type: 'crypto'
            };
        } else {
            newAccount = Accounts.createAccount(name, currency);
        }

        saveToHistory();  // 2025-12-17: Save state before modifying data
        data.accounts.push(newAccount);
        currentAccountId = newAccount.id;

        closeAccountModal();
        render();
        handleSave();  // 2025-12-17: handleSave now shows flash indicator
    }

    function selectAccount(accountId) {
        currentAccountId = accountId;
        render();
    }

    /**
     * Deselect current account (hide account details widget)
     * 2025-12-15: Added for background click deselection
     */
    function deselectAccount() {
        if (currentAccountId !== null) {
            currentAccountId = null;
            render();
        }
    }

    async function deleteAccount(accountId) {
        if (data.accounts.length <= 1) {
            return; // Don't delete the last account
        }

        const confirmed = await showConfirm(I18n.t('confirmDeleteAccount'));
        if (!confirmed) {
            return;
        }

        saveToHistory();  // 2025-12-17: Save state before modifying data
        // Remove account and its transactions
        data.accounts = data.accounts.filter(a => a.id !== accountId);
        data.transactions = data.transactions.filter(t => t.accountId !== accountId);

        // Select another account
        if (currentAccountId === accountId) {
            currentAccountId = data.accounts[0]?.id || null;
        }

        render();
        handleSave();  // 2025-12-17: handleSave now shows flash indicator
    }

    // --- Transaction Operations ---

    /**
     * Toggle between expense and income mode
     * 2025-12-15: New mode toggle for simplified transaction entry
     */
    function setTransactionMode(mode) {
        // Update button active states
        if (mode === 'expense') {
            elements.btnModeExpense.classList.add('active');
            elements.btnModeIncome.classList.remove('active');
        } else {
            elements.btnModeExpense.classList.remove('active');
            elements.btnModeIncome.classList.add('active');
        }

        // Show/hide category icons (only for expense mode)
        elements.categoryIcons.style.display = mode === 'expense' ? 'flex' : 'none';

        // Show/hide recurring toggle (only for expense mode)
        elements.recurringToggleRow.style.display = mode === 'expense' ? 'block' : 'none';
        // Reset recurring when switching to income
        if (mode === 'income') {
            elements.checkboxRecurring.checked = false;
            elements.recurringFrequencyRow.style.display = 'none';
        }

        // Update submit button style and text
        const addBtn = elements.btnAddTransaction;
        if (mode === 'income') {
            addBtn.classList.remove('btn-danger');
            addBtn.classList.add('btn-success');
            addBtn.querySelector('span').textContent = I18n.t('btnAddIncome');
        } else {
            addBtn.classList.remove('btn-success');
            addBtn.classList.add('btn-danger');
            addBtn.querySelector('span').textContent = I18n.t('btnAddExpense');
        }
    }

    /**
     * Get current transaction mode from button active state
     * 2025-12-16: Helper to determine current mode
     */
    function getCurrentMode() {
        return elements.btnModeExpense.classList.contains('active') ? 'expense' : 'income';
    }

    /**
     * Get currently selected category
     * 2025-12-15: Returns category data attribute of active icon
     */
    function getSelectedCategory() {
        const activeIcon = elements.categoryIcons.querySelector('.category-icon.active');
        return activeIcon ? activeIcon.dataset.category : 'general';
    }

    /**
     * Handle adding a transaction with current mode and category
     * 2025-12-15: Unified handler replacing separate income/expense buttons
     * 2025-12-15: Added recurring transaction support
     */
    function handleAddTransaction() {
        if (!currentAccountId) {
            return;
        }

        const desc = elements.inputDesc.value.trim();
        const amountStr = elements.inputAmount.value.replace(/,/g, '');
        const amount = parseFloat(amountStr);
        const mode = getCurrentMode();
        const category = mode === 'expense' ? getSelectedCategory() : null;
        const isRecurring = mode === 'expense' && elements.checkboxRecurring.checked;
        const frequencyMonths = isRecurring ? parseInt(elements.inputRecurringMonths.value) || 1 : null;

        if (!desc) {
            showToast(I18n.t('toastErrorDesc'), false);
            elements.inputDesc.focus();
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            showToast(I18n.t('toastErrorAmount'), false);
            elements.inputAmount.focus();
            return;
        }

        if (isRecurring) {
            // Create recurring transaction
            const recurringTransaction = {
                id: Date.now(),
                accountId: currentAccountId,
                desc: desc,
                amt: -amount,  // Always negative for expenses
                category: category,
                frequencyMonths: frequencyMonths,
                startDate: new Date().toISOString(),
                active: true
            };

            // Initialize recurring array if needed
            if (!data.recurringTransactions) {
                data.recurringTransactions = [];
            }
            data.recurringTransactions.push(recurringTransaction);
            showToast(I18n.t('toastRecurringCreated'));
        } else {
            // Create regular transaction
            // 2025-12-17: Include createdBy for Activity Log attribution
            const userInfo = getCurrentUserInfo();
            const transaction = {
                id: Date.now(),
                accountId: currentAccountId,
                desc: desc,
                amt: mode === 'income' ? amount : -amount,
                category: category,
                date: new Date().toISOString(),
                createdBy: userInfo  // null for local vaults, {email, name} for cloud
            };
            saveToHistory();  // 2025-12-17: Save state before modifying data
            data.transactions.push(transaction);
        }

        // Reset form
        elements.inputDesc.value = '';
        elements.inputAmount.value = '';
        elements.checkboxRecurring.checked = false;
        elements.recurringFrequencyRow.style.display = 'none';
        elements.inputDesc.focus();

        render();
        handleSave();
    }

    async function deleteTransaction(id) {
        const confirmed = await showConfirm(I18n.t('confirmDelete'));
        if (confirmed) {
            data.transactions = data.transactions.filter(t => t.id !== id);
            render();
            handleSave();
        }
    }

    /**
     * Cancel a recurring transaction
     * 2025-12-15: Sets active to false instead of deleting
     */
    async function cancelRecurring(id) {
        const confirmed = await showConfirm(I18n.t('confirmCancelRecurring'));
        if (confirmed) {
            const recurring = data.recurringTransactions?.find(r => r.id === id);
            if (recurring) {
                saveToHistory();  // 2025-12-17: Save state before modifying data
                recurring.active = false;
                render();
                handleSave();  // 2025-12-17: handleSave now shows flash indicator
            }
        }
    }

    // --- Rendering ---

    async function showWorkspace() {
        elements.startupScreen.style.display = 'none';
        elements.workspace.style.display = 'block';

        // 2025-12-16: Get filename based on backend
        let filename;
        if (storageBackend === 'gdrive') {
            filename = await GDrive.getVaultName(gdriveFileId);
            elements.fileBadge.classList.add('cloud');
            elements.fileBadge.textContent = `☁️ ${filename}`;
        } else {
            filename = await Promise.resolve(Storage.getFileName(fileHandle));
            elements.fileBadge.classList.remove('cloud');
            elements.fileBadge.textContent = I18n.t('fileBadge', { filename });
        }

        // 2025-12-16: Initialize widget system (drag-and-drop, collapse)
        Widgets.init();

        // 2025-12-17: Show/hide change password option based on encryption status
        updateChangePasswordVisibility();
    }

    function render() {
        renderAccountTabs();
        renderBalance();
        renderHistory();
        renderBalanceOverview();  // 2025-12-15: Balance overview widget
        renderRecurringWidget();  // 2025-12-15: Recurring expenses widget
        Calendar.renderCalendarWidget();  // 2025-12-15: Calendar widget
        renderActivityLog();  // 2025-12-17: Activity log widget
    }

    function renderAccountTabs() {
        const tabs = elements.accountTabs;
        tabs.innerHTML = '';

        data.accounts.forEach(account => {
            const isActive = account.id === currentAccountId;
            const canDelete = data.accounts.length > 1;
            // 2025-12-15: Account type icons (credit=card, cash=bills, checking=bank)
            // 2025-12-16: Added crypto icons using getCryptoIcon
            const accountIcon = account.type === 'crypto' ? getCryptoIcon(account.currency) :
                account.type === 'credit' ? '💳' :
                    account.type === 'cash' ? '💵' : '🏦';

            const tab = document.createElement('button');
            tab.className = `account-tab ${isActive ? 'active' : ''}`;
            tab.innerHTML = `
                <span class="account-icon">${accountIcon}</span>
                <span class="account-name">${escapeHtml(account.name)}</span>
                <span class="currency-badge">${account.currency}</span>
                ${canDelete ? `<span class="delete-account" data-id="${account.id}">✕</span>` : ''}
            `;

            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-account')) {
                    e.stopPropagation();
                    deleteAccount(account.id);
                } else {
                    selectAccount(account.id);
                }
            });

            tabs.appendChild(tab);
        });
    }

    function renderBalance() {
        const currentAccount = data.accounts.find(a => a.id === currentAccountId);
        const balanceCard = document.querySelector('.balance-card');

        // 2025-12-15: Hide entire balance card when no account is selected
        if (!currentAccount) {
            if (balanceCard) balanceCard.style.display = 'none';
            return;
        }

        // Show balance card when account is selected
        if (balanceCard) balanceCard.style.display = 'block';

        const balance = Accounts.calculateBalance(data.transactions, currentAccountId);
        const t = I18n.t;

        // 2025-12-15: Different display for credit cards vs checking
        if (currentAccount.type === 'credit') {
            // Credit card: Show balance (amount owed) as main number
            const availableCredit = Accounts.calculateAvailableCredit(currentAccount, data.transactions);

            elements.balanceLabel.textContent = t('amountOwed');
            elements.balanceDisplay.textContent = Accounts.formatCurrency(balance, currentAccount.currency);
            elements.balanceDisplay.classList.toggle('negative', balance < 0);

            // Show credit card details with available credit at top
            elements.creditCardInfo.style.display = 'block';
            elements.creditAvailableLabel.textContent = t('availableCredit') + ':';
            elements.creditAvailableValue.textContent = Accounts.formatCurrency(availableCredit, currentAccount.currency);
            elements.creditLimitLabel.textContent = t('creditLimit') + ':';
            elements.creditLimitValue.textContent = Accounts.formatCurrency(currentAccount.creditLimit, currentAccount.currency);
            elements.creditDatesLabel.textContent = `${t('dueDay')}: ${currentAccount.paymentDueDay}`;
            elements.creditDatesValue.textContent = `${t('closesDay')}: ${currentAccount.statementCloseDay}`;

            // 2025-12-15: Translate edit settings button
            elements.btnEditCredit.querySelector('[data-i18n="editCreditSettings"]').textContent = t('editCreditSettings');

            // Hide account settings for credit cards
            elements.accountSettingsInfo.style.display = 'none';
            if (elements.cryptoAccountInfo) elements.cryptoAccountInfo.style.display = 'none';
        } else if (currentAccount.type === 'crypto') {
            // 2025-12-16: Crypto account: Show USD value as main, crypto balance below
            elements.balanceLabel.textContent = t('balanceLabel');

            // Show "Loading..." initially, will be updated by fetchCryptoPrices
            elements.balanceDisplay.textContent = 'Loading...';
            elements.balanceDisplay.classList.remove('negative');
            elements.balanceDisplay.dataset.cryptoAccountId = currentAccount.id;
            elements.balanceDisplay.dataset.cryptoBalance = balance;
            elements.balanceDisplay.dataset.cryptoCurrency = currentAccount.currency;

            // Show crypto balance below
            if (elements.cryptoAccountInfo) {
                elements.cryptoAccountInfo.style.display = 'block';
                elements.cryptoBalanceValue.textContent = `${balance.toFixed(8)} ${currentAccount.currency}`;
            }

            // Hide credit card info and account settings for crypto
            elements.creditCardInfo.style.display = 'none';
            elements.accountSettingsInfo.style.display = 'none';

            // Fetch and update USD price
            updateCryptoBalanceDisplay();
        } else {
            // Checking/cash account: Show balance
            elements.balanceLabel.textContent = t('balanceLabel');
            elements.balanceDisplay.textContent = Accounts.formatCurrency(balance, currentAccount.currency);
            elements.balanceDisplay.classList.toggle('negative', balance < 0);
            elements.creditCardInfo.style.display = 'none';
            if (elements.cryptoAccountInfo) elements.cryptoAccountInfo.style.display = 'none';

            // 2025-12-15: Show account settings for checking/cash accounts
            elements.accountSettingsInfo.style.display = 'block';
            elements.btnEditAccountSettings.querySelector('[data-i18n="editCreditSettings"]').textContent = t('editCreditSettings');
        }

        elements.accountCurrency.textContent = currentAccount.type === 'crypto' ? 'USD' : currentAccount.currency;

        // 2025-12-15: Translate adjust amount button
        elements.btnEditBalance.querySelector('[data-i18n="adjustAmount"]').textContent = t('adjustAmount');
    }

    function renderHistory() {
        const list = elements.historyList;
        list.innerHTML = '';

        const accountTransactions = Accounts.getAccountTransactions(data.transactions, currentAccountId);

        if (accountTransactions.length === 0) {
            elements.emptyState.style.display = 'block';
            return;
        }

        elements.emptyState.style.display = 'none';

        const currentAccount = data.accounts.find(a => a.id === currentAccountId);
        const currency = currentAccount?.currency || 'USD';

        const sorted = [...accountTransactions].sort((a, b) => b.id - a.id);

        sorted.forEach(t => {
            const isIncome = t.amt >= 0;
            const li = document.createElement('li');
            li.className = 'history-item';

            // 2025-12-16: Translate balance adjustment descriptions dynamically
            let displayDesc = t.desc;
            if (t.desc === 'Balance Adjustment' || t.desc === 'Ajuste de Saldo') {
                displayDesc = I18n.t('balanceAdjustment');
            } else if (t.desc.startsWith('Balance Adjustment:') || t.desc.startsWith('Ajuste de Saldo:')) {
                // Has a reason appended, extract and translate
                const reason = t.desc.split(':').slice(1).join(':').trim();
                displayDesc = `${I18n.t('balanceAdjustment')}: ${reason}`;
            }

            li.innerHTML = `
                <div class="item-details">
                    <span class="item-desc">${escapeHtml(displayDesc)}</span>
                    <span class="item-date">${formatDate(t.date)}</span>
                </div>
                <div class="item-actions">
                    <span class="item-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'}${Accounts.formatCurrency(t.amt, currency)}
                    </span>
                    <button class="btn-icon-only calendar" title="${I18n.t('btnCalendarTitle')}" data-id="${t.id}">
                        📅
                    </button>
                    <button class="btn-icon-only delete" title="${I18n.t('btnDeleteTitle')}" data-id="${t.id}">
                        ✕
                    </button>
                </div>
            `;

            li.querySelector('.calendar').addEventListener('click', () => {
                Calendar.openGoogleCalendar(t.desc, t.date, t.amt);
            });

            li.querySelector('.delete').addEventListener('click', () => {
                deleteTransaction(t.id);
            });

            list.appendChild(li);
        });
    }

    /**
     * Render the balance overview sidebar widget
     * 2025-12-15: Added to show all account balances at a glance
     */
    function renderBalanceOverview() {
        const t = I18n.t;

        // Update widget titles
        if (elements.bankWidgetTitle) {
            elements.bankWidgetTitle.textContent = '🏦 ' + t('accountsBank');
        }
        if (elements.creditWidgetTitle) {
            elements.creditWidgetTitle.textContent = '💳 ' + t('accountsCredit');
        }

        // Separate accounts by type (2025-12-16: added crypto exclusion from bank)
        const bankAccounts = data.accounts.filter(a => a.type !== 'credit' && a.type !== 'crypto');
        const creditAccounts = data.accounts.filter(a => a.type === 'credit');

        // Helper: Create bank/cash account item
        function createBankItem(account) {
            const balance = Accounts.calculateBalance(data.transactions, account.id);
            const isActive = account.id === currentAccountId;
            const icon = account.type === 'cash' ? '💵' : '🏦';

            const item = document.createElement('div');
            item.className = `widget-account-item${isActive ? ' active' : ''}`;
            item.innerHTML = `
                <span class="widget-account-name">${icon} ${escapeHtml(account.name)}</span>
                <span class="widget-account-balance ${balance >= 0 ? 'positive' : 'negative'}">
                    ${Accounts.formatCurrency(balance, account.currency)} <span class="widget-currency">${account.currency}</span>
                </span>
            `;
            item.addEventListener('click', () => selectAccount(account.id));
            return item;
        }

        // Helper: Create credit card item
        function createCreditItem(account) {
            const balance = Accounts.calculateBalance(data.transactions, account.id);
            const availableCredit = Accounts.calculateAvailableCredit(account, data.transactions);
            const isActive = account.id === currentAccountId;

            const item = document.createElement('div');
            item.className = `widget-account-item${isActive ? ' active' : ''}`;
            item.innerHTML = `
                <span class="widget-account-name">💳 ${escapeHtml(account.name)}</span>
                <div class="widget-cc-details">
                    <div class="widget-cc-balance">${Accounts.formatCurrency(balance, account.currency)} <span class="widget-currency">${account.currency}</span></div>
                    <div class="widget-cc-available">${t('availableCredit')}: ${Accounts.formatCurrency(availableCredit, account.currency)}</div>
                </div>
            `;
            item.addEventListener('click', () => selectAccount(account.id));
            return item;
        }

        // Render Bank/Cash accounts
        if (elements.bankAccountsList) {
            elements.bankAccountsList.innerHTML = '';
            if (bankAccounts.length === 0) {
                elements.bankAccountsList.innerHTML = '<div class="widget-empty">—</div>';
            } else {
                bankAccounts.forEach(account => {
                    elements.bankAccountsList.appendChild(createBankItem(account));
                });
            }
        }

        // Render Credit Card accounts
        if (elements.creditAccountsList) {
            elements.creditAccountsList.innerHTML = '';
            if (creditAccounts.length === 0) {
                elements.creditAccountsList.innerHTML = '<div class="widget-empty">—</div>';
            } else {
                creditAccounts.forEach(account => {
                    elements.creditAccountsList.appendChild(createCreditItem(account));
                });
            }
        }

        // 2025-12-16: Render Crypto accounts
        const cryptoAccounts = data.accounts.filter(a => a.type === 'crypto');

        // Show/hide crypto widget based on whether crypto accounts exist
        if (elements.cryptoWidgetCard) {
            elements.cryptoWidgetCard.style.display = cryptoAccounts.length > 0 ? 'block' : 'none';
        }

        if (elements.cryptoWidgetTitle) {
            elements.cryptoWidgetTitle.textContent = '🪙 ' + t('accountsCrypto');
        }

        if (elements.cryptoAccountsList && cryptoAccounts.length > 0) {
            elements.cryptoAccountsList.innerHTML = '';
            cryptoAccounts.forEach(account => {
                elements.cryptoAccountsList.appendChild(createCryptoItem(account));
            });

            // Fetch crypto prices for USD conversion
            fetchCryptoPrices();
        }

        // Helper: Create crypto account item
        // 2025-12-16: USD value shown prominently, crypto balance below
        function createCryptoItem(account) {
            const balance = Accounts.calculateBalance(data.transactions, account.id);
            const isActive = account.id === currentAccountId;
            const cryptoIcon = getCryptoIcon(account.currency);

            const item = document.createElement('div');
            item.className = `widget-account-item${isActive ? ' active' : ''}`;
            item.dataset.cryptoCurrency = account.currency;
            item.dataset.cryptoBalance = balance;
            item.innerHTML = `
                <span class="widget-account-name">${cryptoIcon} ${escapeHtml(account.name)}</span>
                <div class="widget-crypto-details">
                    <div class="widget-crypto-usd" data-crypto-id="${account.id}">Loading...</div>
                    <div class="widget-crypto-balance">${balance.toFixed(8)} <span class="widget-currency">${account.currency}</span></div>
                </div>
            `;
            item.addEventListener('click', () => selectAccount(account.id));
            return item;
        }
    }

    /**
     * Render the recurring expenses sidebar widget
     * 2025-12-15: Shows active recurring transactions for current account
     */
    function renderRecurringWidget() {
        const t = I18n.t;

        // Update widget title
        if (elements.recurringWidgetTitle) {
            elements.recurringWidgetTitle.textContent = '🔁 ' + t('recurringWidgetTitle');
        }

        // Get active recurring transactions for all accounts (or current if selected)
        const recurringList = (data.recurringTransactions || []).filter(r => r.active);

        // Render list
        if (elements.recurringList) {
            elements.recurringList.innerHTML = '';

            if (recurringList.length === 0) {
                elements.recurringEmpty.style.display = 'block';
                // 2025-12-16: Hide total when no recurring expenses
                if (elements.recurringTotal) {
                    elements.recurringTotal.style.display = 'none';
                }
            } else {
                elements.recurringEmpty.style.display = 'none';

                // 2025-12-16: Calculate total monthly expenses
                // For each recurring expense, calculate monthly equivalent (amt / frequencyMonths)
                let totalMonthly = 0;
                let displayCurrency = 'USD';

                recurringList.forEach(r => {
                    const account = data.accounts.find(a => a.id === r.accountId);
                    const currency = account?.currency || 'USD';
                    displayCurrency = currency;  // Use last currency (assumes mostly same currency)
                    const categoryIcon = getCategoryIcon(r.category);

                    // Add to total (amt is negative for expenses, so we use Math.abs)
                    const monthlyAmount = Math.abs(r.amt) / (r.frequencyMonths || 1);
                    totalMonthly += monthlyAmount;

                    const item = document.createElement('div');
                    item.className = 'recurring-item';
                    item.innerHTML = `
                        <div class="recurring-item-info">
                            <span class="recurring-item-desc">${categoryIcon} ${escapeHtml(r.desc)}</span>
                            <span class="recurring-item-freq">${t('recurringEvery')} ${r.frequencyMonths} ${t('recurringMonths')}</span>
                        </div>
                        <span class="recurring-item-amount">${Accounts.formatCurrency(r.amt, currency)}</span>
                        <button class="btn-cancel-recurring" data-id="${r.id}" title="${t('btnCancelRecurring')}">✕</button>
                    `;

                    item.querySelector('.btn-cancel-recurring').addEventListener('click', () => {
                        cancelRecurring(r.id);
                    });

                    elements.recurringList.appendChild(item);
                });

                // 2025-12-16: Display total monthly expenses
                if (elements.recurringTotal) {
                    elements.recurringTotal.style.display = 'block';
                    elements.recurringTotal.innerHTML = `<strong>${t('recurringTotal')}</strong> ${Accounts.formatCurrency(-totalMonthly, displayCurrency)}`;
                }
            }
        }
    }

    /**
     * Get category icon for display
     * 2025-12-15: Maps category codes to emoji icons
     */
    function getCategoryIcon(category) {
        const icons = {
            general: '💸',
            food: '🍔',
            utilities: '💡',
            transport: '🚗',
            housing: '🏠',
            health: '🏥',
            fun: '🎮',
            work: '💼'
        };
        return icons[category] || icons.general;
    }

    /**
     * Get crypto currency icon
     * 2025-12-16: Maps crypto currency codes to emoji/icons
     */
    function getCryptoIcon(currency) {
        const icons = {
            BTC: '₿',
            ETH: '⟠',
            SOL: '◎'
        };
        return icons[currency] || '🪙';
    }

    // 2025-12-16: Cache for crypto prices to avoid rate limiting
    let cryptoPriceCache = {
        prices: null,
        timestamp: 0,
        TTL: 60000  // 60 seconds cache
    };

    /**
     * Fetch crypto prices from CoinGecko API and update widget
     * 2025-12-16: Gets USD prices for BTC, ETH, SOL (with caching)
     */
    async function fetchCryptoPrices() {
        const coinIds = {
            BTC: 'bitcoin',
            ETH: 'ethereum',
            SOL: 'solana'
        };

        try {
            // Check cache first
            const now = Date.now();
            let cryptoPrices;

            if (cryptoPriceCache.prices && (now - cryptoPriceCache.timestamp) < cryptoPriceCache.TTL) {
                // Use cached prices
                cryptoPrices = cryptoPriceCache.prices;
            } else {
                // Fetch fresh prices
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
                const prices = await response.json();

                // Map to our currency codes
                cryptoPrices = {
                    BTC: prices.bitcoin?.usd || 0,
                    ETH: prices.ethereum?.usd || 0,
                    SOL: prices.solana?.usd || 0
                };

                // Update cache
                cryptoPriceCache.prices = cryptoPrices;
                cryptoPriceCache.timestamp = now;
            }

            // Update all crypto account USD values
            const cryptoAccounts = data.accounts.filter(a => a.type === 'crypto');
            cryptoAccounts.forEach(account => {
                const balance = Accounts.calculateBalance(data.transactions, account.id);
                const price = cryptoPrices[account.currency] || 0;
                const usdValue = balance * price;

                const usdEl = document.querySelector(`[data-crypto-id="${account.id}"]`);
                if (usdEl) {
                    usdEl.textContent = `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
            });
        } catch (error) {
            console.error('Failed to fetch crypto prices:', error);
            // Show error state only if we don't have cached prices
            if (!cryptoPriceCache.prices) {
                document.querySelectorAll('.widget-crypto-usd').forEach(el => {
                    el.textContent = 'Price unavailable';
                });
            }
        }
    }

    /**
     * Update the main balance card display for crypto accounts
     * 2025-12-16: Fetches USD price and displays in balance card (with caching)
     */
    async function updateCryptoBalanceDisplay() {
        const balanceEl = elements.balanceDisplay;
        if (!balanceEl || !balanceEl.dataset.cryptoAccountId) return;

        const currency = balanceEl.dataset.cryptoCurrency;
        const balance = parseFloat(balanceEl.dataset.cryptoBalance) || 0;

        try {
            // Check cache first
            const now = Date.now();
            let price = 0;

            if (cryptoPriceCache.prices && (now - cryptoPriceCache.timestamp) < cryptoPriceCache.TTL) {
                // Use cached price
                price = cryptoPriceCache.prices[currency] || 0;
            } else {
                // Fetch fresh prices
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
                const prices = await response.json();

                // Update cache
                cryptoPriceCache.prices = {
                    BTC: prices.bitcoin?.usd || 0,
                    ETH: prices.ethereum?.usd || 0,
                    SOL: prices.solana?.usd || 0
                };
                cryptoPriceCache.timestamp = now;

                price = cryptoPriceCache.prices[currency] || 0;
            }

            const usdValue = balance * price;
            balanceEl.textContent = `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            balanceEl.classList.toggle('positive', usdValue >= 0);
        } catch (error) {
            console.error('Failed to fetch crypto price for balance:', error);
            // Use cached price if available
            if (cryptoPriceCache.prices && cryptoPriceCache.prices[currency]) {
                const usdValue = balance * cryptoPriceCache.prices[currency];
                balanceEl.textContent = `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else {
                balanceEl.textContent = 'Price unavailable';
            }
        }
    }

    /**
     * Fetch live exchange rates from ExchangeRate-API
     * 2025-12-16: Updates the exchange rate widget in sidebar
     */
    async function fetchExchangeRates() {
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await response.json();

            if (data && data.rates && data.rates.MXN) {
                const usdToMxn = data.rates.MXN;
                const mxnToUsd = 1 / usdToMxn;

                // Update DOM
                if (elements.rateUsdMxn) {
                    elements.rateUsdMxn.textContent = usdToMxn.toFixed(2);
                }
                if (elements.rateMxnUsd) {
                    elements.rateMxnUsd.textContent = mxnToUsd.toFixed(4);
                }
                if (elements.exchangeUpdated) {
                    const now = new Date();
                    elements.exchangeUpdated.textContent = `${I18n.t('exchangeUpdated')} ${now.toLocaleTimeString()}`;
                }
            }

            // Fetch 7-day history for sparkline from frankfurter.app (free, no key)
            fetchExchangeHistory();

        } catch (error) {
            console.error('Failed to fetch exchange rates:', error);
            if (elements.exchangeUpdated) {
                elements.exchangeUpdated.textContent = I18n.t('exchangeError');
            }
        }
    }

    /**
     * Fetch exchange rate history and render sparkline
     * 2025-12-16: Uses frankfurter.app API for historical data
     * 2025-12-16: Enhanced with X-axis labels and hover tooltips
     * @param {number} days - Number of days of history to fetch
     */
    async function fetchExchangeHistory(days = 7) {
        try {
            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const formatDate = (d) => d.toISOString().split('T')[0];
            const url = `https://api.frankfurter.app/${formatDate(startDate)}..${formatDate(endDate)}?from=USD&to=MXN`;

            const response = await fetch(url);
            const data = await response.json();

            if (data && data.rates) {
                // Extract rates with dates into array
                const rateData = Object.keys(data.rates)
                    .sort()
                    .map(date => ({
                        date: date,
                        rate: data.rates[date].MXN
                    }));

                // Draw sparkline with dates for hover and X-axis
                drawSparkline(rateData, days);
            }
        } catch (error) {
            console.error('Failed to fetch exchange history:', error);
        }
    }

    /**
     * Draw SVG sparkline from rate values with interactive hover
     * 2025-12-16: Enhanced with X-axis labels and hover tooltips
     * @param {Array} rateData - Array of {date, rate} objects
     * @param {number} days - Number of days for X-axis label formatting
     */
    function drawSparkline(rateData, days = 7) {
        const sparklinePath = document.getElementById('sparkline-path');
        const dotsGroup = document.getElementById('sparkline-dots');
        const xAxis = document.getElementById('chart-x-axis');
        const tooltip = document.getElementById('chart-tooltip');

        if (!sparklinePath || rateData.length < 2) return;

        const width = 120;
        const height = 45;
        const padding = 4;
        const chartHeight = 35; // Leave room for dots at top

        const values = rateData.map(d => d.rate);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        // Clear existing dots
        if (dotsGroup) dotsGroup.innerHTML = '';

        // Calculate column width for hover areas
        const columnWidth = (width - 2 * padding) / Math.max(rateData.length - 1, 1);

        // Build polyline points and add hover rectangles (full height for easy hovering)
        const points = rateData.map((d, i) => {
            const x = padding + (i / (rateData.length - 1)) * (width - 2 * padding);
            const y = chartHeight - padding - ((d.rate - min) / range) * (chartHeight - 2 * padding);

            // Add invisible full-height rectangle for hover detection
            if (dotsGroup) {
                // Create a group to hold both the hitbox and the visible dot
                const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('class', 'hover-group');

                // Invisible rectangle for hover detection (full height)
                const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                const hitboxX = x - columnWidth / 2;
                hitbox.setAttribute('x', Math.max(0, hitboxX).toFixed(1));
                hitbox.setAttribute('y', '0');
                hitbox.setAttribute('width', columnWidth.toFixed(1));
                hitbox.setAttribute('height', height.toString());
                hitbox.setAttribute('fill', 'transparent');
                hitbox.setAttribute('class', 'hover-hitbox');

                // Visible dot that appears on hover (at actual data point)
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', x.toFixed(1));
                dot.setAttribute('cy', y.toFixed(1));
                dot.setAttribute('r', '3');
                dot.setAttribute('class', 'hover-dot');

                // Hover events on the hitbox
                hitbox.addEventListener('mouseenter', (e) => {
                    if (tooltip) {
                        const formattedDate = new Date(d.date).toLocaleDateString(I18n.getLocale(), {
                            month: 'short',
                            day: 'numeric'
                        });
                        tooltip.querySelector('.tooltip-rate').textContent = `$${d.rate.toFixed(4)} MXN`;
                        tooltip.querySelector('.tooltip-date').textContent = formattedDate;
                        tooltip.style.display = 'block';

                        // Position tooltip near the point, push toward center at edges
                        const xPercent = (x / width) * 100;
                        tooltip.style.left = `${xPercent}%`;

                        // Adjust transform based on position to prevent clipping
                        if (xPercent < 20) {
                            // Left edge: align tooltip to left
                            tooltip.style.transform = 'translateX(0)';
                        } else if (xPercent > 80) {
                            // Right edge: align tooltip to right
                            tooltip.style.transform = 'translateX(-100%)';
                        } else {
                            // Center: default centered
                            tooltip.style.transform = 'translateX(-50%)';
                        }
                    }
                    dot.classList.add('active');
                });

                hitbox.addEventListener('mouseleave', () => {
                    if (tooltip) tooltip.style.display = 'none';
                    dot.classList.remove('active');
                });

                group.appendChild(hitbox);
                group.appendChild(dot);
                dotsGroup.appendChild(group);
            }

            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        sparklinePath.setAttribute('points', points);

        // Color based on trend (green if up, red if down)
        const trend = values[values.length - 1] - values[0];
        sparklinePath.setAttribute('stroke', trend >= 0 ? '#22c55e' : '#ef4444');

        // Calculate and display percentage change
        const chartChange = document.getElementById('chart-change');
        if (chartChange && values.length >= 2) {
            const startValue = values[0];
            const endValue = values[values.length - 1];
            const percentChange = ((endValue - startValue) / startValue) * 100;

            const sign = percentChange >= 0 ? '+' : '';
            chartChange.textContent = `${sign}${percentChange.toFixed(2)}%`;
            chartChange.className = 'chart-change ' + (percentChange >= 0 ? 'positive' : 'negative');
        }

        // Render X-axis labels
        if (xAxis) {
            renderXAxisLabels(xAxis, rateData, days);
        }
    }

    /**
     * Render X-axis labels for the chart
     * 2025-12-16: Shows days for 7d/1m, weeks for 6m
     */
    function renderXAxisLabels(container, rateData, days) {
        container.innerHTML = '';

        let labelIndices = [];

        if (days <= 7) {
            // 7d: Show every day
            labelIndices = rateData.map((_, i) => i);
        } else if (days <= 30) {
            // 1m: Show every 5 days
            labelIndices = rateData.map((_, i) => i).filter(i => i % 5 === 0 || i === rateData.length - 1);
        } else {
            // 6m: Show weekly labels
            labelIndices = rateData.map((_, i) => i).filter(i => i % 7 === 0 || i === rateData.length - 1);
        }

        // Create labels at evenly spaced positions
        labelIndices.forEach((dataIndex, i) => {
            const d = rateData[dataIndex];
            const date = new Date(d.date);

            let label;
            if (days <= 30) {
                // Days: show day number
                label = date.getDate().toString();
            } else {
                // Weeks: show month/day
                label = date.toLocaleDateString(I18n.getLocale(), { month: 'short', day: 'numeric' });
                // Shorten to just M/D for space
                label = `${date.getMonth() + 1}/${date.getDate()}`;
            }

            const span = document.createElement('span');
            span.textContent = label;

            // Position based on data index
            const xPercent = (dataIndex / (rateData.length - 1)) * 100;
            span.style.position = 'absolute';
            span.style.left = `${xPercent}%`;

            // First label: align left, last label: align right, others: centered
            const isFirst = i === 0;
            const isLast = i === labelIndices.length - 1;
            if (isFirst) {
                span.style.transform = 'translateX(0)';
            } else if (isLast) {
                span.style.transform = 'translateX(-100%)';
            } else {
                span.style.transform = 'translateX(-50%)';
            }

            container.appendChild(span);
        });

        // Make container relative for absolute positioning
        container.style.position = 'relative';
        container.style.height = '12px';
    }

    // --- Utilities ---

    function formatDate(isoString) {
        return new Date(isoString).toLocaleDateString();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message, success = true) {
        const toast = elements.toast;
        toast.textContent = message;
        toast.className = 'toast show' + (success ? ' success' : '');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // --- Start ---
    init();
})();
