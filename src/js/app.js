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
        creditBalanceLabel: document.getElementById('credit-balance-label'),
        creditBalanceValue: document.getElementById('credit-balance-value'),
        creditLimitLabel: document.getElementById('credit-limit-label'),
        creditLimitValue: document.getElementById('credit-limit-value'),
        creditDatesLabel: document.getElementById('credit-dates-label'),
        creditDatesValue: document.getElementById('credit-dates-value'),

        // Form
        addTransactionTitle: document.getElementById('add-transaction-title'),
        inputDesc: document.getElementById('input-desc'),
        inputAmount: document.getElementById('input-amount'),
        btnIncome: document.getElementById('btn-income'),
        btnExpense: document.getElementById('btn-expense'),

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

        // Balance Overview Widget (2025-12-15)
        balanceOverviewTitle: document.getElementById('balance-overview-title'),
        balanceOverviewList: document.getElementById('balance-overview-list'),
        totalPositiveLabel: document.getElementById('total-positive-label'),
        totalPositiveValue: document.getElementById('total-positive-value'),
        totalNegativeLabel: document.getElementById('total-negative-label'),
        totalNegativeValue: document.getElementById('total-negative-value'),
        totalNetLabel: document.getElementById('total-net-label'),
        totalNetValue: document.getElementById('total-net-value'),

        // Vault Modal (2025-12-15)
        vaultModal: document.getElementById('vault-modal'),
        vaultModalTitle: document.getElementById('vault-modal-title'),
        vaultModalDesc: document.getElementById('vault-modal-desc'),
        labelVaultLanguage: document.getElementById('label-vault-language'),
        selectVaultLanguage: document.getElementById('select-vault-language'),
        labelVaultCurrency: document.getElementById('label-vault-currency'),
        selectVaultCurrency: document.getElementById('select-vault-currency'),
        labelVaultAccount: document.getElementById('label-vault-account'),
        inputVaultAccount: document.getElementById('input-vault-account'),
        btnCancelVault: document.getElementById('btn-cancel-vault'),
        btnCreateVault: document.getElementById('btn-create-vault')
    };

    // --- Initialization ---

    async function init() {
        setupTheme();  // 2025-12-15: Theme toggle
        setupLanguage();
        setupEventListeners();
        setupDragAndDrop();
        setupCreditCardUI();  // 2025-12-15: Credit card setup
        await checkForRecentFile();
        updateUILanguage();
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

        // Accounts
        elements.accountsTitle.textContent = t('accountsTitle');
        elements.btnNewAccount.querySelector('[data-i18n="newAccount"]').textContent = t('newAccount');

        // Balance
        elements.balanceLabel.textContent = t('balanceLabel');

        // Form
        elements.addTransactionTitle.textContent = t('addTransactionTitle');
        elements.inputDesc.placeholder = t('inputDescPlaceholder');
        elements.inputAmount.placeholder = t('inputAmountPlaceholder');
        elements.btnIncome.querySelector('[data-i18n="btnIncome"]').textContent = t('btnIncome');
        elements.btnExpense.querySelector('[data-i18n="btnExpense"]').textContent = t('btnExpense');

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
            updateResumeButton(Storage.getFileName(fileHandle));
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
            }
        } catch (e) {
            console.log('No recent file found');
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
        elements.btnIncome.addEventListener('click', () => addTransaction('income'));
        elements.btnExpense.addEventListener('click', () => addTransaction('expense'));
        elements.btnExport.addEventListener('click', handleExport);

        // Account buttons
        elements.btnNewAccount.addEventListener('click', openAccountModal);
        elements.btnCancelAccount.addEventListener('click', closeAccountModal);
        elements.btnCreateAccount.addEventListener('click', handleCreateAccount);
        elements.accountModal.querySelector('.modal-backdrop').addEventListener('click', closeAccountModal);

        // Enter key on inputs
        elements.inputAmount.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTransaction('expense');
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

        elements.inputVaultAccount.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCreateVault();
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

        // Set current language as default selection
        elements.selectVaultLanguage.value = I18n.getLanguage();

        // Set USD as default currency
        elements.selectVaultCurrency.value = 'USD';

        // Clear account name and set placeholder
        elements.inputVaultAccount.value = '';
        elements.inputVaultAccount.placeholder = t('vaultAccountPlaceholder');

        // Update modal labels
        elements.vaultModalTitle.textContent = t('vaultModalTitle');
        elements.vaultModalDesc.textContent = t('vaultModalDesc');
        elements.labelVaultLanguage.textContent = t('vaultLanguage');
        elements.labelVaultCurrency.textContent = t('vaultCurrency');
        elements.labelVaultAccount.textContent = t('vaultAccountName');
        elements.btnCancelVault.querySelector('[data-i18n="cancel"]').textContent = t('cancel');
        elements.btnCreateVault.querySelector('[data-i18n="createVault"]').textContent = t('createVault');

        // Update currency options
        elements.selectVaultCurrency.innerHTML = `
            <option value="USD">${t('currencyUSD')}</option>
            <option value="MXN">${t('currencyMXN')}</option>
        `;

        elements.vaultModal.style.display = 'flex';
        elements.inputVaultAccount.focus();
    }

    function closeVaultModal() {
        elements.vaultModal.style.display = 'none';
    }

    async function handleCreateVault() {
        const selectedLanguage = elements.selectVaultLanguage.value;
        const selectedCurrency = elements.selectVaultCurrency.value;
        const accountName = elements.inputVaultAccount.value.trim() || 'Main Account';

        // Apply language selection
        I18n.setLanguage(selectedLanguage);
        elements.langSelect.value = selectedLanguage;

        try {
            fileHandle = await Storage.createNewFile();

            // Create data with selected settings
            data = Accounts.createEmptyData();

            // Update the default account with selected currency and name
            if (data.accounts.length > 0) {
                data.accounts[0].name = accountName;
                data.accounts[0].currency = selectedCurrency;
            }

            currentAccountId = data.accounts[0]?.id || null;
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
        try {
            fileHandle = await Storage.reopenLastFile();
            await loadFileAndShow();
        } catch (err) {
            showToast(I18n.t('toastErrorReopen'), false);
        }
    }

    async function loadFileAndShow() {
        try {
            data = await Storage.readFile(fileHandle);
            // Set current account to first one
            currentAccountId = data.accounts[0]?.id || null;
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

    // --- Account Operations ---

    function openAccountModal() {
        // Reset form fields
        elements.selectAccountType.value = 'checking';
        elements.inputAccountName.value = '';
        elements.selectCurrency.value = 'USD';
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
        const newBalanceStr = elements.inputNewBalance.value;
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

        // 2025-12-15: Create credit card or checking account based on type
        if (accountType === 'credit') {
            const creditLimit = elements.inputCreditLimit.value;
            const paymentDueDay = elements.selectPaymentDueDay.value;
            const statementCloseDay = elements.selectStatementCloseDay.value;

            newAccount = Accounts.createCreditCardAccount(
                name, currency, creditLimit, paymentDueDay, statementCloseDay
            );
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

    function deleteAccount(accountId) {
        if (data.accounts.length <= 1) {
            return; // Don't delete the last account
        }

        if (!confirm(I18n.t('confirmDeleteAccount'))) {
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

    function addTransaction(type) {
        if (!currentAccountId) {
            return;
        }

        const desc = elements.inputDesc.value.trim();
        const amountStr = elements.inputAmount.value;
        const amount = parseFloat(amountStr);

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

        const transaction = {
            id: Date.now(),
            accountId: currentAccountId,
            desc: desc,
            amt: type === 'income' ? amount : -amount,
            date: new Date().toISOString()
        };

        data.transactions.push(transaction);

        elements.inputDesc.value = '';
        elements.inputAmount.value = '';
        elements.inputDesc.focus();

        render();
        handleSave();
    }

    function deleteTransaction(id) {
        if (confirm(I18n.t('confirmDelete'))) {
            data.transactions = data.transactions.filter(t => t.id !== id);
            render();
            handleSave();
        }
    }

    // --- Rendering ---

    function showWorkspace() {
        elements.startupScreen.style.display = 'none';
        elements.workspace.style.display = 'block';
        elements.fileBadge.textContent = I18n.t('fileBadge', { filename: Storage.getFileName(fileHandle) });
    }

    function render() {
        renderAccountTabs();
        renderBalance();
        renderHistory();
        renderBalanceOverview();  // 2025-12-15: Balance overview widget
        Calendar.renderCalendarWidget();  // 2025-12-15: Calendar widget
    }

    function renderAccountTabs() {
        const tabs = elements.accountTabs;
        tabs.innerHTML = '';

        data.accounts.forEach(account => {
            const isActive = account.id === currentAccountId;
            const canDelete = data.accounts.length > 1;

            const tab = document.createElement('button');
            tab.className = `account-tab ${isActive ? 'active' : ''}`;
            tab.innerHTML = `
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
        if (!currentAccount) {
            elements.balanceDisplay.textContent = '$0.00';
            elements.accountCurrency.textContent = '';
            elements.creditCardInfo.style.display = 'none';
            return;
        }

        const balance = Accounts.calculateBalance(data.transactions, currentAccountId);
        const t = I18n.t;

        // 2025-12-15: Different display for credit cards vs checking
        if (currentAccount.type === 'credit') {
            // Credit card: Show available credit as main number
            const availableCredit = Accounts.calculateAvailableCredit(currentAccount, data.transactions);

            elements.balanceLabel.textContent = t('availableCredit');
            elements.balanceDisplay.textContent = Accounts.formatCurrency(availableCredit, currentAccount.currency);
            elements.balanceDisplay.classList.toggle('negative', availableCredit < 0);

            // Show credit card details
            elements.creditCardInfo.style.display = 'block';
            elements.creditBalanceLabel.textContent = t('currentBalance') + ':';
            elements.creditBalanceValue.textContent = Accounts.formatCurrency(balance, currentAccount.currency);
            elements.creditLimitLabel.textContent = t('creditLimit') + ':';
            elements.creditLimitValue.textContent = Accounts.formatCurrency(currentAccount.creditLimit, currentAccount.currency);
            elements.creditDatesLabel.textContent = `${t('dueDay')}: ${currentAccount.paymentDueDay}`;
            elements.creditDatesValue.textContent = `${t('closesDay')}: ${currentAccount.statementCloseDay}`;
        } else {
            // Checking account: Show balance
            elements.balanceLabel.textContent = t('balanceLabel');
            elements.balanceDisplay.textContent = Accounts.formatCurrency(balance, currentAccount.currency);
            elements.balanceDisplay.classList.toggle('negative', balance < 0);
            elements.creditCardInfo.style.display = 'none';
        }

        elements.accountCurrency.textContent = currentAccount.currency;
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
        const list = elements.balanceOverviewList;
        list.innerHTML = '';

        // Update title
        if (elements.balanceOverviewTitle) {
            elements.balanceOverviewTitle.textContent = t('balanceOverview');
        }

        // Track totals by category
        let totalPositive = 0;
        let totalNegative = 0;

        data.accounts.forEach(account => {
            const balance = Accounts.calculateBalance(data.transactions, account.id);
            const isActive = account.id === currentAccountId;

            // Determine display value based on account type
            let displayValue;
            let amountOwed = 0;  // 2025-12-15: Track amount owed for credit cards
            if (account.type === 'credit') {
                // For credit cards, show available credit
                displayValue = Accounts.calculateAvailableCredit(account, data.transactions);
                // Amount owed is the absolute value of negative balance
                amountOwed = Math.abs(balance);
            } else {
                displayValue = balance;
            }

            // Track totals - credit cards: positive if available credit exists
            if (displayValue >= 0) {
                totalPositive += displayValue;
            } else {
                totalNegative += displayValue;
            }

            const item = document.createElement('div');
            item.className = `balance-overview-item${isActive ? ' active' : ''}`;

            // 2025-12-15: Credit cards show available credit + amount owed
            const owedHtml = account.type === 'credit'
                ? `<span class="balance-account-owed">${t('amountOwed')}: <span class="negative">${Accounts.formatCurrency(amountOwed, account.currency)}</span></span>`
                : '';

            item.innerHTML = `
                <div class="balance-account-info">
                    <span class="balance-account-name">${escapeHtml(account.name)}</span>
                    <span class="balance-account-currency">${account.currency}${account.type === 'credit' ? ' • Credit' : ''}</span>
                    ${owedHtml}
                </div>
                <span class="balance-account-value ${displayValue >= 0 ? 'positive' : 'negative'}">
                    ${displayValue >= 0 ? '' : '-'}${Accounts.formatCurrency(displayValue, account.currency)}
                </span>
            `;

            // Click to select account
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => selectAccount(account.id));

            list.appendChild(item);
        });

        // Update totals
        // Note: We're showing totals in a simple format since currencies may differ
        if (elements.totalPositiveLabel) {
            elements.totalPositiveLabel.textContent = t('totalPositive');
            elements.totalPositiveValue.textContent = `$${totalPositive.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        if (elements.totalNegativeLabel) {
            elements.totalNegativeLabel.textContent = t('totalNegative');
            elements.totalNegativeValue.textContent = `$${Math.abs(totalNegative).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        if (elements.totalNetLabel) {
            const netTotal = totalPositive + totalNegative;
            elements.totalNetLabel.textContent = t('totalNet');
            elements.totalNetValue.textContent = `${netTotal >= 0 ? '' : '-'}$${Math.abs(netTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            elements.totalNetValue.className = netTotal >= 0 ? '' : 'negative';
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
