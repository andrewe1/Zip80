/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - WIDGET SYSTEM MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Provides a modular widget system with drag-and-drop reordering and
 * collapsible functionality for sidebar widgets.
 * 
 * KEY FEATURES:
 * - Drag-and-drop reordering using SortableJS
 * - Collapsible widget content with smooth animations
 * - Persistent storage of widget order and collapsed states
 * - Easy registration of new widget types
 * 
 * WIDGET REQUIREMENTS:
 * - Must have class "widget-card"
 * - Must have data-widget-id attribute
 * - Should have .widget-header for drag handle and collapse toggle
 * - Should have .widget-content for collapsible content
 * 
 * USAGE:
 * 1. Call Widgets.init() after DOM is ready
 * 2. Widgets automatically become draggable and collapsible
 * 3. Preferences are saved to localStorage
 * 
 * DEPENDENCIES: SortableJS
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
 * 
 * 3. CONTEXT PRESERVATION:
 *    - Do not remove this Legend.
 *    - Do not remove legacy comments unless explicitly instructed.
 * ==============================================================================
 * 
 * CHANGE LOG:
 * - 2025-12-16: Initial creation with drag-and-drop and collapse functionality
 * - 2025-12-19: Added setEnabled/getEnabled for widget visibility toggling from menu bar
 * - 2025-12-19: Added popout/maximize feature with floating draggable window
 * - 2025-12-19: Added setupPopout(), popoutWidget(), closePopout(), refreshPopoutContent()
 * - 2025-12-19: Added event delegation for interactive elements in popout (buttons, dropdowns, inputs)
 * - 2025-12-19: Popout syncs with original widget and preserves select/input values on refresh
 * - 2025-12-22: Auto-hide docked widget when popped out, auto-show when floating window closes
 * - 2025-12-22: Added setCollapsed() for programmatic collapse/expand without saving preferences
 * - 2025-12-22: Added onBeforeExpand() callback to control widget expansion based on app state
 * - 2025-12-22: Popout windows now respect collapsed state and shrink to header when collapsed
 */

