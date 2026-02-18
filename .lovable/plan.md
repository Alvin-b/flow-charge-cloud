
## PowerFlow — Smart Energy Wallet App

A fintech-grade PWA for smart electricity management. Built with a modern dark/light mode UI, real-time dashboards, and full wallet functionality.

---

### 🎨 Design System & Branding
- **App name:** PowerFlow
- **Color palette:** Deep navy (`#0A0F1E`) + electric cyan (`#00D4FF`) + soft white, with amber accents for alerts
- **Style:** Glassmorphism cards, soft shadows, smooth transitions, fintech-grade typography
- **Dark mode default** with light mode toggle
- **PWA setup** with install prompt, service worker, and mobile-optimized meta tags

---

### 🔐 1. Authentication Flow
- **Splash screen** with PowerFlow branding and animated logo
- **Phone number entry** screen with country code selector (+254 Kenya default)
- **OTP verification** screen (6-digit code input)
- **4-digit PIN setup** screen with confirm PIN step
- **Biometric auth toggle** in settings (UI only — actual biometrics require native)
- **Device binding notice** on first login

---

### 🏠 2. Home Dashboard (Main Screen)
- **Wallet balance card** — large, glassmorphic, showing kWh balance + KES equivalent
- **Active meter card** — meter ID, online/offline status badge, current rate (kWh/hr)
- **Circular consumption gauge** — animated arc showing daily usage vs average
- **Estimated days remaining** — prominent countdown indicator
- **Quick action buttons** — Recharge, Transfer, Share, Add Meter
- **Smart insight banner** — e.g., "You used 18% more than yesterday"
- **Recent transactions list** — last 3 entries with icons

---

### ⚡ 3. Meter Management Screen
- **My Meters list** — each showing meter ID, property name, status badge (Online/Offline/Active/Inactive), live consumption rate
- **Add Meter flow:**
  - QR code scanner (camera access)
  - Manual meter ID entry fallback
  - Linking request confirmation
- **Meter detail view** — full stats, link/unlink button, SMS fallback status indicator
- **Move out flow** — unlink meter with balance transfer confirmation

---

### 📊 4. Usage Analytics Screen
- **Daily bar chart** — past 7 days usage (interactive, powered by Recharts)
- **Weekly line chart** — trend over 4 weeks
- **Monthly overview** — total kWh consumed, cost breakdown
- **Peak usage time indicator** — shows your highest consumption hour
- **Usage comparison card** — vs yesterday, vs last week
- **Appliance estimation hints** — "Equivalent to running a fridge for 3 days"
- Smooth chart animations and tap-to-inspect tooltips

---

### 💳 5. Recharge Screen (STK Push)
- **Amount input** — preset quick amounts (KES 50, 100, 200, 500, 1000) + custom
- **kWh preview** — shows equivalent units for entered amount in real-time
- **Phone number confirmation** — pre-filled from account, editable
- **Confirm & Pay button** → triggers M-Pesa STK Push via edge function
- **Payment pending animation** — pulsing loader with "Check your phone" message
- **Success screen** — animated checkmark, digital receipt card (amount, units added, new balance, transaction ID)
- **Failure screen** — with retry option and error message

---

### 🔄 6. Transfer / Energy Sharing Screen
- **Recipient input** — phone number field with contact search icon
- **Amount selector** — kWh amount with KES equivalent shown
- **Daily limit indicator** — remaining transfer allowance shown
- **PIN confirmation modal** — 4-digit PIN entry before sending
- **Transfer animation** — energy flowing between two avatars
- **Success/failure screen** with receipt
- **Transfer history tab** — all outgoing and incoming transfers

---

### 🔔 7. Notifications & Alerts
- **In-app notification center** — bell icon with badge count
- **Alert types with distinct icons:**
  - 🟡 Low balance (< 5 kWh)
  - 🔴 Meter offline
  - 🟢 Payment confirmed
  - 🟠 Abnormal usage detected
  - ⚪ Overconsumption warning
- **Push notification setup** (PWA Web Push ready)
- **Alert preferences** in settings — toggle each alert type on/off

---

### 👤 8. Profile & Settings Screen
- **Profile card** — avatar, name, phone number, account tier badge
- **Security section** — Change PIN, Biometric toggle, Active sessions
- **Linked meters** — quick view with manage link
- **Notification preferences** — per-alert-type toggles
- **App theme toggle** — Dark / Light
- **Transaction limits display** — daily transfer limit, recharge limits
- **Help & Support** — FAQ, contact, report issue
- **Logout button**

---

### 🗄️ Backend (Lovable Cloud / Supabase)
- **Database tables:** users, wallets, meters, transactions, meter_readings, transfers, notifications
- **Authentication:** Phone + OTP via Supabase Auth
- **Real-time subscriptions:** Wallet balance updates, meter status changes
- **Edge Functions:**
  - `initiate-stk-push` — calls M-Pesa Daraja API
  - `mpesa-callback` — receives payment confirmation from M-Pesa, updates wallet
  - `transfer-energy` — validates and executes peer transfers
  - `meter-sync` — handles meter reading updates
- **Row Level Security** on all tables
- **PWA configuration** with service worker, manifest, and install prompt page

---

### 📱 Navigation Structure
**Bottom Tab Bar:**
1. 🏠 Home (Dashboard)
2. ⚡ Recharge
3. 📊 Analytics
4. 🔄 Transfer
5. 👤 Profile

---

### 🚀 PWA Setup
- Installable from browser to home screen (iOS & Android)
- Offline-capable with service worker
- App manifest with PowerFlow branding
- `/install` page with install prompt trigger
- Mobile-optimized viewport and splash screens

