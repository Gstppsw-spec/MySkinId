const { Expo } = require("expo-server-sdk");
const { pushToken } = require("../models");

// Create Expo SDK client
// Optionally set accessToken via env for push security
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
});

class PushNotificationService {
  /**
   * Register or update an Expo Push Token
   * @param {Object} params
   * @param {string} params.token - Expo Push Token (ExponentPushToken[xxx])
   * @param {string} [params.customerId] - Customer ID (for customer app)
   * @param {string} [params.userId] - User ID (for doctor/outlet app)
   * @param {string} [params.deviceId] - Optional device identifier
   */
  async registerToken({ token, customerId, userId, deviceId }) {
    try {
      if (!token) {
        return { status: false, message: "Token tidak boleh kosong" };
      }

      // if (!Expo.isExpoPushToken(token)) {
      //  return { status: false, message: "Token push tidak valid" };
      // }

      if (!customerId && !userId) {
        return {
          status: false,
          message: "customerId atau userId harus diisi",
        };
      }

      // Upsert: if token already exists, update the owner & reactivate
      const existing = await pushToken.findOne({ where: { token } });

      if (existing) {
        await existing.update({
          customerId: customerId || existing.customerId,
          userId: userId || existing.userId,
          deviceId: deviceId || existing.deviceId,
          isActive: true,
        });
        return {
          status: true,
          message: "Push token berhasil diperbarui",
          data: existing,
        };
      }

      const newToken = await pushToken.create({
        token,
        customerId,
        userId,
        deviceId,
        isActive: true,
      });

      return {
        status: true,
        message: "Push token berhasil didaftarkan",
        data: newToken,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  /**
   * Remove / deactivate a push token (e.g. on logout)
   * @param {string} token - Expo Push Token string
   */
  async removeToken(token) {
    try {
      if (!token) {
        return { status: false, message: "Token tidak boleh kosong" };
      }

      const existing = await pushToken.findOne({ where: { token } });
      if (!existing) {
        return { status: false, message: "Token tidak ditemukan" };
      }

      await existing.update({ isActive: false });

      return { status: true, message: "Push token berhasil dihapus" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  /**
   * Send push notification to a recipient
   * @param {string} recipientId - customerId or userId
   * @param {'customer'|'user'} recipientType - 'customer' or 'user'
   * @param {Object} notification
   * @param {string} notification.title - Notification title
   * @param {string} notification.body - Notification body text
   * @param {Object} [notification.data] - Extra data payload
   */
  async sendPushNotification(recipientId, recipientType, notification) {
    try {
      if (!recipientId) return;

      // Build where clause based on recipient type
      const whereClause = { isActive: true };
      if (recipientType === "customer") {
        whereClause.customerId = recipientId;
      } else {
        whereClause.userId = recipientId;
      }

      // Get all active tokens for this recipient
      const tokens = await pushToken.findAll({
        where: whereClause,
        attributes: ["id", "token"],
      });

      if (!tokens.length) {
        console.log(
          `[PushNotif] No active tokens for ${recipientType}:${recipientId}`
        );
        return;
      }

      // Build messages
      const messages = [];
      for (const t of tokens) {
        // if (!Expo.isExpoPushToken(t.token)) {
        //   console.warn(
        //     `[PushNotif] Invalid token skipped: ${t.token}`
        //   );
        //   continue;
        // }

        messages.push({
          to: t.token,
          sound: "default",
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
        });
      }

      if (!messages.length) return;

      // Send in chunks (Expo best practice)
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (err) {
          console.error("[PushNotif] Error sending chunk:", err);
        }
      }

      // Process tickets: deactivate tokens that errored with DeviceNotRegistered
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (
          ticket.status === "error" &&
          ticket.details &&
          ticket.details.error === "DeviceNotRegistered"
        ) {
          // This token is no longer valid, deactivate it
          const invalidToken = tokens[i];
          if (invalidToken) {
            console.log(
              `[PushNotif] Deactivating invalid token: ${invalidToken.token}`
            );
            await pushToken.update(
              { isActive: false },
              { where: { id: invalidToken.id } }
            );
          }
        }
      }

      console.log(
        `[PushNotif] Sent ${messages.length} notification(s) to ${recipientType}:${recipientId}`
      );
    } catch (error) {
      // Push notification errors should not break the main flow
      console.error("[PushNotif] Error:", error.message);
    }
  }
}

module.exports = new PushNotificationService();
