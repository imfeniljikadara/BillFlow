"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.health = exports.sendPaymentConfirmation = exports.sendInvoiceReminder = exports.sendSMS = exports.sendEmail = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors");
// Initialize Firebase Admin
admin.initializeApp();
// Enable CORS for cloud functions
const corsHandler = cors({ origin: true });
/**
 * Gmail SMTP Transporter
 * Configure with environment variables:
 * - GMAIL_USER: your-email@gmail.com
 * - GMAIL_APP_PASSWORD: app password from Google Account
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});
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
exports.sendEmail = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        // Validate request method
        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }
        try {
            const { to, subject, body, htmlBody } = req.body;
            // Validate required fields
            if (!to || !subject || !body) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: to, subject, body',
                });
                return;
            }
            // Validate email format
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid email address',
                });
                return;
            }
            // Validate Gmail credentials
            if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
                res.status(500).json({
                    success: false,
                    error: 'Gmail credentials not configured',
                });
                return;
            }
            // Send email
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to,
                subject,
                text: body,
                html: htmlBody || `<pre>${body}</pre>`,
            };
            const info = await transporter.sendMail(mailOptions);
            res.status(200).json({
                success: true,
                messageId: info.messageId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Error sending email:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
});
/**
 * Cloud Function: Send SMS via Twilio (placeholder)
 * Currently returns error - will be implemented when Twilio is ready
 */
exports.sendSMS = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }
        try {
            // Placeholder for Twilio integration
            res.status(501).json({
                success: false,
                error: 'SMS service not yet configured. Set up Twilio account and environment variables.',
                note: 'Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER',
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
});
/**
 * Cloud Function: Send Invoice Reminder (Combined HTTP + Email)
 * Convenience function that formats and sends invoice reminder emails
 */
exports.sendInvoiceReminder = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }
        try {
            const { clientName, email, invoiceNumber, amount, dueDate, } = req.body;
            // Validate required fields
            if (!clientName || !email || !invoiceNumber || !amount || !dueDate) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                });
                return;
            }
            // Format email body
            const subject = `Invoice Reminder: ${invoiceNumber}`;
            const body = `
Dear ${clientName},

This is a reminder that invoice ${invoiceNumber} for ₹${parseFloat(amount).toFixed(2)} is due on ${new Date(dueDate).toLocaleDateString()}.

Please arrange payment at your earliest convenience.

Best regards,
Invoice Payment System
            `.trim();
            const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Invoice Reminder</h2>
    <p>Dear <strong>${clientName}</strong>,</p>
    <p>This is a reminder that invoice <strong>${invoiceNumber}</strong> for <strong>₹${parseFloat(amount).toFixed(2)}</strong> is due on <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>
    <p>Please arrange payment at your earliest convenience.</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">Invoice Payment System</p>
</div>
            `.trim();
            // Send email
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: email,
                subject,
                text: body,
                html: htmlBody,
            };
            const info = await transporter.sendMail(mailOptions);
            res.status(200).json({
                success: true,
                messageId: info.messageId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Error sending reminder:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
});
/**
 * Cloud Function: Send Payment Confirmation
 * Sends confirmation when payment is received
 */
exports.sendPaymentConfirmation = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }
        try {
            const { clientName, email, invoiceNumber, amount } = req.body;
            if (!clientName || !email || !invoiceNumber || !amount) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                });
                return;
            }
            const subject = `Payment Received: ${invoiceNumber}`;
            const body = `
Dear ${clientName},

Thank you for your payment!

We have received your payment of ₹${parseFloat(amount).toFixed(2)} for invoice ${invoiceNumber}.

Your invoice is now marked as paid. Thank you for your business!

Best regards,
Invoice Payment System
            `.trim();
            const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #10b981;">Payment Received</h2>
    <p>Dear <strong>${clientName}</strong>,</p>
    <p>Thank you for your payment!</p>
    <p>We have received your payment of <strong style="color: #10b981;">₹${parseFloat(amount).toFixed(2)}</strong> for invoice <strong>${invoiceNumber}</strong>.</p>
    <p>Your invoice is now marked as paid. Thank you for your business!</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">Invoice Payment System</p>
</div>
            `.trim();
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: email,
                subject,
                text: body,
                html: htmlBody,
            };
            const info = await transporter.sendMail(mailOptions);
            res.status(200).json({
                success: true,
                messageId: info.messageId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Error sending confirmation:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
});
/**
 * Cloud Function: Health Check
 * Simple endpoint to verify Cloud Functions are deployed
 */
exports.health = functions.https.onRequest((req, res) => {
    corsHandler(req, res, () => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            gmailConfigured: !!process.env.GMAIL_USER,
        });
    });
});
//# sourceMappingURL=index.js.map