/**
 * Notification System (Issue 28)
 * Manages email/SMS notifications for reminders
 * 
 * Gmail Integration:
 * - Sends emails through backend email service
 * - Backend runs on: http://localhost:3000 (development)
 * - See backend/server.js for email service setup
 */

import { NotificationSettings } from '../types';

/**
 * Notification provider interface for extensibility
 */
export interface NotificationProvider {
    sendEmail(to: string, subject: string, body: string): Promise<void>;
    sendSMS(phoneNumber: string, message: string): Promise<void>;
}

/**
 * Gmail Notification Provider
 * Sends emails through backend email service via HTTP
 * Requires backend running on EMAIL_SERVICE_URL
 */
export class GmailNotificationProvider implements NotificationProvider {
    private emailServiceUrl: string;

    constructor(emailServiceUrl: string = 'http://localhost:3000') {
        this.emailServiceUrl = emailServiceUrl;
    }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        const payload = { to, subject, body };

        const response = await fetch(`${this.emailServiceUrl}/api/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(`Email failed: ${result.error}`);
        }

        console.log(`✅ Email sent to ${to}`);
    }

    async sendSMS(phoneNumber: string, message: string): Promise<void> {
        // SMS integration with Twilio coming soon
        console.log(`📱 SMS to ${phoneNumber}: ${message} (Not yet implemented)`);
    }
}

/**
 * Mock notification provider for development/testing without backend
 */
export class MockNotificationProvider implements NotificationProvider {
    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        console.log(`📧 [MOCK] Email to ${to}: ${subject}\n${body}`);
    }

    async sendSMS(phoneNumber: string, message: string): Promise<void> {
        console.log(`📱 [MOCK] SMS to ${phoneNumber}: ${message}`);
    }
}

/**
 * Notification quota tracker
 */
export interface NotificationQuota {
    emailsSentToday: number;
    smsSentToday: number;
    emailLimit: number;
    smsLimit: number;
    resetTime: Date;
}

/**
 * Notification Manager
 */
export class NotificationManager {
    private provider: NotificationProvider;
    private emailServiceUrl: string;
    private quota: Map<string, NotificationQuota> = new Map();
    private readonly DAILY_EMAIL_LIMIT = 100;
    private readonly DAILY_SMS_LIMIT = 20;

    constructor(provider?: NotificationProvider, emailServiceUrl?: string) {
        this.emailServiceUrl = emailServiceUrl || 'http://localhost:3000';
        this.provider = provider || new GmailNotificationProvider(this.emailServiceUrl);
    }

    /**
     * Send invoice reminder notification
     */
    async sendInvoiceReminder(
        clientName: string,
        email: string | undefined,
        phoneNumber: string | undefined,
        invoiceNumber: string,
        amount: number,
        dueDate: string,
        settings: NotificationSettings
    ): Promise<{ success: boolean; errors: string[] }> {
        const errors: string[] = [];

        try {
            // Send email reminder via backend
            if (settings.emailReminders && email) {
                try {
                    const response = await fetch(
                        `${this.emailServiceUrl}/api/send-invoice-reminder`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                clientName,
                                to: settings.emailAddress || email,
                                invoiceNumber,
                                amount,
                                dueDate,
                            }),
                        }
                    );

                    const result = await response.json();

                    if (!result.success) {
                        errors.push(`Email failed: ${result.error}`);
                    } else {
                        console.log(`✅ Reminder sent to ${email}`);
                        this.recordEmail(email);
                    }
                } catch (error) {
                    errors.push(
                        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }

            // Send SMS reminder
            if (settings.smsReminders && phoneNumber) {
                const smsBody = this.generateReminderSMSBody(
                    clientName,
                    invoiceNumber,
                    amount,
                    dueDate
                );

                try {
                    await this.sendSMS(
                        settings.phoneNumber || phoneNumber,
                        smsBody
                    );
                } catch (error) {
                    errors.push(
                        `Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }

