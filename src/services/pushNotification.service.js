const admin = require("../../config/firebase");
const { pushToken } = require("../models");

class PushNotificationService {
  /**
   * Register or update a Firebase FCM Push Token
   * @param {Object} params
   * @param {string} params.token - FCM device token
   * @param {string} [params.customerId] - Customer ID (for customer app)
   * @param {string} [params.userId] - User ID (for doctor/outlet app)
   * @param {string} [params.deviceId] - Optional device identifier
   */
  async registerToken({ token, customerId, userId, deviceId }) {
    try {
      if (!token) {
        return { status: false, message: "Token tidak boleh kosong" };
      }

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
   * @param {string} token - FCM device token string
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
   * Send push notification to a recipient via Firebase FCM
   * @param {string} recipientId - customerId or userId
   * @param {'customer'|'user'} recipientType - 'customer' or 'user'
   * @param {Object} notification
   * @param {string} notification.title - Notification title
   * @param {string} notification.body - Notification body text
   * @param {Object} [notification.data] - Extra data payload (values must be strings)
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
      const tokensData = await pushToken.findAll({
        where: whereClause,
        attributes: ["id", "token"],
      });

      if (!tokensData.length) {
        console.log(
          `[PushNotif] No active tokens for ${recipientType}:${recipientId}`
        );
        return;
      }

      const tokenStrings = tokensData.map((t) => t.token).filter(Boolean);

      // Convert data values to strings (FCM requirement)
      const dataPayload = {};
      if (notification.data) {
        for (const [key, value] of Object.entries(notification.data)) {
          dataPayload[key] = String(value);
        }
      }

      // Send via FCM Multicast (supports up to 500 tokens at once)
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokenStrings,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: dataPayload,
        android: {
          notification: {
            sound: "default",
            priority: "high",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      });

      console.log(
        `[PushNotif] Sent to ${recipientType}:${recipientId} — success: ${response.successCount}, failed: ${response.failureCount}`
      );

      // Process responses: deactivate tokens that are no longer registered
      if (response.failureCount > 0) {
        const deactivatePromises = [];

        response.responses.forEach((res, index) => {
          if (res.error) {
            const errorCode = res.error.code;
            console.warn(
              `[PushNotif] Token error [${tokensData[index].token}]: ${errorCode}`
            );

            // Deactivate invalid/unregistered tokens
            if (
              errorCode === "messaging/registration-token-not-registered" ||
              errorCode === "messaging/invalid-registration-token"
            ) {
              console.log(
                `[PushNotif] Deactivating invalid token: ${tokensData[index].token}`
              );
              deactivatePromises.push(
                pushToken.update(
                  { isActive: false },
                  { where: { id: tokensData[index].id } }
                )
              );
            }
          }
        });

        await Promise.all(deactivatePromises);
      }
    } catch (error) {
      // Push notification errors should not break the main flow
      console.error("[PushNotif] Error:", error.message);
    }
  }
}

module.exports = new PushNotificationService();
