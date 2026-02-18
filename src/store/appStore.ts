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

interface AppState {
    // Auth State
    user: User | null;
    userProfile: UserProfile | null;
    isLoading: boolean;

    // Invoice State
    invoices: Invoice[];
    products: Product[];
    clients: Client[];

    // Actions
    initialize: () => () => void; // Returns cleanup function
    addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
    updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    updateInvoiceStatus: (id: string, status: 'PENDING' | 'PAID' | 'OVERDUE') => Promise<void>;
    getInvoice: (id: string) => Invoice | undefined;
    duplicateInvoice: (id: string) => Promise<void>;
    sendReminder: (id: string) => Promise<void>;

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
            set({ user, isLoading: false });

            // Clean up previous subscriptions when auth state changes
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeInvoices) unsubscribeInvoices();
            if (unsubscribeProducts) unsubscribeProducts();
            if (unsubscribeClients) unsubscribeClients();

            if (user) {
                // 2. Subscribe to User Profile
                unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        set({ userProfile: docSnap.data() as UserProfile });
                    }
                });

                // 3. Subscribe to Invoices (filtered by user)
                const qInvoices = query(
                    collection(db, `users/${user.uid}/invoices`),
                    orderBy('dateCreated', 'desc')
                );

                unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
                    const invoices = snapshot.docs.map(doc => ({
                        ...doc.data(),
                        id: doc.id
                    })) as Invoice[];

                    set({ invoices });
                });

                // 4. Subscribe to Products (filtered by user)
                const qProducts = query(
                    collection(db, `users/${user.uid}/products`),
                    orderBy('name', 'asc')
                );

                unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
                    const products = snapshot.docs.map(doc => ({
                        ...doc.data(),
                        id: doc.id
                    })) as Product[];

                    set({ products });
                });
                // 5. Subscribe to Clients
                const qClients = query(
                    collection(db, `users/${user.uid}/clients`),
                    orderBy('name', 'asc')
                );

                unsubscribeClients = onSnapshot(qClients, (snapshot) => {
                    const clients = snapshot.docs.map(doc => ({
                        ...doc.data(),
                        id: doc.id
                    })) as Client[];

                    set({ clients });
                });
            } else {
                set({ invoices: [], products: [], clients: [], userProfile: null });
            }
        });

        // Return cleanup function that unsubscribes from all listeners
        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeInvoices) unsubscribeInvoices();
            if (unsubscribeProducts) unsubscribeProducts();
            if (unsubscribeClients) unsubscribeClients();
        };
    },

    addInvoice: async (invoice) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await addDoc(collection(db, `users/${user.uid}/invoices`), invoice);
        } catch (e) {
            console.error('Error adding invoice:', e);
            throw e;
        }
    },

    updateInvoice: async (id, updates) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            const docRef = doc(db, `users/${user.uid}/invoices`, id);
            await updateDoc(docRef, updates);
        } catch (e) {
            console.error('Error updating invoice:', e);
        }
    },

    deleteInvoice: async (id) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            await deleteDoc(doc(db, `users/${user.uid}/invoices`, id));
        } catch (e) {
            console.error('Error deleting invoice:', e);
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
            set({ user: null, userProfile: null, invoices: [], products: [] });
        } catch (e) {
            console.error('Error signing out:', e);
        }
    }
}));
