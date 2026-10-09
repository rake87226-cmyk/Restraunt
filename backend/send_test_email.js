require('dotenv').config();
const { initEmail, sendOrderConfirmationEmail } = require('./email');

async function main() {
  initEmail();
  const to = process.env.TEST_TO_EMAIL || process.env.SMTP_USER;
  if (!to) {
    console.error('Set TEST_TO_EMAIL or SMTP_USER in .env');
    process.exit(1);
  }
  const res = await sendOrderConfirmationEmail(to, 12345, 'Test User', 10, []);
  console.log('send test result:', res);
  process.exit(res && res.success ? 0 : 1);
}
main();