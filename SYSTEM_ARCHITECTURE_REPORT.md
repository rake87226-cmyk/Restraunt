# LA BELLA RESTAURANT - DETAILED SYSTEM ARCHITECTURE REPORT

## 📋 EXECUTIVE SUMMARY

**La Bella** is a full-stack restaurant management and food ordering web application built with:
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js + Express.js REST API
- **Database:** SQLite3 with 8 core tables
- **Payment Gateway:** Razorpay integration
- **Communication:** Email (Nodemailer) & SMS (Twilio)
- **Authentication:** OTP via Email + Google OAuth + Admin credentials

---

## 🏗️ SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (FRONTEND)                   │
├─────────────────────────────────────────────────────────────────┤
│  Browser (HTML/CSS/JavaScript)                                   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ login.html   │  │ index.html   │  │ admin.html   │           │
│  │ login.js     │  │ (navbar)     │  │ admin-login  │           │
│  │ login.css    │  │ index updates│  │ .html/.js    │           │
│  │              │  │ user-history │  │              │           │
│  │              │  │ .html        │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │menu.html     │  │reservation   │  │feedback.html │           │
│  │menu1.html    │  │.html         │  │              │           │
│  │menu3.html    │  │              │  │              │           │
│  │menu4.html    │  │              │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │contact.html  │  │app.js        │  │style.css     │           │
│  │              │  │(utilities)   │  │(global)      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  All files use localStorage/sessionStorage for client-side state │
│  All files make REST API calls to backend on :3000               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (HTTP/HTTPS)
                              │ Fetch API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (BACKEND)                           │
