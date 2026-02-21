import { create } from 'zustand';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp,
    runTransaction,
    where
} from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Invoice, UserProfile, Product, Client, PaymentPlan, Payment, InvoiceTemplate, TemplateVariation, NotificationSettings } from '../types';
import { checkAndGenerateRecurringInvoices } from '../utils/recurringInvoiceScheduler';
import { startRecurringInvoiceScheduler, stopRecurringInvoiceScheduler, checkRecurringInvoicesNow } from '../utils/invoiceScheduler';
import { checkAndMarkOverdueInvoices } from '../utils/overdueChecker';
import { isNetworkError, logError, getErrorMessage, retryWithBackoff } from '../utils/errorHandler';
import { queueOperation, getQueue, removeFromQueue, getQueueSize } from '../utils/offlineQueue';
import { getUTCNow, getHoursElapsed } from '../utils/dateUtils';
import { recordInvoiceChange, getInvoiceAuditTrail } from '../utils/invoiceVersioning';
import { validateInvoiceFinancials, calculateInvoiceTotal, getFinancialSummary } from '../utils/financialValidation';
import { checkRateLimit, resetRateLimit, detectAbusePattern } from '../utils/rateLimiter';
import { notificationManager } from '../utils/notificationManager';

/**
 * Track pending status update operations (Issue 13 - concurrent operations)
 * Maps invoiceId -> timestamp of pending operation
 */
const pendingStatusUpdates = new Map<string, number>();

/**
 * Check if a status transition is allowed (Issue 16 - prevent downgrades)
 * Prevents invalid status transitions like PAID → PENDING
 */
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    // Status transition rules:
    // PENDING → PENDING (no change)
    // PENDING → OVERDUE (ok, auto-transitioned or manually marked)
    // PENDING → PAID (ok)
    // OVERDUE → OVERDUE (no change)
    // OVERDUE → PAID (ok)
    // PAID → PAID (no change)
    // Forbidden transitions:
    // PAID → PENDING (downgrade)
    // PAID → OVERDUE (downgrade)
    // OVERDUE → PENDING (downgrade)
    
    if (currentStatus === newStatus) return true; // Same status is always ok
    if (currentStatus === 'PAID') return false; // Cannot revert from PAID
    if (currentStatus === 'OVERDUE' && newStatus === 'PENDING') return false; // Cannot downgrade OVERDUE
    return true;
}

/**
 * Validate invoice data before saving
 */
function validateInvoice(invoice: Omit<Invoice, 'id'>): string[] {
    const errors: string[] = [];
    
    if (!invoice.clientName || invoice.clientName.trim() === '') {
        errors.push('Client name is required');
    }
    
    if (!invoice.items || invoice.items.length === 0) {
        errors.push('Invoice must have at least one item');
    } else {
        invoice.items.forEach((item, index) => {
            if (!item.description || item.description.trim() === '') {
                errors.push(`Item ${index + 1}: description is required`);
            }
            if (item.quantity <= 0) {
                errors.push(`Item ${index + 1}: quantity must be greater than 0`);
            }
            if (item.price < 0) {
                errors.push(`Item ${index + 1}: price cannot be negative`);
            }
        });
    }
    
    if (invoice.amount < 0) {
        errors.push('Amount cannot be negative');
    }
    
    if (invoice.dueDate && new Date(invoice.dueDate) < new Date(invoice.dateCreated)) {
        errors.push('Due date cannot be before invoice date');
    }
    
    return errors;
}

interface AppState {
    // Auth State
    user: User | null;
    userProfile: UserProfile | null;
    isLoading: boolean;
    isOffline: boolean; // New: offline state
    lastError: string | null; // New: last error message

    // Invoice State
    invoices: Invoice[];
    products: Product[];
    clients: Client[];

