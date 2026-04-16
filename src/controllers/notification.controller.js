const NotificationService = require("../services/notification.service");
const { getPagination, formatPagination } = require("../utils/pagination");

class NotificationController {
  async list(req, res) {
    try {
      const { category, page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);
      
      // Assume user context from middleware (req.user)
      const userId = req.user.id;
      const roleCode = req.user.roleCode;
      
      let companyId = null;
      // If company admin, we might want to filter by companyId
      // This depends on how req.user is populated. 
      // Often for company admin, we store their companyId in the session/token.
      if (req.user.companyId) {
        companyId = req.user.companyId;
      }

      const params = {
        category,
        userId: roleCode === "CUSTOMER" ? userId : null,
        companyId: roleCode === "COMPANY_ADMIN" ? companyId : null,
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
      if (!companyId) {
        return res.status(400).json({ status: false, message: "Company ID not found in user context" });
      }

      const result = await NotificationService.markAllAsRead(companyId);
      return res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }
}

module.exports = new NotificationController();
