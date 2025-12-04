const { LocationVerificationRequest, masterLocation } = require("../models");

class LocationVerificationService {
  async create(data) {
    try {
      const existing = await LocationVerificationRequest.findOne({
        where: { locationId: data.locationId },
      });

      if (existing) {
        existing.status = "pending";
        await existing.save();
        return {
          status: true,
          message: "Request berhasil di ajukan kembali",
          data: existing,
        };
      }

      const newRequest = await LocationVerificationRequest.create({
        locationId: data.locationId,
        status: "pending",
        note: null,
      });

      return {
        status: true,
        message: "Request verifikasi berhasil di ajukan",
        data: newRequest,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  }

  async list(status) {
    try {
      const where = {};
      if (status) where.status = status;

      const requests = await LocationVerificationRequest.findAll({
        where,
        include: [{ model: masterLocation, as: "location" }],
        order: [["createdAt", "DESC"]],
      });

      return {
        status: true,
        message: "List request verification",
        data: requests,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  }

  async update(id, data) {
    try {
      const request = await LocationVerificationRequest.findByPk(id, {
        include: [{ model: masterLocation, as: "location" }],
      });

      if (!request)
        return {
          status: false,
          message: "Belum ada request ditemukan",
          data: null,
        };

      request.status = data.status != undefined ? data.status : request.status;
      request.note = data.note != undefined ? data.note : request.note;

      if (data.status === "approved" && request.location) {
        request.location.isVerified = true;
        request.location.verifiedDate = new Date();
        await request.location.save();
      }

      if (data.status === "rejected" && request.location) {
        request.location.isVerified = false;
        request.location.verifiedDate = null;
        await request.location.save();
      }
      await request.save();
      return { status: true, message: "Request updated", data: request };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }
}

module.exports = new LocationVerificationService();