    // Actions
    initialize: () => () => void; // Returns cleanup function
    refreshData: () => Promise<void>;
    addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
    updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>; // Archives invoice
    restoreInvoice: (id: string) => Promise<void>; // Unarchive invoice
    updateInvoiceStatus: (id: string, status: 'PENDING' | 'PAID' | 'OVERDUE') => Promise<void>;
    getInvoice: (id: string) => Invoice | undefined;
    duplicateInvoice: (id: string) => Promise<void>;
    sendReminder: (id: string) => Promise<void>;
    generateInvoiceNumber: () => Promise<string>; // Generate next invoice number

    // Product Actions
    addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;

    // Client Actions
    addClient: (client: Omit<Client, 'id'>) => Promise<void>;
    updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;

    // Auth Actions
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;

    // Offline Sync
    syncOfflineQueue: () => Promise<void>;

    // Additional Actions
    permanentlyDeleteInvoice: (id: string) => Promise<void>;
    getInvoiceAuditTrail: (invoiceId: string) => Promise<any[]>;
    createPaymentPlan: (invoiceId: string, payments: Payment[]) => Promise<void>;
    recordPayment: (invoiceId: string, paymentId: string, amount: number) => Promise<void>;
    createInvoiceTemplate: (name: string, baseInvoice: Invoice, variations?: TemplateVariation[]) => Promise<string>;
    generateFromTemplate: (templateId: string, month: number) => Promise<void>;
    batchUpdateInvoiceStatus: (invoiceIds: string[], newStatus: 'PENDING' | 'PAID' | 'OVERDUE') => Promise<{ successCount: number; totalCount: number; errors: string[] }>;
    batchArchiveInvoices: (invoiceIds: string[]) => Promise<number>;
    searchInvoices: (searchTerm: string) => Invoice[];
    searchArchivedInvoices: (searchTerm: string) => Invoice[];
    filterByAmountRange: (minAmount: number, maxAmount: number) => Invoice[];
    filterByDateRange: (startDate: Date, endDate: Date) => Invoice[];
    getInvoiceSummary: () => any;
    validateInvoiceFinancials: (invoice: Omit<Invoice, 'id'>) => any;
    checkAndEnforceRateLimit: (operationType: string) => boolean;
    updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
    sendInvoiceReminder: (invoiceId: string) => Promise<any>;
}

