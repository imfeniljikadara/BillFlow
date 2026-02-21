/**
 * Invoice Versioning & Audit Trail (Issue 21)
 * Tracks all changes to invoices for compliance and dispute resolution
 */

import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { InvoiceHistory, Invoice } from '../types';

/**
 * Record an invoice change in the audit trail
 */
export async function recordInvoiceChange(
    userId: string,
    invoiceId: string,
    changeType: 'created' | 'updated' | 'status_changed' | 'archived' | 'restored',
    changedFields?: Record<string, { old: any; new: any }>,
    changeReason?: string
): Promise<void> {
    try {
        const history: Omit<InvoiceHistory, 'id'> = {
            invoiceId,
            userId,
            changeType,
            changedFields,
            changedAt: new Date().toISOString(),
            changeReason,
        };

        await addDoc(
            collection(db, `users/${userId}/invoiceHistory`),
            history
        );

        console.log(`Recorded ${changeType} for invoice ${invoiceId}`);
    } catch (error) {
        console.error('Error recording invoice change:', error);
        throw error;
    }
}

/**
 * Get full audit trail for an invoice
 */
export async function getInvoiceAuditTrail(
    userId: string,
    invoiceId: string
): Promise<InvoiceHistory[]> {
    try {
        const q = query(
            collection(db, `users/${userId}/invoiceHistory`),
            where('invoiceId', '==', invoiceId)
        );

        const snapshot = await getDocs(q);
        const history: InvoiceHistory[] = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        } as InvoiceHistory));

        // Sort by timestamp (oldest first)
        return history.sort((a, b) => 
            new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
        );
    } catch (error) {
        console.error('Error fetching invoice audit trail:', error);
        return [];
    }
}

/**
 * Get all changes within a date range
 */
export async function getChangesInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
): Promise<InvoiceHistory[]> {
    try {
        const historyRef = collection(db, `users/${userId}/invoiceHistory`);
        const q = query(historyRef);

        const snapshot = await getDocs(q);
        const allChanges: InvoiceHistory[] = snapshot.docs
            .map(doc => ({ ...doc.data(), id: doc.id } as InvoiceHistory))
            .filter(change => {
                const changeDate = new Date(change.changedAt);
                return changeDate >= startDate && changeDate <= endDate;
            });

        // Sort by timestamp (newest first)
        return allChanges.sort((a, b) => 
            new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        );
    } catch (error) {
        console.error('Error fetching changes in date range:', error);
        return [];
    }
}

/**
 * Generate audit report for an invoice
 */
export function generateAuditReport(history: InvoiceHistory[]): string {
    let report = '# Invoice Audit Trail\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Total Changes: ${history.length}\n\n`;

    history.forEach(entry => {
        const date = new Date(entry.changedAt).toLocaleString();
        report += `**${date}** - ${entry.changeType.toUpperCase()}\n`;
        if (entry.changeReason) {
            report += `Reason: ${entry.changeReason}\n`;
        }
        if (entry.changedFields) {
            report += 'Changes:\n';
            Object.entries(entry.changedFields).forEach(([field, change]) => {
                report += `  - ${field}: ${JSON.stringify(change.old)} → ${JSON.stringify(change.new)}\n`;
            });
        }
        report += '\n';
    });

    return report;
}