│                    Node.js + Express.js                          │
│                    Running on PORT 3000                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ server.js - Main Express Application                    │    │
│  │ ───────────────────────────────────────────────────────  │    │
│  │ • CORS middleware for cross-origin requests             │    │
│  │ • Razorpay initialization (payment gateway)             │    │
│  │ • Twilio initialization (SMS service)                   │    │
│  │ • Email service initialization (Nodemailer)            │    │
│  │                                                         │    │
│  │ MENU ENDPOINTS                                          │    │
│  │ GET  /api/menu                                          │    │
│  │      → Returns 22 menu items from database              │    │
│  │                                                         │    │
│  │ ORDER ENDPOINTS                                         │    │
│  │ POST /api/orders                                        │    │
│  │      → Creates order, inserts order_items               │    │
│  │      → Handles Razorpay payment creation                │    │
│  │      → Sends SMS/Email confirmation                    │    │
│  │      → Returns orderId                                  │    │
│  │                                                         │    │
│  │ GET  /api/orders                                        │    │
│  │      → Returns all orders with associated items         │    │
│  │                                                         │    │
│  │ RESERVATION ENDPOINTS                                   │    │
│  │ POST /api/reservations                                  │    │
│  │      → Creates booking, handles payment                 │    │
│  │      → Sets status: 'confirmed' or 'pending_payment'    │    │
│  │      → Sends confirmation email/SMS                    │    │
│  │                                                         │    │
│  │ GET  /api/reservations                                  │    │
│  │      → Returns all reservations with payment details    │    │
│  │                                                         │    │
│  │ PAYMENT ENDPOINTS                                       │    │
│  │ POST /api/payments/verify                               │    │
│  │      → Verifies Razorpay signature (HMAC-SHA256)        │    │
│  │      → Updates order/reservation status to 'paid'       │    │
│  │      → Sends confirmation emails                       │    │
│  │                                                         │    │
│  │ POST /api/payments                                      │    │
│  │      → Records payment details in payments table        │    │
│  │                                                         │    │
│  │ FEEDBACK ENDPOINTS                                      │    │
│  │ POST /api/feedback                                      │    │
│  │      → Creates new feedback record                      │    │
│  │ GET  /api/feedback                                      │    │
│  │      → Returns all feedback                             │    │
│  │                                                         │    │
│  │ AUTHENTICATION ENDPOINTS                                │    │
│  │ POST /api/auth/send-otp                                 │    │
│  │      → Generates 6-digit OTP                            │    │
│  │      → Stores in otpStore with 10-min expiry            │    │
│  │      → Sends OTP via email                              │    │
│  │      → Returns OTP (for testing)                        │    │
│  │                                                         │    │
│  │ POST /api/auth/verify-otp                               │    │
│  │      → Validates OTP against otpStore                   │    │
│  │      → Creates/updates user in database                 │    │
│  │      → Creates session with JWT token                   │    │
│  │      → Returns token + user data                        │    │
│  │                                                         │    │
│  │ POST /api/auth/google-signin                            │    │
│  │      → Decodes Google JWT token                         │    │
│  │      → Creates user if not exists                       │    │
│  │      → Creates authenticated session                    │    │
│  │                                                         │    │
│  │ POST /api/auth/logout                                   │    │
│  │      → Deletes session from database                    │    │
│  │                                                         │    │
│  │ POST /api/auth/verify-token                             │    │
│  │      → Checks if session token is valid                 │    │
│  │      → Returns user data if valid                       │    │
│  │                                                         │    │
│  │ USER HISTORY ENDPOINTS                                  │    │
│  │ POST /api/user/history                                  │    │
│  │      → Returns last 5 orders + last 5 reservations      │    │
│  │      → Populated from orders & reservations tables      │    │
│  │                                                         │    │
│  │ POST /api/user/history/full                             │    │
│  │      → Returns complete user history (all orders/ress.) │    │
│  │      → With full details from order_items, menu         │    │
│  │                                                         │    │
│  │ ADMIN ENDPOINTS                                         │    │
│  │ GET  /api/admin/reservations                            │    │
│  │      → Returns all reservations with stats              │    │
│  │ GET  /api/admin/orders                                  │    │
│  │      → Returns all orders with payment details          │    │
│  │ GET  /api/admin/feedback                                │    │
│  │      → Returns all feedback entries                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Query/Insert/Update
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│                    SQLite3 (db.sqlite)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  db.js - Database Connection Module                             │
│  ─────────────────────────────────────────                      │
│  Exports: run() | all() | get()                                 │
│  (Promisified database query functions)                         │
│                                                                   │
│  TABLES:                                                         │
│                                                                   │
│  1. menu                                                         │
│     ├─ id (PRIMARY KEY)                                         │
│     ├─ name (Pizza, Biryani, etc.)                             │
│     ├─ description                                              │
│     ├─ price                                                    │
│     └─ image (filename)                                         │
│     [22 items pre-seeded]                                       │
│                                                                   │
│  2. users                                                        │
│     ├─ id (PRIMARY KEY)                                         │
│     ├─ email (UNIQUE)                                           │
│     ├─ name                                                     │
│     ├─ phone                                                    │
│     ├─ created_at                                               │
│     └─ updated_at                                               │
│     [Created on first OTP/Google login]                         │
│                                                                   │
│  3. sessions                                                     │
│     ├─ id (PRIMARY KEY)                                         │
│     ├─ user_id (FOREIGN KEY → users.id)                        │
│     ├─ token (UNIQUE JWT)                                       │
│     ├─ expires_at                                               │
│     └─ created_at                                               │
│     [One session per authenticated user]                        │
│                                                                   │
│  4. orders                                                       │
│     ├─ id (PRIMARY KEY)                                         │
│     ├─ customer_name                                            │
│     ├─ customer_email                                           │
│     ├─ customer_phone                                           │
│     ├─ total (order amount in ₹)                               │
│     ├─ status ('pending', 'confirmed', 'paid')                 │
│     ├─ payment_id (Razorpay)                                    │
│     └─ created_at                                               │
│     [Each food order creates one record]                        │
│                                                                   │
│  5. order_items                                                  │
│     ├─ id (PRIMARY KEY)                                         │
│     ├─ order_id (FOREIGN KEY → orders.id)                      │
│     ├─ menu_id (FOREIGN KEY → menu.id)                         │
│     ├─ quantity                                                 │
│     └─ price (item price at time of order)                     │
│     [One per item in order, multiple rows per order]           │
│                                                                   │
│  6. reservations                                                 │
│     ├─ id (PRIMARY KEY)                                         │
│     ├─ name (customer name)                                     │
│     ├─ email                                                    │
│     ├─ phone                                                    │
│     ├─ date (booking date YYYY-MM-DD)                          │
│     ├─ time (booking time HH:MM)                               │
│     ├─ party_size (number of guests)                           │
│     ├─ status ('confirmed', 'pending_payment', 'paid')         │
│     ├─ payment_id                                               │
│     └─ created_at                                               │
│     [One per table booking]                                     │
│                                                                   │
│  7. payments                                                     │
│     ├─ id (PRIMARY KEY)                                         │
│     ├─ order_id / reservation_id (optional)                    │
│     ├─ amount                                                   │
│     ├─ method (razorpay, cash)                                  │
│     ├─ status (completed, pending)                              │
│     ├─ details (JSON with Razorpay details)                    │
│     └─ created_at                                               │
│     [Payment transaction record]                                │
│                                                                   │
│  8. feedback                                                     │
│     ├─ id (PRIMARY KEY)                                         │
│     ├─ name                                                     │
│     ├─ email                                                    │
│     ├─ rating                                                   │
│     ├─ message                                                  │
│     └─ created_at                                               │
│     [Customer feedback/reviews]                                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (External Services)
                              ▼
