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
 */

(() => {
    // State
    let fileHandle = null;
    let data = { version: 2, accounts: [], transactions: [] };
    let currentAccountId = null;

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
        btnCloseVault: document.getElementById('btn-close-vault'),
        btnSave: document.getElementById('btn-save'),

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

        // Exchange Rate Widget (2025-12-16)
        exchangeWidgetTitle: document.getElementById('exchange-widget-title'),
        rateUsdMxn: document.getElementById('rate-usd-mxn'),
        rateMxnUsd: document.getElementById('rate-mxn-usd'),
        exchangeUpdated: document.getElementById('exchange-updated'),

        // History
        historyTitle: document.getElementById('history-title'),
        historyList: document.getElementById('history-list'),
        emptyState: document.getElementById('empty-state'),
        btnExport: document.getElementById('btn-export'),

        // Account Modal
        accountModal: document.getElementById('account-modal'),
        modalTitle: document.getElementById('modal-title'),
        selectAccountType: document.getElementById('select-account-type'),
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
        bankWidgetTitle: document.getElementById('bank-widget-title'),
        bankAccountsList: document.getElementById('bank-accounts-list'),
        creditWidgetTitle: document.getElementById('credit-widget-title'),
        creditAccountsList: document.getElementById('credit-accounts-list'),

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
        btnConfirmOk: document.getElementById('btn-confirm-ok')
    };

    // --- Initialization ---

    async function init() {
        setupTheme();  // 2025-12-15: Theme toggle
        setupLanguage();
        setupEventListeners();
        setupDragAndDrop();
        setupCreditCardUI();  // 2025-12-15: Credit card setup
        setupCreditEditModal();  // 2025-12-15: Credit edit modal
        setupAccountEditModal();  // 2025-12-15: Account edit modal
        setupVaultLanguageSync();  // 2025-12-15: Vault language-currency sync
        setupCommaFormatting();  // 2025-12-15: Comma separators for number inputs
        await checkForRecentFile();
        updateUILanguage();
        fetchExchangeRates();  // 2025-12-16: Load exchange rates
    }

    /**
     * Setup credit card UI elements
     * 2025-12-15: Populates day dropdowns (1-31) for payment due and statement close
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

        // Toggle credit card fields visibility based on account type
        elements.selectAccountType.addEventListener('change', () => {
            const isCredit = elements.selectAccountType.value === 'credit';
            elements.creditCardFields.style.display = isCredit ? 'block' : 'none';
        });
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
        elements.appTitle.textContent = t('appTitle');
        elements.appSubtitle.innerHTML = `${t('appSubtitle')}<br>${t('appSubtitleDrag')}`;
        elements.btnOpen.querySelector('[data-i18n="btnOpen"]').textContent = t('btnOpen');
        elements.btnNew.querySelector('[data-i18n="btnNew"]').textContent = t('btnNew');

        // Header
        elements.btnSave.querySelector('[data-i18n="btnSave"]').textContent = t('btnSave');
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

        // Account type options (2025-12-15)
        elements.selectAccountType.innerHTML = `
            <option value="checking">${t('accountTypeChecking')}</option>
            <option value="cash">${t('accountTypeCash')}</option>
            <option value="credit">${t('accountTypeCreditCard')}</option>
        `;

        // Currency options
        elements.selectCurrency.innerHTML = `
            <option value="USD">${t('currencyUSD')}</option>
            <option value="MXN">${t('currencyMXN')}</option>
        `;

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
        elements.btnSave.addEventListener('click', handleSave);
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

        // Default account name based on language
        const defaultAccountName = selectedLanguage === 'es' ? 'Cuenta Principal' : 'Main Account';

        // Apply language selection
        I18n.setLanguage(selectedLanguage);
        elements.langSelect.value = selectedLanguage;

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

            // 2025-12-15: Start with no account selected (deselected state is default)
            currentAccountId = null;
            await Storage.writeFile(fileHandle, data);

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

    async function loadFileAndShow() {
        try {
            data = await Storage.readFile(fileHandle);
            // 2025-12-15: Start with no account selected (deselected state is default)
            currentAccountId = null;
            showWorkspace();
            render();
        } catch (err) {
            showToast(I18n.t('toastErrorRead'), false);
        }
    }

    async function handleSave() {
        if (!fileHandle) return;

        try {
            await Storage.writeFile(fileHandle, data);
            showToast(I18n.t('toastSaved'));
        } catch (err) {
            showToast(I18n.t('toastErrorSave'), false);
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
     * 2025-12-15: Updated to use custom confirm modal
     */
    async function handleCloseVault() {
        const confirmed = await showConfirm(I18n.t('confirmCloseVault'));
        if (!confirmed) {
            return;
        }

        // Reset state
        fileHandle = null;
        data = { version: 2, accounts: [], transactions: [] };
        currentAccountId = null;

        // Show startup screen
        elements.workspace.style.display = 'none';
        elements.startupScreen.style.display = 'flex';
    }

    // --- Account Operations ---

    function openAccountModal() {
        // Reset form fields
        elements.selectAccountType.value = 'checking';
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
        const reason = elements.inputAdjustmentReason.value.trim();
        const desc = reason
            ? `${I18n.t('balanceAdjustment')}: ${reason}`
            : I18n.t('balanceAdjustment');

        const transaction = {
            id: Date.now(),
            accountId: currentAccountId,
            desc: desc,
            amt: adjustment,
            date: new Date().toISOString()
        };

        data.transactions.push(transaction);
        closeBalanceModal();
        render();
        handleSave();
        showToast(I18n.t('toastBalanceUpdated'));
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

        // Update account
        currentAccount.creditLimit = newLimit;
        currentAccount.paymentDueDay = newDueDay;
        currentAccount.statementCloseDay = newCloseDay;

        closeCreditModal();
        render();
        handleSave();
        showToast(I18n.t('toastCreditUpdated'));
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

        // Update account
        currentAccount.name = newName;
        currentAccount.currency = newCurrency;

        closeAccountEditModal();
        render();
        handleSave();
        showToast(I18n.t('toastAccountUpdated'));
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
        } else {
            newAccount = Accounts.createAccount(name, currency);
        }

        data.accounts.push(newAccount);
        currentAccountId = newAccount.id;

        closeAccountModal();
        render();
        handleSave();
        showToast(I18n.t('toastAccountCreated'));
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

        // Remove account and its transactions
        data.accounts = data.accounts.filter(a => a.id !== accountId);
        data.transactions = data.transactions.filter(t => t.accountId !== accountId);

        // Select another account
        if (currentAccountId === accountId) {
            currentAccountId = data.accounts[0]?.id || null;
        }

        render();
        handleSave();
        showToast(I18n.t('toastAccountDeleted'));
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
            const transaction = {
                id: Date.now(),
                accountId: currentAccountId,
                desc: desc,
                amt: mode === 'income' ? amount : -amount,
                category: category,
                date: new Date().toISOString()
            };
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
                recurring.active = false;
                render();
                handleSave();
                showToast(I18n.t('toastRecurringCanceled'));
            }
        }
    }

    // --- Rendering ---

    async function showWorkspace() {
        elements.startupScreen.style.display = 'none';
        elements.workspace.style.display = 'block';
        // getFileName may be async in Electron
        const filename = await Promise.resolve(Storage.getFileName(fileHandle));
        elements.fileBadge.textContent = I18n.t('fileBadge', { filename });
    }

    function render() {
        renderAccountTabs();
        renderBalance();
        renderHistory();
        renderBalanceOverview();  // 2025-12-15: Balance overview widget
        renderRecurringWidget();  // 2025-12-15: Recurring expenses widget
        Calendar.renderCalendarWidget();  // 2025-12-15: Calendar widget
    }

    function renderAccountTabs() {
        const tabs = elements.accountTabs;
        tabs.innerHTML = '';

        data.accounts.forEach(account => {
            const isActive = account.id === currentAccountId;
            const canDelete = data.accounts.length > 1;
            // 2025-12-15: Account type icons (credit=card, cash=bills, checking=bank)
            const accountIcon = account.type === 'credit' ? '💳' : account.type === 'cash' ? '💵' : '🏦';

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
        } else {
            // Checking/cash account: Show balance
            elements.balanceLabel.textContent = t('balanceLabel');
            elements.balanceDisplay.textContent = Accounts.formatCurrency(balance, currentAccount.currency);
            elements.balanceDisplay.classList.toggle('negative', balance < 0);
            elements.creditCardInfo.style.display = 'none';

            // 2025-12-15: Show account settings for checking/cash accounts
            elements.accountSettingsInfo.style.display = 'block';
            elements.btnEditAccountSettings.querySelector('[data-i18n="editCreditSettings"]').textContent = t('editCreditSettings');
        }

        elements.accountCurrency.textContent = currentAccount.currency;

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
            li.innerHTML = `
                <div class="item-details">
                    <span class="item-desc">${escapeHtml(t.desc)}</span>
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

        // Separate accounts by type
        const bankAccounts = data.accounts.filter(a => a.type !== 'credit');
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
            } else {
                elements.recurringEmpty.style.display = 'none';

                recurringList.forEach(r => {
                    const account = data.accounts.find(a => a.id === r.accountId);
                    const currency = account?.currency || 'USD';
                    const categoryIcon = getCategoryIcon(r.category);

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
        } catch (error) {
            console.error('Failed to fetch exchange rates:', error);
            if (elements.exchangeUpdated) {
                elements.exchangeUpdated.textContent = I18n.t('exchangeError');
            }
        }
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
