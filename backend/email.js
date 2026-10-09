const nodemailer = require('nodemailer');

let transporter = null;

function initEmail() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL || user;

  console.log('[EMAIL] config:', { host: !!host, port, user: !!user, from: !!from });

  if (!host || !user || !pass) {
    console.warn('[EMAIL] Missing SMTP config; emails will be logged but not sent.');
    return;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  transporter.verify((err, success) => {
    if (err) {
      console.error('[EMAIL] transporter.verify failed:', err && err.message ? err.message : err);
      transporter = null;
    } else {
      console.log('[EMAIL] transporter verified and ready to send.');
    }
  });

  initEmail._from = from;
}

async function sendEmail(toEmail, subject, html) {
  if (!transporter) {
    console.log(`[EMAIL LOG] (not configured) To:${toEmail} Subject:${subject}`);
    return { success: false, reason: 'transporter-not-configured' };
  }

  const msg = { from: process.env.FROM_EMAIL || process.env.SMTP_USER, to: toEmail, subject, html };
  console.log('[EMAIL SENDING] to=', toEmail, 'subject=', subject);
  try {
    const info = await transporter.sendMail(msg);
    console.log('[EMAIL SENT] messageId=', info.messageId, 'response=', info.response);
    return { success: true, info };
  } catch (err) {
    console.error('[EMAIL ERROR] sendMail failed:', err && err.message ? err.message : err);
    if (err.response) console.error('[EMAIL ERROR] smtp response:', err.response.toString());
    return { success: false, error: err && err.message };
  }
}

