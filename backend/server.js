require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { run, all, get } = require('./db');
const { initTwilio, sendOrderConfirmation, sendReservationConfirmation } = require('./sms');
const { initEmail, sendEmail, sendOrderConfirmationEmail, sendReservationConfirmationEmail } = require('./email');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken'); // For Google JWT verification

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Twilio SMS
initTwilio();

// Initialize Email
initEmail();

let rzp = null;
function initRazorpay() {
  const keyId = process.env.RZP_KEY_ID;
  const keySecret = process.env.RZP_KEY_SECRET;
  if (keyId && keySecret) {
    rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    console.log('[RAZORPAY] initialized');
  } else {
    console.log('[RAZORPAY] keys missing in .env');
  }
}
initRazorpay();

app.get('/api/menu', async (req, res) => {
  try {
    const category = req.query.category;
    let items;
    if (category && category !== 'all') {
      items = await all('SELECT * FROM menu WHERE category = ? ORDER BY id', [category]);
    } else {
      items = await all('SELECT * FROM menu ORDER BY id');
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items = [], customer = {}, total = 0, paymentMethod = 'cash' } = req.body;
    const result = await run(
      'INSERT INTO orders (customer_name, customer_email, customer_phone, total, status, created_at) VALUES (?,?,?,?,?,datetime("now"))',
      [customer.name || '', customer.email || '', customer.phone || '', total, 'pending']
    );
    const orderId = result.lastID;

    // Get menu items to fetch names and prices
    const itemsList = [];
    for (const it of items) {
      const menuItem = await get('SELECT * FROM menu WHERE id = ?', [it.id]);
      if (menuItem) {
        itemsList.push({
          id: it.id,
          name: menuItem.name,
          quantity: it.qty,
          price: menuItem.price
        });
        await run('INSERT INTO order_items (order_id, menu_id, quantity, price) VALUES (?,?,?,?)', [orderId, it.id, it.qty, menuItem.price]);
      }
    }

    // If online payment requested, create Razorpay order
    if (paymentMethod === 'online') {
      if (!rzp) return res.status(500).json({ error: 'Razorpay not configured on server' });
      const razorOrder = await rzp.orders.create({
        amount: Math.round(total * 100), // Convert to paise
        currency: 'INR',
        receipt: `order_${orderId}`,
        notes: { type: 'order', orderId: String(orderId) }
      });
      return res.json({ orderId, payment: { key: process.env.RZP_KEY_ID, order: razorOrder } });
    }

    // Send SMS confirmation if phone is provided
    if (customer.phone) {
      sendOrderConfirmation(customer.phone, orderId, total).catch(err => console.error('SMS send error:', err));
    }

    // Send email confirmation if email is provided
    if (customer.email) {
      sendOrderConfirmationEmail(customer.email, orderId, customer.name || 'Customer', total, itemsList).catch(err => console.error('Email send error:', err));
    }

    res.json({ orderId, status: 'confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await all('SELECT * FROM orders ORDER BY created_at DESC');
    for (const ord of orders) {
      ord.items = await all('SELECT oi.*, m.name FROM order_items oi LEFT JOIN menu m ON oi.menu_id = m.id WHERE oi.order_id = ?', [ord.id]);
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { name, email, phone, date, time, party = 1, paymentMethod = 'cash' } = req.body;

    // create reservation row; use party_size column (fixes SQLITE_ERROR: no column named party)
    const result = await run(
      'INSERT INTO reservations (name, email, phone, date, time, party_size, status, created_at) VALUES (?,?,?,?,?,?,?,datetime("now"))',
      [name||'', email||'', phone||'', date||'', time||'', Number(party)||1, paymentMethod === 'online' ? 'pending_payment' : 'confirmed']
    );
    const reservationId = result && result.lastID ? result.lastID : (await get('SELECT last_insert_rowid() as id')).id;

    // if client requested online payment create Razorpay order for ₹100
    if (paymentMethod === 'online') {
      if (!rzp) return res.status(500).json({ error: 'Razorpay not configured on server' });
      const amountINR = 100;
      const razorOrder = await rzp.orders.create({
        amount: amountINR * 100,
        currency: 'INR',
        receipt: `reservation_${reservationId}`,
        notes: { type: 'reservation', reservationId: String(reservationId) }
      });
      return res.json({ reservationId, payment: { key: process.env.RZP_KEY_ID, order: razorOrder } });
    }

    // cash/reservation confirmed
    res.json({ reservationId, status: 'confirmed' });
  } catch (err) {
    console.error('POST /api/reservations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add verification endpoint (client calls this after successful Razorpay checkout)
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, type, id } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing verification fields' });
    }

    const generated = crypto.createHmac('sha256', process.env.RZP_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    if (type === 'reservation') {
      const rid = Number(id);
      const res_data = await get('SELECT * FROM reservations WHERE id = ?', [rid]);
      await run('UPDATE reservations SET status = ?, payment_id = ? WHERE id = ?', ['paid', razorpay_payment_id, rid]);
      
      // Send confirmation email for paid reservation
      if (res_data && res_data.email) {
        sendReservationConfirmationEmail(res_data.email, rid, res_data.name || 'Guest', res_data.date, res_data.time, res_data.party_size).catch(err => console.error('Email send error:', err));
      }
      return res.json({ success: true, type, id: rid });
    }

    if (type === 'order') {
      const oid = Number(id);
      const order_data = await get('SELECT * FROM orders WHERE id = ?', [oid]);
      await run('UPDATE orders SET status = ?, payment_id = ? WHERE id = ?', ['paid', razorpay_payment_id, oid]);
      
      // Send confirmation email for paid order
      if (order_data && order_data.customer_email) {
        const items = await all('SELECT oi.*, m.name, m.price as menu_price FROM order_items oi LEFT JOIN menu m ON oi.menu_id = m.id WHERE oi.order_id = ?', [oid]);
        console.log('[PAYMENT VERIFY] Order', oid, 'items found:', items.length, 'items:', items);
        const itemsList = items.map(i => ({ 
          name: i.name || 'Item', 
          quantity: i.quantity, 
          price: i.price || i.menu_price 
        }));
        console.log('[PAYMENT VERIFY] itemsList:', itemsList);
        sendOrderConfirmationEmail(order_data.customer_email, oid, order_data.customer_name || 'Customer', order_data.total, itemsList).catch(err => console.error('Email send error:', err));
      }
      return res.json({ success: true, type, id: oid });
    }

    // unknown type -> acknowledge verified
    return res.json({ success: true, note: 'verified' });
  } catch (err) {
    console.error('/api/payments/verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reservations', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM reservations ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Feedback endpoints
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, phone, rating = 5, comment = '' } = req.body;
    const result = await run('INSERT INTO feedback (name, email, phone, rating, comment, created_at) VALUES (?,?,?,?,?,datetime("now"))', [name, email, phone, rating, comment]);
    res.json({ feedbackId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/feedback', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/feedback', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoints: enriched views with payment info
app.get('/api/admin/reservations', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM reservations ORDER BY created_at DESC');
    const out = [];
    for (const r of rows) {
      let paid = false;
      let payment_ref = null;
      let payment_details = null;
      
      // Check if payment_id exists (from Razorpay)
      if (r.payment_id) {
        paid = true;
        payment_ref = r.payment_id;
      }
      
      // Also check payments table
      const pay = await get('SELECT id, status, details FROM payments WHERE reservation_id = ? ORDER BY created_at DESC LIMIT 1', [r.id]);
      if (pay) {
        payment_ref = pay.id;
        paid = pay.status === 'completed' || pay.status === 'paid';
        try { payment_details = JSON.parse(pay.details || '{}'); } catch(e) { payment_details = pay.details; }
      }
      
      out.push({
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        date: r.date,
        time: r.time,
        party_size: r.party_size,
        status: r.status,
        created_at: r.created_at,
        paid,
        payment_ref,
        payment_details
      });
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM orders ORDER BY created_at DESC');
    const out = [];
    for (const o of rows) {
      const items = await all('SELECT oi.*, m.name FROM order_items oi LEFT JOIN menu m ON oi.menu_id = m.id WHERE oi.order_id = ?', [o.id]);
      let paid = false;
      let payment_ref = null;
      let payment_details = null;
      
      // Check if payment_id exists (from Razorpay)
      if (o.payment_id) {
        paid = true;
        payment_ref = o.payment_id;
      }
      
      
      const pay = await get('SELECT id, status, details FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1', [o.id]);
      if (pay) {
        payment_ref = pay.id;
        paid = pay.status === 'completed' || pay.status === 'paid';
        try { payment_details = JSON.parse(pay.details || '{}'); } catch(e) { payment_details = pay.details; }
      }
      
      out.push({
        id: o.id,
        name: o.customer_name,
        phone: o.customer_phone,
        email: o.customer_email,
        total: o.total,
        status: o.status,
        created_at: o.created_at,
        items,
        paid,
        payment_ref,
        payment_details
      });
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



const otpStore = {};
const OTP_EXPIRY = 10 * 60 * 1000; 
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(email) {
  const crypto = require('crypto');
  const payload = `${email}:${Date.now()}:${Math.random()}`;
  return crypto.createHash('sha256').update(payload + JWT_SECRET).digest('hex');
}

// Send OTP endpoint
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    const otp = generateOTP();
    otpStore[email] = {
      otp,
      createdAt: Date.now(),
      attempts: 0
    };

    // Try to send OTP via email
    let emailSent = false;
    try {
      const { sendEmail } = require('./email');
      const result = await sendEmail(
        email,
        'La Bella Restaurant - Login OTP',
        `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; color: white; text-align: center;">
          <h2>Your La Bella Login OTP</h2>
          <div style="font-size: 32px; font-weight: bold; margin: 20px 0; letter-spacing: 5px;">${otp}</div>
          <p style="font-size: 14px; opacity: 0.9;">This OTP is valid for 10 minutes</p>
        </div>`
      );
      emailSent = result && result.success;
      console.log('[AUTH] Email send result:', result);
    } catch (emailErr) {
      console.error('[EMAIL] Failed to send OTP:', emailErr.message);
    }

    console.log(`[AUTH] OTP generated for ${email}: ${otp}`);

    res.json({ 
      success: true, 
      message: emailSent ? 'OTP sent successfully to your email' : 'OTP generated (email may not be configured)',
      otp: otp,
      emailSent: emailSent
    });
  } catch (err) {
    console.error('[AUTH] Error sending OTP:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP required' });
    }

    const storedOTP = otpStore[email];
    console.log(`[AUTH] Verify OTP for ${email}:`);
    console.log(`  Stored OTP: "${storedOTP?.otp}" (type: ${typeof storedOTP?.otp})`);
    console.log(`  Received OTP: "${otp}" (type: ${typeof otp})`);

    if (!storedOTP) {
      console.log(`[AUTH] No OTP found in store for ${email}`);
      return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() - storedOTP.createdAt > OTP_EXPIRY) {
      delete otpStore[email];
      console.log(`[AUTH] OTP expired for ${email}`);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    storedOTP.attempts++;

    if (storedOTP.attempts > 5) {
      delete otpStore[email];
      console.log(`[AUTH] Too many attempts for ${email}`);
      return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Convert both to strings and compare
    const storedOtpStr = String(storedOTP.otp).trim();
    const receivedOtpStr = String(otp).trim();
    
    console.log(`[AUTH] Comparing: "${storedOtpStr}" === "${receivedOtpStr}" ? ${storedOtpStr === receivedOtpStr}`);

    if (storedOtpStr !== receivedOtpStr) {
      console.log(`[AUTH] OTP mismatch for ${email}. Attempt ${storedOTP.attempts}/5`);
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    console.log(`[AUTH] OTP verified successfully for ${email}`);

    // OTP is valid, get or create user
    let user = await get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      // Create new user
      const result = await run(
        'INSERT INTO users (email, name, created_at) VALUES (?, ?, datetime("now"))',
        [email, email.split('@')[0]]
      );
      user = {
        id: result.lastID,
        email,
        name: email.split('@')[0]
      };
    }

    // Clear OTP
    delete otpStore[email];

    // Generate token
    const token = generateToken(email);

    // Store session
    await run(
      'INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, datetime("now", "+7 days"), datetime("now"))',
      [user.id, token]
    );

    console.log(`[AUTH] User ${email} authenticated successfully`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      email: user.email,
      name: user.name,
      userId: user.id
    });
  } catch (err) {
    console.error('[AUTH] Error verifying OTP:', err);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// ===================== USER HISTORY ENDPOINTS =====================

/**
 * Get user's order and reservation history
 * Returns recent orders and reservations for the authenticated user
 */
app.post('/api/user/history', async (req, res) => {
  try {
    const { email, limit = 5 } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    // Get recent orders
    const orders = await all(
      `SELECT 'order' as type, id, customer_name as name, total, status, created_at, 'Orders' as category 
       FROM orders 
       WHERE customer_email = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [email, limit]
    );

    // Get recent reservations
    const reservations = await all(
      `SELECT 'reservation' as type, id, name, null as total, status, created_at, 'Reservations' as category, date, time, party_size
       FROM reservations 
       WHERE email = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [email, limit]
    );

    // Combine and sort by date (most recent first)
    const combined = [...orders, ...reservations].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({
      success: true,
      orders,
      reservations,
      combined: combined.slice(0, limit)
    });
  } catch (err) {
    console.error('[USER HISTORY] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

/**
 * Get complete order and reservation history with details
 */
app.post('/api/user/history/full', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    // Get all orders with items
    const orders = await all(
      `SELECT o.*, GROUP_CONCAT(m.name, ', ') as items_summary
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN menu m ON oi.menu_id = m.id
       WHERE o.customer_email = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [email]
    );

    // Get all reservations
    const reservations = await all(
      `SELECT * FROM reservations WHERE email = ? ORDER BY created_at DESC`,
      [email]
    );

    res.json({
      success: true,
      orders,
      reservations
    });
  } catch (err) {
    console.error('[USER HISTORY FULL] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch complete history' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      await run('DELETE FROM sessions WHERE token = ?', [token]);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[AUTH] Error logging out:', err);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Verify token endpoint
app.post('/api/auth/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const session = await get('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")', [token]);

    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [session.user_id]);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('[AUTH] Error verifying token:', err);
    res.status(500).json({ success: false, message: 'Token verification failed' });
  }
});

// ===================== GOOGLE SIGN-IN ENDPOINT =====================

/**
 * Verify Google JWT token and create user session
 * Note: In production, verify the token using Google's public keys
 * For now, we'll decode and trust Google's signature
 */
app.post('/api/auth/google-signin', async (req, res) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ success: false, message: 'Google token required' });
    }

    console.log('[GOOGLE AUTH] Received Google token');

    try {
      // Decode JWT without verification (in production, verify using Google's public keys)
      const decoded = jwt.decode(googleToken, { complete: true });
      
      if (!decoded) {
        console.error('[GOOGLE AUTH] Failed to decode token');
        return res.status(400).json({ success: false, message: 'Invalid Google token' });
      }

      const payload = decoded.payload;
      console.log('[GOOGLE AUTH] Token decoded:', { email: payload.email, name: payload.name });

      if (!payload.email) {
        return res.status(400).json({ success: false, message: 'No email in Google token' });
      }

      // Check if user exists
      let user = await get('SELECT * FROM users WHERE email = ?', [payload.email]);

      if (!user) {
        // Create new user from Google data
        const result = await run(
          'INSERT INTO users (email, name, created_at) VALUES (?, ?, datetime("now"))',
          [payload.email, payload.name || payload.email.split('@')[0]]
        );
        user = {
          id: result.lastID,
          email: payload.email,
          name: payload.name || payload.email.split('@')[0]
        };
        console.log('[GOOGLE AUTH] New user created:', user.email);
      } else {
        console.log('[GOOGLE AUTH] Existing user found:', user.email);
      }

      // Generate session token
      const token = generateToken(payload.email);

      // Store session
      await run(
        'INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, datetime("now", "+7 days"), datetime("now"))',
        [user.id, token]
      );

      console.log(`[GOOGLE AUTH] Session created for ${user.email}`);

      res.json({
        success: true,
        message: 'Google Sign-In successful',
        token,
        email: user.email,
        name: user.name,
        userId: user.id
      });
    } catch (decodeErr) {
      console.error('[GOOGLE AUTH] Error decoding token:', decodeErr.message);
      
      // Alternative: Try to verify using Google's public keys (optional)
      // For now, return error
      return res.status(400).json({ success: false, message: 'Invalid or expired Google token' });
    }
  } catch (err) {
    console.error('[GOOGLE AUTH] Error:', err);
    res.status(500).json({ success: false, message: 'Google Sign-In failed' });
  }
});

// ===================== ADMIN FOOD MANAGEMENT ENDPOINTS =====================

// Get all menu items for admin
app.get('/api/admin/menu', async (req, res) => {
  try {
    const items = await all('SELECT * FROM menu ORDER BY id DESC');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new menu item
app.post('/api/admin/menu', async (req, res) => {
  try {
    const { name, description, price, image, category = 'all' } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const result = await run(
      'INSERT INTO menu (name, description, price, image, category) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', parseFloat(price), image || null, category]
    );

    const newItem = {
      id: result.lastID,
      name,
      description: description || '',
      price: parseFloat(price),
      image: image || null,
      category
    };

    // Broadcast update to all clients (if using Socket.io, replace with socket broadcast)
    console.log('[MENU] New item added:', newItem);
    
    res.json({ 
      success: true, 
      message: `✅ Food item "${name}" added successfully to ${category} category!`,
      item: newItem 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update menu item
app.put('/api/admin/menu/:id', async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const { name, description, price, image, category = 'all' } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    await run(
      'UPDATE menu SET name = ?, description = ?, price = ?, image = ?, category = ? WHERE id = ?',
      [name, description || '', parseFloat(price), image || null, category, itemId]
    );

    console.log('[MENU] Item updated:', itemId);

    res.json({ 
      success: true, 
      message: `✅ Food item "${name}" updated successfully!`,
      id: itemId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete menu item
app.delete('/api/admin/menu/:id', async (req, res) => {
  try {
    const itemId = Number(req.params.id);

    // Get item name before deleting
    const item = await get('SELECT name FROM menu WHERE id = ?', [itemId]);
    
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await run('DELETE FROM menu WHERE id = ?', [itemId]);

    console.log('[MENU] Item deleted:', itemId, item.name);

    res.json({ 
      success: true, 
      message: `🗑️ Food item "${item.name}" deleted successfully!`,
      id: itemId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { orderId = null, reservationId = null, amount = 0, method = 'card', details = {} } = req.body;
    const result = await run(
      'INSERT INTO payments (order_id, reservation_id, amount, method, status, details, created_at) VALUES (?,?,?,?,?,?,datetime("now"))',
      [orderId, reservationId, amount, method, 'completed', JSON.stringify(details || {})]
    );

    if (orderId) await run('UPDATE orders SET status = ? WHERE id = ?', ['paid', orderId]);
    if (reservationId) await run('UPDATE reservations SET status = ? WHERE id = ?', ['confirmed', reservationId]);

    res.json({ paymentId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optionally serve frontend files from parent folder
app.use(express.static(path.join(__dirname, '..')));

// For any API route not matched above, return JSON 404 instead of HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler that always returns JSON
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err && err.message ? err.message : 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
