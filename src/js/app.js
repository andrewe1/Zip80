/**
 * Zip80 Expense Tracker - Main Application
 * Features: i18n support, autosave on all transactions
 */

(() => {
    // State
    let fileHandle = null;
    let transactions = [];

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

        // Balance
        balanceLabel: document.getElementById('balance-label'),
        balanceDisplay: document.getElementById('balance-display'),

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
        // Set initial language in dropdown
        elements.langSelect.value = I18n.getLanguage();

        // Listen for language changes
        elements.langSelect.addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
            updateUILanguage();
            render(); // Re-render to update dynamic content
        });
    }

    /**
     * Update all UI text based on current language
     */
    function updateUILanguage() {
        const t = I18n.t;

        // Startup screen
        elements.appTitle.textContent = t('appTitle');
        elements.appSubtitle.innerHTML = `${t('appSubtitle')}<br>${t('appSubtitleDrag')}`;
        elements.btnOpen.querySelector('[data-i18n="btnOpen"]').textContent = t('btnOpen');
        elements.btnNew.querySelector('[data-i18n="btnNew"]').textContent = t('btnNew');

        // Header
        elements.btnSave.querySelector('[data-i18n="btnSave"]').textContent = t('btnSave');

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

        // Update resume button if visible
        if (elements.btnResume.style.display !== 'none' && fileHandle) {
            updateResumeButton(Storage.getFileName(fileHandle));
        }

        // Update HTML lang attribute
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

        // Enter key on inputs
        elements.inputAmount.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTransaction('expense');
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
        try {
            fileHandle = await Storage.createNewFile();
            transactions = [];
            await Storage.writeFile(fileHandle, transactions);
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
            transactions = await Storage.readFile(fileHandle);
            showWorkspace();
            render();
        } catch (err) {
            showToast(I18n.t('toastErrorRead'), false);
        }
    }

    async function handleSave() {
        if (!fileHandle) return;

        try {
            await Storage.writeFile(fileHandle, transactions);
            showToast(I18n.t('toastSaved'));
        } catch (err) {
            showToast(I18n.t('toastErrorSave'), false);
        }
    }

    function handleExport() {
        const timestamp = new Date().toISOString().split('T')[0];
        Storage.exportToJSON(transactions, `zip80_export_${timestamp}.json`);
        showToast(I18n.t('toastExported'));
    }

    // --- Transaction Operations ---

    function addTransaction(type) {
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
            desc: desc,
            amt: type === 'income' ? amount : -amount,
            date: new Date().toISOString()
        };

        transactions.push(transaction);

        // Clear inputs
        elements.inputDesc.value = '';
        elements.inputAmount.value = '';
        elements.inputDesc.focus();

        render();
        handleSave(); // Auto-save on every transaction
    }

    function deleteTransaction(id) {
        if (confirm(I18n.t('confirmDelete'))) {
            transactions = transactions.filter(t => t.id !== id);
            render();
            handleSave(); // Auto-save after delete
        }
    }

    // --- Rendering ---

    function showWorkspace() {
        elements.startupScreen.style.display = 'none';
        elements.workspace.style.display = 'block';
        elements.fileBadge.textContent = I18n.t('fileBadge', { filename: Storage.getFileName(fileHandle) });
    }

    function render() {
        renderBalance();
        renderHistory();
    }

    function renderBalance() {
        const total = transactions.reduce((acc, t) => acc + t.amt, 0);
        elements.balanceDisplay.textContent = formatCurrency(total);
        elements.balanceDisplay.classList.toggle('negative', total < 0);
    }

    function renderHistory() {
        const list = elements.historyList;
        list.innerHTML = '';

        if (transactions.length === 0) {
            elements.emptyState.style.display = 'block';
            return;
        }

        elements.emptyState.style.display = 'none';

        // Sort by date descending (newest first)
        const sorted = [...transactions].sort((a, b) => b.id - a.id);

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
                        ${isIncome ? '+' : ''}${formatCurrency(t.amt)}
                    </span>
                    <button class="btn-icon-only calendar" title="${I18n.t('btnCalendarTitle')}" data-id="${t.id}">
                        📅
                    </button>
                    <button class="btn-icon-only delete" title="${I18n.t('btnDeleteTitle')}" data-id="${t.id}">
                        ✕
                    </button>
                </div>
            `;

            // Event listeners
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

    function formatCurrency(amount) {
        return '$' + Math.abs(amount).toFixed(2);
    }

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
