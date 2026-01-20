const {
  masterRoomConsultation,
  masterConsultationImage,
  masterConsultationCategory,
  masterConsultationMessage,
  masterConsultationPrescription,
  relationshipUserLocation,
  masterProduct,
  masterLocation,
} = require("../models");

const { Op, Sequelize, where } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");

module.exports = {
  async getRoomByUser(userId) {
    try {
      const rooms = await masterRoomConsultation.findAll({
        where: {
          [Sequelize.Op.or]: [{ customerId: userId }, { doctorId: userId }],
        },
        include: [
          {
            model: masterConsultationCategory,
            as: "consultationCategory",
          },
        ],
      });

      return { status: true, message: "Success", data: rooms };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async createRoom(data) {
    try {
      const {
        customerId,
        consultationCategoryId,
        locationId,
        latitude,
        longitude,
      } = data;

      if (!customerId) {
        return { status: false, message: "Customer tidak boleh kosong" };
      }

      if (!consultationCategoryId) {
        return {
          status: false,
          message: "Kategori konsultasi tidak boleh kosong",
        };
      }

      const roomCode = `ROOM-${nanoid(8).toUpperCase()}`;

      const room = await masterRoomConsultation.create({
        customerId,
        roomCode,
        doctorId: null,
        status: "pending",
        consultationCategoryId,
        expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        locationId,
        latitude,
        longitude,
      });

      return { status: true, message: "Success", data: room };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async assignDoctor(data, roomId) {
    try {
      const { doctorId } = data;
      const room = await masterRoomConsultation.findByPk(roomId);

      if (!room) {
        return { status: false, message: "Tidak ada room ditemukan" };
      }

      room.doctorId = doctorId;
      room.status = "open";

      await room.save;

      return {
        status: true,
        message: "Berhasil masuk ke room chat",
        data: room,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async closeRoom(roomId) {
    try {
      const room = await masterRoomConsultation.findByPk(roomId);
      if (!room) {
        return { status: false, message: "Tidak ada room ditemukan" };
      }

      room.status = "closed";
      await room.save();
      return {
        status: true,
        message: "Berhasil masuk ke room chat",
        data: room,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getByRoomId(roomId) {
    try {
      const room = await masterRoomConsultation.findByPk(roomId, {
        include: [
          {
            model: masterConsultationCategory,
            as: "consultationCategory",
          },
          {
            model: masterConsultationImage,
            as: "consultationImage",
            attributes: ["id"],
          },
        ],
      });

      if (!room) {
        return { status: false, message: "Room tidak ditemukan", data: null };
      }

      const imageCount = room.consultationImage
        ? room.consultationImage.length
        : 0;

      const isScanning = room.doctorId === null && imageCount >= 3;

      return {
        status: true,
        message: "Success",
        data: {
          ...room.toJSON(),
          imageCount,
          isScanning,
        },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async addMessage(data, files) {
    try {
      const { roomId, messageType, message, senderRole } = data;

      if (!roomId || !messageType) {
        return { status: false, message: "roomid dan type tidak boleh kosong" };
      }

      const newMessage = await masterConsultationMessage.create({
        roomId,
        message,
        messageType,
        senderRole,
      });

      if (files || files.length > 0) {
        const imageRecords = files.map((file) => ({
          messageId: newMessage.id,
          roomId: roomId,
          imageUrl: file.path,
        }));

        await masterConsultationImage.bulkCreate(imageRecords);

        messageContent = imageRecords.map((img) => img.imageUrl);
        newMessage.message = JSON.stringify(messageContent);
      }

      return { status: true, message: "Success", data: newMessage };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getMessagesByRoomId({ roomId, cursor, limit }) {
    try {
      const where = { roomId };
      if (cursor) {
        where.createdAt = {
          [Op.lt]: new Date(cursor),
        };
      }
      const messages = await masterConsultationMessage.findAll({
        where,
        include: [
          {
            model: masterConsultationImage,
            as: "consultationImage",
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
      });
      return {
        status: true,
        message: "Berhasil",
        data: messages,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async getMediaByRoomId(roomId) {
    try {
      const media = await masterConsultationImage.findAll({
        where: { roomId: roomId },
      });

      return { status: true, message: "Berhasil", data: media };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getAllReadyToAssign(userId, role) {
    try {
      let locationIncludeOptions = {
        model: masterLocation,
        as: "location",
        attributes: ["id", ["name", "namaOutlet"]],
        required: false, // Default LEFT JOIN
      };

      if (role === "Outlet_Doctor") {
        const userLocations = await relationshipUserLocation.findAll({
          where: { userId: userId, isactive: true },
          attributes: ["locationId"],
        });

        const locationIds = userLocations.map((ul) => ul.locationId);

        if (locationIds.length === 0) {
          // If doctor has no location assigned, return empty
          return { status: true, message: "Success", data: [] };
        }

        // For outlet_doctor: INNER JOIN and filter by location
        locationIncludeOptions.required = true;
        locationIncludeOptions.where = { id: { [Op.in]: locationIds } };
      } else if (role === "Doctor_General") {
        // Doctor General logic:
        // LEFT JOIN (already set as default)
        // No location filtering
      } else {
        // Any other role returns empty
        return { status: true, message: "Success", data: [] };
      }

      // Filter rooms that have >= 3 images
      const havingThreeImagesLiteral = Sequelize.literal(
        `(SELECT COUNT(1) FROM masterConsultationImage AS mci WHERE mci.roomId = masterRoomConsultation.id) >= 3`,
      );

      const rooms = await masterRoomConsultation.findAll({
        attributes: [
          "id",
          "roomCode",
          "customerId",
          "status",
          // The result will be nested objects for includes
        ],
        where: {
          status: "pending",
          [Op.and]: [havingThreeImagesLiteral],
        },
        include: [
          {
            model: masterConsultationCategory,
            as: "consultationCategory",
            attributes: ["name"],
          },
          locationIncludeOptions,
        ],
      });

      return { status: true, message: "Success", data: rooms };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async addPrescription(data) {
    try {
      const { roomId, refferenceId, refferenceType, notes } = data;

      if (!roomId || !notes) {
        return {
          status: false,
          message: "Room dan data resep tidak boleh kosong",
          data: null,
        };
      }

      const prescription = await masterConsultationPrescription.create({
        roomId,
        notes,
        refferenceId,
        refferenceType,
      });

      return { status: true, message: "Berhasil", data: prescription };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getPrescriptionByRoomId(roomId) {
    try {
      const prescriptions = await masterConsultationPrescription.findAll({
        where: { roomId },
        include: [{ model: masterProduct, as: "product" }],
        order: [["createdAt", "ASC"]],
      });

      return { status: true, message: "Berhasil", data: prescriptions };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
