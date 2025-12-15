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
 * - 2025-12-14: Initial creation with basic expense tracking
 * - 2025-12-14: Added i18n integration for English/Spanish
 * - 2025-12-14: Added multi-account support with account tabs
 * - 2025-12-14: Added edit balance feature with adjustment transactions
 * - 2025-12-14: Added "reason for adjustment" field to balance editing
 */

(() => {
    // State
    let fileHandle = null;
    let data = { version: 2, accounts: [], transactions: [] };
    let currentAccountId = null;

    // DOM Elements
    const elements = {
        // Language
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

        // Modal
        accountModal: document.getElementById('account-modal'),
        modalTitle: document.getElementById('modal-title'),
        labelAccountName: document.getElementById('label-account-name'),
        inputAccountName: document.getElementById('input-account-name'),
        labelCurrency: document.getElementById('label-currency'),
        selectCurrency: document.getElementById('select-currency'),
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
        toast: document.getElementById('toast')
    };

    // --- Initialization ---

    async function init() {
        setupLanguage();
        setupEventListeners();
        setupDragAndDrop();
        await checkForRecentFile();
        updateUILanguage();
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
        elements.labelAccountName.textContent = t('accountName');
        elements.inputAccountName.placeholder = t('accountNamePlaceholder');
        elements.labelCurrency.textContent = t('currency');
        elements.btnCancelAccount.querySelector('[data-i18n="cancel"]').textContent = t('cancel');
        elements.btnCreateAccount.querySelector('[data-i18n="createAccount"]').textContent = t('createAccount');

        // Currency options
        elements.selectCurrency.innerHTML = `
            <option value="USD">${t('currencyUSD')}</option>
            <option value="MXN">${t('currencyMXN')}</option>
        `;

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
        try {
            fileHandle = await Storage.createNewFile();
            data = Accounts.createEmptyData();
            currentAccountId = data.accounts[0]?.id || null;
            await Storage.writeFile(fileHandle, data);
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
        elements.inputAccountName.value = '';
        elements.selectCurrency.value = 'USD';
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
        const name = elements.inputAccountName.value.trim();
        const currency = elements.selectCurrency.value;

        if (!name) {
            showToast(I18n.t('toastErrorAccountName'), false);
            elements.inputAccountName.focus();
            return;
        }

        const newAccount = Accounts.createAccount(name, currency);
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
            return;
        }

        const balance = Accounts.calculateBalance(data.transactions, currentAccountId);
        elements.balanceDisplay.textContent = Accounts.formatCurrency(balance, currentAccount.currency);
        elements.balanceDisplay.classList.toggle('negative', balance < 0);
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
