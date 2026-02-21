/**
 * Financial Calculations Validation (Issue 30)
 * Validates invoice totals and financial consistency
 */

import { Invoice, FinancialValidationResult } from '../types';

/**
 * Validate invoice financial calculations
 * Checks:
 * - Total amount matches sum of items
 * - No negative amounts
 * - Item prices valid
 * - All required fields present
 */
export function validateInvoiceFinancials(invoice: Omit<Invoice, 'id'>): FinancialValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if amount matches items total
    if (invoice.items && invoice.items.length > 0) {
        const calculatedTotal = calculateInvoiceTotal(invoice.items);
        
        if (Math.abs(calculatedTotal - invoice.amount) > 0.01) { // Allow 1 paisa tolerance
            errors.push(
                `Amount mismatch: Invoice shows ${invoice.amount}, but items total ${calculatedTotal.toFixed(2)}`
            );
        }
    }

    // Check for negative amounts
    if (invoice.amount < 0) {
        errors.push('Invoice amount cannot be negative');
    }

    // Check for zero amount invoices
    if (invoice.amount === 0) {
        warnings.push('Invoice amount is zero');
    }

    // Validate each item
    if (invoice.items) {
        invoice.items.forEach((item, index) => {
            if (item.price < 0) {
                errors.push(`Item ${index + 1}: price cannot be negative`);
            }
            if (item.quantity < 0) {
                errors.push(`Item ${index + 1}: quantity cannot be negative`);
            }
            if (item.quantity === 0) {
                warnings.push(`Item ${index + 1}: quantity is zero`);
            }
            const itemTotal = item.price * item.quantity;
            if (itemTotal > invoice.amount) {
                warnings.push(`Item ${index + 1}: subtotal exceeds invoice total`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Calculate invoice total from items
 */
export function calculateInvoiceTotal(items: any[]): number {
    return items.reduce((sum, item) => {
        const itemPrice = typeof item.price === 'number' ? item.price : 0;
        const itemQty = typeof item.quantity === 'number' ? item.quantity : 0;
        return sum + (itemPrice * itemQty);
    }, 0);
}

/**
 * Apply tax to invoice amount (Issue 30 - future enhancement)
 */
export function calculateWithTax(amount: number, taxRate: number = 0): number {
    if (taxRate < 0 || taxRate > 100) {
        throw new Error('Tax rate must be between 0 and 100');
    }
    return amount + (amount * taxRate / 100);
}

/**
 * Apply discount to invoice amount
 */
export function calculateWithDiscount(amount: number, discountPercentage: number = 0): number {
    if (discountPercentage < 0 || discountPercentage > 100) {
        throw new Error('Discount must be between 0 and 100 percent');
    }
    return amount - (amount * discountPercentage / 100);
}

/**
 * Check if two invoices have same financial terms
 * Useful for detecting duplicates
 */
export function haveSameFinancialTerms(invoice1: Invoice, invoice2: Invoice): boolean {
    return (
        Math.abs(invoice1.amount - invoice2.amount) < 0.01 &&
        invoice1.clientId === invoice2.clientId &&
        invoice1.items.length === invoice2.items.length
    );
}

/**
 * Get financial summary of invoices
 */
export function getFinancialSummary(invoices: Invoice[]): {
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    invoiceCount: number;
} {
    const summary = {
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        invoiceCount: invoices.length,
    };

    invoices.forEach(invoice => {
        if (invoice.isArchived) return; // Skip archived
        
        summary.totalAmount += invoice.amount;
        
        switch (invoice.status) {
            case 'PAID':
                summary.totalPaid += invoice.amount;
                break;
            case 'PENDING':
                summary.totalPending += invoice.amount;
                break;
            case 'OVERDUE':
                summary.totalOverdue += invoice.amount;
                break;
        }
    });

    return summary;
}