┌──────────────────┬──────────────────┬──────────────────┐
│   EMAIL SERVICE  │   SMS SERVICE    │   PAYMENT GATE   │
├──────────────────┼──────────────────┼──────────────────┤
│                  │                  │                  │
│ email.js         │ sms.js           │ Razorpay         │
│ (Nodemailer)     │ (Twilio)         │ SDK              │
│                  │                  │                  │
│ SMTP via Gmail   │ Twilio API       │ REST API         │
│ Sends:           │ Sends:           │ Creates:         │
│ • OTP email      │ • SMS confirm    │ • Payment orders │
│ • Order confirm  │ • Booking confirm│ • Verifies sign. │
│ • Booking confirm│                  │                  │
│                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## 📁 FILE STRUCTURE & CONNECTIONS

### ROOT DIRECTORY (Frontend Files)

```
labella/
├── index.html                    [HOME PAGE & NAVBAR]
│   ├── Displays: Menu showcase, featured items
│   ├── Connects to: style.css
│   ├── JavaScript: Checks auth on load via localStorage
│   ├── Calls API: /api/user/history (loads user history dropdown)
│   ├── Calls API: /api/auth/logout (logout button)
│   └── Redirects to: user-history.html (full history button)
│
├── login.html                    [USER AUTHENTICATION]
│   ├── Shows: Email form → OTP form
│   ├── Connects to: login.css, login.js
│   ├── Calls API: POST /api/auth/send-otp (enter email)
│   ├── Calls API: POST /api/auth/verify-otp (enter OTP)
│   ├── Calls API: POST /api/auth/google-signin (Google button)
│   ├── Stores: userToken, userEmail, userName in localStorage
│   └── Redirects to: index.html (on success)
│
├── login.css                     [LOGIN PAGE STYLING]
│   └── Styles: Gradient backgrounds, animations, responsive design
│
├── login.js                      [LOGIN PAGE LOGIC]
│   ├── handleEmailSubmit() → Validates email, calls send-otp
│   ├── handleOtpSubmit() → Validates OTP, calls verify-otp
│   ├── handleGoogleSignIn() → Processes Google callback
│   ├── setupOtpInputs() → Auto-advance OTP fields
│   ├── resendOtp() → Resend OTP with 60s timer
│   └── checkAuthStatus() → Redirect if already logged in
│
├── admin.html                    [ADMIN DASHBOARD]
│   ├── Shows: Booking/Order/Feedback statistics
│   ├── Connects to: admin-dashboard.css
│   ├── Auth Check: Redirects to admin-login.html if no session
│   ├── Calls API: /api/admin/reservations (load reservations)
│   ├── Calls API: /api/admin/orders (load orders)
│   ├── Calls API: /api/admin/feedback (load feedback)
│   ├── Features: Search, filter, CSV export
│   └── Logout: Clears sessionStorage, redirects to admin-login.html
│
├── admin-login.html              [ADMIN LOGIN FORM]
│   ├── Shows: Username & Password fields
│   ├── Connects to: admin-login.js
│   ├── Validates: Username == "Rakesh" && Password == "998664"
│   ├── Stores: adminToken in sessionStorage
│   └── Redirects to: admin.html (on success)
│
├── admin-login.js                [ADMIN LOGIN LOGIC]
│   ├── handleAdminLogin() → Validates credentials
│   ├── Stores: sessionStorage.adminToken, adminUsername
│   ├── Remember me: Saves to localStorage
│   └── adminLogout() → Clears session and redirects
│
├── user-history.html             [FULL USER HISTORY PAGE]
│   ├── Shows: All orders + reservations
│   ├── Filter tabs: All / Orders / Reservations
│   ├── Calls API: /api/user/history/full
│   ├── Displays: Order details, reservation details
│   └── Links back to: index.html
│
├── menu.html, menu1.html,        [MENU PAGES]
├── menu3.html, menu4.html        
│   ├── Display: Menu items with descriptions & prices
│   ├── Calls API: /api/menu (load menu items)
│   ├── Features: Add to cart, quantity selection
│   └── Redirects to: reservation.html (checkout)
│
├── reservation.html              [CHECKOUT & BOOKING]
│   ├── Shows: Cart review, customer form, payment option
│   ├── Calls API: POST /api/orders (submit food order)
│   ├── Calls API: POST /api/reservations (submit booking)
│   ├── Payment: Integrates Razorpay
│   ├── Calls API: POST /api/payments/verify (after Razorpay)
│   └── Handles: Online & Cash payment methods
│
├── contact.html                  [CONTACT PAGE]
│   └── Shows: Restaurant contact info, location, hours
│
├── feedback.html                 [FEEDBACK FORM]
│   ├── Shows: Name, email, rating, message form
│   ├── Calls API: POST /api/feedback (submit feedback)
│   ├── Calls API: GET /api/feedback (load feedback display)
│   └── Features: Star rating, message input
│
├── app.js                        [UTILITY FUNCTIONS]
│   └── Shared JS utilities (if any)
│
├── style.css                     [GLOBAL STYLING]
│   ├── Navbar styling
│   ├── Footer styling
│   ├── Common button/card styles
│   └── Responsive breakpoints
│
├── admin-dashboard.css           [ADMIN PAGE STYLING]
│   └── Dashboard-specific styles
│
├── GOOGLE_SIGNIN_SETUP.md        [DOCUMENTATION]
│   └── Setup guide for Google OAuth integration
│
└── [Image files: *.jpeg, *.jpg]  [MENU ITEM IMAGES]
    └── Used in menu display
```

