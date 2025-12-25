/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - GOOGLE CALENDAR MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Provides native Google Calendar integration for creating calendar events
 * directly from transactions. Uses the Google Calendar API for seamless
 * in-app event creation without leaving Zip80.
 * 
 * KEY FEATURES:
 * - Create calendar events via Google Calendar API
 * - Smart reminder timing (Later today, Tomorrow, Next week, Custom)
 * - Recurring event support (Daily, Weekly, Monthly, Yearly)
 * - Fallback to deep-links for users without Calendar scope
 * 
 * DEPENDENCIES:
 * - GDrive module (for OAuth token)
 * - I18n module (for translations)
 * 
 * USED BY: app.js, calendar.js
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
 * - 2025-12-24: Initial creation with Calendar API integration
 */

const GCalendar = (() => {
    // Google Calendar API base URL
    const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

    // State
    let hasCalendarScope = null; // null = unknown, true/false after check
    let zip80CalendarId = null;  // Cached calendar ID for Zip80
    let currentVaultName = null; // Current vault name for calendar naming
    let onEventCreatedCallback = null; // Callback for when event is created

    /**
     * Check if the current OAuth token has Calendar scope
     * @returns {Promise<boolean>} True if Calendar scope is available
     */
    async function checkCalendarScope() {
        if (hasCalendarScope !== null) return hasCalendarScope;

        try {
            // Try a simple Calendar API call to check access
            const token = getAccessToken();
            if (!token) {
                hasCalendarScope = false;
                return false;
            }

            const response = await fetch(`${CALENDAR_API}/users/me/calendarList?maxResults=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            hasCalendarScope = response.ok;
            return hasCalendarScope;
        } catch (err) {
            console.warn('[GCalendar] Scope check failed:', err);
            hasCalendarScope = false;
            return false;
        }
    }

    /**
     * Get access token from GDrive module
     * @returns {string|null} Access token or null if not signed in
     */
    function getAccessToken() {
        // Access token is stored in localStorage by GDrive module
        return localStorage.getItem('zip80_gdrive_token');
    }

    /**
     * Reset scope check (call on sign-out or when re-authenticating)
     */
    function resetScopeCheck() {
        hasCalendarScope = null;
    }

    /**
     * Calculate reminder date based on timing option
     * @param {string} timing - 'today', 'tomorrow', 'nextweek', or ISO date string
     * @returns {Date} Calculated reminder date
     */
    function calculateReminderDate(timing) {
        const now = new Date();
        const result = new Date(now);

        switch (timing) {
            case 'today':
                // 9:00 PM today, or 9:00 AM next day if past 9 PM
                if (now.getHours() >= 21) {
                    result.setDate(result.getDate() + 1);
                    result.setHours(9, 0, 0, 0);
                } else {
                    result.setHours(21, 0, 0, 0);
                }
                break;

            case 'tomorrow':
                // 9:00 AM tomorrow
                result.setDate(result.getDate() + 1);
                result.setHours(9, 0, 0, 0);
                break;

            case 'nextweek':
                // 9:00 AM, 7 days from now
                result.setDate(result.getDate() + 7);
                result.setHours(9, 0, 0, 0);
                break;

            default:
                // Custom date/time passed as ISO string or Date
                if (timing instanceof Date) {
                    return timing;
                }
                try {
                    return new Date(timing);
                } catch {
                    // Fallback to tomorrow if invalid
                    result.setDate(result.getDate() + 1);
                    result.setHours(9, 0, 0, 0);
                }
        }

        return result;
    }

    /**
     * Convert recurrence option to Google Calendar RRULE
     * @param {string} recurrence - 'none', 'daily', 'weekly', 'monthly', 'yearly'
     * @returns {string[]|null} RRULE array or null for one-time events
     */
    function getRecurrenceRule(recurrence) {
        switch (recurrence) {
            case 'daily':
                return ['RRULE:FREQ=DAILY'];
            case 'weekly':
                return ['RRULE:FREQ=WEEKLY'];
            case 'monthly':
                return ['RRULE:FREQ=MONTHLY'];
            case 'yearly':
                return ['RRULE:FREQ=YEARLY'];
            default:
                return null; // One-time event
        }
    }

    /**
     * Get or create a dedicated Zip80 calendar for this vault
     * @param {string} vaultName - Name of the current vault
     * @returns {Promise<string>} Calendar ID to use for events
     */
    async function getOrCreateZip80Calendar(vaultName) {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const calendarName = `Zip80 - ${vaultName}`;

        // Check if we have a cached calendar ID for this vault
        if (zip80CalendarId && currentVaultName === vaultName) {
            return zip80CalendarId;
        }

        try {
            // Search for existing Zip80 calendar
            const listResponse = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (listResponse.ok) {
                const listData = await listResponse.json();
                const existingCalendar = listData.items?.find(cal => cal.summary === calendarName);

                if (existingCalendar) {
                    console.log('[GCalendar] Found existing calendar:', calendarName);
                    zip80CalendarId = existingCalendar.id;
                    currentVaultName = vaultName;
                    return zip80CalendarId;
                }
            }

            // Calendar doesn't exist, create it
            console.log('[GCalendar] Creating new calendar:', calendarName);
            const createResponse = await fetch(`${CALENDAR_API}/calendars`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    summary: calendarName,
                    description: `Payment reminders from Zip80 expense tracker - ${vaultName}`,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })
            });

            if (!createResponse.ok) {
                const error = await createResponse.json();
                console.warn('[GCalendar] Failed to create calendar, using primary:', error);
                return 'primary';
            }

            const newCalendar = await createResponse.json();
            console.log('[GCalendar] Created calendar:', newCalendar.id);
            zip80CalendarId = newCalendar.id;
            currentVaultName = vaultName;
            return zip80CalendarId;
        } catch (err) {
            console.warn('[GCalendar] Calendar lookup failed, using primary:', err);
            return 'primary';
        }
    }

    /**
     * Create a calendar event via Google Calendar API
     * @param {object} eventDetails - Event details
     * @param {string} eventDetails.title - Event title
     * @param {string} eventDetails.description - Event description
     * @param {string} eventDetails.timing - 'today', 'tomorrow', 'nextweek', or ISO date
     * @param {string} eventDetails.recurrence - 'none', 'daily', 'weekly', 'monthly', 'yearly'
     * @param {string} [eventDetails.notes] - Additional notes
     * @param {string} [eventDetails.vaultName] - Vault name for dedicated calendar
     * @returns {Promise<object>} Created event or error
     */
    async function createEvent(eventDetails) {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const startDate = calculateReminderDate(eventDetails.timing);
        const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 min duration

        // Build event resource with [zip80-event] marker for safety verification
        const eventDescription = (eventDetails.notes || eventDetails.description || '') + '\n\n[zip80-event]';
        const event = {
            summary: eventDetails.title,
            description: eventDescription,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 }, // 30 min before
                    { method: 'popup', minutes: 0 }   // At event time
                ]
            }
        };

        // Add recurrence if specified
        const rrule = getRecurrenceRule(eventDetails.recurrence);
        if (rrule) {
            event.recurrence = rrule;
        }

        // Get or create dedicated Zip80 calendar
        const calendarId = eventDetails.vaultName
            ? await getOrCreateZip80Calendar(eventDetails.vaultName)
            : 'primary';

        // Create event via Calendar API
        const response = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[GCalendar] Event creation failed:', error);
            throw new Error(error.error?.message || 'Failed to create event');
        }

        const createdEvent = await response.json();
        console.log('[GCalendar] Event created:', createdEvent.id);

        // Return event details for tracking
        return {
            eventId: createdEvent.id,
            calendarId: calendarId,
            htmlLink: createdEvent.htmlLink
        };
    }

    /**
     * Delete a calendar event with safety checks
     * @param {string} eventId - The event ID to delete
     * @param {string} calendarId - The calendar ID containing the event
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async function deleteEvent(eventId, calendarId) {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Safeguard 1: Verify calendar is a Zip80 calendar
        try {
            const calResponse = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (calResponse.ok) {
                const calendar = await calResponse.json();
                if (!calendar.summary || !calendar.summary.startsWith('Zip80 -')) {
                    console.error('[GCalendar] Safety check failed: Not a Zip80 calendar');
                    throw new Error('Cannot delete: Not a Zip80 calendar');
                }
            }
        } catch (err) {
            console.error('[GCalendar] Calendar verification failed:', err);
            throw new Error('Failed to verify calendar ownership');
        }

        // Safeguard 2: Verify event has [zip80-event] marker
        try {
            const eventResponse = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (eventResponse.ok) {
                const event = await eventResponse.json();
                if (!event.description || !event.description.includes('[zip80-event]')) {
                    console.error('[GCalendar] Safety check failed: Event not created by Zip80');
                    throw new Error('Cannot delete: Event not created by Zip80');
                }
            }
        } catch (err) {
            if (err.message.includes('Cannot delete')) throw err;
            console.error('[GCalendar] Event verification failed:', err);
            throw new Error('Failed to verify event ownership');
        }

        // All safeguards passed, proceed with delete
        const response = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok && response.status !== 204) {
            const error = await response.json().catch(() => ({}));
            console.error('[GCalendar] Event deletion failed:', error);
            throw new Error(error.error?.message || 'Failed to delete event');
        }

        console.log('[GCalendar] Event deleted:', eventId);
        return true;
    }

    /**
     * Show the calendar event modal
     * @param {string} description - Transaction description
     * @param {string} date - Transaction date
     * @param {number} amount - Transaction amount
     * @param {boolean} hasScope - Whether Calendar scope is granted
     * @param {string} [vaultName] - Current vault name for calendar naming
     * @param {string} [transactionId] - Transaction ID for event tracking
     */
    function showEventModal(description, date, amount, hasScope = true, vaultName = null, transactionId = null) {
        const modal = document.getElementById('calendar-event-modal');
        if (!modal) {
            console.error('[GCalendar] Modal not found');
            return;
        }

        // Show/hide fallback section based on Calendar scope
        const fallbackSection = document.getElementById('calendar-fallback-section');
        if (fallbackSection) {
            fallbackSection.style.display = hasScope ? 'none' : 'block';
        }

        // Pre-fill form fields
        const titleInput = document.getElementById('input-event-title');
        const notesInput = document.getElementById('input-event-notes');

        if (titleInput) {
            titleInput.value = `Pay ${description}: $${Math.abs(amount).toFixed(2)}`;
        }
        if (notesInput) {
            notesInput.value = `Reminder for expense: ${description}`;
        }

        // Reset timing and recurrence to defaults
        const timingSelect = document.getElementById('select-event-timing');
        const recurrenceSelect = document.getElementById('select-event-recurrence');
        const customDateGroup = document.getElementById('event-custom-date-group');

        if (timingSelect) timingSelect.value = 'tomorrow';
        if (recurrenceSelect) recurrenceSelect.value = 'none';
        if (customDateGroup) customDateGroup.style.display = 'none';

        // Store original transaction data for fallback and tracking
        modal.dataset.originalDesc = description;
        modal.dataset.originalDate = date;
        modal.dataset.originalAmount = amount;
        modal.dataset.vaultName = vaultName || '';
        modal.dataset.transactionId = transactionId || '';

        // Show modal
        modal.style.display = 'flex';
        if (titleInput) titleInput.focus();
    }

    /**
     * Hide the calendar event modal
     */
    function hideEventModal() {
        const modal = document.getElementById('calendar-event-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Handle form submission from the event modal
     * @returns {Promise<boolean>} True if event was created successfully
     */
    async function handleEventSubmit() {
        const modal = document.getElementById('calendar-event-modal');
        const titleInput = document.getElementById('input-event-title');
        const notesInput = document.getElementById('input-event-notes');
        const timingSelect = document.getElementById('select-event-timing');
        const recurrenceSelect = document.getElementById('select-event-recurrence');
        const customDateInput = document.getElementById('input-event-custom-date');
        const customTimeInput = document.getElementById('input-event-custom-time');

        const title = titleInput?.value.trim();
        if (!title) {
            if (typeof I18n !== 'undefined') {
                alert(I18n.t('eventTitleRequired') || 'Please enter a title');
            } else {
                alert('Please enter a title');
            }
            return false;
        }

        // Determine timing
        let timing = timingSelect?.value || 'tomorrow';
        if (timing === 'custom' && customDateInput && customTimeInput) {
            const dateStr = customDateInput.value;
            const timeStr = customTimeInput.value || '09:00';
            timing = new Date(`${dateStr}T${timeStr}`);
        }

        try {
            const eventResult = await createEvent({
                title: title,
                description: notesInput?.value || '',
                timing: timing,
                recurrence: recurrenceSelect?.value || 'none',
                notes: notesInput?.value || '',
                vaultName: modal?.dataset.vaultName || null
            });

            // Store event info for later retrieval
            modal.dataset.lastEventId = eventResult.eventId;
            modal.dataset.lastCalendarId = eventResult.calendarId;

            hideEventModal();

            // Show success toast
            if (typeof window.showToast === 'function') {
                const msg = (typeof I18n !== 'undefined')
                    ? I18n.t('eventCreatedSuccess') || 'Event added to Google Calendar!'
                    : 'Event added to Google Calendar!';
                window.showToast(msg, true);
            }

            // Call callback with event info for transaction storage
            if (typeof onEventCreatedCallback === 'function') {
                onEventCreatedCallback({
                    eventId: eventResult.eventId,
                    calendarId: eventResult.calendarId,
                    transactionId: modal?.dataset.transactionId || null
                });
            }

            // Return event info for transaction storage
            return {
                success: true,
                eventId: eventResult.eventId,
                calendarId: eventResult.calendarId,
                transactionId: modal?.dataset.transactionId || null
            };
        } catch (err) {
            console.error('[GCalendar] Failed to create event:', err);

            // Show error toast
            if (typeof window.showToast === 'function') {
                const msg = (typeof I18n !== 'undefined')
                    ? I18n.t('eventCreatedError') || 'Failed to add event'
                    : 'Failed to add event';
                window.showToast(msg + ': ' + err.message, false);
            }

            return { success: false, error: err.message };
        }
    }

    /**
     * Get the last created event info from modal dataset
     * @returns {object|null} Last event info or null
     */
    function getLastEventInfo() {
        const modal = document.getElementById('calendar-event-modal');
        if (!modal || !modal.dataset.lastEventId) return null;
        return {
            eventId: modal.dataset.lastEventId,
            calendarId: modal.dataset.lastCalendarId,
            transactionId: modal.dataset.transactionId
        };
    }

    /**
     * Initialize the calendar event modal event listeners
     */
    function initModal() {
        const modal = document.getElementById('calendar-event-modal');
        if (!modal) return;

        // Close on backdrop click
        const backdrop = modal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', hideEventModal);
        }

        // Cancel button
        const cancelBtn = document.getElementById('btn-cancel-event');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', hideEventModal);
        }

        // Submit button
        const submitBtn = document.getElementById('btn-add-event');
        if (submitBtn) {
            submitBtn.addEventListener('click', handleEventSubmit);
        }

        // Fallback deep-link button
        const fallbackBtn = document.getElementById('btn-event-fallback');
        if (fallbackBtn) {
            fallbackBtn.addEventListener('click', () => {
                // Use original transaction data for deep-link
                const desc = modal.dataset.originalDesc;
                const date = modal.dataset.originalDate;
                const amount = modal.dataset.originalAmount;

                if (typeof Calendar !== 'undefined' && Calendar.openGoogleCalendar) {
                    Calendar.openGoogleCalendar(desc, date, parseFloat(amount));
                }
                hideEventModal();
            });
        }

        // Upgrade button (re-auth with Calendar scope)
        const upgradeBtn = document.getElementById('btn-calendar-upgrade');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', async () => {
                hideEventModal();
                // Trigger re-authentication to get Calendar scope
                if (typeof GDrive !== 'undefined' && GDrive.signIn) {
                    await GDrive.signIn();
                    resetScopeCheck();
                }
            });
        }

        // Timing select - show/hide custom date fields
        const timingSelect = document.getElementById('select-event-timing');
        const customDateGroup = document.getElementById('event-custom-date-group');
        if (timingSelect && customDateGroup) {
            timingSelect.addEventListener('change', () => {
                customDateGroup.style.display = timingSelect.value === 'custom' ? 'flex' : 'none';
            });
        }
    }

    /**
     * Set callback for when an event is created
     * @param {function} callback - Callback function receiving {eventId, calendarId, transactionId}
     */
    function setOnEventCreated(callback) {
        onEventCreatedCallback = callback;
    }

    // Public API
    return {
        checkCalendarScope,
        resetScopeCheck,
        createEvent,
        deleteEvent,
        getLastEventInfo,
        setOnEventCreated,
        showEventModal,
        hideEventModal,
        handleEventSubmit,
        initModal,
        calculateReminderDate,
        getRecurrenceRule
    };
})();
