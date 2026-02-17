import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, InvoiceItem, UserProfile } from '../types';

export const generateInvoiceHTML = (invoice: Invoice, businessProfile: UserProfile | null) => {
    const totalAmount = invoice.amount.toLocaleString('en-IN');
    const date = new Date(invoice.dateCreated).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const invoiceNum = invoice.invoiceNumber || invoice.id.slice(-8).toUpperCase();

    const itemsRows = invoice.items && invoice.items.length > 0
        ? invoice.items.map(item => {
            const itemTotal = item.quantity * item.price;
            return `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${itemTotal.toLocaleString('en-IN')}</td>
            </tr>
        `}).join('')
        : `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${invoice.serviceName || 'Service'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">1</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${invoice.amount.toLocaleString('en-IN')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${invoice.amount.toLocaleString('en-IN')}</td>
            </tr>
        `;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
                body {
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    color: #333;
                    margin: 0;
                    padding: 40px;
                    -webkit-print-color-adjust: exact;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 40px;
                }
                .business-name {
                    font-size: 28px;
                    font-weight: bold;
                    color: #1e293b;
                    text-transform: uppercase;
                }
                .invoice-tag {
                    font-size: 36px;
                    font-weight: bold;
                    color: #e2e8f0;
                    text-align: right;
                }
                .invoice-details {
                    text-align: right;
                    margin-top: 10px;
                    color: #64748b;
                }
                .client-box {
                    background-color: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 40px;
                }
                .label {
                    font-size: 10px;
                    font-weight: bold;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 5px;
                }
                .client-name {
                    font-size: 18px;
                    font-weight: bold;
                    color: #0f172a;
                }
                .client-contact {
                    font-size: 13px;
                    color: #64748b;
                    margin-top: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 40px;
                }
                th {
                    text-align: left;
                    padding: 12px;
                    background-color: #f1f5f9;
                    font-size: 10px;
                    text-transform: uppercase;
                    color: #64748b;
                    letter-spacing: 1px;
                }
                .total-section {
                    display: flex;
                    justify-content: flex-end;
                }
                .total-box {
                    width: 300px;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                .grand-total {
                    border-top: 2px solid #0f172a;
                    padding-top: 10px;
                    margin-top: 10px;
                    font-size: 20px;
                    font-weight: bold;
                    color: #0f172a;
                }
                .status-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-left: 10px;
                }
                .status-pending { background: #FEF3C7; color: #D97706; }
                .status-paid { background: #D1FAE5; color: #059669; }
                .status-overdue { background: #FEE2E2; color: #DC2626; }
                .payment-section {
                    margin-top: 40px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                }
                .payment-title {
                    font-size: 10px;
                    font-weight: bold;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 10px;
                }
                .payment-details {
                    font-size: 14px;
                    color: #334155;
                }
                .qr-section {
                    margin-top: 20px;
                    text-align: center;
                }
                .footer {
                    margin-top: 60px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 12px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                }
                .notes-box {
                    margin-top: 30px;
                    padding: 15px;
                    background-color: #f8fafc;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #475569;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="business-name">${businessProfile?.businessName || 'MY BUSINESS'}</div>
                    <div style="margin-top: 5px; color: #64748b;">${businessProfile?.mobileNumber || ''}</div>
                    ${businessProfile?.gstNumber ? `<div style="margin-top: 3px; color: #64748b; font-size: 12px;">GSTIN: ${businessProfile.gstNumber}</div>` : ''}
                </div>
                <div>
                    <div class="invoice-tag">INVOICE</div>
                    <div class="invoice-details">
                        #${invoiceNum}<br/>
                        ${date}
                        <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
                    </div>
                </div>
            </div>

            <div class="client-box">
                <div class="label">BILLED TO</div>
                <div class="client-name">${invoice.clientName}</div>
                ${invoice.clientEmail ? `<div class="client-contact">✉ ${invoice.clientEmail}</div>` : ''}
                ${invoice.clientPhone ? `<div class="client-contact">📱 ${invoice.clientPhone}</div>` : ''}
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 50%">Item</th>
                        <th style="text-align: center; width: 10%">Qty</th>
                        <th style="text-align: right; width: 20%">Price</th>
                        <th style="text-align: right; width: 20%">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <div class="total-section">
                <div class="total-box">
                    <div class="row">
                        <span>Subtotal</span>
                        <span>₹${totalAmount}</span>
                    </div>
                    <div class="row grand-total">
                        <span>Total Due</span>
                        <span>₹${totalAmount}</span>
                    </div>
                </div>
            </div>

            ${invoice.notes ? `
            <div class="notes-box">
                <strong>Notes:</strong><br/>
                ${invoice.notes}
            </div>
            ` : ''}

            <div class="payment-section">
                <div class="payment-title">PAYMENT INFORMATION</div>
                <div class="payment-details">
                    <div><strong>Pay via UPI:</strong> ${businessProfile?.upiId || 'Not set'}</div>
                    ${businessProfile?.bankName ? `
                    <div style="margin-top: 10px;">
                        <strong>Bank Transfer:</strong><br/>
                        ${businessProfile.bankName}<br/>
                        A/C: ${businessProfile.accountNumber || 'N/A'}<br/>
                        IFSC: ${businessProfile.ifscCode || 'N/A'}
                    </div>
                    ` : ''}
                    <div style="margin-top: 5px; font-size: 10px; color: #64748b;">(Google Pay, PhonePe, Paytm, etc.)</div>
                </div>
            </div>

            <div class="footer">
                Thank you for your business! 🙏
            </div>
        </body>
        </html>
    `;
};

// Alias for backward compatibility
export const generateInvoicePDF = generateInvoiceHTML;

export const createAndSharePDF = async (invoice: Invoice, businessProfile: UserProfile | null) => {
    try {
        const html = generateInvoiceHTML(invoice, businessProfile);
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
