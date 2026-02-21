# Invoice Payment Email Service

Email service backend for the Invoice Payment app. Handles sending emails via Gmail SMTP and manages reminders/confirmations.

## Setup (5 minutes)

### 1. Copy Environment Variables

```bash
cp .env.example .env
```

Then edit `.env` with your Gmail credentials:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Invoice Flow
PORT=3000
```

### 2. Get Gmail App Password

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Factor Authentication** (if not enabled)
3. Click **App passwords** (under "How you sign in to Google")
4. Select "Mail" → "Windows Computer" (or your OS)
5. Google generates a 16-character password → **Copy this to `.env`**

⚠️ **Important:** Use the App Password, NOT your actual Gmail password.

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Start the Service

```bash
npm start
```

You should see:

```
🚀 Email Service Running
📍 Server: http://localhost:3000
📧 Provider: Gmail SMTP

✅ Gmail SMTP connected successfully
   Sending from: your-email@gmail.com
```

## API Endpoints

### Send Email

```bash
POST http://localhost:3000/api/send-email
Content-Type: application/json

{
  "to": "client@example.com",
  "subject": "Invoice Reminder",
  "body": "HTML email content here"
}
```

### Send Invoice Reminder

```bash
POST http://localhost:3000/api/send-invoice-reminder

{
  "clientName": "John Doe",
  "to": "john@example.com",
  "invoiceNumber": "INV-001",
  "amount": 5000,
  "dueDate": "2026-02-28"
}
```

### Send Payment Confirmation

```bash
POST http://localhost:3000/api/send-payment-confirmation

{
  "clientName": "John Doe",
  "to": "john@example.com",
  "invoiceNumber": "INV-001",
  "amount": 5000
}
```

### Health Check

```bash
GET http://localhost:3000/health
```

## Troubleshooting

### "Gmail SMTP connection failed"

**Problem:** `Error: Invalid login: 535-5.7.8 Username and password not accepted`

**Solution:**
- ❌ Don't use your actual Gmail password
- ✅ Use App Password from step 2 above
- ✅ Make sure 2FA is enabled on your Gmail account
- ✅ Check for typos in `.env`

### Email not sending

**Check:**
1. Is the backend running? (`npm start`)
2. Is the app configured with correct backend URL?
   - Check [.env](../.env) `EXPO_PUBLIC_EMAIL_SERVICE_URL=http://localhost:3000`
3. Are Gmail credentials correct in `backend/.env`?
4. Check server logs for error details

## Development vs Production

### Development (Local Testing)

```bash
# Terminal 1: Start React Native app
cd invoice-payment
npm start

# Terminal 2: Start email service
cd backend
npm start
```

### Production Deployment

The backend needs to be deployed to a server. Free options:

1. **Railway.app** (Recommended - $5/month after free tier)
   - Free tier: 5GB bandwidth, limited hours
   - Commands:
     ```bash
     npm install -g @railway/cli
     railway login
     railway init
     railway up
     ```
   - Get deployment URL from Railway dashboard

2. **Render.com**
   - Free tier available
   - Deploy via GitHub (auto-deploys on push)
   - Get deployment URL from Render dashboard

3. **Heroku** (Free tier discontinued, but still cheapest option)
   - $7/month per dyno

4. **Firebase Cloud Functions** (Advanced)
   - Free tier: 2 million invocations/month
   - Requires Firebase setup

### Update Production URL

Once deployed, update [.env](../.env):

```env
# Change from localhost to your deployment URL
EXPO_PUBLIC_EMAIL_SERVICE_URL=https://your-backend-url.railway.app
```

## Architecture

```
┌─────────────────────────┐
│  React Native App       │
│  (Expo Router)          │
│                         │
│  notificationManager.ts │
│  (calls HTTP endpoints) │
└────────────┬────────────┘
             │ HTTP POST
             ▼
┌─────────────────────────┐
│  Email Service Backend  │
│  (Node.js + Express)    │
│                         │
│  server.js              │
│  /api/send-email        │
│  /api/send-invoice-*    │
└────────────┬────────────┘
             │ SMTP
             ▼
         Gmail SMTP
```

## Next Steps

- [ ] Deploy backend to production
- [ ] Update `.env` with production URL
- [ ] Set up SMS with Twilio (in `server.js`)
- [ ] Add retry logic for failed emails
- [ ] Set up email templates with SendGrid (optional upgrade)
- [ ] Monitor email delivery with analytics

## Support

For issues:
1. Check server logs for error details
2. Verify Gmail app password is correct
3. Ensure 2FA is enabled on Gmail account
4. Test with `curl` to isolate frontend vs backend issues

```bash
# Test email endpoint directly
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","body":"Hello"}'
```
