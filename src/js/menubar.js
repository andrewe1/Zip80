/*
==============================================================================
FILE MAINTENANCE & AI PROTOCOL
1. CHANGE LOG: 
   - [2025-12-17] - [Init] - Created menu bar controller with view modes and options dropdown
   - [2025-12-17] - [Edit] - Added save status indicator functions (setSaveStatus)
   - [2025-12-19] - [Edit] - Added widgets dropdown, historical view panel switching, removed compact view
2. INSTRUCTION:
   - When editing this file, always update the Change Log above.
   - Explain the "WHY" behind complex logic in inline comments.
3. PRESERVATION:
   - Do not remove this header block.
==============================================================================

PURPOSE:
Menu bar controller for Zip80 Expense Tracker.
Handles view mode switching and options dropdown interactions.

EXPORTS:
- MenuBar (global object with init method)

DEPENDENCIES:
- None (standalone, but integrates with app.js)
*/

const MenuBar = (function () {
    'use strict';

    // --- DOM References ---
    let menuBar;
    let viewModeButtons;
    let optionsButton;
    let optionsDropdown;
    let dropdownItems;
    // 2025-12-19: Widgets dropdown
    let widgetsButton;
    let widgetsDropdown;

    // --- State ---
    let currentViewMode = 'standard';
    let optionsDropdownOpen = false;
    let widgetsDropdownOpen = false;

    /**
     * Initialize the menu bar functionality
     * Called after DOM is ready
     */
    function init() {
        // Get DOM references
        menuBar = document.getElementById('menu-bar');
        if (!menuBar) {
            console.warn('MenuBar: #menu-bar not found in DOM');
            return;
        }

        viewModeButtons = menuBar.querySelectorAll('.menu-btn-view');
        optionsButton = document.getElementById('btn-options');
        optionsDropdown = document.getElementById('options-dropdown');
        dropdownItems = optionsDropdown ? optionsDropdown.querySelectorAll('.dropdown-item') : [];

        // 2025-12-19: Widgets dropdown references
        widgetsButton = document.getElementById('btn-widgets');
        widgetsDropdown = document.getElementById('widgets-dropdown');

        // Bind event listeners
        bindViewModeEvents();
        bindOptionsDropdownEvents();
        bindWidgetsDropdownEvents();  // 2025-12-19
        bindClickOutsideHandler();

        console.log('MenuBar initialized');
    }

    /**
     * Bind click events for view mode toggle buttons
     */
    function bindViewModeEvents() {
        viewModeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const viewMode = button.dataset.view;
                setViewMode(viewMode);
            });
        });
    }

    /**
     * Set the active view mode
     * 2025-12-19: Updated to handle standard/historical (removed compact)
     * @param {string} mode - View mode name ('standard', 'historical')
     */
    function setViewMode(mode) {
        if (mode === currentViewMode) return;

        currentViewMode = mode;

        // Update button active states
        viewModeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });

        // Add/remove body class for view mode styling
        document.body.classList.remove('view-standard', 'view-historical');
        document.body.classList.add(`view-${mode}`);

        // 2025-12-19: Toggle visibility of main content vs historical view
        const workspaceMain = document.querySelector('.workspace-main');
        const historicalView = document.getElementById('historical-view');
        const workspaceSidebar = document.querySelector('.workspace-sidebar');

        if (mode === 'historical') {
            if (workspaceMain) workspaceMain.style.display = 'none';
            if (historicalView) historicalView.style.display = 'block';
            if (workspaceSidebar) workspaceSidebar.style.display = 'none';
        } else {
            // Use empty string to remove inline style and let CSS take over
            if (workspaceMain) workspaceMain.style.display = '';
            if (historicalView) historicalView.style.display = 'none';
            if (workspaceSidebar) workspaceSidebar.style.display = '';
        }

        // Dispatch custom event for other components to react
        window.dispatchEvent(new CustomEvent('viewModeChange', {
            detail: { mode }
        }));

        console.log(`View mode changed to: ${mode}`);
    }

    /**
     * Bind events for the options dropdown
     */
    function bindOptionsDropdownEvents() {
        if (!optionsButton || !optionsDropdown) return;

        // Toggle dropdown on button click
        optionsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeWidgetsDropdown(); // Close widgets if open
            toggleOptionsDropdown();
        });

        // Handle dropdown item clicks
        dropdownItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                handleDropdownAction(action);
                closeOptionsDropdown();
            });
        });

        // Keyboard navigation
        optionsButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleOptionsDropdown();
            } else if (e.key === 'Escape' && optionsDropdownOpen) {
                closeOptionsDropdown();
            }
        });
    }

    /**
     * 2025-12-19: Bind events for the widgets dropdown
     */
    function bindWidgetsDropdownEvents() {
        if (!widgetsButton || !widgetsDropdown) return;

        // Toggle dropdown on button click
        widgetsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeOptionsDropdown(); // Close options if open
            toggleWidgetsDropdown();
        });

        // Handle toggle switch changes
        const toggleItems = widgetsDropdown.querySelectorAll('.widget-toggle-item');
        toggleItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const widgetId = item.dataset.widget;
            if (checkbox && widgetId) {
                checkbox.addEventListener('change', () => {
                    toggleWidget(widgetId, checkbox.checked);
                });
            }
        });

        // Keyboard navigation
        widgetsButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleWidgetsDropdown();
            } else if (e.key === 'Escape' && widgetsDropdownOpen) {
                closeWidgetsDropdown();
            }
        });
    }

    /**
     * Toggle the options dropdown visibility
     */
    function toggleOptionsDropdown() {
        optionsDropdownOpen ? closeOptionsDropdown() : openOptionsDropdown();
    }

    /**
     * Open the options dropdown
     */
    function openOptionsDropdown() {
        optionsDropdownOpen = true;
        optionsDropdown.style.display = 'block';
        optionsButton.setAttribute('aria-expanded', 'true');
    }

    /**
     * Close the options dropdown
     */
    function closeOptionsDropdown() {
        optionsDropdownOpen = false;
        if (optionsDropdown) optionsDropdown.style.display = 'none';
        if (optionsButton) optionsButton.setAttribute('aria-expanded', 'false');
    }

    /**
     * 2025-12-19: Toggle the widgets dropdown visibility
     */
    function toggleWidgetsDropdown() {
        widgetsDropdownOpen ? closeWidgetsDropdown() : openWidgetsDropdown();
    }

    /**
     * 2025-12-19: Open the widgets dropdown
     */
    function openWidgetsDropdown() {
        widgetsDropdownOpen = true;
        widgetsDropdown.style.display = 'block';
        widgetsButton.setAttribute('aria-expanded', 'true');
    }

    /**
     * 2025-12-19: Close the widgets dropdown
     */
    function closeWidgetsDropdown() {
        widgetsDropdownOpen = false;
        if (widgetsDropdown) widgetsDropdown.style.display = 'none';
        if (widgetsButton) widgetsButton.setAttribute('aria-expanded', 'false');
    }

    /**
     * 2025-12-19: Toggle a widget's visibility
     * @param {string} widgetId - The widget's data-widget-id value
     * @param {boolean} enabled - Whether to show or hide the widget
     */
    function toggleWidget(widgetId, enabled) {
        // Call into Widgets module if available
        if (typeof Widgets !== 'undefined' && Widgets.setEnabled) {
            Widgets.setEnabled(widgetId, enabled);
        } else {
            // Fallback: directly show/hide the widget
            const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
            if (widget) {
                widget.style.display = enabled ? '' : 'none';
            }
        }
        console.log(`Widget ${widgetId} ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Handle clicks outside dropdowns to close them
     */
    function bindClickOutsideHandler() {
        document.addEventListener('click', (e) => {
            // Close options dropdown
            if (optionsDropdownOpen && optionsDropdown && !optionsDropdown.contains(e.target) && e.target !== optionsButton) {
                closeOptionsDropdown();
            }
            // Close widgets dropdown
            if (widgetsDropdownOpen && widgetsDropdown && !widgetsDropdown.contains(e.target) && e.target !== widgetsButton) {
                closeWidgetsDropdown();
            }
        });
    }

    /**
     * Handle dropdown menu item actions
     * @param {string} action - Action identifier from data-action attribute
     */
    function handleDropdownAction(action) {
        switch (action) {
            case 'export-csv':
                console.log('Export CSV action triggered');
                // TODO: Implement CSV export
                if (typeof window.showToast === 'function') {
                    window.showToast('CSV export coming soon!', 'info');
                }
                break;

            case 'export-json':
                console.log('Export JSON action triggered');
                // Trigger existing export if available
                const exportBtn = document.getElementById('btn-export');
                if (exportBtn) {
                    exportBtn.click();
                }
                break;

            case 'settings':
                console.log('Settings action triggered');
                // TODO: Open settings modal
                if (typeof window.showToast === 'function') {
                    window.showToast('Settings coming soon!', 'info');
                }
                break;

            case 'about':
                console.log('About action triggered');
                if (typeof window.showToast === 'function') {
                    window.showToast('Zip80 Expense Tracker v1.0', 'info');
                }
                break;

            default:
                console.warn(`Unknown dropdown action: ${action}`);
        }

        // Dispatch event for custom handlers
        window.dispatchEvent(new CustomEvent('menuAction', {
            detail: { action }
        }));
    }

    /**
     * Get the current view mode
     * @returns {string} Current view mode name
     */
    function getViewMode() {
        return currentViewMode;
    }

    // --- Save Status Indicator ---
    const saveStatusConfig = {
        saved: { icon: '✓', textKey: 'statusSaved', text: 'Saved', title: 'All changes saved' },
        saving: { icon: '↻', textKey: 'statusSaving', text: 'Saving...', title: 'Saving changes...' },
        error: { icon: '⚠', textKey: 'statusError', text: 'Error', title: 'Save failed' }
    };

    /**
     * Update the save status indicator
     * 2025-12-17: 'saved' status now triggers a brief flash animation
     * @param {'saved'|'saving'|'error'} status - The save status to display
     */
    function setSaveStatus(status) {
        const statusEl = document.getElementById('save-status');
        if (!statusEl) return;

        const config = saveStatusConfig[status] || saveStatusConfig.saved;
        const iconEl = statusEl.querySelector('.save-status-icon');
        const textEl = statusEl.querySelector('.save-status-text');

        // Update content
        if (iconEl) iconEl.textContent = config.icon;
        if (textEl) {
            textEl.textContent = config.text;
            textEl.dataset.i18n = config.textKey;
        }
        statusEl.title = config.title;

        // Remove existing animation classes
        statusEl.classList.remove('flash');

        // Update status class
        statusEl.className = 'save-status save-status-' + status;

        // For 'saved' status, trigger flash animation
        if (status === 'saved') {
            // Force reflow to restart animation
            void statusEl.offsetWidth;
            statusEl.classList.add('flash');
        }
    }

    // --- Public API ---
    return {
        init,
        setViewMode,
        getViewMode,
        closeDropdown: closeOptionsDropdown,
        closeWidgetsDropdown,
        setSaveStatus
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MenuBar.init);
} else {
    MenuBar.init();
}