### BACKEND DIRECTORY

```
backend/
├── server.js                     [MAIN EXPRESS APPLICATION]
│   ├── Initialize: CORS, Express, Razorpay, Twilio, Email
│   ├── Import: db.js, email.js, sms.js
│   ├── PORT: 3000
│   ├── Routes: 22 endpoints (documented in API section)
│   └── Exports: None (runs as service)
│
├── db.js                         [DATABASE CONNECTION]
│   ├── sqlite3 connection to db.sqlite
│   ├── Exports: run(), all(), get()
│   │   • run(sql, params) → Execute INSERT/UPDATE/DELETE
│   │   • all(sql, params) → Fetch multiple rows
│   │   • get(sql, params) → Fetch single row
│   └── All promisified (returns Promises)
│
├── init_db.js                    [DATABASE INITIALIZATION]
│   ├── Creates 8 tables if not exist
│   ├── Adds payment_id columns if missing
│   ├── Seeds 22 menu items (Italian & Indian)
│   ├── Run once on setup: node init_db.js
│   └── Safe to run multiple times (uses IF NOT EXISTS)
│
├── email.js                      [EMAIL SERVICE]
│   ├── initEmail() → Create Nodemailer transporter
│   ├── sendEmail(toEmail, subject, html) → Generic send
│   ├── sendOrderConfirmationEmail() → Order receipts
│   ├── sendReservationConfirmationEmail() → Booking confirmations
│   ├── Uses: Gmail SMTP (configured in .env)
│   └── Exports: All 4 functions
│
├── sms.js                        [SMS SERVICE]
│   ├── initTwilio() → Initialize Twilio client
│   ├── sendOrderConfirmation() → Order SMS
│   ├── sendReservationConfirmation() → Booking SMS
│   └── Uses: Twilio API (configured in .env)
│
├── send_test_email.js            [TESTING UTILITY]
│   └── Manual script to test email sending
│
├── db.sqlite                     [SQLITE DATABASE FILE]
│   └── Stores all user, order, reservation, feedback data
│
├── package.json                  [NPM DEPENDENCIES]
│   ├── express: Web framework
│   ├── cors: Cross-origin requests
│   ├── dotenv: Environment variables
│   ├── sqlite3: Database
│   ├── nodemailer: Email sending
│   ├── razorpay: Payment gateway SDK
│   ├── twilio: SMS service
│   └── jsonwebtoken: Google JWT decoding
│
├── .env                          [CONFIGURATION - NOT VERSIONED]
│   ├── SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
│   ├── RZP_KEY_ID, RZP_KEY_SECRET (Razorpay)
│   ├── TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
│   ├── TWILIO_PHONE_NUMBER
│   ├── PORT (default 3000)
│   ├── JWT_SECRET
│   └── DB_PATH (optional)
│
├── .env.example                  [TEMPLATE FOR .env]
│   └── Shows required environment variables
│
├── README.md                     [PROJECT DOCUMENTATION]
│   └── Setup and usage instructions
│
└── node_modules/                 [NPM PACKAGES]
    └── All installed dependencies
```

