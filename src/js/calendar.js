/**
 * Calendar Module - Handles passive notifications
 * Requirement: Passive Notifications via external calendar links
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
