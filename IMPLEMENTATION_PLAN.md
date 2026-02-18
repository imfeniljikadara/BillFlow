# Invoice App — Implementation Plan & Analysis

## Status: Phase 1 Fixes Applied ✅

---

## 🔴 P0 CRITICAL FIXES (COMPLETED)

### 1. Onboarding Re-prompt Bug — FIXED ✅
**Root Cause:** Race condition in auth flow
- `appStore.ts` was setting `isLoading: false` immediately when auth resolved, before the Firestore profile snapshot arrived
- `index.tsx` then saw `userProfile === null` and redirected to `/onboarding` prematurely

**Fix Applied (3 files):**
- **`src/store/appStore.ts`** — `isLoading` now stays `true` until the profile listener fires its first snapshot. For logged-in users, profile data is guaranteed to be available before any routing decisions.
- **`src/app/index.tsx`** — Simplified from redundant 3-branch check to clean 3-path logic: no user → login, onboarding complete → tabs, otherwise → onboarding.
- **`src/app/onboarding.tsx`** — Pre-fills existing profile data (business name, UPI ID) so returning users never re-enter information. UPI ID is now optional.

### 2. Data Leak on Sign-Out — FIXED ✅
- `signOut` wasn't clearing `clients[]`, so switching accounts could show stale client data from the previous user.

### 3. TypeScript Errors — FIXED ✅
- `invoice/[id].tsx` had `Object is possibly undefined` errors on `recurrenceInterval` display.

### 4. Layout Bug — FIXED ✅
- `reminderHistory` style had `marginHorizontal: 24` inside a padded `ScrollView`, causing double-padding.

---

## 🟡 P1 — HIGH PRIORITY (Next Sprint)

### 5. Due Date Handling
**Issue:** The `create.tsx` has a `dueDate` field but it's just a text input, not a proper date picker. No automatic OVERDUE status transition.
**Fix:** Add `@react-native-community/datetimepicker` for proper date selection. Add auto-overdue logic in `initialize()`.

### 6. Invoice Number Auto-Generation
**Issue:** No sequential invoice numbering. Currently uses truncated Firestore ID as invoice number.
**Fix:** Add `invoiceNumber` auto-increment to profile metadata. Format as `INV-001`, `INV-002`, etc.

### 7. Search/Filter UX on Invoices Tab
**Issue:** Sorting options exist but the date sort assumes string comparison which may not work correctly for all date formats.
**Fix:** Ensure proper date parsing in sort comparisons.

### 8. Missing Client Notes Field in Client Modal
**Issue:** `clients.tsx` has `clientNotes` state but no corresponding `TextInput` in the modal form.
**Fix:** Add notes input field to the client add/edit modal.

---

## 🟢 P2 — MEDIUM PRIORITY (From Roadmap)

### 9. Offline Mode Support
- Add AsyncStorage caching for invoices/clients/products
- Queue Firestore writes when offline
- Show offline indicator in status bar

### 10. Invoice Templates
- Allow users to save invoice item presets
- Quick-fill from templates when creating new invoices

### 11. Batch Operations
- Multi-select invoices for bulk status updates
- Bulk PDF export/share

### 12. Push Notifications
- Overdue invoice reminders (local notifications)
- Payment confirmation alerts
- Recurring invoice generation alerts

### 13. Enhanced Dashboard
- Revenue forecasting based on recurring invoices
- Aging receivables report
- Client payment patterns

---

## 🔵 P3 — AI FEATURES (From Roadmap)

### 14. Smart Invoice Generation
- Auto-suggest items and pricing based on client history
- Pre-fill client details from previous invoices

### 15. Smart Payment Predictions
- Predict which clients are likely to pay late
- Suggest optimal reminder timing

### 16. Auto-Categorization
- Automatically categorize expenses and revenue
- Generate tax-ready reports

### 17. Voice Invoice Creation
- Create invoices via voice commands
- Natural language item description parsing

### 18. Client Insights
- Revenue per client trends
- Client health score
- Payment reliability scoring

---

## 🔵 P3 — ADVANCED FEATURES (From Roadmap)

### 19. Multi-Currency Support
- Add currency selection per invoice
- Basic exchange rate conversion

### 20. Expense Tracking
- Track business expenses alongside invoices
- Profit/loss reporting

### 21. Client Portal
- Shareable invoice links
- Online payment integration

### 22. Document Management
- Attach receipts and documents to invoices
- OCR for expense receipts

---

## Architecture Notes

### Current Stack
- **Framework:** Expo (React Native)
- **Navigation:** Expo Router (file-based)
- **State:** Zustand (real-time Firestore sync)
- **Backend:** Firebase (Auth + Firestore)
- **PDF:** expo-print + expo-sharing
- **Charts:** Custom bar charts (no external lib used in Analysis)

### Key Files Modified
| File | Change |
|------|--------|
| `src/store/appStore.ts` | Fixed race condition, data leak on sign-out |
| `src/app/index.tsx` | Simplified auth routing logic |
| `src/app/onboarding.tsx` | Pre-fill existing data, optional UPI |
| `src/app/invoice/[id].tsx` | TypeScript fix, layout fix |

### Testing Checklist for Fixes
- [ ] New user sign-up → sees onboarding → completes → goes to tabs
- [ ] Log out → log back in → goes directly to tabs (NO onboarding)
- [ ] Close app → reopen → goes directly to tabs (NO onboarding)
- [ ] Sign out → sign in as different user → no stale client data
- [ ] Recurring invoice interval displays correctly
- [ ] Reminder history card aligns properly within invoice detail view
