const response = require("../helpers/response");
const consultation = require("../services/masterConsultation");
const quotaService = require("../services/quota.service");
const transactionOrder = require("../services/transactionOrder");
const { formatPagination } = require("../utils/pagination");

module.exports = {
  async getRoomByUserDoctor(req, res) {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { status, name } = req.query;

    const result = await consultation.getRoomByUser(user.id, {
      page,
      pageSize,
      status,
      roleCode: user.roleCode,
      locationIds: user.locationIds,
      name,
    });

    if (!result.status) {
      return response.error(res, result.message, null);
    }

    const { totalItems, rows } = result.data;

    return res.status(200).json({
      success: true,
      message: result.message,
      data: rows,
      pagination: formatPagination(totalItems, page, pageSize),
    });
  },

  async getRoomByUser(req, res) {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { status } = req.query;

    const result = await consultation.getRoomByUser(id, {
      page,
      pageSize,
      status,
    });

    if (!result.status) {
      return response.error(res, result.message, null);
    }

    const { totalItems, rows } = result.data;

    return res.status(200).json({
      success: true,
      message: result.message,
      data: rows,
      pagination: formatPagination(totalItems, page, pageSize),
    });
  },

  async createRoom(req, res) {
    const data = {
      ...(req.body || {}),
      customerId: req.body?.customerId || req.user?.id,
    };
    const result = await consultation.createRoom(data);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async assignDoctor(req, res) {
    const { id } = req.params;
    const user = req.user;
    const result = await consultation.assignDoctor(user, id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async closeRoom(req, res) {
    const { id } = req.params;
    const result = await consultation.closeRoom(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async readyToAssign(req, res) {
    try {
      const user = req.user;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const { name } = req.query;

      const result = await consultation.getAllReadyToAssign(
        user.id,
        user.roleCode,
        page,
        pageSize,
        name,
      );

      if (!result.status) {
        return res.status(400).json({ success: false, message: result.message });
      }

      const { totalItems, rows } = result.data;

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: formatPagination(totalItems, page, pageSize),
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getByRoomId(req, res) {
    const { id } = req.params;
    const result = await consultation.getByRoomId(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async addMessage(req, res) {
    const result = await consultation.addMessage(req.body, req.files);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async readMessage(req, res) {
    const { id } = req.params;
    const result = await consultation.setMessageRead(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getMessagesByRoomId(req, res) {
    try {
      const { id } = req.params;
      const { cursor, limit } = req.query;

      const result = await consultation.getMessagesByRoomId({
        roomId: id,
        cursor: cursor || null,
        limit: limit ? parseInt(limit) : 20,
      });

      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message, null);
    } catch (error) {
      return response.error(res, error.message, null);
    }
  },

  async getMediaByRoomId(req, res) {
    const { id } = req.params;
    const result = await consultation.getMediaByRoomId(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async updateLocation(req, res) {
    const { id } = req.params;
    const locationId = req.body.locationId;
    const result = await consultation.updateLocation(locationId, id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async updateLatLng(req, res) {
    const { id } = req.params;
    const { lat, lng } = req.body;
    const result = await consultation.updateLatLng(lat, lng, id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async addPrescription(req, res) {
    const { id } = req.params;
    const result = await consultation.addPrescription(req.body, id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getPrescriptionByRoomId(req, res) {
    const { id } = req.params;
    const result = await consultation.getPrescriptionByRoomId(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getAllPrescriptionByOutlet(req, res) {
    const { id } = req.params;
    const { search, productCategoryId, packageCategoryId } = req.query;

    const filters = {
      search,
      productCategoryId,
      packageCategoryId,
    };

    const result = await consultation.getAllPrescriptionByOutlet(id, filters);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async deletePrescriptionsByRoomId(req, res) {
    const { roomId } = req.params;
    const result = await consultation.deletePrescriptionsByRoomId(roomId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async deletePrescription(req, res) {
    const { id } = req.params;
    const result = await consultation.deletePrescription(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async addRecommendation(req, res) {
    const { id } = req.params;
    const result = await consultation.addRecommendation(id, req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getRecommendationDetail(req, res) {
    const { id } = req.params;
    const result = await consultation.getRecommendationDetail(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getRecommendations(req, res) {
    const { id } = req.params;
    const { sortBy } = req.query;
    const result = await consultation.getRecommendations(id, sortBy);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getQuota(req, res) {
    const customerId = req.user.id;
    const result = await quotaService.getUserQuota(customerId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async buyQuota(req, res) {
    const customerId = req.user.id;
    const result = await transactionOrder.buyConsultationQuota(req.body, customerId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getQuotaConfig(req, res) {
    const result = await quotaService.getQuotaConfig();
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async updateQuotaConfig(req, res) {
    const result = await quotaService.updateQuotaConfig(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getAllUserQuotas(req, res) {
    const { page, pageSize, search } = req.query;
    const result = await quotaService.getAllUserQuotas({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10,
      search
    });

    if (!result.status) {
      return response.error(res, result.message, null);
    }

    const { totalItems, rows } = result.data;
    return res.status(200).json({
      success: true,
      message: result.message,
      data: rows,
      pagination: formatPagination(totalItems, parseInt(page) || 1, parseInt(pageSize) || 10),
    });
  },

  async updateUserQuotaBalance(req, res) {
    const { customerId } = req.params;
    const { purchasedBalance } = req.body;
    const result = await quotaService.updateUserQuotaBalance(customerId, purchasedBalance);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async bulkUpdateUserQuotaBalance(req, res) {
    const { customerIds, purchasedBalance } = req.body;
    const result = await quotaService.bulkUpdateUserQuotaBalance(customerIds, purchasedBalance);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getConsultationDashboardSummary(req, res) {
    try {
      const { transactionItem, transaction, order, masterCustomer } = require("../models");
      const { Op } = require("sequelize");

      const { search, startDate, endDate, page = 1, pageSize = 10 } = req.query;
      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const user = req.user;
      const roleCode = user?.roleCode;
      const isGlobalAdmin = ["SUPER_ADMIN", "OPERATIONAL_ADMIN"].includes(roleCode);
      const allowedLocationIds = user?.locationIds || [];

      const transactionItemWhere = {
        itemType: "CONSULTATION_QUOTA"
      };

      if (!isGlobalAdmin && roleCode === "OUTLET_ADMIN") {
        transactionItemWhere.locationId = { [Op.in]: allowedLocationIds.length > 0 ? allowedLocationIds : [-1] };
      }

      // 1. Fetch all PAID consultation quota transaction items for metrics calculations
      const allPaidItems = await transactionItem.findAll({
        where: transactionItemWhere,
        include: [
          {
            model: transaction,
            as: "transaction",
            required: true,
            include: [
              {
                model: order,
                as: "order",
                required: true,
                where: { paymentStatus: "PAID" }
              }
            ]
          }
        ]
      });

      // Calculate monthly growth boundaries
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // Metrik Penampung
      let totalPatientsAllTime = new Set();
      let totalTransactionsAllTime = 0;
      let totalRevenueAllTime = 0;
      let totalQuotaAllTime = 0;

      let patientsThisMonth = new Set();
      let transactionsThisMonth = 0;
      let revenueThisMonth = 0;
      let quotaThisMonth = 0;

      let patientsPrevMonth = new Set();
      let transactionsPrevMonth = 0;
      let revenuePrevMonth = 0;
      let quotaPrevMonth = 0;

      allPaidItems.forEach((item) => {
        const orderDate = new Date(item.transaction.order.createdAt);
        const customerId = item.transaction.order.customerId;
        const price = parseFloat(item.totalPrice || 0);
        const qty = parseInt(item.quantity || 0);

        // All-Time
        totalPatientsAllTime.add(customerId);
        totalTransactionsAllTime += 1;
        totalRevenueAllTime += price;
        totalQuotaAllTime += qty;

        // This Month
        if (orderDate >= startOfThisMonth) {
          patientsThisMonth.add(customerId);
          transactionsThisMonth += 1;
          revenueThisMonth += price;
          quotaThisMonth += qty;
        }
        // Prev Month
        else if (orderDate >= startOfPrevMonth && orderDate <= endOfPrevMonth) {
          patientsPrevMonth.add(customerId);
          transactionsPrevMonth += 1;
          revenuePrevMonth += price;
          quotaPrevMonth += qty;
        }
      });

      const calcGrowth = (curr, prev) => {
        if (prev === 0) return curr > 0 ? "+100.0%" : "+0.0%";
        const diff = ((curr - prev) / prev) * 100;
        return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
      };

      const metrics = {
        totalPatients: {
          value: `${totalPatientsAllTime.size} Orang`,
          growth: `${calcGrowth(patientsThisMonth.size, patientsPrevMonth.size)} Bulan ini`
        },
        totalTransactions: {
          value: `${totalTransactionsAllTime} Transaksi`,
          growth: `${calcGrowth(transactionsThisMonth, transactionsPrevMonth)} Bulan ini`
        },
        consultationRevenue: {
          value: `Rp ${totalRevenueAllTime.toLocaleString("id-ID")}`,
          growth: `${calcGrowth(revenueThisMonth, revenuePrevMonth)} Bulan ini`
        },
        totalQuotaSold: {
          value: `${totalQuotaAllTime} Kuota`,
          growth: `${calcGrowth(quotaThisMonth, quotaPrevMonth)} Bulan ini`
        }
      };

      // 2. Query for filtered and paginated patients list (table)
      const customerWhereClause = {};
      if (search && search !== "") {
        customerWhereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      const orderWhereClause = { paymentStatus: "PAID" };
      if (startDate && endDate) {
        const filterStart = new Date(startDate);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);
        orderWhereClause.createdAt = {
          [Op.between]: [filterStart, filterEnd]
        };
      } else if (startDate) {
        const filterStart = new Date(startDate);
        orderWhereClause.createdAt = {
          [Op.gte]: filterStart
        };
      } else if (endDate) {
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);
        orderWhereClause.createdAt = {
          [Op.lte]: filterEnd
        };
      }

      const { count: totalItems, rows: items } = await transactionItem.findAndCountAll({
        where: transactionItemWhere,
        include: [
          {
            model: transaction,
            as: "transaction",
            required: true,
            include: [
              {
                model: order,
                as: "order",
                required: true,
                where: orderWhereClause,
                include: [
                  {
                    model: masterCustomer,
                    as: "customer",
                    required: true,
                    where: customerWhereClause
                  }
                ]
              }
            ]
          }
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset
      });

      const formatIndonesianDate = (dateString) => {
        if (!dateString) return "-";
        const months = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "-";
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      };

      const formatIndonesianTime = (dateString) => {
        if (!dateString) return "-";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "-";
        
        // Convert to WIB (UTC+7)
        const utc = d.getTime() + d.getTimezoneOffset() * 60000;
        const wibTime = new Date(utc + 3600000 * 7);
        
        const pad = (num) => String(num).padStart(2, "0");
        return `${pad(wibTime.getHours())}.${pad(wibTime.getMinutes())} WIB`;
      };

      const mappedPatients = items.map((item, idx) => {
        const orderData = item.transaction.order;
        const customerData = orderData.customer;

        return {
          no: offset + idx + 1,
          customerProfile: {
            name: customerData.name,
            email: customerData.email || "-",
            phoneNumber: customerData.phoneNumber || "-"
          },
          jumlahKuota: `${item.quantity} KUOTA`,
          tanggalBeliDate: formatIndonesianDate(orderData.createdAt),
          tanggalBeliTime: formatIndonesianTime(orderData.createdAt),
          biaya: `Rp ${parseFloat(item.totalPrice).toLocaleString("id-ID")}`
        };
      });

      return response.success(res, "Consultation dashboard summary fetched successfully", {
        metrics,
        patients: {
          rows: mappedPatients,
          totalCount: totalItems,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      });
    } catch (error) {
      return response.error(res, error.message, null);
    }
  }
};
