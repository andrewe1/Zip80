/**
 * ==============================================================================
 * FILE MAINTENANCE & AI PROTOCOL
 * 1. CHANGE LOG: 
 *    - [2025-12-20] - [Init] - Created sticky notes module for floating deck management
 * 2. INSTRUCTION:
 *    - When editing this file, always update the Change Log above.
 *    - Explain the "WHY" behind complex logic in inline comments.
 * 3. PRESERVATION:
 *    - Do not remove this header block.
 * ==============================================================================
 */

/**
 * ZIP80 STICKY NOTES MODULE
 * Provides floating sticky note decks with sharing capability
 */
const StickyNotes = (() => {
    'use strict';

    // 8 color options for decks
    const DECK_COLORS = [
        '#ffeb3b', // Yellow
        '#ff9800', // Orange
        '#f44336', // Red
        '#e91e63', // Pink
        '#9c27b0', // Purple
        '#2196f3', // Blue
        '#4caf50', // Green
        '#607d8b'  // Gray
    ];

    // Default deck position
    const DEFAULT_POSITION = { x: 100, y: 100 };

    // Currently dragging deck reference
    let draggedDeck = null;
    let dragOffset = { x: 0, y: 0 };

    /**
     * Initialize sticky notes system
     */
    function init() {
        // Setup global drag listeners
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    }

    /**
     * Create a new deck
     * @param {string} name - Deck name
     * @param {string} [color] - Optional color (defaults to yellow)
     * @returns {object} New deck object
     */
    function createDeck(name = 'New Deck', color = DECK_COLORS[0]) {
        return {
            id: 'deck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name,
            color: color,
            position: { ...DEFAULT_POSITION },
            collapsed: false,
            notes: [],
            createdAt: new Date().toISOString(),
            createdBy: null  // Set by app.js when creating
        };
    }

    /**
     * Add a note to a deck
     * @param {object} deck - The deck to add note to
     * @param {string} text - Note text
     * @returns {object} The new note
     */
    function addNote(deck, text) {
        const note = {
            id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            text: text.trim(),
            done: false,
            createdAt: new Date().toISOString()
        };
        deck.notes.push(note);
        return note;
    }

    /**
     * Toggle note done state
     * @param {object} deck - The deck containing the note
     * @param {string} noteId - Note ID to toggle
     */
    function toggleNote(deck, noteId) {
        const note = deck.notes.find(n => n.id === noteId);
        if (note) {
            note.done = !note.done;
        }
    }

    /**
     * Delete a note from a deck
     * @param {object} deck - The deck
     * @param {string} noteId - Note ID to delete
     */
    function deleteNote(deck, noteId) {
        deck.notes = deck.notes.filter(n => n.id !== noteId);
    }

    /**
     * Render all decks to the container
     * @param {array} decks - Array of deck objects
     * @param {function} onSave - Callback to save changes
     * @param {function} onShare - Callback to share deck
     */
    function renderDecks(decks, onSave, onShare) {
        const container = document.getElementById('sticky-decks-container');
        if (!container) return;

        container.innerHTML = '';

        (decks || []).forEach(deck => {
            const deckEl = createDeckElement(deck, onSave, onShare);
            container.appendChild(deckEl);
        });
    }

    /**
     * Create a deck DOM element
     */
    function createDeckElement(deck, onSave, onShare) {
        const el = document.createElement('div');
        el.className = `sticky-deck${deck.collapsed ? ' collapsed' : ''}`;
        el.dataset.deckId = deck.id;
        el.style.left = deck.position.x + 'px';
        el.style.top = deck.position.y + 'px';
        el.style.setProperty('--deck-color', deck.color);

        el.innerHTML = `
            <div class="sticky-deck-header">
                <span class="sticky-deck-title" contenteditable="true">${escapeHtml(deck.name)}</span>
                <div class="sticky-deck-actions">
                    <button class="sticky-deck-btn btn-color" title="Change color">🎨</button>
                    <button class="sticky-deck-btn btn-collapse" title="Minimize">${deck.collapsed ? '▼' : '▲'}</button>
                    <button class="sticky-deck-btn btn-share" title="Share">📤</button>
                    <button class="sticky-deck-btn btn-close" title="Close">✕</button>
                </div>
            </div>
            <div class="sticky-deck-body">
                <ul class="sticky-notes-list">
                    ${deck.notes.map(note => `
                        <li class="sticky-note-item${note.done ? ' done' : ''}" data-note-id="${note.id}">
                            <input type="checkbox" class="sticky-note-checkbox" ${note.done ? 'checked' : ''}>
                            <span class="sticky-note-text">${escapeHtml(note.text)}</span>
                            <button class="sticky-note-delete" title="Delete">✕</button>
                        </li>
                    `).join('')}
                </ul>
                <div class="sticky-note-input-row">
                    <input type="text" class="sticky-note-input" placeholder="+ Add note...">
                </div>
            </div>
            <div class="sticky-deck-color-picker" style="display: none;">
                ${DECK_COLORS.map(c => `
                    <button class="color-option${deck.color === c ? ' active' : ''}" 
                            data-color="${c}" 
                            style="background-color: ${c}"></button>
                `).join('')}
            </div>
        `;

        // Wire up events
        setupDeckEvents(el, deck, onSave, onShare);

        return el;
    }

    /**
     * Setup event listeners for a deck element
     */
    function setupDeckEvents(el, deck, onSave, onShare) {
        const header = el.querySelector('.sticky-deck-header');
        const titleEl = el.querySelector('.sticky-deck-title');
        const btnCollapse = el.querySelector('.btn-collapse');
        const btnColor = el.querySelector('.btn-color');
        const btnShare = el.querySelector('.btn-share');
        const btnClose = el.querySelector('.btn-close');
        const colorPicker = el.querySelector('.sticky-deck-color-picker');
        const notesList = el.querySelector('.sticky-notes-list');
        const noteInput = el.querySelector('.sticky-note-input');

        // Drag header to move
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.isContentEditable) return;
            startDrag(el, deck, e.clientX, e.clientY);
        });

        // Edit title
        titleEl.addEventListener('blur', () => {
            deck.name = titleEl.textContent.trim() || 'Untitled';
            onSave();
        });

        // Collapse toggle
        btnCollapse.addEventListener('click', () => {
            deck.collapsed = !deck.collapsed;
            el.classList.toggle('collapsed', deck.collapsed);
            btnCollapse.textContent = deck.collapsed ? '▼' : '▲';
            onSave();
        });

        // Color picker toggle
        btnColor.addEventListener('click', () => {
            colorPicker.style.display = colorPicker.style.display === 'none' ? 'flex' : 'none';
        });

        // Color selection
        colorPicker.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                deck.color = btn.dataset.color;
                el.style.setProperty('--deck-color', deck.color);
                colorPicker.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                colorPicker.style.display = 'none';
                onSave();
            });
        });

        // Share button
        btnShare.addEventListener('click', () => {
            if (onShare) onShare(deck);
        });

        // Close (delete) deck
        btnClose.addEventListener('click', () => {
            if (confirm('Delete this deck?')) {
                deck._deleted = true;
                el.remove();
                onSave();
            }
        });

        // Toggle note checkbox
        notesList.addEventListener('change', (e) => {
            if (e.target.classList.contains('sticky-note-checkbox')) {
                const noteId = e.target.closest('.sticky-note-item').dataset.noteId;
                toggleNote(deck, noteId);
                e.target.closest('.sticky-note-item').classList.toggle('done');
                onSave();
            }
        });

        // Delete note
        notesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('sticky-note-delete')) {
                const noteId = e.target.closest('.sticky-note-item').dataset.noteId;
                deleteNote(deck, noteId);
                e.target.closest('.sticky-note-item').remove();
                onSave();
            }
        });

        // Add new note
        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && noteInput.value.trim()) {
                const note = addNote(deck, noteInput.value);
                const li = document.createElement('li');
                li.className = 'sticky-note-item';
                li.dataset.noteId = note.id;
                li.innerHTML = `
                    <input type="checkbox" class="sticky-note-checkbox">
                    <span class="sticky-note-text">${escapeHtml(note.text)}</span>
                    <button class="sticky-note-delete" title="Delete">✕</button>
                `;
                notesList.appendChild(li);
                noteInput.value = '';
                onSave();
            }
        });
    }

    // --- Drag and Drop ---

    function startDrag(el, deck, clientX, clientY) {
        draggedDeck = { el, deck };
        const rect = el.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        el.classList.add('dragging');
    }

    function handleDragMove(e) {
        if (!draggedDeck) return;
        const { el, deck } = draggedDeck;
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        el.style.left = Math.max(0, x) + 'px';
        el.style.top = Math.max(0, y) + 'px';
        deck.position.x = Math.max(0, x);
        deck.position.y = Math.max(0, y);
    }

    function handleDragEnd() {
        if (draggedDeck) {
            draggedDeck.el.classList.remove('dragging');
            draggedDeck = null;
        }
    }

    // --- Utility ---

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    return {
        init,
        createDeck,
        addNote,
        toggleNote,
        deleteNote,
        renderDecks,
        DECK_COLORS
    };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    StickyNotes.init();
});