---

## 🔄 DATA FLOW DIAGRAMS

### USER LOGIN FLOW

```
┌────────────────┐
│ User lands on  │
│ login.html     │
└────────┬────────┘
         │
         ▼
    ┌────────────────────────┐
    │ 1. Enter Email Address │
    │ 2. Click "Send OTP"    │
    └────────┬───────────────┘
             │
             ▼
    POST /api/auth/send-otp
    {email: "user@example.com"}
             │
             ▼
    [server.js - otpStore]
    ├─ Generate: 6-digit OTP
    ├─ Store: otpStore[email] = {otp, createdAt, attempts}
    ├─ Email: Send OTP via Nodemailer
    └─ Return: {success: true, otp: "123456"}
             │
             ▼
    Display OTP in green box (testing)
    Resend timer starts (60 seconds)
             │
             ▼
    ┌──────────────────────────┐
    │ 1. Enter 6-digit OTP     │
    │ 2. Click "Verify OTP"    │
    └────────┬─────────────────┘
             │
             ▼
    POST /api/auth/verify-otp
    {email: "user@example.com", otp: "123456"}
             │
             ▼
    [server.js - OTP Verification]
    ├─ Validate: otpStore[email].otp == otp
    ├─ Check: Not expired (< 10 minutes)
    ├─ Check: Not max attempts (< 5)
    └─ If valid:
        │
        ├─► Query: SELECT * FROM users WHERE email
        │   If NOT exists:
        │   └─► INSERT INTO users (email, name, phone, created_at)
        │
        ├─► Generate JWT token
        │
        ├─► INSERT INTO sessions (user_id, token, expires_at)
        │
        └─► Return: {success: true, token, email, name}
             │
             ▼
    [Client] Store in localStorage:
    ├─ localStorage.userToken = token
    ├─ localStorage.userEmail = email
    └─ localStorage.userName = name
             │
             ▼
    Show success animation
    Redirect to index.html after 500ms
             │
             ▼
    ┌──────────────────────────┐
    │ index.html loads         │
    │ Navbar shows:            │
    │ • User avatar with initial
    │ • User name              │
    │ • Logout button          │
    │ • History dropdown       │
    └──────────────────────────┘
```

### ORDER PLACEMENT FLOW