const Widgets = (() => {
    const STORAGE_KEY = 'zip80_widget_preferences';

    // Default widget configuration
    // Add new widgets here with their default settings
    const DEFAULT_WIDGETS = {
        'accounts': { order: 0, collapsed: false, enabled: true, group: 'main' },  // 2025-12-22
        'balance': { order: 1, collapsed: false, enabled: true, group: 'main' },   // 2025-12-22
        'history': { order: 2, collapsed: false, enabled: true, group: 'main' },   // 2025-12-22
        'balance-bank': { order: 3, collapsed: false, enabled: true, group: 'balance-row' },
        'balance-credit': { order: 4, collapsed: false, enabled: true, group: 'balance-row' },
        'balance-crypto': { order: 5, collapsed: false, enabled: true, group: 'balance-row' },
        'calendar': { order: 6, collapsed: false, enabled: true, group: 'sidebar' },
        'recurring': { order: 7, collapsed: false, enabled: true, group: 'bottom-row' },
        'exchange': { order: 8, collapsed: false, enabled: true, group: 'bottom-row' },
        'crypto-rates': { order: 9, collapsed: false, enabled: true, group: 'bottom-row' },
        'activity-log': { order: 10, collapsed: false, enabled: true, group: 'bottom-row' }
    };

    let sortableInstances = [];
    let preferences = {};

    /**
     * Initialize the widget system
     * Call this after DOM is ready
     */
    function init() {
        loadPreferences();
        setupWidgetHeaders();
        restoreCollapsedStates();
        restoreEnabledStates();  // 2025-12-19: Restore visibility
        initSortable();
    }

    /**
     * Load widget preferences from localStorage
     */
    function loadPreferences() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                preferences = JSON.parse(saved);
            } else {
                preferences = JSON.parse(JSON.stringify(DEFAULT_WIDGETS));
            }
        } catch (e) {
            console.error('Failed to load widget preferences:', e);
            preferences = JSON.parse(JSON.stringify(DEFAULT_WIDGETS));
        }
    }

    /**
     * Save widget preferences to localStorage
     */
    function savePreferences() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch (e) {
            console.error('Failed to save widget preferences:', e);
        }
    }

    /**
     * Setup widget headers with collapse toggle and drag handle
     */
    function setupWidgetHeaders() {
        const widgets = document.querySelectorAll('.widget-card[data-widget-id]');

        widgets.forEach(widget => {
            const widgetId = widget.dataset.widgetId;
            const header = widget.querySelector('.widget-header');

            if (!header) return;

            // Add collapse toggle button if not already present
            if (!header.querySelector('.widget-collapse-btn')) {
                const collapseBtn = document.createElement('button');
                collapseBtn.className = 'widget-collapse-btn';
                collapseBtn.innerHTML = '<span class="collapse-icon">▼</span>';
                collapseBtn.title = 'Collapse/Expand';
                collapseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleCollapse(widgetId);
                });
                header.appendChild(collapseBtn);
            }

            // Add drag handle indicator
            if (!header.querySelector('.widget-drag-handle')) {
                const dragHandle = document.createElement('span');
                dragHandle.className = 'widget-drag-handle';
                dragHandle.innerHTML = '⋮⋮';
                dragHandle.title = 'Drag to reorder';
                header.insertBefore(dragHandle, header.firstChild);
            }
        });
    }

    /**
     * Restore collapsed states from preferences
     */
    function restoreCollapsedStates() {
        Object.keys(preferences).forEach(widgetId => {
            if (preferences[widgetId].collapsed) {
                const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
                if (widget) {
                    widget.classList.add('collapsed');
                }
            }
        });
    }

    // 2025-12-22: Callbacks for widgets that need to control expansion behavior
    const beforeExpandCallbacks = {};

    /**
     * Register a callback to be called before a widget expands
     * Return false from the callback to prevent expansion
     * @param {string} widgetId 
     * @param {Function} callback - Returns boolean, false prevents expansion
     */
    function onBeforeExpand(widgetId, callback) {
        beforeExpandCallbacks[widgetId] = callback;
    }

    /**
     * Toggle collapse state for a widget
     * @param {string} widgetId - The widget's data-widget-id value
     */
    function toggleCollapse(widgetId) {
        const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (!widget) return;

        const isCurrentlyCollapsed = widget.classList.contains('collapsed');

        // 2025-12-22: If widget is collapsed and trying to expand, check beforeExpand callback
        if (isCurrentlyCollapsed && beforeExpandCallbacks[widgetId]) {
            const canExpand = beforeExpandCallbacks[widgetId]();
            if (canExpand === false) {
                // Prevent expansion - widget stays collapsed
                return;
            }
        }

        const isCollapsed = widget.classList.toggle('collapsed');

        // Update preferences
        if (!preferences[widgetId]) {
            preferences[widgetId] = { ...DEFAULT_WIDGETS[widgetId] } || { order: 99, collapsed: false };
        }
        preferences[widgetId].collapsed = isCollapsed;
        savePreferences();
    }

    /**
     * 2025-12-22: Set collapsed state for a widget (without saving to preferences)
     * Used for automatic collapse/expand based on app state (e.g., no account selected)
     * @param {string} widgetId - The widget's data-widget-id value
     * @param {boolean} collapsed - Whether the widget should be collapsed
     */
    function setCollapsed(widgetId, collapsed) {
        const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (!widget) return;

        if (collapsed) {
            widget.classList.add('collapsed');
        } else {
            widget.classList.remove('collapsed');
        }

        // Also update any popout window for this widget
        const popoutWin = document.querySelector(`#popout-${widgetId}`);
        if (popoutWin) {
            const content = popoutWin.querySelector('.widget-popout-content');
            if (collapsed) {
                // Collapse popout: hide content and shrink window
                if (content) content.style.display = 'none';
                popoutWin.classList.add('collapsed');
                // Store original height and shrink
                if (!popoutWin.dataset.originalHeight) {
                    popoutWin.dataset.originalHeight = popoutWin.style.height || getComputedStyle(popoutWin).height;
                }
                popoutWin.style.height = 'auto';
                popoutWin.style.minHeight = '50px';
            } else {
                // Expand popout: show content and restore height
                if (content) content.style.display = '';
                popoutWin.classList.remove('collapsed');
                if (popoutWin.dataset.originalHeight) {
                    popoutWin.style.height = popoutWin.dataset.originalHeight;
                    popoutWin.style.minHeight = '';
                }
            }
        }
    }

    /**
     * 2025-12-19: Set enabled state for a widget (show/hide)
     * @param {string} widgetId - The widget's data-widget-id value
     * @param {boolean} enabled - Whether the widget should be visible
     */
    function setEnabled(widgetId, enabled) {
        const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (widget) {
            widget.style.display = enabled ? '' : 'none';
        }

        // Update preferences
        if (!preferences[widgetId]) {
            preferences[widgetId] = { ...DEFAULT_WIDGETS[widgetId] } || { order: 99, collapsed: false, enabled: true };
        }
        preferences[widgetId].enabled = enabled;
        savePreferences();
    }

    /**
     * 2025-12-19: Check if a widget is enabled (visible)
     * @param {string} widgetId - The widget's data-widget-id value
     * @returns {boolean} True if enabled
     */
    function getEnabled(widgetId) {
        return preferences[widgetId]?.enabled !== false;  // Default to true if not set
    }

    /**
     * 2025-12-19: Restore enabled/disabled states from preferences
     */
    function restoreEnabledStates() {
        Object.keys(preferences).forEach(widgetId => {
            if (preferences[widgetId].enabled === false) {
                const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
                if (widget) {
                    widget.style.display = 'none';
                }
            }
        });
    }

    /**
     * Initialize SortableJS for drag-and-drop functionality
     * 2025-12-16: Simplified to avoid nested sortable conflicts
     */
    function initSortable() {
        // Check if SortableJS is available
        if (typeof Sortable === 'undefined') {
            console.error('Widgets: SortableJS not loaded!');
            return;
        }

        // Destroy any existing instances
        sortableInstances.forEach(instance => instance.destroy());
        sortableInstances = [];

        console.log('Widgets: Initializing SortableJS...');

        // Make widgets within each row swappable (Bank/Credit, Recurring/Exchange)
        const widgetRows = document.querySelectorAll('.balance-widgets-row');
        console.log('Widgets: Found', widgetRows.length, 'widget rows');

        widgetRows.forEach((row, index) => {
            const widgets = row.querySelectorAll('.widget-card');
            console.log('Widgets: Row', index, 'has', widgets.length, 'widgets');

            if (widgets.length > 1) {
                const sortable = new Sortable(row, {
                    animation: 200,
                    handle: '.widget-drag-handle',
                    ghostClass: 'widget-ghost',
                    chosenClass: 'widget-chosen',
                    dragClass: 'widget-drag',
                    draggable: '.widget-card',
                    onStart: function (evt) {
                        console.log('Widgets: Drag started on', evt.item.dataset.widgetId);
                    },
                    onEnd: handleDragEnd
                });
                sortableInstances.push(sortable);
            }
        });

        // Make the main sidebar sortable for reordering rows and standalone widgets
        const sidebar = document.querySelector('.workspace-sidebar');
        if (sidebar) {
            const directChildren = sidebar.querySelectorAll(':scope > .card.widget-card, :scope > .balance-widgets-row');
            console.log('Widgets: Sidebar has', directChildren.length, 'draggable children');

            const sidebarSortable = new Sortable(sidebar, {
                animation: 200,
                handle: '.widget-drag-handle',
                ghostClass: 'widget-ghost',
                chosenClass: 'widget-chosen',
                dragClass: 'widget-drag',
                draggable: '.card.widget-card, .balance-widgets-row',
                onStart: function (evt) {
                    console.log('Widgets: Sidebar drag started');
                },
                onEnd: handleDragEnd
            });
            sortableInstances.push(sidebarSortable);
        }

        console.log('Widgets: Created', sortableInstances.length, 'Sortable instances');
    }

    /**
     * Handle drag end event - save new order
     * @param {Event} evt - SortableJS event object
     */
    function handleDragEnd(evt) {
        // Get all widgets in their new order
        const sidebar = document.querySelector('.workspace-sidebar');
        if (!sidebar) return;

        let order = 0;

        // Walk through all widgets and update their order
        sidebar.querySelectorAll('[data-widget-id]').forEach(widget => {
            const widgetId = widget.dataset.widgetId;
            if (!preferences[widgetId]) {
                preferences[widgetId] = { order: 0, collapsed: false };
            }
            preferences[widgetId].order = order++;
        });

        savePreferences();
    }

    /**
     * Get the current order of widgets
     * @returns {Array} Array of widget IDs in order
     */
    function getWidgetOrder() {
        return Object.entries(preferences)
            .sort((a, b) => a[1].order - b[1].order)
            .map(entry => entry[0]);
    }

    /**
     * Check if a widget is collapsed
     * @param {string} widgetId - The widget's data-widget-id value
     * @returns {boolean} True if collapsed
     */
    function isCollapsed(widgetId) {
        return preferences[widgetId]?.collapsed || false;
    }

    /**
     * Register a new widget type (for future extensibility)
     * @param {string} widgetId - Unique identifier for the widget
     * @param {object} config - Configuration object { order, collapsed, group }
     */
    function registerWidget(widgetId, config = {}) {
        if (!preferences[widgetId]) {
            preferences[widgetId] = {
                order: config.order ?? Object.keys(preferences).length,
                collapsed: config.collapsed ?? false,
                group: config.group ?? 'main'
            };
            savePreferences();
        }
    }

    /**
     * Reset all widget preferences to defaults
     */
    function resetToDefaults() {
        preferences = JSON.parse(JSON.stringify(DEFAULT_WIDGETS));
        savePreferences();

        // Remove collapsed classes
        document.querySelectorAll('.widget-card.collapsed').forEach(widget => {
            widget.classList.remove('collapsed');
        });
    }

    // 2025-12-19: Multi-popout functionality
    const activePopouts = new Map(); // Map<widgetId, { window: HTMLElement, observer: MutationObserver }>
    let topZIndex = 10000;
    let dragTarget = null;
    let dragOffset = { x: 0, y: 0 };

    /**
     * Setup popout functionality
     * Adds maximize buttons to widget headers and sets up global handlers
     */
    function setupPopout() {
        // Add maximize button to each widget header
        document.querySelectorAll('.widget-header').forEach(header => {
            const widget = header.closest('.widget-card');
            if (!widget) return;

            const widgetId = widget.dataset.widgetId;
            if (!widgetId) return;

            // Avoid double-adding
            if (header.querySelector('.widget-maximize-btn')) return;

            // Create maximize button
            const maxBtn = document.createElement('button');
            maxBtn.className = 'widget-maximize-btn';
            maxBtn.innerHTML = '⛶';
            maxBtn.title = 'Pop out widget';
            maxBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                popoutWidget(widgetId);
            });

            // Insert before the title or as first child
            header.insertBefore(maxBtn, header.firstChild);
        });

        // Global Escape key to close focused popout
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Find popout with highest z-index
                let highestZ = -1;
                let topWidgetId = null;
                activePopouts.forEach((win, id) => {
                    const z = parseInt(win.style.zIndex || 0);
                    if (z > highestZ) {
                        highestZ = z;
                        topWidgetId = id;
                    }
                });
                if (topWidgetId) closePopout(topWidgetId);
            }
        });

        // Global move/up handlers for dragging
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // Global click handler to bring to front
        document.addEventListener('mousedown', (e) => {
            const win = e.target.closest('.widget-popout-window');
            if (win) {
                const widgetId = win.dataset.widgetId;
                if (widgetId) focusPopout(widgetId);
            }
        });
    }

    /**
     * Create a new popout window element
     * @param {string} widgetId
     * @param {string} title
     * @returns {HTMLElement}
     */
    function createPopoutElement(widgetId, title) {
        const win = document.createElement('div');
        win.className = 'widget-popout-window';
        win.id = `popout-${widgetId}`;
        win.dataset.widgetId = widgetId;
        win.style.zIndex = ++topZIndex;

        win.innerHTML = `
            <div class="widget-popout-header">
                <span class="widget-popout-title">${title}</span>
                <button class="widget-popout-close" title="Close">✕</button>
            </div>
            <div class="widget-popout-content"></div>
        `;

        // Close button handler
        const closeBtn = win.querySelector('.widget-popout-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closePopout(widgetId);
        });

        // Drag handler
        const header = win.querySelector('.widget-popout-header');
        header.addEventListener('mousedown', (e) => startDrag(win, e));

        // Event delegation for interactive elements in this specific popout
        const content = win.querySelector('.widget-popout-content');

        // Chart range buttons
        content.addEventListener('click', (e) => {
            const rangeBtn = e.target.closest('.chart-range-btn');
            if (rangeBtn) {
                const days = parseInt(rangeBtn.dataset.days);
                const origWidget = document.querySelector(`.widget-card[data-widget-id="${widgetId}"]`);
                if (origWidget) {
                    const origBtn = origWidget.querySelector(`.chart-range-btn[data-days="${days}"]`);
                    if (origBtn) {
                        origBtn.click(); // Trigger original behavior
                        // Popout refresh is handled by the overall refresh loop if necessary, 
                        // but here we manually refresh to be snappy
                        setTimeout(() => refreshPopoutContent(widgetId), 500);
                    }
                }
            }
        });

        // Dropdown changes & Input events
        content.addEventListener('change', (e) => syncToOriginal(widgetId, e));
        content.addEventListener('input', (e) => syncToOriginal(widgetId, e));

        document.body.appendChild(win);
        return win;
    }

    /**
     * Sync actions in popout to original widget
     */
    function syncToOriginal(widgetId, e) {
        const origWidget = document.querySelector(`.widget-card[data-widget-id="${widgetId}"]`);
        if (!origWidget) return;

        const origEl = origWidget.querySelector(`#${e.target.id}`);
        if (origEl) {
            origEl.value = e.target.value;
            origEl.dispatchEvent(new Event(e.type));
            setTimeout(() => refreshPopoutContent(widgetId), e.type === 'input' ? 300 : 500);
        }
    }

    /**
     * Bring popout to front
     */
    function focusPopout(widgetId) {
        const entry = activePopouts.get(widgetId);
        if (entry && entry.window && parseInt(entry.window.style.zIndex) < topZIndex) {
            entry.window.style.zIndex = ++topZIndex;
        }
    }

    /**
     * Pop out a widget into the floating window
     * @param {string} widgetId - The widget's data-widget-id value
     */
    function popoutWidget(widgetId) {
        // If already open, just focus it
        if (activePopouts.has(widgetId)) {
            focusPopout(widgetId);
            return;
        }

        const widget = document.querySelector(`.widget-card[data-widget-id="${widgetId}"]`);
        if (!widget) return;

        // Get title text
        const titleEl = widget.querySelector('.widget-title');
        const title = titleEl ? titleEl.textContent : widgetId;

        // Create window
        const win = createPopoutElement(widgetId, title);

        // Setup MutationObserver to sync content automatically when the original widget changes
        const content = widget.querySelector('.widget-content');
        const observer = new MutationObserver(() => {
            refreshPopoutContent(widgetId);
        });

        if (content) {
            observer.observe(content, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true // Watch for class/style changes too
            });
        }

        activePopouts.set(widgetId, { window: win, observer });

        // Populate and position
        refreshPopoutContent(widgetId);

        // Show temporarily to get dimensions, then position
        win.style.display = 'block';
        win.style.visibility = 'hidden';

        const rect = win.getBoundingClientRect();
        const centerX = (window.innerWidth - rect.width) / 2 + (activePopouts.size * 20); // Stack offset
        const centerY = (window.innerHeight - rect.height) / 2 + (activePopouts.size * 20);

        win.style.left = centerX + 'px';
        win.style.top = Math.max(50, centerY) + 'px';
        win.style.visibility = 'visible';

        // 2025-12-22: Auto-hide the docked widget when popped out
        widget.style.display = 'none';

        // 2025-12-22: If the docked widget is collapsed, collapse the popout too
        if (widget.classList.contains('collapsed')) {
            const popoutContent = win.querySelector('.widget-popout-content');
            if (popoutContent) popoutContent.style.display = 'none';
            win.classList.add('collapsed');
            win.style.height = 'auto';
            win.style.minHeight = '50px';
        }
    }

    /**
     * Close a specific popout window
     * @param {string} widgetId
     */
    function closePopout(widgetId) {
        const entry = activePopouts.get(widgetId);
        if (entry) {
            if (entry.observer) entry.observer.disconnect();
            if (entry.window) entry.window.remove();
            activePopouts.delete(widgetId);

            // 2025-12-22: Auto-show the docked widget when popout is closed
            const widget = document.querySelector(`.widget-card[data-widget-id="${widgetId}"]`);
            if (widget) {
                widget.style.display = '';
            }
        }
    }

    /**
     * Hide all popout windows (but keep them in memory)
     * 2025-12-19: Used when closing vault to hide floating widgets without destroying them
     */
    function hideAllPopouts() {
        activePopouts.forEach((entry) => {
            if (entry.window) entry.window.style.display = 'none';
        });
    }

    /**
     * Show all popout windows that were previously hidden
     * 2025-12-19: Used when opening vault to restore floating widgets
     */
    function showAllPopouts() {
        activePopouts.forEach((entry, widgetId) => {
            if (entry.window) {
                entry.window.style.display = 'block';
                // Refresh content in case data changed
                refreshPopoutContent(widgetId);
            }
        });
    }

    /**
     * Refresh popout content from the original widget
     * @param {string} widgetId
     */
    function refreshPopoutContent(widgetId) {
        const entry = activePopouts.get(widgetId);
        if (!entry || !entry.window) return;

        const widget = document.querySelector(`.widget-card[data-widget-id="${widgetId}"]`);
        if (!widget) return;

        const content = widget.querySelector('.widget-content');
        const popoutContent = entry.window.querySelector('.widget-popout-content');
        if (!content || !popoutContent) return;

        // Copy HTML
        popoutContent.innerHTML = content.innerHTML;

        // Sync values
        widget.querySelectorAll('select, input').forEach(origEl => {
            const popoutEl = popoutContent.querySelector(`#${origEl.id}`);
            if (popoutEl) popoutEl.value = origEl.value;
        });
    }

    function startDrag(win, e) {
        if (e.target.classList.contains('widget-popout-close')) return;
        dragTarget = win;
        const rect = win.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        focusPopout(win.dataset.widgetId);
    }

    function drag(e) {
        if (!dragTarget) return;
        e.preventDefault();
        dragTarget.style.left = (e.clientX - dragOffset.x) + 'px';
        dragTarget.style.top = (e.clientY - dragOffset.y) + 'px';
    }

    function stopDrag() {
        dragTarget = null;
    }

    // Public API
    return {
        init,
        toggleCollapse,
        setCollapsed,  // 2025-12-22: For auto-collapse/expand based on app state
        onBeforeExpand,  // 2025-12-22: Register callback to control expansion
        isCollapsed,
        setEnabled,
        getEnabled,
        getWidgetOrder,
        registerWidget,
        resetToDefaults,
        setupPopout,
        popoutWidget,
        closePopout,
        hideAllPopouts,
        showAllPopouts
    };
})();
