/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - CALENDAR MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Provides passive notifications for expense reminders by integrating with
 * external calendar services. No intrusive pop-ups - user chooses to add.
 * 
 * KEY FEATURES:
 * - Google Calendar deep-links (opens in new tab)
 * - Outlook Web calendar links
 * - .ics file download (works with any calendar app)
 * 
 * HOW IT WORKS:
 * When user clicks the calendar icon (📅) on a transaction, it opens
 * Google Calendar with a pre-filled event based on the transaction details.
 * 
 * KEY FUNCTIONS:
 * - openGoogleCalendar(): Main function called from app.js
 * - createGoogleCalendarLink(): Generates Google Calendar URL
 * - createOutlookLink(): Generates Outlook Web URL
 * - downloadICS(): Creates and downloads .ics file
 * 
 * DEPENDENCIES: None (standalone module)
 * USED BY: app.js (history item calendar buttons)
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
 * - 2025-12-14: Initial creation with Google Calendar, Outlook, and .ics support
 * - 2025-12-15: Added renderCalendarWidget() for sidebar calendar display
 * - 2025-12-15: Fixed calendar date localization to use current I18n language
 */

const Calendar = (() => {

    /**
     * Generate Google Calendar deep-link
     */
    function createGoogleCalendarLink(description, date, amount) {
        const eventDate = new Date(date);
        const dateStr = eventDate.toISOString().split('T')[0].replace(/-/g, '');

        const title = `Pay ${description}: $${Math.abs(amount).toFixed(2)}`;
        const details = `Reminder for expense: ${description}`;

        const url = new URL('https://calendar.google.com/calendar/render');
        url.searchParams.set('action', 'TEMPLATE');
        url.searchParams.set('text', title);
        url.searchParams.set('dates', `${dateStr}T100000/${dateStr}T103000`);
        url.searchParams.set('details', details);

        return url.toString();
    }

    /**
     * Generate Outlook Web calendar link
     */
    function createOutlookLink(description, date, amount) {
        const eventDate = new Date(date);
        const startDate = eventDate.toISOString();
        const endDate = new Date(eventDate.getTime() + 30 * 60000).toISOString();

        const title = `Pay ${description}: $${Math.abs(amount).toFixed(2)}`;

        const url = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
        url.searchParams.set('subject', title);
        url.searchParams.set('startdt', startDate);
        url.searchParams.set('enddt', endDate);
        url.searchParams.set('body', `Reminder for expense: ${description}`);

        return url.toString();
    }

    /**
     * Generate and download .ics file
     */
    function downloadICS(description, date, amount) {
        const eventDate = new Date(date);
        const dateStr = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = new Date(eventDate.getTime() + 30 * 60000);
        const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const title = `Pay ${description}: $${Math.abs(amount).toFixed(2)}`;
        const uid = `zip80-${Date.now()}@local`;

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Zip80//Expense Tracker//EN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dateStr}`,
            `DTSTART:${dateStr}`,
            `DTEND:${endStr}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:Reminder for expense: ${description}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reminder_${description.replace(/\s+/g, '_')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Open Google Calendar with event details
     */
    function openGoogleCalendar(description, date, amount) {
        const url = createGoogleCalendarLink(description, date, amount);
        window.open(url, '_blank');
    }

    /**
     * Render the calendar widget in the sidebar
     * Displays full date at top and monthly grid with today highlighted
     */
    function renderCalendarWidget() {
        const fullDateEl = document.getElementById('calendar-full-date');
        const daysEl = document.getElementById('calendar-days');

        if (!fullDateEl || !daysEl) return;

        const now = new Date();
        const today = now.getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get current language locale (2025-12-15: Use I18n.getLocale() for localization)
        const locale = typeof I18n !== 'undefined' ? I18n.getLocale() : 'en-US';

        // Format full date: "Sunday, December 15, 2025" or "domingo, 15 de diciembre de 2025"
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const fullDateStr = now.toLocaleDateString(locale, options);
        fullDateEl.textContent = fullDateStr;

        // Calculate calendar grid
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
        const daysInMonth = lastDayOfMonth.getDate();

        // Clear existing days
        daysEl.innerHTML = '';

        // Add empty cells for days before the first of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            daysEl.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;

            if (day === today) {
                dayEl.classList.add('today');
            }

            daysEl.appendChild(dayEl);
        }
    }

    // Public API
    return {
        createGoogleCalendarLink,
        createOutlookLink,
        downloadICS,
        openGoogleCalendar,
        renderCalendarWidget
    };
})();
