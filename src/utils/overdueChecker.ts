import { Invoice } from '../types';
import { getUTCToday, hasDatePassed } from './dateUtils';

/**
 * Checks if an invoice is overdue based on its due date
 * Returns true if due date has passed and invoice is still PENDING
 * Uses UTC to avoid timezone issues (Issue 18)
 */
export const isInvoiceOverdue = (invoice: Invoice): boolean => {
    // Only check PENDING invoices
    if (invoice.status !== 'PENDING') return false;
    
    // If no due date, it's not overdue
    if (!invoice.dueDate) return false;
    
    // Use UTC-aware date comparison (Issue 18)
    return hasDatePassed(invoice.dueDate);
};

/**
 * Checks all invoices and returns those that should be marked as overdue
 */
export const getOverdueInvoices = (invoices: Invoice[]): Invoice[] => {
    return invoices.filter(isInvoiceOverdue);
};

/**
 * Auto-marks invoices as overdue if they have passed their due date
 * Returns count of invoices marked as overdue
 */
export const checkAndMarkOverdueInvoices = async (
    invoices: Invoice[],
    updateInvoiceStatus: (id: string, status: 'PENDING' | 'PAID' | 'OVERDUE') => Promise<void>
): Promise<number> => {
    try {
        const overdueInvoices = getOverdueInvoices(invoices);
        
        // Update all overdue invoices
        for (const invoice of overdueInvoices) {
            await updateInvoiceStatus(invoice.id, 'OVERDUE');
        }
        
        return overdueInvoices.length;
    } catch (error) {
        console.error('Error checking overdue invoices:', error);
        return 0;
    }
};
