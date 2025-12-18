/*
==============================================================================
FILE MAINTENANCE & AI PROTOCOL
1. CHANGE LOG: 
   - [2025-12-17] - [Init] - Created history module for undo/redo functionality
2. INSTRUCTION:
   - When editing this file, always update the Change Log above.
   - Explain the "WHY" behind complex logic in inline comments.
3. PRESERVATION:
   - Do not remove this header block.
==============================================================================

PURPOSE:
Session-based undo/redo history for Zip80 Expense Tracker.
Stores data snapshots before modifications and allows reverting changes.
History is cleared when vault is closed.

EXPORTS:
- History (global object)

DEPENDENCIES:
- None (standalone module)
*/

const History = (function () {
    'use strict';

    // --- Configuration ---
    const MAX_HISTORY_SIZE = 50;  // Limit memory usage

    // --- State ---
    let undoStack = [];
    let redoStack = [];

    /**
     * Push a state onto the undo stack
     * Should be called BEFORE making changes to data
     * @param {object} data - The current data state to save
     */
    function pushState(data) {
        // Deep clone to avoid reference issues
        const snapshot = JSON.parse(JSON.stringify(data));
        undoStack.push(snapshot);

        // Clear redo stack when new action is taken
        redoStack = [];

        // Limit history size to prevent memory issues
        if (undoStack.length > MAX_HISTORY_SIZE) {
            undoStack.shift();  // Remove oldest state
        }

        updateButtons();
    }

    /**
     * Undo the last action
     * @param {object} currentData - The current data state
     * @returns {object|null} The previous state, or null if no history
     */
    function undo(currentData) {
        if (undoStack.length === 0) return null;

        // Save current state to redo stack
        const currentSnapshot = JSON.parse(JSON.stringify(currentData));
        redoStack.push(currentSnapshot);

        // Pop and return previous state
        const previousState = undoStack.pop();
        updateButtons();
        return previousState;
    }

    /**
     * Redo the last undone action
     * @param {object} currentData - The current data state
     * @returns {object|null} The next state, or null if no redo history
     */
    function redo(currentData) {
        if (redoStack.length === 0) return null;

        // Save current state to undo stack
        const currentSnapshot = JSON.parse(JSON.stringify(currentData));
        undoStack.push(currentSnapshot);

        // Pop and return next state
        const nextState = redoStack.pop();
        updateButtons();
        return nextState;
    }

    /**
     * Clear all history (called when closing vault)
     */
    function clear() {
        undoStack = [];
        redoStack = [];
        updateButtons();
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    function canUndo() {
        return undoStack.length > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    function canRedo() {
        return redoStack.length > 0;
    }

    /**
     * Update the enabled/disabled state of undo/redo buttons
     */
    function updateButtons() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');

        if (undoBtn) {
            undoBtn.disabled = !canUndo();
            undoBtn.classList.toggle('disabled', !canUndo());
        }
        if (redoBtn) {
            redoBtn.disabled = !canRedo();
            redoBtn.classList.toggle('disabled', !canRedo());
        }
    }

    /**
     * Get current history size (for debugging)
     * @returns {object} Object with undo and redo counts
     */
    function getHistorySize() {
        return {
            undo: undoStack.length,
            redo: redoStack.length
        };
    }

    // --- Public API ---
    return {
        pushState,
        undo,
        redo,
        clear,
        canUndo,
        canRedo,
        updateButtons,
        getHistorySize
    };
})();