```
┌──────────────────────────────┐
│ User browses menu.html       │
│ Calls: GET /api/menu         │
│ Shows: 22 menu items         │
└──────────┬───────────────────┘
           │ Select items, add to cart
           ▼
    ┌──────────────────────┐
    │ Click "Checkout"     │
    │ Go to reservation.html│
    └──────────┬───────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ Enter Customer Details:     │
    │ • Name                      │
    │ • Email                     │
    │ • Phone                     │
    │ • Address                   │
    │ • Payment Method            │
    │   (Cash / Online)           │
    └──────────┬──────────────────┘
              │
              ▼
    [If Cash Payment]
              │
              ├──► POST /api/orders
              │    {items: [{id, qty}], customer: {...}, total, paymentMethod: 'cash'}
              │
              ├──► [server.js - Create Order]
              │    ├─ INSERT INTO orders (customer_name, email, phone, total, status='pending')
              │    ├─ For each item:
              │    │  └─ INSERT INTO order_items (order_id, menu_id, qty, price)
              │    ├─ Send SMS: sendOrderConfirmation(phone, orderId, total)
              │    ├─ Send Email: sendOrderConfirmationEmail(email, orderId, name, total, items)
              │    └─ Return: {orderId, status: 'confirmed'}
              │
              └──► Show confirmation
                   Display: Order #123
                   Email & SMS sent
                   Redirect to index.html
    
    [If Online Payment (Razorpay)]
              │
              ├──► POST /api/orders
              │    {items: [...], customer: {...}, paymentMethod: 'online'}
              │
              ├──► [server.js - Create Razorpay Order]
              │    ├─ INSERT INTO orders (status='pending')
              │    ├─ rzp.orders.create({amount, currency, receipt})
              │    └─ Return: {orderId, payment: {key, order}}
              │
              ├──► Show Razorpay Checkout Modal
              │    (Razorpay.js handles payment UI)
              │
              ├──► User completes payment
              │    Razorpay generates:
              │    • razorpay_order_id
              │    • razorpay_payment_id
              │    • razorpay_signature
              │
              ├──► POST /api/payments/verify
              │    {razorpay_order_id, razorpay_payment_id, razorpay_signature, type: 'order', id: orderId}
              │
              ├──► [server.js - Verify Payment]
              │    ├─ Recreate HMAC-SHA256 signature with RZP_KEY_SECRET
              │    ├─ Compare: generated == received
              │    ├─ If valid:
              │    │  ├─ UPDATE orders SET status='paid', payment_id=razorpay_payment_id
              │    │  ├─ INSERT INTO payments (order_id, amount, method, status, details)
              │    │  ├─ Send Email: sendOrderConfirmationEmail(...)
              │    │  └─ Return: {success: true}
              │    └─ If invalid:
              │       └─ Return: {success: false, error: 'Invalid signature'}
              │
              └──► Show success
                   Order confirmed and paid
                   Redirect to index.html
```

### ADMIN ACCESS FLOW

```
┌────────────────────────────────┐
│ Admin navigates to admin.html   │
└────────┬───────────────────────┘
         │
         ▼
    Check sessionStorage.adminToken
         │
         ├─► If exists:
         │   └─ Show Admin Dashboard
         │      ├─ Call GET /api/admin/reservations
         │      ├─ Call GET /api/admin/orders
         │      ├─ Call GET /api/admin/feedback
         │      └─ Display tables & statistics
         │
         └─► If NOT exists:
             └─ Redirect to admin-login.html
                │
                ▼
             ┌──────────────────┐
             │ Enter Username   │
             │ Enter Password   │
             └────────┬─────────┘
                      │
                      ▼
             Validate in admin-login.js:
             ├─ username == "Rakesh"
             ├─ password == "998664"
             │
             ├─► If valid:
             │   ├─ sessionStorage.adminToken = 'authenticated'
             │   ├─ sessionStorage.adminUsername = 'Rakesh'
             │   ├─ localStorage.rememberAdmin = 'true' (if checked)
             │   └─ Redirect to admin.html
             │
             └─► If invalid:
                 ├─ Show error message
                 ├─ Clear password field
                 └─ Focus username input
```

### USER HISTORY FLOW

```
┌────────────────┐
│ User logged in │
│ on index.html  │
└────────┬───────┘
         │
         ▼
    On page load:
    loadUserHistory() called
         │
         ▼
    POST /api/user/history
    {email: localStorage.userEmail, limit: 5}
         │
         ▼
    [server.js - Query History]
    ├─ SELECT * FROM orders WHERE customer_email = ? LIMIT 5
    ├─ SELECT * FROM reservations WHERE email = ? LIMIT 5
    └─ Return: {orders: [...], reservations: [...], combined: [...]}
         │
         ▼
    Display in navbar dropdown:
    ├─ Last 5 orders (with totals)
    ├─ Last 5 reservations (with dates)
    └─ Status badges (green, orange, blue)
         │
         ▼
    User clicks "View Full History"
         │
         ▼
    Redirect to user-history.html
         │
         ▼
    POST /api/user/history/full
    {email: userEmail}
         │
         ▼
    [server.js - Query Complete History]
    ├─ SELECT * FROM orders WHERE customer_email = ?
    ├─ For each order:
    │  └─ SELECT * FROM order_items WHERE order_id = ?
    │     SELECT * FROM menu WHERE id = ?
    ├─ SELECT * FROM reservations WHERE email = ?
    └─ Return: {orders: [...with items], reservations: [...]}
         │
         ▼
    Display full history page:
    ├─ Filter tabs: All / Orders / Reservations
    ├─ Order cards: ID, date, amount, items, status
    ├─ Reservation cards: ID, date, time, guests, status
    └─ Empty state if no history
```

