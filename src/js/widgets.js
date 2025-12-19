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
 */

const Widgets = (() => {
    const STORAGE_KEY = 'zip80_widget_preferences';

    // Default widget configuration
    // Add new widgets here with their default settings
    const DEFAULT_WIDGETS = {
        'balance-bank': { order: 0, collapsed: false, enabled: true, group: 'balance-row' },
        'balance-credit': { order: 1, collapsed: false, enabled: true, group: 'balance-row' },
        'balance-crypto': { order: 2, collapsed: false, enabled: true, group: 'balance-row' },
        'calendar': { order: 3, collapsed: false, enabled: true, group: 'main' },
        'recurring': { order: 4, collapsed: false, enabled: true, group: 'bottom-row' },
        'exchange': { order: 5, collapsed: false, enabled: true, group: 'bottom-row' },
        'crypto-rates': { order: 6, collapsed: false, enabled: true, group: 'bottom-row' },  // 2025-12-19
        'activity-log': { order: 7, collapsed: false, enabled: true, group: 'bottom-row' }
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

    /**
     * Toggle collapse state for a widget
     * @param {string} widgetId - The widget's data-widget-id value
     */
    function toggleCollapse(widgetId) {
        const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (!widget) return;

        const isCollapsed = widget.classList.toggle('collapsed');

        // Update preferences
        if (!preferences[widgetId]) {
            preferences[widgetId] = { ...DEFAULT_WIDGETS[widgetId] } || { order: 99, collapsed: false };
        }
        preferences[widgetId].collapsed = isCollapsed;
        savePreferences();
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

    // Public API
    return {
        init,
        toggleCollapse,
        isCollapsed,
        setEnabled,
        getEnabled,
        getWidgetOrder,
        registerWidget,
        resetToDefaults
    };
})();
