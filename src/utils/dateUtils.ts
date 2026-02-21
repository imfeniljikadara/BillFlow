/**
 * Timezone-aware date utilities
 * All dates are stored as ISO strings in Firestore
 * All comparisons should use UTC to avoid timezone issues
 */

/**
 * Get today's date in UTC (not device/browser timezone)
 * Returns at 00:00:00 UTC
 */
export function getUTCToday(): Date {
    const today = new Date();
    // Convert to UTC by creating a new date from UTC components
    return new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        0, 0, 0, 0
    ));
}

/**
 * Get current time in UTC
 */
export function getUTCNow(): Date {
    return new Date();
}

/**
 * Check if a date (ISO string) has passed (in UTC)
 * Useful for checking if invoices are overdue
 */
export function hasDatePassed(dateString: string | undefined): boolean {
    if (!dateString) return false;
    const dueDate = new Date(dateString);
    const now = getUTCNow();
    return dueDate < now;
}

/**
 * Check if a date is today (in UTC)
 * Compares only the date portion, ignoring time
 */
export function isDateToday(dateString: string | undefined): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = getUTCToday();
    return (
        date.getUTCFullYear() === today.getUTCFullYear() &&
        date.getUTCMonth() === today.getUTCMonth() &&
        date.getUTCDate() === today.getUTCDate()
    );
}

/**
 * Check if a date is before another date (time-agnostic)
 * Compares only the date portion
 */
export function isDateBefore(dateString1: string | undefined, dateString2: string | undefined): boolean {
    if (!dateString1 || !dateString2) return false;
    const date1 = new Date(dateString1);
    const date2 = new Date(dateString2);
    
    return (
        date1.getUTCFullYear() < date2.getUTCFullYear() ||
        (date1.getUTCFullYear() === date2.getUTCFullYear() &&
            date1.getUTCMonth() < date2.getUTCMonth()) ||
        (date1.getUTCFullYear() === date2.getUTCFullYear() &&
            date1.getUTCMonth() === date2.getUTCMonth() &&
            date1.getUTCDate() < date2.getUTCDate())
    );
}

/**
 * Check if a date is after another date (time-agnostic)
 */
export function isDateAfter(dateString1: string | undefined, dateString2: string | undefined): boolean {
    if (!dateString1 || !dateString2) return false;
    return isDateBefore(dateString2, dateString1);
}

/**
 * Get hours elapsed since a timestamp
 */
export function getHoursElapsed(timestampString: string | undefined): number {
    if (!timestampString) return Infinity;
    const timestamp = new Date(timestampString);
    const now = getUTCNow();
    return (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
}

/**
 * Format a date for display (simple ISO format)
 */
export function formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * Convert ISO string to local display time
 */
export function formatDateLocal(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}
