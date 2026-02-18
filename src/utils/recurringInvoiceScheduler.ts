import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Invoice } from '../types';

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

            if (!invoice.nextRecurrenceDate) continue;

            const nextRecurrence = new Date(invoice.nextRecurrenceDate);

            // Check if it's time to generate a new invoice
            if (nextRecurrence <= now) {
                await generateNextRecurringInvoice(user.uid, invoice);
                generatedCount++;
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
 */
async function generateNextRecurringInvoice(userId: string, template: Invoice): Promise<void> {
    try {
        // Create new invoice from template
        const { id, dateCreated, status, lastReminderSent, reminderCount, nextRecurrenceDate, ...templateData } = template;

        const newInvoice: any = {
            ...templateData,
            status: 'PENDING',
            dateCreated: new Date().toISOString(),
            // Keep recurring settings
            isRecurring: template.isRecurring,
            recurrenceInterval: template.recurrenceInterval,
        };

        // Add the new invoice
        await addDoc(collection(db, `users/${userId}/invoices`), newInvoice);

        // Update the template's nextRecurrenceDate
        const updatedNextDate = calculateNextRecurrenceDate(
            new Date(template.nextRecurrenceDate),
            template.recurrenceInterval!
        );

        await updateDoc(doc(db, `users/${userId}/invoices`, template.id), {
            nextRecurrenceDate: updatedNextDate.toISOString(),
        });

        console.log(`Generated recurring invoice for ${template.clientName}`);
    } catch (error) {
        console.error('Error generating recurring invoice:', error);
        throw error;
    }
}

/**
 * Calculate the next recurrence date based on interval
 */
function calculateNextRecurrenceDate(currentDate: Date, interval: 'weekly' | 'monthly' | 'yearly'): Date {
    const nextDate = new Date(currentDate);

    switch (interval) {
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
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
        const invoiceRef = doc(db, `users/${user.uid}/invoices`, invoiceId);
        const snapshot = await getDocs(query(collection(db, `users/${user.uid}/invoices`), where('__name__', '==', invoiceId)));
        
        if (snapshot.empty) {
            throw new Error('Invoice not found');
        }

        const invoice = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as Invoice;

        if (!invoice.isRecurring) {
            throw new Error('Invoice is not recurring');
        }

        await generateNextRecurringInvoice(user.uid, invoice);
    } catch (error) {
        console.error('Error manually generating recurring invoice:', error);
        throw error;
    }
}
