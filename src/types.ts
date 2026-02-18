export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export type RecurrenceInterval = 'weekly' | 'monthly' | 'yearly';

export interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
}

export interface Invoice {
    id: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientId?: string;
    items: InvoiceItem[];
    amount: number;
    dateCreated: string; // ISO String
    dueDate?: string;    // ISO String
    status: InvoiceStatus;
    notes?: string;
    invoiceNumber?: string;

    // Recurrence
    isRecurring?: boolean;
    recurrenceInterval?: RecurrenceInterval;
    nextRecurrenceDate?: string; // ISO String

    // Reminders
    lastReminderSent?: string; // ISO String
    reminderCount?: number;

    // Legacy support (optional)
    serviceName?: string;
}

export interface Client {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    createdAt: string; // ISO String
}

export interface Product {
    id: string;
    name: string;
    price: number;
}

export interface UserProfile {
    businessName: string;
    mobileNumber?: string;
    upiId: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    panNumber?: string;
    gstNumber?: string;
    isPro?: boolean;
    onboardingComplete?: boolean;
}
