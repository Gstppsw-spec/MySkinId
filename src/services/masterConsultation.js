const {
  masterRoomConsultation,
  masterConsultationImage,
  masterConsultationCategory,
  masterConsultationMessage,
  masterConsultationPrescription,
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
      const { customerId, consultationCategoryId } = data;

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
        ],
      });

      return { status: true, message: "Success", data: room };
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

  async getMessagesByRoomId(roomId) {
    try {
      const message = await masterConsultationMessage.findAll({
        where: { roomId: roomId },
        include: [{ model: masterConsultationImage, as: "consultationImage" }],
        order: [["createdAt", "ASC"]],
      });

      return { status: true, message: "Berhasil", data: message };
    } catch (error) {
      return { status: false, message: error.message, data: null };
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

  async addPrescription(data) {
    try {
      const { roomId, doctorId, customerId, productId, notes } = data;

      if (!roomId || !notes) {
        return {
          status: false,
          message: "Room dan data resep tidak boleh kosong",
          data: null,
        };
      }

      const prescription = await masterConsultationPrescription.create({
        roomId,
        productId,
        notes,
        customerId,
        doctorId,
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
