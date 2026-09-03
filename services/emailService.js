const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const logger = require('../config/logger');

// Credentials resolve via the AWS SDK's default chain — an IAM role attached
// to the instance, or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY in the
// environment. Nothing here needs to know which one is in play.
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

const FROM_ADDRESS = process.env.SES_FROM_ADDRESS || 'noreply@befree.fit';

// SANDBOX OVERRIDE — TEMPORARY.
// AWS SES sandbox mode can only deliver to verified recipient addresses, so
// every reset email is redirected to one verified test inbox regardless of
// which user actually requested it, to exercise the full flow end-to-end
// before AWS approves production sending access.
//
// Delete SES_SANDBOX_TEST_RECIPIENT from the environment once SES is out of
// sandbox — recipients then go to the real user automatically, no code
// change required here.
const SANDBOX_OVERRIDE = process.env.SES_SANDBOX_TEST_RECIPIENT || null;

async function sendPasswordResetEmail(toEmail, code) {
  const actualRecipient = SANDBOX_OVERRIDE || toEmail;

  if (SANDBOX_OVERRIDE) {
    logger.warn('SES sandbox override active — reset email redirected', {
      intendedRecipient: toEmail,
      actualRecipient
    });
  }

  const command = new SendEmailCommand({
    Source: FROM_ADDRESS,
    Destination: { ToAddresses: [actualRecipient] },
    Message: {
      Subject: { Data: 'Your BeFree password reset code', Charset: 'UTF-8' },
      Body: {
        Text: {
          Data:
            `Password reset requested for: ${toEmail}\n\n` +
            `Your BeFree password reset code is: ${code}\n\n` +
            `This code expires in 20 minutes and can only be used once.\n\n` +
            `If you didn't request this, you can safely ignore this email — ` +
            `your password will not be changed.`,
          Charset: 'UTF-8'
        }
      }
    }
  });

  await sesClient.send(command);
}

module.exports = { sendPasswordResetEmail };
