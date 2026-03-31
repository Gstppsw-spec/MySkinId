const { CompanyVerificationRequest, masterCompany } = require("../models");

class CompanyVerificationService {
  async create(data) {
    try {
      const existing = await CompanyVerificationRequest.findOne({
        where: { companyId: data.companyId },
      });

      if (existing) {
        existing.status = "pending";
        await existing.save();
        return {
          status: true,
          message: "Request updated to pending",
          data: existing,
        };
      }
      const newRequest = await CompanyVerificationRequest.create({
        companyId: data.companyId,
        status: "pending",
        note: null,
      });

      return {
        status: true,
        message: "Request created",
        data: newRequest,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }
  async list(status, pagination = {}, name = null) {
    try {
      const { limit, offset } = pagination;
      const { Op } = require("sequelize");
      const where = {};
      if (status) where.status = status;

      const include = [
        {
          model: masterCompany,
          as: "company",
          ...(name && {
            where: { name: { [Op.like]: `%${name}%` } },
            required: true,
          }),
        },
      ];

      const { count, rows: requests } = await CompanyVerificationRequest.findAndCountAll({
        where,
        include,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
        subQuery: false,
        distinct: true,
      });

      return {
        status: true,
        message: "List fetched",
        data: requests,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }

  async detail(id) {
    try {
      const request = await CompanyVerificationRequest.findByPk(id, {
        include: [{ model: masterCompany, as: "company" }],
      });
      if (!request)
        return { status: false, message: "Request not found", data: null };
      return { status: true, message: "Detail fetched", data: request };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }

  async update(id, data) {
    try {
      const request = await CompanyVerificationRequest.findByPk(id, {
        include: [{ model: masterCompany, as: "company" }],
      });
      if (!request)
        return { status: false, message: "Request not found", data: null };
      request.status = data.status !== undefined ? data.status : request.status;
      request.note = data.note !== undefined ? data.note : request.note;

      if (data.status === "approved" && request.company) {
        request.company.isVerified = true;
        request.company.verifiedDate = new Date();
        await request.company.save();
      }

      if (data.status === "rejected" && request.company) {
        request.company.isVerified = false;
        request.company.verifiedDate = null;
        await request.company.save();
      }
      await request.save();
      return { status: true, message: "Request updated", data: request };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }

  async delete(id) {
    try {
      const request = await CompanyVerificationRequest.findByPk(id);
      if (!request)
        return { status: false, message: "Request not found", data: null };

      await request.destroy();
      return { status: true, message: "Request deleted", data: null };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }
}

module.exports = new CompanyVerificationService();
