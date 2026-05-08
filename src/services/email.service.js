const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }

  /**
   * Send an email.
   * @param {string} to - Recipient email address.
   * @param {string} subject - Email subject.
   * @param {string} text - Plain text content.
   * @param {string} [html] - Optional HTML content.
   * @returns {Promise<{status: boolean, message: string, data?: any, error?: any}>}
   */
  async sendEmail(to, subject, text, html = null) {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        console.warn("[EmailService] Email configuration missing in .env");
        return {
          status: false,
          message: "Konfigurasi email tidak lengkap di .env",
        };
      }

      const mailOptions = {
        from: `"MYSKIN.ID" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
      };

      if (html) {
        mailOptions.html = html;
      }

      console.log(`[EmailService] Sending email to ${to}...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent to ${to} successfully.`);

      return {
        status: true,
        message: "Email berhasil dikirim",
        data: info,
      };
    } catch (error) {
      console.error(`[EmailService] Error sending email to ${to}:`, error);
      return {
        status: false,
        message: "Gagal mengirim email",
        error: error.message,
      };
    }
  }
}

module.exports = new EmailService();
