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
    Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Invoice, UserProfile, Product, Client } from '../types';
import { checkAndGenerateRecurringInvoices } from '../utils/recurringInvoiceScheduler';
import { startRecurringInvoiceScheduler, stopRecurringInvoiceScheduler, checkRecurringInvoicesNow } from '../utils/invoiceScheduler';
import { checkAndMarkOverdueInvoices } from '../utils/overdueChecker';
import { isNetworkError, logError, getErrorMessage, retryWithBackoff } from '../utils/errorHandler';

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

                        set({ products });
                    },
                    (error) => {
                        logError('productsListener', error);
                        if (isNetworkError(error)) {
                            set({ isOffline: true });
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

                        set({ clients });
                    },
                    (error) => {
                        logError('clientsListener', error);
                        if (isNetworkError(error)) {
                            set({ isOffline: true });
                        }
                    }
                );

                // Stop scheduler when user logs out
                stopRecurringInvoiceScheduler();
            }
        });

        // Return cleanup function that unsubscribes from all listeners
        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeInvoices) unsubscribeInvoices();
            if (unsubscribeProducts) unsubscribeProducts();
            if (unsubscribeClients) unsubscribeClients();
            // Stop scheduler on cleanup
            stopRecurringInvoiceScheduler();
            if (unsubscribeInvoices) unsubscribeInvoices();
            if (unsubscribeProducts) unsubscribeProducts();
            if (unsubscribeClients) unsubscribeClients();
            // Stop scheduler on cleanup
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
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await retryWithBackoff(async () => {
                await addDoc(collection(db, `users/${user.uid}/invoices`), invoice);
            });
            // Clear any previous errors on success
            set({ lastError: null });
        } catch (e) {
            logError('addInvoice', e);
            set({ lastError: getErrorMessage(e) });
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
            });
            set({ lastError: null });
        } catch (e) {
            logError('updateInvoice', e);
            set({ lastError: getErrorMessage(e) });
        }
    },

    deleteInvoice: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            // Soft delete - mark as archived instead of permanently deleting
            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await retryWithBackoff(async () => {
                await updateDoc(docRef, {
                    isArchived: true,
                    archivedAt: new Date().toISOString()
                });
            });
            set({ lastError: null });
        } catch (e) {
            logError('deleteInvoice', e);
            set({ lastError: getErrorMessage(e) });
        }
    },

    restoreInvoice: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            // Unarchive invoice
            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await updateDoc(docRef, {
                isArchived: false
            });
        } catch (e) {
            console.error('Error restoring invoice:', e);
        }
    },

    updateInvoiceStatus: async (id, status) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await updateDoc(docRef, { status });
        } catch (e) {
            console.error('Error updating invoice status:', e);
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
            throw e;
        }
    },

    deleteProduct: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await deleteDoc(doc(db, `users/${user.uid}/products`, id));
        } catch (e) {
            console.error('Error deleting product:', e);
        }
    },

    // Client Actions
    addClient: async (client) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await addDoc(collection(db, `users/${user.uid}/clients`), client);
        } catch (e) {
            console.error('Error adding client:', e);
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
        }
    },

    deleteClient: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await deleteDoc(doc(db, `users/${user.uid}/clients`, id));
        } catch (e) {
            console.error('Error deleting client:', e);
        }
    },

    duplicateInvoice: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const invoice = get().invoices.find(inv => inv.id === id);
            if (!invoice) throw new Error('Invoice not found');

            const { id: _id, dateCreated, status, lastReminderSent, reminderCount, ...rest } = invoice;
            const newInvoice: any = {
                ...rest,
                status: 'PENDING',
                dateCreated: new Date().toISOString(),
            };
            // Remove undefined fields
            Object.keys(newInvoice).forEach(key => {
                if (newInvoice[key] === undefined) delete newInvoice[key];
            });
            await addDoc(collection(db, `users/${user.uid}/invoices`), newInvoice);
        } catch (e) {
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

            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await updateDoc(docRef, {
                lastReminderSent: new Date().toISOString(),
                reminderCount: (invoice.reminderCount || 0) + 1,
            });
        } catch (e) {
            console.error('Error sending reminder:', e);
            throw e;
        }
    },

    generateInvoiceNumber: async () => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const { userProfile } = get();
            let counter = userProfile?.invoiceCounter || 0;
            counter += 1;
            
            // Update the profile with new counter
            await updateDoc(doc(db, 'users', user.uid), {
                invoiceCounter: counter
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
    }
}));