---

## 🔌 API ENDPOINT REFERENCE

### Authentication Endpoints

| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|--------------|----------|---------|
| POST | `/api/auth/send-otp` | `{email}` | `{success, message, otp, emailSent}` | Send OTP to email |
| POST | `/api/auth/verify-otp` | `{email, otp}` | `{success, token, email, name, phone}` | Verify OTP & create session |
| POST | `/api/auth/google-signin` | `{idToken}` | `{success, token, email, name}` | Google OAuth login |
| POST | `/api/auth/logout` | `{email}` | `{success}` | Delete user session |
| POST | `/api/auth/verify-token` | `{email, token}` | `{valid, user}` | Check session validity |

### Menu & Order Endpoints

| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|--------------|----------|---------|
| GET | `/api/menu` | - | `[{id, name, description, price, image}...]` | Get all 22 menu items |
| POST | `/api/orders` | `{items, customer, total, paymentMethod}` | `{orderId, status}` or `{orderId, payment}` | Create food order |
| GET | `/api/orders` | - | `[{id, customer_name, items, total, status}...]` | Get all orders |

### Reservation & Payment Endpoints

| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|--------------|----------|---------|
| POST | `/api/reservations` | `{name, email, phone, date, time, party, paymentMethod}` | `{reservationId, status}` or `{reservationId, payment}` | Create table reservation |
| GET | `/api/reservations` | - | `[{id, name, email, date, time, party_size, status}...]` | Get all reservations |
| POST | `/api/payments/verify` | `{razorpay_order_id, razorpay_payment_id, razorpay_signature, type, id}` | `{success, type, id}` | Verify Razorpay payment |
| POST | `/api/payments` | `{order_id/reservation_id, amount, method, status}` | `{paymentId}` | Record payment |

### User & History Endpoints

| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|--------------|----------|---------|
| POST | `/api/user/history` | `{email, limit}` | `{orders, reservations, combined}` | Get last N transactions |
| POST | `/api/user/history/full` | `{email}` | `{orders: [...with items], reservations}` | Get complete history |

### Feedback & Admin Endpoints

| Method | Endpoint | Request Body | Response | Purpose |
|--------|----------|--------------|----------|---------|
| POST | `/api/feedback` | `{name, email, rating, message}` | `{feedbackId}` | Submit feedback |
| GET | `/api/feedback` | - | `[{id, name, email, rating, message, created_at}...]` | Get all feedback |
| GET | `/api/admin/reservations` | - | `[{reservations with stats}]` | Admin dashboard reservations |
| GET | `/api/admin/orders` | - | `[{orders with payment details}]` | Admin dashboard orders |
| GET | `/api/admin/feedback` | - | `[{all feedback}]` | Admin dashboard feedback |

---

## 🔐 AUTHENTICATION & SECURITY

### Session Management

**User Login:**
- OTP stored in `otpStore` (in-memory, 10-minute expiry)
- Session token stored in `sessions` table with `user_id` reference
- Token is SHA256 hash of email + timestamp + random value + JWT_SECRET
- Stored in `localStorage` on client side

**Admin Login:**
- Hardcoded credentials: `Rakesh` / `998664`
- Token stored in `sessionStorage` (cleared on browser close)
- "Remember me" checkbox stores username in `localStorage`

### Data Validation

- Email: Regex validation `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- OTP: 6-digit numeric code
- Phone: Accepted as-is (for SMS delivery)
- Amounts: Converted to paise for Razorpay (amount * 100)

### Payment Security

- Razorpay signature verification using HMAC-SHA256
- Formula: `crypto.createHmac('sha256', RZP_KEY_SECRET).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex')`
- Signature must match to confirm payment authenticity

---

## 🚀 DEPLOYMENT WORKFLOW

### 1. Prerequisites
```
Node.js 14+
npm or yarn
SQLite3
Gmail SMTP credentials (for OTP)
Razorpay account (for payments)
Twilio account (for SMS)
```

