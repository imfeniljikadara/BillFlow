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
    isArchived?: boolean; // True if archived, not permanently deleted

    // Recurrence
    isRecurring?: boolean;
    recurrenceInterval?: RecurrenceInterval;
    nextRecurrenceDate?: string; // ISO String

    // Reminders
    lastReminderSent?: string; // ISO String
    reminderCount?: number;

    // Tracking
    lastGeneratedDate?: string; // ISO String - when recurring invoice was generated
    statusUpdatedAt?: string; // ISO String - when status was last changed
    archivedAt?: string; // ISO String - when invoice was archived

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
    invoiceCounter?: number; // Counter for auto-generated invoice numbers
}

// Issue 21: Invoice Versioning & Audit Trail
export interface InvoiceHistory {
    id: string;
    invoiceId: string;
    userId: string;
    changeType: 'created' | 'updated' | 'status_changed' | 'archived' | 'restored';
    changedFields?: Record<string, { old: any; new: any }>;
    changedAt: string; // ISO String
    changedBy?: string; // User ID who made change
    changeReason?: string;
}

// Issue 24: Payment Plan Support
export interface PaymentPlan {
    invoiceId: string;
    payments: Payment[];
    totalAmount: number;
    createdAt: string;
}

export interface Payment {
    id: string;
    amount: number;
    dueDate: string; // ISO String
    status: 'PENDING' | 'PAID';
    paidDate?: string; // ISO String
    notes?: string;
}

// Issue 25: Recurring Invoice Templates
export interface InvoiceTemplate {
    id: string;
    userId: string;
    name: string;
    baseInvoice: Invoice;
    variations?: TemplateVariation[]; // Monthly variations
    createdAt: string;
    updatedAt: string;
}

export interface TemplateVariation {
    month: number; // 0-11 for Jan-Dec
    adjustedAmount?: number;
    adjustedItems?: InvoiceItem[];
    notes?: string;
}

// Issue 28: Notification Settings
export interface NotificationSettings {
    userId: string;
    emailReminders: boolean;
    smsReminders: boolean;
    emailAddress?: string;
    phoneNumber?: string;
}

// Issue 30: Financial Validation
export interface FinancialValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
