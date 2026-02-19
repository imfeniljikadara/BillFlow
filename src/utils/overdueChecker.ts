import { Invoice } from '../types';

/**
 * Checks if an invoice is overdue based on its due date
 * Returns true if due date has passed and invoice is still PENDING
 */
export const isInvoiceOverdue = (invoice: Invoice): boolean => {
    // Only check PENDING invoices
    if (invoice.status !== 'PENDING') return false;
    
    // If no due date, it's not overdue
    if (!invoice.dueDate) return false;
    
    // Compare due date with today
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    
    // Reset time for accurate date comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
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
