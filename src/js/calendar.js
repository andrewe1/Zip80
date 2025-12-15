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
 * - 2025-12-14: Initial creation with Google Calendar, Outlook, and .ics support
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

    // Public API
    return {
        createGoogleCalendarLink,
        createOutlookLink,
        downloadICS,
        openGoogleCalendar
    };
})();
