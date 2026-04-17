const NotificationService = require("../services/notification.service");
const { getPagination, formatPagination } = require("../utils/pagination");

class NotificationController {
  async list(req, res) {
    try {
      const { category, type, referenceType, status, page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);
      
      const userId = req.user.id;
      const roleCode = req.user.roleCode;
      
      let companyId = null;
      if (req.user.companyId) {
        companyId = req.user.companyId;
      }

      const params = {
        category,
        type,
        referenceType,
        status,
        userId: (roleCode === "CUSTOMER" || roleCode === "DOCTOR") ? userId : null,
        companyId: (roleCode === "COMPANY_ADMIN" || roleCode === "OUTLET_ADMIN" || roleCode === "OPERATIONAL_ADMIN") ? companyId : null,
        page: pagination.page,
        pageSize: pagination.pageSize,
      };

      // Special case: if user is SUPER_ADMIN, they might see all or we need a specific filter.
      // But based on request, it's primarily for Company Admin.

      const result = await NotificationService.getNotifications(params);

      if (!result.status) {
        return res.status(400).json(result);
      }

      return res.status(200).json({
        status: true,
        message: result.message,
        data: result.data,
        unreadCount: result.unreadCount,
        pagination: formatPagination(result.totalCount, pagination.page, pagination.pageSize),
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const result = await NotificationService.markAsRead(id);
      return res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id;
      const roleCode = req.user.roleCode;

      const target = {};
      if (roleCode === "COMPANY_ADMIN" || roleCode === "OUTLET_ADMIN" || roleCode === "OPERATIONAL_ADMIN") {
        target.companyId = companyId;
      } else {
        target.userId = userId;
      }

      if (!target.companyId && !target.userId) {
        return res.status(400).json({ status: false, message: "Target for Read All not found" });
      }

      const result = await NotificationService.markAllAsRead(target);
      return res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }
}

module.exports = new NotificationController();
