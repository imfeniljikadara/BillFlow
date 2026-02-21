import * as functions from 'firebase-functions';
/**
 * Cloud Function: Send Email via Gmail SMTP
 * Called from: notificationManager via HTTP
 *
 * Usage:
 * POST /sendEmail
 * {
 *   to: "client@example.com",
 *   subject: "Invoice Reminder",
 *   body: "Plain text...",
 *   htmlBody: "<h1>Invoice Reminder</h1>..." (optional)
 * }
 */
export declare const sendEmail: functions.HttpsFunction;
/**
 * Cloud Function: Send SMS via Twilio (placeholder)
 * Currently returns error - will be implemented when Twilio is ready
 */
export declare const sendSMS: functions.HttpsFunction;
/**
 * Cloud Function: Send Invoice Reminder (Combined HTTP + Email)
 * Convenience function that formats and sends invoice reminder emails
 */
export declare const sendInvoiceReminder: functions.HttpsFunction;
/**
 * Cloud Function: Send Payment Confirmation
 * Sends confirmation when payment is received
 */
export declare const sendPaymentConfirmation: functions.HttpsFunction;
/**
 * Cloud Function: Health Check
 * Simple endpoint to verify Cloud Functions are deployed
 */
export declare const health: functions.HttpsFunction;
