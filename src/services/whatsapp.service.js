const axios = require("axios");

const API_KEY_WHATSAPP = process.env.API_KEY_WHATSAPP;

class WhatsappService {
  /**
   * Send a text message via WhatsApp.
   * @param {string} to - Recipient phone number (e.g., "628123456789").
   * @param {string} message - Message body.
   * @returns {Promise<{status: boolean, message: string, data?: any, error?: any}>}
   */
  async sendMessage(to, message) {
    try {
      if (!API_KEY_WHATSAPP) {
        console.warn("[WhatsappService] API_KEY_WHATSAPP is not configured.");
        return {
          status: false,
          message: "Konfigurasi WhatsApp API tidak tersedia",
        };
      }

      const payload = {
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          body: message,
        },
      };

      console.log(`[WhatsappService] Sending message to ${to}...`);

      const { data } = await axios.post(
        "https://wa7029.cloudwa.my.id/api/v1/messages",
        payload,
        {
          headers: {
            Authorization: `Bearer ${API_KEY_WHATSAPP}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`[WhatsappService] Message sent to ${to} successfully.`);

      return {
        status: true,
        message: "Pesan berhasil dikirim via WhatsApp",
        data,
      };
    } catch (error) {
      console.error(`[WhatsappService] Error sending message to ${to}:`, error.response?.data || error.message);
      return {
        status: false,
        message: "Gagal mengirim pesan via WhatsApp",
        error: error.response?.data || error.message,
      };
    }
  }
}

module.exports = new WhatsappService();