            return {
                success: errors.length === 0,
                errors,
            };
        } catch (error) {
            return {
                success: false,
                errors: [
                    `Notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ],
            };
        }
    }

    /**
     * Send payment confirmation notification
     */
    async sendPaymentConfirmation(
        clientName: string,
        email: string | undefined,
        invoiceNumber: string,
        amount: number,
        settings: NotificationSettings
    ): Promise<void> {
        if (!settings.emailReminders || !email) return;

        try {
            const response = await fetch(
                `${this.emailServiceUrl}/api/send-payment-confirmation`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientName,
                        to: settings.emailAddress || email,
                        invoiceNumber,
                        amount,
                    }),
                }
            );

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            console.log(`✅ Confirmation sent to ${email}`);
            this.recordEmail(email);
        } catch (error) {
            console.error(
                'Payment confirmation failed:',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Send email
     */
    private async sendEmail(to: string, subject: string, body: string): Promise<void> {
        if (!this.hasEmailQuota(to)) {
            throw new Error('Daily email limit reached');
        }

        await this.provider.sendEmail(to, subject, body);
        this.recordEmail(to);
    }

    /**
     * Send SMS
     */
    private async sendSMS(phoneNumber: string, message: string): Promise<void> {
        // Validate phone number
        if (!/^\+?[\d\s-()]+$/.test(phoneNumber)) {
            throw new Error('Invalid phone number format');
        }

        if (!this.hasSMSQuota(phoneNumber)) {
            throw new Error('Daily SMS limit reached');
        }

        await this.provider.sendSMS(phoneNumber, message);
        this.recordSMS(phoneNumber);
    }

    /**
     * Check email quota
     */
    private hasEmailQuota(email: string): boolean {
        const quota = this.getOrCreateQuota(email);
        return quota.emailsSentToday < quota.emailLimit;
    }

    /**
     * Check SMS quota
     */
    private hasSMSQuota(phoneNumber: string): boolean {
        const quota = this.getOrCreateQuota(phoneNumber);
        return quota.smsSentToday < quota.smsLimit;
    }

    /**
     * Record sent email
     */
    private recordEmail(email: string): void {
        const quota = this.getOrCreateQuota(email);
        quota.emailsSentToday++;
    }

    /**
     * Record sent SMS
     */
    private recordSMS(phoneNumber: string): void {
        const quota = this.getOrCreateQuota(phoneNumber);
        quota.smsSentToday++;
    }

    /**
     * Get or create quota entry
     */
    private getOrCreateQuota(identity: string): NotificationQuota {
        if (!this.quota.has(identity)) {
            const now = new Date();
            const resetTime = new Date(now);
            resetTime.setDate(resetTime.getDate() + 1);
            resetTime.setHours(0, 0, 0, 0);

            this.quota.set(identity, {
                emailsSentToday: 0,
                smsSentToday: 0,
                emailLimit: this.DAILY_EMAIL_LIMIT,
                smsLimit: this.DAILY_SMS_LIMIT,
                resetTime,
            });
        }

        return this.quota.get(identity)!;
    }

    /**
     * Generate reminder email body
     */
    private generateReminderEmailBody(
        clientName: string,
        invoiceNumber: string,
        amount: number,
        dueDate: string
    ): string {
        return `
Dear ${clientName},

This is a reminder that invoice ${invoiceNumber} for ₹${amount.toFixed(2)} is due on ${new Date(dueDate).toLocaleDateString()}.

Please arrange payment at your earliest convenience.

Best regards,
Invoice Payment System
        `.trim();
    }

    /**
     * Generate reminder SMS body
     */
    private generateReminderSMSBody(
        clientName: string,
        invoiceNumber: string,
        amount: number,
        dueDate: string
    ): string {
        const date = new Date(dueDate).toLocaleDateString();
        return `Reminder: Invoice ${invoiceNumber} for ₹${amount} due on ${date}. Please arrange payment.`;
    }

    /**
     * Generate payment confirmation email body
     */
    private generatePaymentConfirmationBody(
        clientName: string,
        invoiceNumber: string,
        amount: number
    ): string {
        return `
Dear ${clientName},

Thank you for your payment!

We have received your payment of ₹${amount.toFixed(2)} for invoice ${invoiceNumber}.

Your invoice is now marked as paid. Thank you for your business!

Best regards,
Invoice Payment System
        `.trim();
    }
}

// Create singleton instance with Gmail provider
// Uses backend email service at EMAIL_SERVICE_URL from environment
const emailServiceUrl = process.env.EXPO_PUBLIC_EMAIL_SERVICE_URL || 'http://localhost:3000';
const gmailProvider = new GmailNotificationProvider(emailServiceUrl);
export const notificationManager = new NotificationManager(gmailProvider, emailServiceUrl);
