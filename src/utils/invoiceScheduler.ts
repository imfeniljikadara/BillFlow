import { auth } from '../config/firebase';
import { checkAndGenerateRecurringInvoices } from './recurringInvoiceScheduler';

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start a periodic check for recurring invoices
 * Runs every 6 hours
 */
export function startRecurringInvoiceScheduler() {
    if (schedulerInterval) {
        // Already running
        return;
    }

    // Run immediately on startup
    checkAndGenerateRecurringInvoices().catch(console.error);

    // Then run every 6 hours (21600000 ms)
    schedulerInterval = setInterval(() => {
        const user = auth.currentUser;
        if (user) {
            checkAndGenerateRecurringInvoices().catch(console.error);
        }
    }, 6 * 60 * 60 * 1000);

    console.log('[Scheduler] Recurring invoice scheduler started (every 6 hours)');
}

/**
 * Stop the recurring invoice scheduler
 */
export function stopRecurringInvoiceScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[Scheduler] Recurring invoice scheduler stopped');
    }
}

/**
 * Force check for recurring invoices right now
 */
export async function checkRecurringInvoicesNow() {
    const user = auth.currentUser;
    if (!user) {
        console.log('[Scheduler] No authenticated user');
        return;
    }
    
    try {
        const count = await checkAndGenerateRecurringInvoices();
        console.log(`[Scheduler] Generated ${count} recurring invoices`);
        return count;
    } catch (error) {
        console.error('[Scheduler] Error checking recurring invoices:', error);
        throw error;
    }
}
