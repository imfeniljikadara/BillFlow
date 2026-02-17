# Security Guidelines

## Firebase Setup

### Environment Variables
This app requires Firebase credentials to be set up in a `.env` file. **Never commit this file to version control.**

1. Copy `.env.example` to `.env`
2. Fill in your Firebase credentials from [Firebase Console](https://console.firebase.google.com/)
3. The `.env` file is already in `.gitignore` to prevent accidental commits

### Firestore Security Rules

**IMPORTANT:** This app uses user-scoped data paths. You must configure Firestore security rules to protect user data.

Add these rules to your Firebase Console under Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to read/write their own invoices
      match /invoices/{invoiceId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Allow users to read/write their own products
      match /products/{productId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Data Structure

The app now uses user-scoped collections:
- `users/{userId}` - User profile data
- `users/{userId}/invoices/{invoiceId}` - User's invoices
- `users/{userId}/products/{productId}` - User's product library

This ensures complete data isolation between users.

## Migration Notes

If you have existing data in the old structure (`/invoices` and `/products` at root level), you'll need to migrate it to the new user-scoped structure. Contact your Firebase administrator for migration assistance.

## Security Best Practices

1. ✅ Firebase credentials are in `.env` (not committed)
2. ✅ Firestore rules enforce user data isolation
3. ✅ All subscriptions properly cleaned up on logout
4. ✅ Authentication required for all data operations
5. ✅ User ID validated on every Firestore operation

## Additional Recommendations

- Enable Firebase App Check for additional security
- Set up Firebase Authentication email verification
- Configure Firebase rate limiting
- Enable audit logging in Firebase Console
- Regularly review Firebase usage and security alerts
