const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Generic SMTP transport — works with any provider (Mailgun's SMTP
// credentials, Gmail, SendGrid, your own mail server, etc.). No
// provider-specific SDK: just host/port/credentials.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
// true = implicit TLS (port 465). false = STARTTLS (port 587/25), which is
// what most providers, including Mailgun, expect by default.
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS || 'noreply@befree.fit';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'BeFree';

// NOTE on Mailgun sandbox domains: if SMTP_USER is postmaster@sandboxXXXX
// .mailgun.org, Mailgun still only delivers to addresses added as
// "Authorized Recipients" for that domain in the dashboard — that
// restriction is enforced by Mailgun regardless of API vs SMTP, and is not
// something this code can work around. Add a real, DNS-verified domain to
// send to arbitrary users.

let transporter = null;
function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP is not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS)');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }
  return transporter;
}

async function sendPasswordResetEmail(toEmail, code) {
  try {
    await getTransporter().sendMail({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: toEmail,
      subject: 'Your BeFree password reset code',
      text:
        `Password reset requested for: ${toEmail}\n\n` +
        `Your BeFree password reset code is: ${code}\n\n` +
        `This code expires in 20 minutes and can only be used once.\n\n` +
        `If you didn't request this, you can safely ignore this email — ` +
        `your password will not be changed.`
    });
  } catch (error) {
    logger.error('SMTP send failed', {
      code: error.code,
      responseCode: error.responseCode,
      response: error.response,
      message: error.message
    });
    throw error;
  }
}

module.exports = { sendPasswordResetEmail };