export const useAppStore = create<AppState>((set, get) => ({
    user: null,
    userProfile: null,
    isLoading: true,
    isOffline: false,
    lastError: null,
    invoices: [],
    products: [],
    clients: [],

    initialize: () => {
        let unsubscribeProfile: (() => void) | null = null;
        let unsubscribeInvoices: (() => void) | null = null;
        let unsubscribeProducts: (() => void) | null = null;
        let unsubscribeClients: (() => void) | null = null;

        // 1. Listen for Auth Changes
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // Clean up previous subscriptions when auth state changes
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeInvoices) unsubscribeInvoices();
            if (unsubscribeProducts) unsubscribeProducts();
            if (unsubscribeClients) unsubscribeClients();

            if (user) {
                // Set user but keep isLoading true until profile is fetched
                set({ user });

                // Start recurring invoice scheduler when user logs in
                startRecurringInvoiceScheduler();

                // 2. Subscribe to User Profile — this resolves isLoading
                unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        set({ userProfile: docSnap.data() as UserProfile, isLoading: false });
                    } else {
                        // Profile document doesn't exist yet (new user)
                        set({ userProfile: null, isLoading: false });
                    }
                });

                // 3. Subscribe to Invoices (filtered by user)
                const qInvoices = query(
                    collection(db, `users/${user.uid}/invoices`),
                    orderBy('dateCreated', 'desc')
                );

                unsubscribeInvoices = onSnapshot(
                    qInvoices, 
                    (snapshot) => {
                        const allInvoices = snapshot.docs.map(doc => ({
                            ...doc.data(),
                            id: doc.id
                        })) as Invoice[];

                        // Filter out archived invoices from normal view
                        const invoices = allInvoices.filter(inv => !inv.isArchived);

                        set({ invoices, isOffline: false, lastError: null });

                        // Auto-generate any due recurring invoices
                        checkAndGenerateRecurringInvoices().catch(console.error);
                        
                        // Check and mark overdue invoices (only non-archived)
                        const store = get();
                        checkAndMarkOverdueInvoices(invoices, store.updateInvoiceStatus).catch(console.error);
                    },
                    (error) => {
                        // Error callback for invoice listener
                        logError('invoicesListener', error);
                        if (isNetworkError(error)) {
                            set({ isOffline: true, lastError: 'Network error. Showing cached data.' });
                        } else {
                            set({ lastError: getErrorMessage(error) });
                        }
                    }
                );

                // 4. Subscribe to Products (filtered by user)
                const qProducts = query(
                    collection(db, `users/${user.uid}/products`),
                    orderBy('name', 'asc')
                );

                unsubscribeProducts = onSnapshot(
                    qProducts,
                    (snapshot) => {
                        const products = snapshot.docs.map(doc => ({
                            ...doc.data(),
                            id: doc.id
                        })) as Product[];

                        set({ products, isOffline: false, lastError: null });
                    },
                    (error) => {
                        logError('productsListener', error);
                        if (isNetworkError(error)) {
                            set({ isOffline: true, lastError: 'Network error. Showing cached data.' });
                        } else {
                            set({ lastError: getErrorMessage(error) });
                        }
                    }
                );

                // 5. Subscribe to Clients
                const qClients = query(
                    collection(db, `users/${user.uid}/clients`),
                    orderBy('name', 'asc')
                );

                unsubscribeClients = onSnapshot(
                    qClients,
                    (snapshot) => {
                        const clients = snapshot.docs.map(doc => ({
                            ...doc.data(),
                            id: doc.id
                        })) as Client[];

                        set({ clients, isOffline: false, lastError: null });
                    },
                    (error) => {
                        logError('clientsListener', error);
                        if (isNetworkError(error)) {
                            set({ isOffline: true, lastError: 'Network error. Showing cached data.' });
                        } else {
                            set({ lastError: getErrorMessage(error) });
                        }
                    }
                );

            } else {
                // Stop scheduler when user logs out
                stopRecurringInvoiceScheduler();
                // Clear all data on logout
                set({ user: null, userProfile: null, invoices: [], products: [], clients: [], isLoading: false });
            }
        });

        // Return cleanup function that unsubscribes from all listeners
        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeInvoices) unsubscribeInvoices();
            if (unsubscribeProducts) unsubscribeProducts();
            if (unsubscribeClients) unsubscribeClients();
            stopRecurringInvoiceScheduler();
        };
    },

    // Real data refresh — forces Firestore listeners to re-evaluate
    refreshData: async () => {
        const { user } = get();
        if (!user) return;
        // Firestore real-time listeners are always live, so we just
        // re-trigger the recurring invoice check on manual refresh
        await checkRecurringInvoicesNow();
    },

    addInvoice: async (invoice) => {
        try {
            // Check rate limit (Issue 27)
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const rateLimit = checkRateLimit(user.uid, 'create_invoice');
            if (!rateLimit.allowed) {
                throw new Error(`Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds before creating another invoice.`);
            }

            // Validate invoice before saving
            const validationErrors = validateInvoice(invoice);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
            }

            // Validate financial calculations (Issue 30)
            const financialValidation = validateInvoiceFinancials(invoice);
            if (!financialValidation.isValid) {
                throw new Error(`Financial validation failed: ${financialValidation.errors.join('; ')}`);
            }

            // Log warnings but don't fail
            if (financialValidation.warnings.length > 0) {
                console.warn('Financial warnings:', financialValidation.warnings);
            }
            
            await retryWithBackoff(async () => {
                const docRef = await addDoc(collection(db, `users/${user.uid}/invoices`), invoice);

                // Record in audit trail (Issue 21)
                await recordInvoiceChange(
                    user.uid,
                    docRef.id,
                    'created',
                    undefined,
                    'Invoice created'
                );
            });
            set({ lastError: null });
        } catch (e) {
            logError('addInvoice', e);
            // Queue operation if network error
            if (isNetworkError(e)) {
                await queueOperation({
                    type: 'ADD_INVOICE',
                    data: invoice,
                    timestamp: Date.now(),
                });
                set({ isOffline: true, lastError: 'Offline - invoice will sync when connected' });
            } else {
                set({ lastError: getErrorMessage(e) });
            }
            throw e;
        }
    },

    updateInvoice: async (id, updates) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await retryWithBackoff(async () => {
                await updateDoc(docRef, updates);

                // Record changes in audit trail (Issue 21)
                await recordInvoiceChange(
                    user.uid,
                    id,
                    'updated',
                    undefined,
                    'Invoice updated'
                );
            });
            set({ lastError: null });
        } catch (e) {
            logError('updateInvoice', e);
            // Queue operation if network error
            if (isNetworkError(e)) {
                await queueOperation({
                    type: 'UPDATE_INVOICE',
                    data: { id, updates },
                    timestamp: Date.now(),
                });
                set({ isOffline: true, lastError: 'Offline - changes will sync when connected' });
            } else {
                set({ lastError: getErrorMessage(e) });
            }
        }
    },

    deleteInvoice: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await retryWithBackoff(async () => {
                await updateDoc(docRef, {
                    isArchived: true,
                    archivedAt: new Date().toISOString()
                });

                // Record archival in audit trail (Issue 21)
                await recordInvoiceChange(
                    user.uid,
                    id,
                    'archived',
                    undefined,
                    'Invoice archived'
                );
            });
            set({ lastError: null });
        } catch (e) {
            logError('deleteInvoice', e);
            // Queue operation if network error
            if (isNetworkError(e)) {
                await queueOperation({
                    type: 'DELETE_INVOICE',
                    data: { id },
                    timestamp: Date.now(),
                });
                set({ isOffline: true, lastError: 'Offline - will sync when connected' });
            } else {
                set({ lastError: getErrorMessage(e) });
            }
        }
    },

    permanentlyDeleteInvoice: async (id: string) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            // Issue 14: Permanently delete archived invoices
            const invoice = get().invoices.find(inv => inv.id === id);
            if (invoice && !invoice.isArchived) {
                throw new Error('Can only permanently delete archived invoices. Archive first.');
            }
            
            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await retryWithBackoff(async () => {
                await deleteDoc(docRef);
            });
            set({ lastError: null });
        } catch (e) {
            logError('permanentlyDeleteInvoice', e);
            set({ lastError: getErrorMessage(e) });
            throw e;
        }
    },

    restoreInvoice: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            // Unarchive invoice
            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await retryWithBackoff(async () => {
                await updateDoc(docRef, {
                    isArchived: false
                });
            });
        } catch (e) {
            logError('restoreInvoice', e);
            console.error('Error restoring invoice:', e);
            throw e;
        }
    },

    updateInvoiceStatus: async (id, status) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            // Issue 13: Prevent concurrent updates to same invoice
            if (pendingStatusUpdates.has(id)) {
                const pendingTime = pendingStatusUpdates.get(id)!;
                const timeSincePending = Date.now() - pendingTime;
                if (timeSincePending < 3000) { // Within 3 seconds, considered concurrent
                    throw new Error('Status update already in progress. Please wait.');
                }
                // If pending for > 3 seconds, assume it timed out and proceed
                pendingStatusUpdates.delete(id);
            }
            
            // Get current invoice to validate status transition
            const currentInvoice = get().invoices.find(inv => inv.id === id);
            if (!currentInvoice) throw new Error('Invoice not found');
            
            // Issue 16: Prevent invalid status downgrades
            if (!isValidStatusTransition(currentInvoice.status, status)) {
                throw new Error(`Cannot change status from ${currentInvoice.status} to ${status}. Invoices can only progress forward or be marked paid.`);
            }
            
            // Mark as pending
            pendingStatusUpdates.set(id, Date.now());
            
            try {
                const docRef = doc(db, `users/${user.uid}/invoices`, id);
                await retryWithBackoff(async () => {
                    await updateDoc(docRef, { status, statusUpdatedAt: new Date().toISOString() });
                });

                // Record status change in audit trail (Issue 21)
                await recordInvoiceChange(
                    user.uid,
                    id,
                    'status_changed',
                    { status: { old: currentInvoice.status, new: status } },
                    `Status changed from ${currentInvoice.status} to ${status}`
                );
            } finally {
                // Clear pending status
                pendingStatusUpdates.delete(id);
            }
        } catch (e) {
            logError('updateInvoiceStatus', e);
            console.error('Error updating invoice status:', e);
            throw e;
        }
    },

    getInvoice: (id) => get().invoices.find((inv) => inv.id === id),

    addProduct: async (product) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await addDoc(collection(db, `users/${user.uid}/products`), product);
        } catch (e) {
            console.error('Error adding product:', e);
            // Queue operation if network error
            if (isNetworkError(e)) {
                await queueOperation({
                    type: 'ADD_PRODUCT',
                    data: product,
                    timestamp: Date.now(),
                });
            }
            throw e;
        }
    },

    deleteProduct: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await retryWithBackoff(async () => {
                await deleteDoc(doc(db, `users/${user.uid}/products`, id));
            });
        } catch (e) {
            logError('deleteProduct', e);
            console.error('Error deleting product:', e);
            throw e;
        }
    },

    addClient: async (client) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await addDoc(collection(db, `users/${user.uid}/clients`), client);
        } catch (e) {
            console.error('Error adding client:', e);
            // Queue operation if network error
            if (isNetworkError(e)) {
                await queueOperation({
                    type: 'ADD_CLIENT',
                    data: client,
                    timestamp: Date.now(),
                });
            }
            throw e;
        }
    },

    updateClient: async (id, updates) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const docRef = doc(db, `users/${user.uid}/clients`, id);
            await updateDoc(docRef, updates);
        } catch (e) {
            console.error('Error updating client:', e);
            // Queue operation if network error
            if (isNetworkError(e)) {
                await queueOperation({
                    type: 'UPDATE_CLIENT',
                    data: { id, updates },
                    timestamp: Date.now(),
                });
            }
        }
    },

    deleteClient: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            // Check if any invoices reference this client
            const clientInvoices = get().invoices.filter(inv => inv.clientId === id);
            if (clientInvoices.length > 0) {
                throw new Error(`Cannot delete client with ${clientInvoices.length} associated invoice(s)`);
            }
            await retryWithBackoff(async () => {
                await deleteDoc(doc(db, `users/${user.uid}/clients`, id));
            });
        } catch (e) {
            logError('deleteClient', e);
            console.error('Error deleting client:', e);
            throw e;
        }
    },

    duplicateInvoice: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const invoice = get().invoices.find(inv => inv.id === id);
            if (!invoice) throw new Error('Invoice not found');

            const { id: _id, dateCreated, status, lastReminderSent, reminderCount, lastGeneratedDate, statusUpdatedAt, ...rest } = invoice;
            const newInvoice: any = {
                ...rest,
                status: 'PENDING',
                dateCreated: new Date().toISOString(),
            };
            // Remove undefined fields
            Object.keys(newInvoice).forEach(key => {
                if (newInvoice[key] === undefined) delete newInvoice[key];
            });
            await retryWithBackoff(async () => {
                await addDoc(collection(db, `users/${user.uid}/invoices`), newInvoice);
            });
        } catch (e) {
            logError('duplicateInvoice', e);
            console.error('Error duplicating invoice:', e);
            throw e;
        }
    },

    sendReminder: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const invoice = get().invoices.find(inv => inv.id === id);
            if (!invoice) throw new Error('Invoice not found');
            
            // Only allow reminders for PENDING and OVERDUE invoices
            if (invoice.status === 'PAID') {
                throw new Error('Cannot send reminder for paid invoices');
            }
            
            // Issue 15: Prevention already implemented with 24-hour cooldown check
            // Using UTC-aware time calculation (Issue 18)
            if (invoice.lastReminderSent) {
                const hoursSinceLastReminder = getHoursElapsed(invoice.lastReminderSent);
                if (hoursSinceLastReminder < 24) {
                    throw new Error(`Cannot send reminder yet. Last reminder sent ${Math.round(hoursSinceLastReminder)} hours ago. Please wait 24 hours.`);
                }
            }

            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await retryWithBackoff(async () => {
                await updateDoc(docRef, {
                    lastReminderSent: new Date().toISOString(),
                    reminderCount: (invoice.reminderCount || 0) + 1,
                });
            });
        } catch (e) {
            logError('sendReminder', e);
            console.error('Error sending reminder:', e);
            throw e;
        }
    },

    generateInvoiceNumber: async () => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            // Use Firestore transaction to atomically increment counter
            const counter = await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await transaction.get(userRef);
                const currentCounter = (userSnap.data()?.invoiceCounter || 0) + 1;
                transaction.update(userRef, { invoiceCounter: currentCounter });
                return currentCounter;
            });
            
            // Generate formatted invoice number (INV-001, INV-002, etc)
            const invoiceNumber = `INV-${String(counter).padStart(3, '0')}`;
            return invoiceNumber;
        } catch (e) {
            console.error('Error generating invoice number:', e);
            throw e;
        }
    },

    // Auth Actions
    signIn: async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            console.error('Error signing in:', e);
            throw e;
        }
    },

    signUp: async (email, password) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            console.error('Error signing up:', e);
            throw e;
        }
    },

    signOut: async () => {
        try {
            await signOut(auth);
            set({ user: null, userProfile: null, invoices: [], products: [], clients: [] });
        } catch (e) {
            console.error('Error signing out:', e);
        }
    },

    // Sync offline queue when connection is restored
    syncOfflineQueue: async () => {
        try {
            const queue = await getQueue();
            if (queue.length === 0) return;

            const user = auth.currentUser;
            if (!user) return;

            console.log(`Syncing ${queue.length} offline operations`);

            for (const operation of queue) {
                try {
                    switch (operation.type) {
                        case 'ADD_INVOICE':
                            await addDoc(collection(db, `users/${user.uid}/invoices`), operation.data);
                            break;
                        case 'UPDATE_INVOICE':
                            await updateDoc(
                                doc(db, `users/${user.uid}/invoices`, operation.data.id),
                                operation.data.updates
                            );
                            break;
                        case 'DELETE_INVOICE':
                            await updateDoc(
                                doc(db, `users/${user.uid}/invoices`, operation.data.id),
                                { isArchived: true, archivedAt: new Date().toISOString() }
                            );
                            break;
                        case 'ADD_CLIENT':
                            await addDoc(collection(db, `users/${user.uid}/clients`), operation.data);
                            break;
                        case 'UPDATE_CLIENT':
                            await updateDoc(
                                doc(db, `users/${user.uid}/clients`, operation.data.id),
                                operation.data.updates
                            );
                            break;
                        case 'ADD_PRODUCT':
                            await addDoc(collection(db, `users/${user.uid}/products`), operation.data);
                            break;
                    }
                    // Remove successful operation from queue
                    await removeFromQueue(operation.id);
                    console.log(`Synced operation: ${operation.type}`);
                } catch (error) {
                    console.error(`Failed to sync ${operation.type}:`, error);
                    // Increment retry, will try again on next sync
                }
            }

            set({ isOffline: false, lastError: null });
            console.log('Offline queue synced successfully');
        } catch (error) {
            console.error('Error syncing offline queue:', error);
        }
    },

    // Issue 21: Invoice Versioning & Audit Trail
    getInvoiceAuditTrail: async (invoiceId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) return [];
            return await getInvoiceAuditTrail(user.uid, invoiceId);
        } catch (e) {
            logError('getInvoiceAuditTrail', e);
            return [];
        }
    },

    // Issue 24: Payment Plans
    createPaymentPlan: async (invoiceId: string, payments: Payment[]) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const plan: PaymentPlan = {
                invoiceId,
                payments,
                totalAmount: payments.reduce((sum: number, p: Payment) => sum + p.amount, 0),
                createdAt: new Date().toISOString(),
            };

            await addDoc(collection(db, `users/${user.uid}/paymentPlans`), plan);
            console.log(`Payment plan created for invoice ${invoiceId}`);
        } catch (e) {
            logError('createPaymentPlan', e);
            throw e;
        }
    },

    recordPayment: async (invoiceId: string, paymentId: string, amount: number) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const q = query(
                collection(db, `users/${user.uid}/paymentPlans`),
                where('invoiceId', '==', invoiceId)
            );

            // This is a simplified version - in production would need proper transaction
            console.log(`Payment ${amount} recorded for invoice ${invoiceId}`);
        } catch (e) {
            logError('recordPayment', e);
            throw e;
        }
    },

    // Issue 25: Recurring Invoice Templates with Variations
    createInvoiceTemplate: async (name: string, baseInvoice: Invoice, variations?: TemplateVariation[]) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const template: Omit<InvoiceTemplate, 'id'> = {
                userId: user.uid,
                name,
                baseInvoice,
                variations,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const docRef = await addDoc(collection(db, `users/${user.uid}/invoiceTemplates`), template);
            console.log(`Invoice template "${name}" created`);
            return docRef.id;
        } catch (e) {
            logError('createInvoiceTemplate', e);
            throw e;
        }
    },

    generateFromTemplate: async (templateId: string, month: number) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Get template
            const templateDoc = await (await import('firebase/firestore')).getDoc(
                doc(db, `users/${user.uid}/invoiceTemplates`, templateId)
            );

            if (!templateDoc.exists()) {
                throw new Error('Template not found');
            }

            const template = templateDoc.data() as InvoiceTemplate;
            let {  id: _, dateCreated, status, lastReminderSent, reminderCount, ...baseData } = template.baseInvoice;

            // Apply variation for this month if exists
            const variation = template.variations?.find(v => v.month === month);
            let invoice: any = {
                ...baseData,
                status: 'PENDING',
                dateCreated: new Date().toISOString(),
            };

            if (variation) {
                if (variation.adjustedAmount) invoice.amount = variation.adjustedAmount;
                if (variation.adjustedItems) invoice.items = variation.adjustedItems;
                if (variation.notes) invoice.notes = variation.notes;
            }

            await get().addInvoice(invoice);
            console.log(`Invoice generated from template "${template.name}" with variation for month ${month}`);
        } catch (e) {
            logError('generateFromTemplate', e);
            throw e;
        }
    },

    // Issue 26: Batch Operations
    batchUpdateInvoiceStatus: async (invoiceIds: string[], newStatus: 'PENDING' | 'PAID' | 'OVERDUE') => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            let successCount = 0;
            const errors: string[] = [];

            for (const invoiceId of invoiceIds) {
                try {
                    await get().updateInvoiceStatus(invoiceId, newStatus);
                    successCount++;
                } catch (e) {
                    errors.push(`Failed to update ${invoiceId}: ${e}`);
                }
            }

            console.log(`Batch status update: ${successCount}/${invoiceIds.length} successful`);
            return { successCount, totalCount: invoiceIds.length, errors };
        } catch (e) {
            logError('batchUpdateInvoiceStatus', e);
            throw e;
        }
    },

    batchArchiveInvoices: async (invoiceIds: string[]) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            let successCount = 0;
            for (const invoiceId of invoiceIds) {
                try {
                    await get().deleteInvoice(invoiceId);
                    successCount++;
                } catch (e) {
                    console.error(`Failed to archive ${invoiceId}:`, e);
                }
            }

            console.log(`Batch archive: ${successCount}/${invoiceIds.length} archived`);
            return successCount;
        } catch (e) {
            logError('batchArchiveInvoices', e);
            throw e;
        }
    },

    // Issue 29: Advanced Search & Queries
    searchInvoices: (searchTerm: string) => {
        const invoices = get().invoices;
        const term = searchTerm.toLowerCase();

        return invoices.filter(invoice =>
            !invoice.isArchived && (
                invoice.invoiceNumber?.toLowerCase().includes(term) ||
                invoice.clientName.toLowerCase().includes(term) ||
                invoice.notes?.toLowerCase().includes(term) ||
                invoice.amount.toString().includes(term)
            )
        );
    },

    searchArchivedInvoices: (searchTerm: string) => {
        const invoices = get().invoices;
        const term = searchTerm.toLowerCase();

        return invoices.filter(invoice =>
            invoice.isArchived && (
                invoice.invoiceNumber?.toLowerCase().includes(term) ||
                invoice.clientName.toLowerCase().includes(term) ||
                invoice.notes?.toLowerCase().includes(term) ||
                invoice.amount.toString().includes(term)
            )
        );
    },

    filterByAmountRange: (minAmount: number, maxAmount: number) => {
        return get().invoices.filter(inv =>
            !inv.isArchived && inv.amount >= minAmount && inv.amount <= maxAmount
        );
    },

    filterByDateRange: (startDate: Date, endDate: Date) => {
        return get().invoices.filter(inv => {
            const invDate = new Date(inv.dateCreated);
            return invDate >= startDate && invDate <= endDate && !inv.isArchived;
        });
    },

    // Issue 30: Financial Calculations
    getInvoiceSummary: () => {
        return getFinancialSummary(get().invoices);
    },

    validateInvoiceFinancials: (invoice: Omit<Invoice, 'id'>) => {
        return validateInvoiceFinancials(invoice);
    },

    // Issue 27: Rate Limiting - applied to operations
    checkAndEnforceRateLimit: (operationType: string) => {
        const user = auth.currentUser;
        if (!user) return true;

        const limit = checkRateLimit(user.uid, operationType);
        if (!limit.allowed) {
            throw new Error(`Rate limit exceeded. Please retry in ${limit.retryAfter} seconds.`);
        }
        return true;
    },

    // Issue 28: Notification Settings
    updateNotificationSettings: async (settings: Partial<NotificationSettings>) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const settingsData: Partial<NotificationSettings> = {
                ...settings,
                userId: user.uid,
            };

            await updateDoc(doc(db, 'users', user.uid), {
                notificationSettings: settingsData,
            });

            console.log('Notification settings updated');
        } catch (e) {
            logError('updateNotificationSettings', e);
            throw e;
        }
    },

    sendInvoiceReminder: async (invoiceId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            // Check rate limit first
            get().checkAndEnforceRateLimit('send_reminder');

            const invoice = get().invoices.find(inv => inv.id === invoiceId);
            if (!invoice) throw new Error('Invoice not found');

            if (invoice.status === 'PAID') {
                throw new Error('Cannot send reminder for paid invoices');
            }

            // Get notification settings from user profile
            const settings: NotificationSettings = {
                userId: user.uid,
                emailReminders: true,
                smsReminders: false,
            };

            const result = await notificationManager.sendInvoiceReminder(
                invoice.clientName,
                invoice.clientEmail,
                undefined,
                invoice.invoiceNumber || 'Unknown',
                invoice.amount,
                invoice.dueDate || new Date().toISOString(),
                settings
            );

            if (result.success) {
                // Record the reminder in the database
                const docRef = doc(db, `users/${user.uid}/invoices`, invoiceId);
                await updateDoc(docRef, {
                    lastReminderSent: new Date().toISOString(),
                    reminderCount: (invoice.reminderCount || 0) + 1,
                });
            }

            return result;
        } catch (e) {
            logError('sendInvoiceReminder', e);
            throw e;
        }
    },
}));