### 2. Setup Steps

**Clone/Download project:**
```bash
cd labella
cd backend
npm install
```

**Configure .env:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com

RZP_KEY_ID=rzp_live_xxxxx
RZP_KEY_SECRET=rzp_live_xxxxx

TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxx
TWILIO_PHONE_NUMBER=+1xxx

JWT_SECRET=your-super-secret-key-change-in-production

PORT=3000
DB_PATH=./db.sqlite
```

**Initialize Database:**
```bash
node init_db.js
```

**Start Server:**
```bash
node server.js
# Server running on port 3000
```

### 3. Access URLs

- Public Site: `http://localhost:3000/index.html`
- Login: `http://localhost:3000/login.html`
- Admin: `http://localhost:3000/admin.html` (redirects to login if not authenticated)
- Admin Login: `http://localhost:3000/admin-login.html`

---

## 📊 DATABASE RELATIONSHIPS

```
users (1) ──────── (Many) sessions
  │id                      ├─ user_id
  └─ email                 └─ token

users ──────► orders (via email/customer_email)
users ──────► reservations (via email)
users ──────► feedback (via email)

orders (1) ──────── (Many) order_items
  │id                     ├─ order_id
  └─ total               └─ price (snapshot)

menu (1) ──────── (Many) order_items
  │id, price              └─ menu_id

orders ──────► payments (via order_id)
reservations ──────► payments (via reservation_id)

reservations ──────► payments (via payment_id after checkout)
```

---

## 🔗 KEY CONNECTIONS SUMMARY

| File A | File B | Connection | Type |
|--------|--------|-----------|------|
| login.html | login.js | Included via `<script>` | JavaScript event handler |
| login.js | server.js | Fetch API to `/api/auth/*` | HTTP REST calls |
| index.html | style.css | Linked via `<link>` | CSS stylesheet |
| index.html | login.js (for auth check) | localStorage read | Client-side state |
| reservation.html | Razorpay SDK | External library | Payment processing |
| admin.html | admin-login.html | Redirect via JavaScript | Session-based access control |
| server.js | db.js | `const { run, all, get } = require('./db')` | Module import |
| server.js | email.js | `const {...} = require('./email')` | Module import |
| server.js | sms.js | `const {...} = require('./sms')` | Module import |
| email.js | SMTP (Gmail) | Nodemailer connection | External email service |
| sms.js | Twilio API | REST API call | External SMS service |
| server.js | Razorpay | SDK initialization | External payment service |

---

## 🎯 COMPLETE USER JOURNEY MAP

### New User Path:
1. Visit `index.html` → See public menu
2. Click "Order Now" → Redirected to `login.html`
3. Enter email → `POST /api/auth/send-otp`
4. Receive OTP → Enter OTP → `POST /api/auth/verify-otp`
5. User created in database, session created
6. Redirected to `index.html` → Navbar shows user avatar
7. Browse menu pages (`menu.html`, `menu1.html`)
8. Add items to cart
9. Click checkout → Go to `reservation.html`
10. Fill order details → Select payment method
11. If online: Razorpay payment → `POST /api/payments/verify`
12. Order stored in database, confirmation email sent
13. Order appears in user history dropdown & `user-history.html`

### Admin Path:
1. Visit `admin.html`
2. Redirected to `admin-login.html` (no session)
3. Enter: Username `Rakesh`, Password `998664`
4. Session stored, redirected back to `admin.html`
5. Dashboard loads: `GET /api/admin/reservations`, `/api/admin/orders`, `/api/admin/feedback`
6. View, search, filter data
7. Export to CSV if needed
8. Click logout → `adminLogout()` clears session
9. Redirected to `admin-login.html`

---

## 📝 SUMMARY

**La Bella** is a full-stack restaurant management system with:
- ✅ Multi-page frontend (HTML/CSS/JS)
- ✅ REST API backend (Node.js/Express)
- ✅ SQLite database (8 tables)
- ✅ User authentication (OTP + Google OAuth + Admin)
- ✅ Payment processing (Razorpay)
- ✅ Email notifications (Nodemailer)
- ✅ SMS notifications (Twilio)
- ✅ Admin dashboard (protected, secure)
- ✅ User history tracking

All components work together through HTTP REST APIs, with state managed via browser storage and server-side database.