// escape minimal HTML
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// sendOrderConfirmationEmail uses signature: (toEmail, orderId, customerName, total, items)
async function sendOrderConfirmationEmail(toEmail, orderId, customerName, total, items) {
  // safe helpers (avoid using ?? / complex inline expressions)
  function safeQty(it) {
    if (!it) return 1;
    if (typeof it.quantity !== 'undefined' && it.quantity !== null) return Number(it.quantity) || 1;
    if (typeof it.qty !== 'undefined' && it.qty !== null) return Number(it.qty) || 1;
    if (typeof it.count !== 'undefined' && it.count !== null) return Number(it.count) || 1;
    return 1;
  }
  function safePrice(it) {
    if (!it) return 0;
    if (typeof it.price !== 'undefined' && it.price !== null) return Number(it.price) || 0;
    if (typeof it.unit_price !== 'undefined' && it.unit_price !== null) return Number(it.unit_price) || 0;
    if (typeof it.item_price !== 'undefined' && it.item_price !== null) return Number(it.item_price) || 0;
    return 0;
  }

  const rowsHtml = Array.isArray(items) && items.length > 0 ? items.map(it => {
    const name = escapeHtml((it && (it.name || it.menu_name || it.item_name || it.title)) || 'Item');
    const qty = safeQty(it);
    const price = safePrice(it);
    const itemTotal = (price * qty).toFixed(2);
    return `
      <tr>
        <td style="padding:18px 12px;border-bottom:1px solid rgba(255,255,255,0.06);vertical-align:top">
          <div style="font-size:16px;color:#fff;margin-bottom:8px">${name}</div>
        </td>
        <td style="padding:18px 12px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center;color:#fff">×${qty}</td>
        <td style="padding:18px 12px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;color:#fff">₹${Number(price).toFixed(2)}</td>
        <td style="padding:18px 12px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;color:#fff;font-weight:700">₹${itemTotal}</td>
      </tr>
    `;
  }).join('') : '';

  const grandTotal = Number(total || 0).toFixed(2);

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Order Confirmed</title>
    <style>
      body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; background:#111; color:#fff; }
      .wrap { max-width:680px; margin:24px auto; background:#0f0f10; border-radius:8px; overflow:hidden; box-shadow:0 6px 30px rgba(0,0,0,0.6); }
      .header { background:#c0392b; padding:26px 20px; text-align:center; color:#fff; font-size:22px; font-weight:700; }
      .body { padding:26px 20px; background:linear-gradient(180deg,#0f0f10,#0b0b0c); }
      .greeting { font-size:16px; color:#ddd; margin-bottom:6px; }
      .sub { color:#aaa; margin-bottom:18px; font-size:14px; }
      .meta { color:#ddd; margin-bottom:18px; font-size:14px; }
      table { width:100%; border-collapse:collapse; margin-top:6px; }
      thead td { background:rgba(255,255,255,0.06); color:#ddd; font-weight:700; padding:12px; }
      tbody td { padding:12px; vertical-align:middle; }
      .total-row td { background:rgba(255,255,255,0.03); padding:14px; color:#fff; font-weight:700; font-size:16px; }
      .footer { color:#999; font-size:13px; margin-top:20px; text-align:left; }
      .contact { color:#fff; font-weight:700; display:block; margin-top:8px; }
      @media (max-width:520px){ .wrap{margin:12px} .header{font-size:18px} }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">🍽️ Order Confirmed!</div>
      <div class="body">
        <div class="greeting">Hi ${escapeHtml(customerName || '')},</div>
        <div class="sub">Thank you for your order! Your delicious meal is being prepared.</div>

        <div class="meta"><strong>Order ID:</strong> #${escapeHtml(String(orderId))}</div>

        <table role="presentation" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <td style="text-align:left">Item</td>
              <td style="text-align:center">Qty</td>
              <td style="text-align:right">Price</td>
              <td style="text-align:right">Total</td>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml ? rowsHtml : '<tr><td colspan="4" style="padding:14px;text-align:center;color:#999">Items details...</td></tr>'}
            <tr class="total-row">
              <td colspan="3" style="text-align:right">Grand Total:</td>
              <td style="text-align:right">₹${grandTotal}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div>Your order will be ready shortly. If you have any questions, please contact us at</div>
          <div class="contact">+91 99866 45103</div>
        </div>

      </div>
    </div>
  </body>
  </html>
  `;

  return sendEmail(toEmail, `Order Confirmed — #${orderId}`, html);
}

async function sendReservationConfirmationEmail(toEmail, reservationId, customerName, date, time, partySize) {
  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reservation Confirmed</title>
    <style>
      body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; background:#111; color:#fff; }
      .wrap { max-width:680px; margin:24px auto; background:#0f0f10; border-radius:8px; overflow:hidden; box-shadow:0 6px 30px rgba(0,0,0,0.6); }
      .header { background:#c0392b; padding:26px 20px; text-align:center; color:#fff; font-size:22px; font-weight:700; }
      .body { padding:26px 20px; background:linear-gradient(180deg,#0f0f10,#0b0b0c); }
      .greeting { font-size:16px; color:#ddd; margin-bottom:6px; }
      .sub { color:#aaa; margin-bottom:18px; font-size:14px; }
      .details { background:rgba(255,255,255,0.03); padding:16px; border-radius:6px; margin:18px 0; border-left:4px solid #c0392b; }
      .detail-item { margin:8px 0; font-size:14px; color:#ddd; }
      .detail-label { color:#aaa; font-size:12px; text-transform:uppercase; }
      .detail-value { color:#fff; font-weight:700; font-size:15px; margin-top:4px; }
      .footer { color:#999; font-size:13px; margin-top:20px; text-align:left; }
      .contact { color:#fff; font-weight:700; display:block; margin-top:8px; }
      @media (max-width:520px){ .wrap{margin:12px} .header{font-size:18px} }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">📅 Reservation Confirmed!</div>
      <div class="body">
        <div class="greeting">Hi ${escapeHtml(customerName || '')},</div>
        <div class="sub">Your reservation has been confirmed. We look forward to seeing you!</div>

        <div class="details">
          <div class="detail-item">
            <div class="detail-label">Reservation ID</div>
            <div class="detail-value">#${escapeHtml(String(reservationId))}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Date & Time</div>
            <div class="detail-value">${escapeHtml(date)} at ${escapeHtml(time)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Party Size</div>
            <div class="detail-value">${partySize} ${partySize === 1 ? 'Guest' : 'Guests'}</div>
          </div>
        </div>

        <div class="footer">
          <div>If you need to modify or cancel your reservation, please contact us at</div>
          <div class="contact">+91 99866 45103</div>
        </div>

      </div>
    </div>
  </body>
  </html>
  `;
  return sendEmail(toEmail, `Reservation Confirmed — #${reservationId}`, html);
}

module.exports = { initEmail, sendEmail, sendOrderConfirmationEmail, sendReservationConfirmationEmail };
