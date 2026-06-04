const {
  masterNotification,
  masterUser,
  relationshipUserCompany,
  masterLocation,
  flashSale,
  flashSaleItem,
  masterProduct,
  masterPackage,
} = require("../models");
const pushNotificationService = require("./pushNotification.service");
const { Op } = require("sequelize");

class NotificationService {
  /**
   * Create a notification, save to DB, and send a push notification.
   */
  async createNotification(data) {
    try {
      const {
        companyId,
        locationId,
        userId,
        title,
        body,
        category,
        type,
        referenceId,
        referenceType,
        recipientType = "user",
        meta = {},
      } = data;

      const notification = await masterNotification.create({
        companyId,
        locationId,
        userId,
        title,
        body,
        category,
        type,
        referenceId,
        referenceType,
        isRead: false,
      });

      // Recipient logic
      if (userId) {
        // Targeted at a specific user or customer
        await pushNotificationService.sendPushNotification(userId, recipientType, {
          title,
          body,
          data: {
            notificationId: notification.id,
            category,
            type,
            referenceId: referenceId || "",
            referenceType: referenceType || "",
            ...meta,
          },
        });
      } else if (companyId) {
        // Targeted at a company (all active admins)
        const admins = await relationshipUserCompany.findAll({
          where: { companyId, isactive: true },
          attributes: ["userId"],
        });

        const pushPromises = admins.map((admin) =>
          pushNotificationService.sendPushNotification(admin.userId, "user", {
            title,
            body,
            data: {
              notificationId: notification.id,
              category,
              type,
              referenceId: referenceId || "",
              referenceType: referenceType || "",
              ...meta,
            },
          })
        );
        await Promise.all(pushPromises);
      }

      return { status: true, data: notification };
    } catch (error) {
      console.error("[NotificationService] Create Error:", error.message);
      return { status: false, message: error.message };
    }
  }

