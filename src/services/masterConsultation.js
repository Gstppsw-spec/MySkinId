const {
  masterRoomConsultation,
  masterConsultationImage,
  masterConsultationCategory,
  masterConsultationMessage,
  masterConsultationPrescription,
  relationshipUserLocation,
  masterProduct,
  masterLocation,
  masterCustomer,
  masterPackage,
  masterService,
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
          {
            model: masterConsultationMessage,
            as: "consultationMessage",
            separate: true,
            limit: 1,
            order: [["createdAt", "DESC"]],
            attributes: ["message", "createdAt"],
          },
          {
            model: masterCustomer,
            as: 'customer',
            attributes: ['id', 'name']
          }
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

  async assignDoctor({ id: doctorId }, roomId) {
    try {
      const room = await masterRoomConsultation.findByPk(roomId);
      if (!room) {
        return { status: false, message: "Tidak ada room ditemukan" };
      }
      room.doctorId = doctorId;
      room.status = "open";
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
          {
            model: masterCustomer,
            as: 'customer',
            attributes: ['id', 'name']
          }
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

  async setMessageRead(roomId) {
    try {
      await masterConsultationMessage.update(
        { isRead: true },
        {
          where: {
            roomId: roomId,
            isRead: false,
          },
        }
      );
      return { status: true, message: "Success", data: null };
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
        attributes: ["id", "name"],
        required: false,
      };

      if (role === "OUTLET_DOCTORR") {
        const userLocations = await relationshipUserLocation.findAll({
          where: {
            userId: userId,
            isactive: true,
          },
          attributes: ["locationId"],
        });

        const locationIds = userLocations.map((ul) => ul.locationId);
        if (locationIds.length === 0) {
          return { status: true, message: "Success", data: [] };
        }

        locationIncludeOptions = {
          ...locationIncludeOptions,
          required: true,
          where: {
            id: { [Op.in]: locationIds },
          },
        };
      }
      const hasMinThreeImages = Sequelize.literal(`
      EXISTS (
        SELECT 1
        FROM masterConsultationImage mci
        WHERE mci.roomId = masterRoomConsultation.id
        GROUP BY mci.roomId
        HAVING COUNT(1) >= 3
      )
    `);
      const rooms = await masterRoomConsultation.findAll({
        attributes: ["id", "roomCode", "customerId", "status", "createdAt"],
        where: {
          status: "pending",
          [Op.and]: [hasMinThreeImages],
        },
        include: [
          {
            model: masterConsultationCategory,
            as: "consultationCategory",
            attributes: ["name"],
          },
          locationIncludeOptions,
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["name"],
          },
          {
            model: masterConsultationImage,
            as: "consultationImage",
            attributes: ["imageUrl"],
          },
        ],
        order: [["createdAt", "ASC"]],
      });

      return { status: true, message: "Success", data: rooms };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },
  async addPrescription(data, roomId) {
    try {
      // Validate input
      if (!roomId) {
        return {
          status: false,
          message: "Room ID tidak boleh kosong",
          data: null,
        };
      }

      if (!Array.isArray(data)) {
        return {
          status: false,
          message: "Data harus berupa array",
          data: null,
        };
      }

      if (data.length === 0) {
        return {
          status: false,
          message: "Data resep tidak boleh kosong",
          data: null,
        };
      }

      // Validate each prescription has required fields
      for (const prescription of data) {
        if (!prescription.notes) {
          return {
            status: false,
            message: "Setiap resep harus memiliki notes",
            data: null,
          };
        }
      }

      // Map prescriptions to include roomId
      const prescriptionsData = data.map((prescription) => ({
        roomId,
        notes: prescription.notes,
        refferenceId: prescription.refferenceId || null,
        refferenceType: prescription.refferenceType || null,
      }));

      // Bulk create prescriptions
      const prescriptions = await masterConsultationPrescription.bulkCreate(
        prescriptionsData
      );

      return { status: true, message: "Berhasil menambahkan resep", data: prescriptions };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getPrescriptionByRoomId(roomId) {
    try {
      const prescriptions = await masterConsultationPrescription.findAll({
        where: { roomId },
        include: [
          {
            model: masterProduct,
            as: "product",
            attributes: ["id", "name", "description"],
            where: { isVerified: true, isActive: true },
            required: false
          },
          {
            model: masterService,
            as: "service",
            attributes: ["id", "name", "description"],
            where: { isVerified: true, isActive: true },
            required: false
          },
          {
            model: masterPackage,
            as: "package",
            attributes: ["id", "name", "description"],
            where: { isVerified: true, isActive: true },
            required: false
          }
        ],
        order: [["createdAt", "ASC"]],
      });

      // Map to unified prescription object
      const formattedPrescriptions = prescriptions.map((prescription) => {
        const prescriptionJson = prescription.toJSON();

        // Determine which reference type to use based on refferenceType
        let prescriptionData = null;
        if (prescriptionJson.refferenceType === "product" && prescriptionJson.product) {
          prescriptionData = prescriptionJson.product;
        } else if (prescriptionJson.refferenceType === "service" && prescriptionJson.service) {
          prescriptionData = prescriptionJson.service;
        } else if (prescriptionJson.refferenceType === "package" && prescriptionJson.package) {
          prescriptionData = prescriptionJson.package;
        }

        // Remove individual reference fields and add unified prescription field
        delete prescriptionJson.product;
        delete prescriptionJson.service;
        delete prescriptionJson.package;
        delete prescriptionJson.refferenceId;
        delete prescriptionJson.createdAt;
        delete prescriptionJson.updatedAt;

        return {
          ...prescriptionJson,
          prescription: prescriptionData
        };
      });

      return { status: true, message: "Berhasil", data: formattedPrescriptions };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getAllPrescriptionByOutlet(roomId) {
    try {
      // Get the room to extract locationId
      const room = await masterRoomConsultation.findOne({
        where: { id: roomId },
        attributes: ["id", "locationId"],
      });

      if (!room) {
        return { status: false, message: "Room tidak ditemukan", data: null };
      }

      if (!room.locationId) {
        return { status: false, message: "Room tidak memiliki locationId", data: null };
      }

      // Fetch products, services, and packages with the same locationId
      const [productPrescription, servicePrescription, packagePrescription] = await Promise.all([
        masterProduct.findAll({
          where: {
            locationId: room.locationId,
            isVerified: true,
            isActive: true
          },
          attributes: ["id", "name"],
        }),
        masterService.findAll({
          where: {
            locationId: room.locationId,
            isVerified: true,
            isActive: true
          },
          attributes: ["id", "name"],
        }),
        masterPackage.findAll({
          where: {
            locationId: room.locationId,
            isVerified: true,
            isActive: true
          },
          attributes: ["id", "name"],
        }),
      ]);

      const prescriptions = {
        product: productPrescription,
        service: servicePrescription,
        package: packagePrescription,
      };

      return { status: true, message: "Berhasil", data: prescriptions };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
