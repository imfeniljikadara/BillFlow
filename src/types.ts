export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE';

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
    items: InvoiceItem[];
    amount: number;
    dateCreated: string; // ISO String
    dueDate?: string;    // ISO String
    status: InvoiceStatus;
    notes?: string;
    invoiceNumber?: string;

    // Legacy support (optional)
    serviceName?: string;
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
