/**
 * Email Service Backend
 * Handles email sending via Gmail SMTP
 * Start with: npm install && npm start
 */

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify Gmail connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail SMTP connection failed:', error.message);
    console.error('\n⚠️  Make sure you have:');
    console.error('1. Set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env');
    console.error('2. Enabled 2FA on your Gmail account');
    console.error('3. Created an App Password (not your actual password)\n');
  } else {
    console.log('✅ Gmail SMTP connected successfully');
    console.log(`   Sending from: ${process.env.SMTP_FROM_EMAIL}\n`);
  }
});

/**
 * Send Email Endpoint
 * POST /api/send-email
 */
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    // Validate inputs
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, body',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to,
      subject,
      html: body,
      replyTo: process.env.SMTP_FROM_EMAIL,
    });

    console.log(`📧 Email sent: ${info.response}`);

    res.json({
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Send Invoice Reminder Endpoint
 * POST /api/send-invoice-reminder
 */
app.post('/api/send-invoice-reminder', async (req, res) => {
  try {
    const { clientName, to, invoiceNumber, amount, dueDate } = req.body;

    if (!to || !clientName || !invoiceNumber || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px; }
        .content { padding: 20px; background-color: #f9f9f9; margin: 20px 0; border-radius: 5px; }
        .amount { font-size: 24px; font-weight: bold; color: #007bff; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Invoice Reminder</h2>
        </div>
        <div class="content">
          <p>Dear ${clientName},</p>
          <p>This is a friendly reminder that your invoice is now due.</p>
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Amount Due:</strong> <span class="amount">₹${parseFloat(amount).toFixed(2)}</span></p>
          <p><strong>Due Date:</strong> ${dueDateFormatted}</p>
          <p>Please arrange payment at your earliest convenience.</p>
          <p>If you have already sent the payment, please disregard this reminder.</p>
          <p>Thank you for your business!</p>
        </div>
        <div class="footer">
          <p>Invoice Payment System</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to,
      subject: `Invoice Reminder: ${invoiceNumber}`,
      html: htmlBody,
      replyTo: process.env.SMTP_FROM_EMAIL,
    });

    console.log(`📧 Reminder sent to ${to}: ${info.response}`);

    res.json({
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Reminder send error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Send Payment Confirmation Endpoint
 * POST /api/send-payment-confirmation
 */
app.post('/api/send-payment-confirmation', async (req, res) => {
  try {
    const { clientName, to, invoiceNumber, amount } = req.body;

    if (!to || !clientName || !invoiceNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; border-radius: 5px; }
        .content { padding: 20px; background-color: #f9f9f9; margin: 20px 0; border-radius: 5px; }
        .amount { font-size: 24px; font-weight: bold; color: #28a745; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>✓ Payment Received</h2>
        </div>
        <div class="content">
          <p>Dear ${clientName},</p>
          <p>Thank you for your payment!</p>
          <p>We have successfully received your payment.</p>
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Amount Received:</strong> <span class="amount">₹${parseFloat(amount).toFixed(2)}</span></p>
          <p>Your invoice is now marked as paid. Thank you for your business!</p>
        </div>
        <div class="footer">
          <p>Invoice Payment System</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to,
      subject: `Payment Received: ${invoiceNumber}`,
      html: htmlBody,
      replyTo: process.env.SMTP_FROM_EMAIL,
    });

    console.log(`📧 Confirmation sent to ${to}: ${info.response}`);

    res.json({
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Confirmation send error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'invoice-payment-email',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 Email Service Running');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📧 Provider: Gmail SMTP`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   POST /api/send-email`);
  console.log(`   POST /api/send-invoice-reminder`);
  console.log(`   POST /api/send-payment-confirmation`);
  console.log(`   GET  /health\n`);
});
