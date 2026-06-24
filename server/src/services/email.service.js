const { Resend } = require('resend');
const logger = require('../config/logger');

const resendApiKey = process.env.RESEND_API_KEY;
let resend;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  logger.warn('RESEND_API_KEY is not defined. Email service will run in simulated development logging mode.');
}

class EmailService {
  static async sendPasswordReset(email, token) {
    const subject = 'Reset Your Dizipay Password';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px;">
        <h2 style="color: #6D5DFC;">Dizipay Password Recovery</h2>
        <p>You requested a password reset for your Dizipay account.</p>
        <p>Use the following secure token to complete your password update:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; font-family: monospace; font-size: 16px; font-weight: bold; color: #6D5DFC; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 1px;">
          ${token}
        </div>
        <p>If you did not request this password recovery, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #F1F5F9; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94A3B8;">&copy; ${new Date().getFullYear()} Dizipay. All rights reserved.</p>
      </div>
    `;

    if (resend) {
      try {
        await resend.emails.send({
          from: 'Dizipay <noreply@dizipay.in>',
          to: email,
          subject,
          html
        });
        logger.info(`Password reset email successfully sent via Resend to ${email}.`);
      } catch (err) {
        logger.error(`Failed to send password reset email via Resend: %O`, err);
        throw err;
      }
    } else {
      logger.info(`[SIMULATED EMAIL] Password reset token for ${email}: ${token}`);
    }
  }

  static async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to Dizipay!';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px;">
        <h2 style="color: #6D5DFC;">Welcome to Dizipay!</h2>
        <p>Hi ${name || email},</p>
        <p>Thank you for choosing Dizipay as your identity and document verification infrastructure.</p>
        <p>You can now generate API keys, test endpoints inside the playground sandbox, and configure webhook targets in your client portal.</p>
        <hr style="border: 0; border-top: 1px solid #F1F5F9; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94A3B8;">&copy; ${new Date().getFullYear()} Dizipay. All rights reserved.</p>
      </div>
    `;

    if (resend) {
      try {
        await resend.emails.send({
          from: 'Dizipay <noreply@dizipay.in>',
          to: email,
          subject,
          html
        });
        logger.info(`Welcome email successfully sent via Resend to ${email}.`);
      } catch (err) {
        logger.error(`Failed to send welcome email via Resend: %O`, err);
      }
    } else {
      logger.info(`[SIMULATED EMAIL] Welcome email for ${email} logged.`);
    }
  }

  static async sendVerificationEmail(email, token) {
    const subject = 'Verify Your Dizipay Email Address';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px;">
        <h2 style="color: #6D5DFC;">Verify Your Dizipay Account</h2>
        <p>Please use the following verification token to verify your email address:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; font-family: monospace; font-size: 16px; font-weight: bold; color: #6D5DFC; text-align: center; border-radius: 8px; margin: 20px 0;">
          ${token}
        </div>
        <hr style="border: 0; border-top: 1px solid #F1F5F9; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94A3B8;">&copy; ${new Date().getFullYear()} Dizipay. All rights reserved.</p>
      </div>
    `;

    if (resend) {
      try {
        await resend.emails.send({
          from: 'Dizipay <noreply@dizipay.in>',
          to: email,
          subject,
          html
        });
        logger.info(`Verification email successfully sent via Resend to ${email}.`);
      } catch (err) {
        logger.error(`Failed to send verification email via Resend: %O`, err);
      }
    } else {
      logger.info(`[SIMULATED EMAIL] Verification email for ${email} with token ${token} logged.`);
    }
  }
}

module.exports = EmailService;