  /**
   * Get paginated notifications with filters.
   */
  async getNotifications(params) {
    try {
      const { 
        companyId, 
        userId, 
        category, 
        type, 
        referenceType, 
        status, 
        page = 1, 
        pageSize = 10 
      } = params;
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const where = {};
      if (category && category !== "All") {
        where.category = category;
      }

      if (type) {
        where.type = type;
      }

      if (referenceType) {
        where.referenceType = referenceType;
      }

      if (status) {
        if (status === "accepted") {
          where.type = { [Op.in]: ["VERIFICATION_APPROVED", "TRANSACTION_SUCCESS"] };
        } else if (status === "rejected") {
          where.type = { [Op.in]: ["VERIFICATION_REJECTED", "TRANSACTION_FAILED"] };
        }
      }

      if (userId) {
        where.userId = userId;
      } else if (companyId) {
        where.companyId = companyId;
      }

      const { count: totalCount, rows: notifications } =
        await masterNotification.findAndCountAll({
          where,
          order: [["createdAt", "DESC"]],
          limit,
          offset,
        });

      // Count unread
      const unreadCount = await masterNotification.count({
        where: { ...where, isRead: false },
      });

      return {
        status: true,
        message: "Notifications fetched successfully",
        data: notifications,
        unreadCount,
        totalCount,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id) {
    try {
      const notification = await masterNotification.findByPk(id);
      if (!notification) {
        return { status: false, message: "Notification not found" };
      }

      await notification.update({
        isRead: true,
        readAt: new Date(),
      });

      return { status: true, message: "Notification marked as read", data: notification };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  /**
   * Mark all notifications as read for a company.
   */
  async markAllAsRead({ companyId, userId }) {
    try {
      const where = { isRead: false };
      if (companyId) {
        where.companyId = companyId;
      } else if (userId) {
        where.userId = userId;
      } else {
        return { status: false, message: "No target (company or user) provided" };
      }

      await masterNotification.update(
        {
          isRead: true,
          readAt: new Date(),
        },
        { where }
      );

      return { status: true, message: "All notifications marked as read" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  /**
   * Daily cron logic for Flash Sale notifications.
   * Notifies company admins about active or upcoming flash sales daily.
   */
  async notifyFlashSaleDaily() {
    try {
      const now = new Date();
      
      // Find UPCOMING or ACTIVE flash sales
      const activeSales = await flashSale.findAll({
        where: {
          status: { [Op.in]: ["UPCOMING", "ACTIVE"] },
          endDate: { [Op.gt]: now },
        },
        include: [
          {
            model: flashSaleItem,
            as: "items",
            include: [
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "companyId"],
              },
            ],
          },
        ],
      });

      if (!activeSales.length) return { status: true, message: "No active flash sales to notify" };

      // Group by company to avoid spamming multiple notifications for the same sale
      const companySales = new Map();

      for (const sale of activeSales) {
        for (const item of sale.items) {
          if (item.location && item.location.companyId) {
            const companyId = item.location.companyId;
            if (!companySales.has(companyId)) {
              companySales.set(companyId, []);
            }
            companySales.get(companyId).push({
                saleTitle: sale.title,
                saleId: sale.id,
                status: sale.status
            });
          }
        }
      }

      for (const [companyId, sales] of companySales.entries()) {
        const uniqueSales = Array.from(new Set(sales.map(s => s.saleId)))
            .map(id => sales.find(s => s.saleId === id));
        
        for (const sale of uniqueSales) {
            const title = `Flash Sale: ${sale.saleTitle}`;
            const body = sale.status === "ACTIVE" 
                ? `Flash sale "${sale.saleTitle}" sedang berlangsung hari ini!` 
                : `Flash sale "${sale.saleTitle}" akan segera dimulai. Siapkan stok produk Anda!`;

            await this.createNotification({
              companyId,
              title,
              body,
              category: "Promotion",
              type: "FLASH_SALE_DAILY",
              referenceId: sale.saleId,
              referenceType: "flashSale",
              meta: {
                status: sale.status,
              },
            });
        }
      }

      return { status: true, message: `Dispatched daily flash sale notifications to ${companySales.size} companies` };
    } catch (error) {
      console.error("[NotificationService] Flash Sale Daily Cron Error:", error.message);
      return { status: false, message: error.message };
    }
  }

  async sendGeneralBroadcastImmediate({ title, body, clickRoute, target = "ALL" }) {
    try {
      const { masterCustomer } = require("../models");
      const customers = await masterCustomer.findAll({
        where: { isActive: true },
        attributes: ["id"],
      });

      const customerIds = customers.map(c => c.id).filter(Boolean);

      if (customerIds.length === 0) {
        return { status: false, message: "No active customers found to notify" };
      }

      const meta = { clickRoute: clickRoute || "" };

      const sendPromises = customerIds.map(customerId =>
        this.createNotification({
          userId: customerId,
          recipientType: "customer",
          title,
          body,
          category: "Promotion",
          type: "GENERAL_BROADCAST",
          referenceId: null,
          referenceType: null,
          meta,
        })
      );

      await Promise.all(sendPromises);

      return {
        status: true,
        message: `Berhasil mengirimkan broadcast ke ${customerIds.length} customer`,
        data: { notifiedCustomerCount: customerIds.length },
      };
    } catch (error) {
      console.error("[NotificationService] sendGeneralBroadcastImmediate Error:", error.message);
      return { status: false, message: error.message };
    }
  }

  async createScheduledGeneralNotification({ title, body, clickRoute, scheduledAt, repeatDaily, target = "ALL" }) {
    try {
      if (!scheduledAt) {
        return { status: false, message: "Waktu jadwal pengiriman harus diisi" };
      }

      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        return { status: false, message: "Format tanggal tidak valid" };
      }
      if (parsedDate <= new Date()) {
        return { status: false, message: "Waktu jadwal pengiriman harus di masa depan" };
      }

      const { scheduledNotification } = require("../models");
      const notif = await scheduledNotification.create({
        title,
        body,
        clickRoute: clickRoute || null,
        target,
        status: repeatDaily ? "ACTIVE" : "PENDING",
        scheduledAt: parsedDate,
        repeatDaily: !!repeatDaily,
      });

      return {
        status: true,
        message: "Berhasil menjadwalkan notifikasi umum",
        data: notif,
      };
    } catch (error) {
      console.error("[NotificationService] createScheduledGeneralNotification Error:", error.message);
      return { status: false, message: error.message };
    }
  }

  async getScheduledGeneralNotifications() {
    try {
      const { scheduledNotification } = require("../models");
      const list = await scheduledNotification.findAll({
        where: { flashSaleId: null },
        order: [["createdAt", "DESC"]],
      });

      return {
        status: true,
        message: "Berhasil mengambil daftar jadwal notifikasi umum",
        data: list,
      };
    } catch (error) {
      console.error("[NotificationService] getScheduledGeneralNotifications Error:", error.message);
      return { status: false, message: error.message };
    }
  }

  async deleteScheduledGeneralNotification(id) {
    try {
      const { scheduledNotification } = require("../models");
      const notif = await scheduledNotification.findByPk(id);
      if (!notif) return { status: false, message: "Jadwal notifikasi tidak ditemukan" };

      await notif.destroy();

      return {
        status: true,
        message: "Berhasil membatalkan dan menghapus jadwal notifikasi umum",
        data: notif,
      };
    } catch (error) {
      console.error("[NotificationService] deleteScheduledGeneralNotification Error:", error.message);
      return { status: false, message: error.message };
    }
  }
}

module.exports = new NotificationService();
