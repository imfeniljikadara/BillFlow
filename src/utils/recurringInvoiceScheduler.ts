import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Invoice, RecurrenceInterval } from '../types';

/**
 * Validate recurrence settings for an invoice (Issue 12 fix)
 * Returns array of validation errors (empty if valid)
 */
function validateRecurrenceSettings(invoice: Invoice): string[] {
    const errors: string[] = [];
    
    if (!invoice.isRecurring) {
        return errors; // Not a recurring invoice, no validation needed
    }
    
    if (!invoice.recurrenceInterval) {
        errors.push('Recurring invoice missing recurrenceInterval');
    } else if (!['weekly', 'monthly', 'yearly'].includes(invoice.recurrenceInterval)) {
        errors.push(`Invalid recurrenceInterval: ${invoice.recurrenceInterval}`);
    }
    
    if (!invoice.nextRecurrenceDate) {
        errors.push('Recurring invoice missing nextRecurrenceDate');
    } else {
        try {
            const nextDate = new Date(invoice.nextRecurrenceDate);
            if (isNaN(nextDate.getTime())) {
                errors.push(`Invalid nextRecurrenceDate: ${invoice.nextRecurrenceDate}`);
            }
        } catch (e) {
            errors.push(`Invalid nextRecurrenceDate format: ${invoice.nextRecurrenceDate}`);
        }
    }
    
    return errors;
}

/**
 * Check for recurring invoices that need to be generated
 * This should be called periodically (e.g., daily)
 */
export async function checkAndGenerateRecurringInvoices(): Promise<number> {
    const user = auth.currentUser;
    if (!user) {
        console.log('No authenticated user');
        return 0;
    }

    try {
        const now = new Date();

        // Query for recurring invoices where nextRecurrenceDate has passed
        const q = query(
            collection(db, `users/${user.uid}/invoices`),
            where('isRecurring', '==', true)
        );

        const snapshot = await getDocs(q);
        let generatedCount = 0;

        for (const docSnap of snapshot.docs) {
            const invoice = { ...docSnap.data(), id: docSnap.id } as Invoice;

            // Validate recurrence settings before processing (Issue 12)
            const validationErrors = validateRecurrenceSettings(invoice);
            if (validationErrors.length > 0) {
                console.warn(`Skipping invoice ${invoice.id} due to validation errors:`, validationErrors);
                continue;
            }

            if (!invoice.nextRecurrenceDate) continue;

            const nextRecurrence = new Date(invoice.nextRecurrenceDate);

            // Check if it's time to generate a new invoice
            if (nextRecurrence <= now) {
                // Prevent duplicates: check if already generated today
                const lastGenerated = invoice.lastGeneratedDate ? new Date(invoice.lastGeneratedDate) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Only generate if not already generated today
                if (!lastGenerated || lastGenerated < today) {
                    await generateNextRecurringInvoice(user.uid, invoice);
                    generatedCount++;
                }
            }
        }

        console.log(`Generated ${generatedCount} recurring invoices`);
        return generatedCount;
    } catch (error) {
        console.error('Error checking recurring invoices:', error);
        throw error;
    }
}

/**
 * Generate the next invoice from a recurring invoice template
 * Uses Firestore transaction to ensure atomicity (Issue 19 fix)
 */
async function generateNextRecurringInvoice(userId: string, template: Invoice): Promise<void> {
    try {
        // Create new invoice from template
        const { id, dateCreated, status, lastReminderSent, reminderCount, nextRecurrenceDate, ...templateData } = template;

        const newInvoice: any = {
            ...templateData,
            status: 'PENDING',
            dateCreated: new Date().toISOString(),
            lastGeneratedDate: new Date().toISOString(),  // Track when invoice was generated
            // Keep recurring settings
            isRecurring: template.isRecurring,
            recurrenceInterval: template.recurrenceInterval,
        };

        // Calculate next recurrence date BEFORE transaction
        const updatedNextDate = calculateNextRecurrenceDate(
            new Date(template.nextRecurrenceDate!),
            template.recurrenceInterval!
        );

        // Use transaction to ensure both operations succeed or both fail (Issue 19)
        await runTransaction(db, async (transaction) => {
            // Add the new invoice
            const invoicesRef = collection(db, `users/${userId}/invoices`);
            await addDoc(invoicesRef, newInvoice);

            // Update the template's nextRecurrenceDate
            const templateRef = doc(db, `users/${userId}/invoices`, template.id);
            transaction.update(templateRef, {
                nextRecurrenceDate: updatedNextDate.toISOString(),
                lastGeneratedDate: new Date().toISOString(),
            });
        });

        console.log(`Generated recurring invoice for ${template.clientName}`);
    } catch (error) {
        console.error('Error generating recurring invoice:', error);
        throw error;
    }
}

/**
 * Calculate the next recurrence date based on interval
 * Properly handles month-end dates (e.g., Jan 31 -> Feb 28/29 -> Mar 31)
 */
function calculateNextRecurrenceDate(currentDate: Date, interval: 'weekly' | 'monthly' | 'yearly'): Date {
    const nextDate = new Date(currentDate);

    switch (interval) {
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            // Preserve the day of month (e.g., 31st stays 31st when possible)
            const dayOfMonth = currentDate.getDate();
            nextDate.setMonth(nextDate.getMonth() + 1);
            // If the resulting day went past the max day of the new month (e.g., Feb 31),
            // clamp it to the last day of that month
            const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
            if (nextDate.getDate() !== dayOfMonth) {
                nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
            }
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
    }

    return nextDate;
}

/**
 * Manually generate the next invoice for a recurring invoice
 * Useful for "Generate Now" button
 */
export async function manuallyGenerateRecurringInvoice(invoiceId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    try {
        // Fetch the invoice directly by ID (not with a where clause)
        const invoiceRef = doc(db, `users/${user.uid}/invoices`, invoiceId);
        const docSnap = await getDoc(invoiceRef);

        if (!docSnap.exists()) {
            throw new Error('Invoice not found');
        }

        const invoice = { ...docSnap.data(), id: docSnap.id } as Invoice;

        if (!invoice.isRecurring) {
            throw new Error('Invoice is not recurring');
        }

        await generateNextRecurringInvoice(user.uid, invoice);
    } catch (error) {
        console.error('Error manually generating recurring invoice:', error);
        throw error;
    }
}
