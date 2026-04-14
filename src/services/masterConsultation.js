const {
  masterRoomConsultation,
  masterConsultationImage,
  masterConsultationCategory,
  masterConsultationMessage,
  masterConsultationPrescription,
  consultationRecommendation,
  relationshipUserLocation,
  masterProduct,
  masterProductImage,
  masterProductCategory,
  masterSubCategoryService,
  masterLocation,
  masterLocationImage,
  masterCustomer,
  masterPackage,
  masterPackageItems,
  masterService,
  masterCity,
  masterQuestionnaire,
  masterQuestionnaireAnswer,
  consultationRecommendationCategory,
  masterUser,
} = require("../models");

const { Op, Sequelize, where, Model } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");
const socketInstance = require("../socket/socketInstance");
const pushNotificationService = require("./pushNotification.service");

module.exports = {
  async getRoomByUser(userId, filters = {}) {
    try {
      const { page = 1, pageSize = 10, status } = filters;
      const offset = (page - 1) * pageSize;

      const where = {
        [Op.or]: [{ customerId: userId }, { doctorId: userId }],
      };

      if (status && status !== "all") {
        where.status = status;
      }

      const { count, rows } = await masterRoomConsultation.findAndCountAll({
        where,
        include: [
          {
            model: masterConsultationCategory,
            as: "consultationCategory",
            required: false,
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
            as: "customer",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: masterProduct,
            as: "product",
            attributes: [
              "id",
              "name",
              "price",
              "discountPercent",
              "description",
            ],
            required: false,
            include: [
              {
                model: masterProductImage,
                as: "images",
                attributes: ["imageUrl"],
                limit: 1,
                required: false,
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: pageSize,
        offset,
        distinct: true,
      });

      // Untuk room yang locationId = null tapi punya lat/long,
      // cari location terdekat dan isi field location
      const enrichedRooms = await Promise.all(
        rows.map(async (room) => {
          const roomJson = room.toJSON();

          // Check if questionnaire is completed (only count required questions)
          const requiredQuestions = await masterQuestionnaire.findAll({
            attributes: ["id"],
            include: [
              {
                model: masterConsultationCategory,
                as: "consultationCategories",
                where: { id: room.consultationCategoryId },
                through: { attributes: [] },
                attributes: [],
              },
            ],
            where: { isActive: true, isRequired: true },
          });

          const requiredQuestionIds = requiredQuestions.map((q) => q.id);
          const totalRequired = requiredQuestionIds.length;

          let isQuestionareCompleted = true;
          if (totalRequired > 0) {
            const totalAnswers = await masterQuestionnaireAnswer.count({
              where: {
                roomId: room.id,
                questionnaireId: { [Op.in]: requiredQuestionIds },
              },
            });
            isQuestionareCompleted = totalAnswers >= totalRequired;
          }
          roomJson.isQuestionareCompleted = isQuestionareCompleted;

          if (
            !roomJson.locationId &&
            roomJson.latitude != null &&
            roomJson.longitude != null
          ) {
            const latitude = roomJson.latitude;
            const longitude = roomJson.longitude;

            const distanceLiteral = Sequelize.literal(`
            6371 * acos(
              cos(radians(${latitude})) *
              cos(radians(CAST(latitude AS FLOAT))) *
              cos(radians(CAST(longitude AS FLOAT)) - radians(${longitude})) +
              sin(radians(${latitude})) *
              sin(radians(CAST(latitude AS FLOAT)))
            )
          `);

            const nearestLocation = await masterLocation.findOne({
              attributes: ["id", "name", [distanceLiteral, "distance"]],
              where: {
                latitude: { [Op.ne]: null },
                longitude: { [Op.ne]: null },
              },
              order: [[distanceLiteral, "ASC"]],
            });

            roomJson.location = nearestLocation
              ? { id: nearestLocation.id, name: nearestLocation.name }
              : null;
          }

          return roomJson;
        }),
      );

      return {
        status: true,
        message: "Success",
        data: {
          totalItems: count,
          rows: enrichedRooms,
        },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },


  async createRoom(data = {}) {
    try {
      const {
        customerId,
        consultationCategoryId,
        locationId,
        latitude,
        longitude,
        answers,
        productId,
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

      const existingActiveRoom = await masterRoomConsultation.findOne({
        where: {
          customerId,
          consultationCategoryId,
          status: { [Op.ne]: "closed" },
        }
      });

      if (existingActiveRoom) {
        if (existingActiveRoom.status === "waiting_questionnaire") {
          // Update basic info if it changed
          existingActiveRoom.locationId = locationId || existingActiveRoom.locationId;
          existingActiveRoom.latitude = latitude || existingActiveRoom.latitude;
          existingActiveRoom.longitude = longitude || existingActiveRoom.longitude;
          existingActiveRoom.productId = productId || existingActiveRoom.productId;
          await existingActiveRoom.save();

          // If answers are provided, process them
          if (answers && Array.isArray(answers) && answers.length > 0) {
            await this._processQuestionnaireAnswers(existingActiveRoom, consultationCategoryId, answers);
          }

          return { status: true, message: "Melanjutkan kuesioner yang ada", data: existingActiveRoom };
        } else {
          // If it's already pending or open, just return the existing room
          return { status: true, message: "Anda sudah memiliki konsultasi aktif di kategori ini", data: existingActiveRoom };
        }
      }

      if (productId) {
        const product = await masterProduct.findByPk(productId);
        if (!product) {
          return { status: false, message: "Produk tidak ditemukan" };
        }
      }

      const roomCode = `ROOM-${nanoid(8).toUpperCase()}`;

      // Default status is pending
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
        productId,
      });

      // Save questionnaire answers if provided
      if (answers && Array.isArray(answers) && answers.length > 0) {
        await this._processQuestionnaireAnswers(room, consultationCategoryId, answers);
      }

      return { status: true, message: "Success", data: room };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async _processQuestionnaireAnswers(room, consultationCategoryId, answers) {
    // Validate required questions
    const requiredQuestions = await masterQuestionnaire.findAll({
      where: { isActive: true, isRequired: true },
      include: [
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
          where: { id: consultationCategoryId },
          attributes: [],
        },
      ],
    });

    const answeredIds = answers.map((a) => a.questionnaireId);
    const missingRequired = requiredQuestions.filter(
      (q) => !answeredIds.includes(q.id),
    );

    // Save answers (potentially redundant if already exists, but simple for now)
    // Ideally we'd only insert new ones or use upsert
    const answerData = answers.map((a) => ({
      roomId: room.id,
      questionnaireId: a.questionnaireId,
      answer: typeof a.answer === "object" ? JSON.stringify(a.answer) : a.answer,
    }));

    for (const data of answerData) {
      await masterQuestionnaireAnswer.upsert(data);
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

      socketInstance.emitRoomStatusUpdate(roomId, "open", { doctorId });

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

      socketInstance.emitRoomStatusUpdate(roomId, "closed");

      return {
        status: true,
        message: "Berhasil menutup room konsultasi",
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
          },
          {
            model: masterProduct,
            as: 'product',
            include: [
              {
                model: masterProductImage,
                as: 'images',
                attributes: ['id', 'imageUrl']
              }
            ],
            attributes: ['id', 'name', 'price', 'discountPercent', 'description']
          },
          {
            model: masterLocation,
            as: 'location',
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

      // Check if questionnaire is completed (only count required questions)
      const requiredQuestions = await masterQuestionnaire.findAll({
        attributes: ["id"],
        include: [
          {
            model: masterConsultationCategory,
            as: "consultationCategories",
            where: { id: room.consultationCategoryId },
            through: { attributes: [] },
            attributes: [],
          },
        ],
        where: { isActive: true, isRequired: true },
      });

      const requiredQuestionIds = requiredQuestions.map((q) => q.id);
      const totalRequired = requiredQuestionIds.length;

      let isQuestionareCompleted = true;
      if (totalRequired > 0) {
        const totalAnswers = await masterQuestionnaireAnswer.count({
          where: {
            roomId: room.id,
            questionnaireId: { [Op.in]: requiredQuestionIds },
          },
        });
        isQuestionareCompleted = totalAnswers >= totalRequired;
      }

      return {
        status: true,
        message: "Success",
        data: {
          ...room.toJSON(),
          imageCount,
          isScanning,
          isQuestionareCompleted,
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

      if (files && files.length > 0) {
        const imageRecords = files.map((file) => ({
          messageId: newMessage.id,
          roomId: roomId,
          imageUrl: file.path,
        }));

        await masterConsultationImage.bulkCreate(imageRecords);

        messageContent = imageRecords.map((img) => img.imageUrl);
        newMessage.message = JSON.stringify(messageContent);
      }

      socketInstance.emitConsultationMessage(roomId, newMessage);

      // === PUSH NOTIFICATION ===
      try {
        const room = await masterRoomConsultation.findByPk(roomId, {
          attributes: ["id", "customerId", "doctorId"],
        });
        if (room) {
          // Determine recipient: if sender is customer → notify doctor, and vice versa
          const recipientId =
            senderRole === "customer" ? room.doctorId : room.customerId;
          const recipientType =
            senderRole === "customer" ? "user" : "customer";

          if (recipientId) {
            const notifBody =
              messageType === "image" ? "\uD83D\uDCF7 Mengirim gambar" : message;

            pushNotificationService.sendPushNotification(
              recipientId,
              recipientType,
              {
                title: "Pesan Baru - Konsultasi",
                body: notifBody || "Pesan baru",
                data: { roomId, type: "consultation_message" },
              }
            );
          }
        }
      } catch (pushErr) {
        // Push notification error should never break the chat flow
        console.error("[PushNotif] Error in addMessage:", pushErr.message);
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

      socketInstance.emitRoomStatusUpdate(roomId, "messages_read");

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

  async getAllReadyToAssign(userId, role, page = 1, pageSize = 10) {
    try {
      // Check if the doctor is available for consultation
      const doctor = await masterUser.findByPk(userId);
      if (!doctor || !doctor.isAvailableConsul) {
        return {
          status: true,
          message: "Dokter belum mengaktifkan status konsultasi",
          data: {
            totalItems: 0,
            totalPages: 0,
            currentPage: page,
            rows: [],
          },
        };
      }

      const offset = (page - 1) * pageSize;

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
          return {
            status: true,
            message: "Success",
            data: {
              totalItems: 0,
              totalPages: 0,
              currentPage: page,
              rows: [],
            },
          };
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

      const { count, rows } = await masterRoomConsultation.findAndCountAll({
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
          {
            model: masterProduct,
            as: 'product',
            attributes: ['id', 'name', 'price', 'discountPercent', 'description'],
            include: [
              {
                model: masterProductImage,
                as: 'images',
                attributes: ['imageUrl'],
                limit: 1
              }
            ]
          }
        ],
        order: [["createdAt", "ASC"]],
        limit: pageSize,
        offset,
        distinct: true,
      });

      return {
        status: true,
        message: "Success",
        data: {
          totalItems: count,
          totalPages: Math.ceil(count / pageSize),
          currentPage: page,
          rows,
        },
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async updateLocation(locationId, roomId) {
    try {
      const room = await masterRoomConsultation.findByPk(roomId);
      if (!room) {
        return { status: false, message: "Room not found", data: null };
      }
      room.locationId = locationId;
      await room.save();
      return { status: true, message: "Location updated successfully", data: room };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async updateLatLng(lat, lng, roomId) {
    try {
      const room = await masterRoomConsultation.findByPk(roomId);
      if (!room) {
        return { status: false, message: "Room not found", data: null };
      }
      room.latitude = lat;
      room.longitude = lng;
      await room.save();
      return { status: true, message: "LatLng updated successfully", data: room };
    } catch (error) {
      return { status: false, message: error.message, data: null };
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

      // validate refferenceId and refferenceType
      for (const prescription of data) {
        if (!prescription.refferenceType) {
          return {
            status: false,
            message: "Refference type tidak boleh kosong",
            data: null,
          };
        }
        if (!['product', 'package'].includes(prescription.refferenceType)) {
          return {
            status: false,
            message: "Refference type hanya boleh 'product' atau 'package'",
            data: null,
          };
        }
        if (!prescription.refferenceId) {
          return {
            status: false,
            message: "Refference ID tidak boleh kosong",
            data: null,
          };
        }
        if (prescription.refferenceType === "product") {
          const product = await masterProduct.findByPk(prescription.refferenceId);
          if (!product) {
            return {
              status: false,
              message: "Product tidak ditemukan",
              data: null,
            };
          }
        }
        if (prescription.refferenceType === "package") {
          const pkg = await masterPackage.findByPk(prescription.refferenceId);
          if (!pkg) {
            return {
              status: false,
              message: "Package tidak ditemukan",
              data: null,
            };
          }
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
            attributes: ["id", "name", "description", "price", "discountPercent", "weightGram", "locationId"],
            required: false,
            include: [
              {
                model: masterProductImage,
                as: "images",
                attributes: ["imageUrl"],
              },
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "cityId", "districtId"],
              },
            ],
          },
          {
            model: masterPackage,
            as: "package",
            attributes: ["id", "name", "description", "price", "discountPercent", "locationId"],
            required: false,
            include: [
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "cityId", "districtId"],
                include: [
                  {
                    model: masterLocationImage,
                    as: "images",
                    attributes: ["imageUrl"],
                  },
                ],
              },
              {
                model: masterPackageItems,
                as: "items",
                attributes: ["id", "qty"],
                include: [
                  {
                    model: masterService,
                    as: "service",
                    attributes: ["id", "name", "description", "duration", "price"],
                  },
                ],
              },
            ],
          },
        ],
        order: [["createdAt", "ASC"]],
      });

      // Map to unified prescription object
      const formattedPrescriptions = prescriptions.map((prescription) => {
        const prescriptionJson = prescription.toJSON();

        let prescriptionData = null;
        let media = null;
        let location = null;

        if (prescriptionJson.refferenceType === "product" && prescriptionJson.product) {
          const prod = prescriptionJson.product;
          const price = parseFloat(prod.price) || 0;
          const discountPercent = parseFloat(prod.discountPercent) || 0;
          const discountPrice = price - (price * discountPercent) / 100;

          prescriptionData = {
            id: prod.id,
            name: prod.name,
            description: prod.description,
            price: price,
            discountPrice: discountPrice,
            discountPercent: discountPercent,
            weight: prod.weightGram,
          };

          if (prod.images && prod.images.length > 0) {
            media = prod.images[0];
          }

          if (prod.location) {
            location = {
              locationId: prod.location.id,
              locationName: prod.location.name,
              cityId: prod.location.cityId,
              districtId: prod.location.districtId,
            };
          }
        } else if (prescriptionJson.refferenceType === "package" && prescriptionJson.package) {
          const pkg = prescriptionJson.package;
          const price = parseFloat(pkg.price) || 0;
          const discountPercent = parseFloat(pkg.discountPercent) || 0;
          const discountPrice = price - (price * discountPercent) / 100;

          // Format items: setiap item berisi data service + qty
          const items = (pkg.items || []).map((item) => ({
            id: item.id,
            qty: item.qty,
            service: item.service || null,
          }));

          prescriptionData = {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            price: price,
            discountPrice: discountPrice,
            discountPercent: discountPercent,
            items,
          };

          if (pkg.location) {
            location = {
              locationId: pkg.location.id,
              locationName: pkg.location.name,
              cityId: pkg.location.cityId,
              districtId: pkg.location.districtId,
            };

            if (pkg.location.images && pkg.location.images.length > 0) {
              media = pkg.location.images[0];
            }
          }
        }

        if (prescriptionData) {
          prescriptionData.media = media;
          prescriptionData.location = location;
        }

        // Bersihkan field mentah dari response
        delete prescriptionJson.product;
        delete prescriptionJson.package;
        delete prescriptionJson.refferenceId;
        delete prescriptionJson.createdAt;
        delete prescriptionJson.updatedAt;

        return {
          ...prescriptionJson,
          prescription: prescriptionData,
        };
      });

      return { status: true, message: "Berhasil", data: formattedPrescriptions };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getAllPrescriptionByOutlet(roomId, filters = {}) {
    try {
      const {
        search,
        productCategoryId,
        packageCategoryId,
      } = filters;

      // Get the room to extract locationId or latitude/longitude
      const room = await masterRoomConsultation.findOne({
        where: { id: roomId },
        attributes: ["id", "locationId", "latitude", "longitude", "consultationCategoryId"],
      });

      if (!room) {
        return { status: false, message: "Room tidak ditemukan", data: null };
      }

      if (!room.locationId) {
        // If no locationId, try to find nearest locations using latitude/longitude
        if (!room.latitude || !room.longitude) {
          return { status: false, message: "Room tidak memiliki locationId / latitude longitude", data: null };
        }

        const latitude = room.latitude;
        const longitude = room.longitude;

        // Find nearest locations by latitude and longitude (distance in meters)
        const distanceLiteral = Sequelize.literal(`
          (6371 * acos(
            cos(radians(${latitude})) *
            cos(radians(CAST(latitude AS FLOAT))) *
            cos(radians(CAST(longitude AS FLOAT)) - radians(${longitude})) +
            sin(radians(${latitude})) *
            sin(radians(CAST(latitude AS FLOAT)))
          )) * 1000.0
        `);

        const nearestLocations = await masterLocation.findAll({
          attributes: [
            "id",
            "name",
            [distanceLiteral, "distance"]
          ],
          where: {
            latitude: { [Op.ne]: null },
            longitude: { [Op.ne]: null }
          },
          order: [[distanceLiteral, "ASC"]],
          limit: 10, // Get 10 nearest locations
        });

        const locationIds = nearestLocations.map((location) => location.id);

        if (locationIds.length === 0) {
          return {
            status: true,
            message: "Tidak ada lokasi terdekat ditemukan",
            data: []
          };
        }

        const productInclude = [
          {
            model: masterProductImage,
            as: "images",
            attributes: ["imageUrl"],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "cityId", "districtId"],
          },
        ];

        // Filter product berdasarkan consultationCategoryId dari room
        if (room.consultationCategoryId) {
          productInclude.push({
            model: masterConsultationCategory,
            as: "consultationCategories",
            where: { id: room.consultationCategoryId },
            attributes: [],
            through: { attributes: [] },
            required: true,
          });
        }

        if (productCategoryId) {
          const productCategoryIds = Array.isArray(productCategoryId) ? productCategoryId : [productCategoryId];
          productInclude.push({
            model: masterProductCategory,
            as: "categories",
            where: { id: { [Op.in]: productCategoryIds } },
            attributes: [],
            through: { attributes: [] },
            required: true,
          });
        }

        const packageInclude = [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "cityId", "districtId"],
            include: [
              {
                model: masterLocationImage,
                as: "images",
                attributes: ["imageUrl"],
              },
            ],
          },
          {
            model: masterPackageItems,
            as: "items",
            attributes: ["id", "qty"],
            required: !!packageCategoryId,
            include: [
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "description", "duration", "price"],
                required: !!packageCategoryId,
                include: packageCategoryId
                  ? [
                    {
                      model: masterSubCategoryService,
                      as: "categories",
                      where: { id: { [Op.in]: Array.isArray(packageCategoryId) ? packageCategoryId : [packageCategoryId] } },
                      attributes: [],
                      through: { attributes: [] },
                      required: true,
                    },
                  ]
                  : [],
              },
            ],
          },
        ];

        // Filter package berdasarkan consultationCategoryId dari room
        if (room.consultationCategoryId) {
          packageInclude.push({
            model: masterConsultationCategory,
            as: "consultationCategories",
            where: { id: room.consultationCategoryId },
            attributes: [],
            through: { attributes: [] },
            required: true,
          });
        }

        const productWhere = { locationId: locationIds };
        if (search) {
          productWhere.name = { [Op.like]: `%${search}%` };
        }

        const packageWhere = { locationId: locationIds };
        if (search) {
          packageWhere.name = { [Op.like]: `%${search}%` };
        }

        const [productPrescription, packagePrescription] = await Promise.all([
          masterProduct.findAll({
            where: productWhere,
            attributes: [
              "id",
              "name",
              "description",
              "price",
              "discountPercent",
              "weightGram",
              "locationId",
            ],
            include: productInclude,
          }),
          masterPackage.findAll({
            where: packageWhere,
            attributes: [
              "id",
              "name",
              "description",
              "price",
              "discountPercent",
              "locationId",
            ],
            include: packageInclude,
          }),
        ]);

        // Group by nearest locations
        const prescriptionsByOutlet = nearestLocations.map((loc) => {
          const locJson = loc.toJSON();
          const locId = locJson.id;

          const formattedProducts = productPrescription
            .filter((p) => p.locationId === locId)
            .map((product) => {
              const productJson = product.toJSON();
              const price = parseFloat(productJson.price) || 0;
              const discountPercent = parseFloat(productJson.discountPercent) || 0;
              const discountPrice = price - (price * discountPercent) / 100;

              let media = null;
              if (productJson.images && productJson.images.length > 0) {
                media = productJson.images[0];
              }

              let location = null;
              if (productJson.location) {
                location = {
                  locationId: productJson.location.id,
                  locationName: productJson.location.name,
                  cityId: productJson.location.cityId,
                  districtId: productJson.location.districtId,
                };
              }

              return {
                id: productJson.id,
                name: productJson.name,
                description: productJson.description,
                price: price,
                discountPrice: discountPrice,
                discountPercent: discountPercent,
                weight: productJson.weightGram,
                media,
                location,
              };
            });

          const formattedPackages = packagePrescription
            .filter((pkg) => pkg.locationId === locId)
            .map((pkg) => {
              const pkgJson = pkg.toJSON();
              const price = parseFloat(pkgJson.price) || 0;
              const discountPercent = parseFloat(pkgJson.discountPercent) || 0;
              const discountPrice = price - (price * discountPercent) / 100;

              const items = (pkgJson.items || []).map((item) => ({
                id: item.id,
                qty: item.qty,
                service: item.service || null,
              }));

              let media = null;
              let location = null;
              if (pkgJson.location) {
                location = {
                  locationId: pkgJson.location.id,
                  locationName: pkgJson.location.name,
                  cityId: pkgJson.location.cityId,
                  districtId: pkgJson.location.districtId,
                };

                if (pkgJson.location.images && pkgJson.location.images.length > 0) {
                  media = pkgJson.location.images[0];
                }
              }

              return {
                id: pkgJson.id,
                name: pkgJson.name,
                description: pkgJson.description,
                price: price,
                discountPrice: discountPrice,
                discountPercent: discountPercent,
                items,
                media,
                location,
              };
            });

          return {
            locationId: locId,
            locationName: locJson.name,
            distance: Math.round(parseFloat(locJson.distance) || 0),
            product: formattedProducts,
            package: formattedPackages,
          };
        });

        // Optional: filter out outlets that have neither products nor packages
        const filteredResult = prescriptionsByOutlet.filter(
          (item) => item.product.length > 0 || item.package.length > 0
        );

        return { status: true, message: "Berhasil", data: filteredResult };
      }
      else {
        const productInclude = [
          {
            model: masterProductImage,
            as: "images",
            attributes: ["imageUrl"],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "cityId", "districtId"],
          },
        ];

        // Filter product berdasarkan consultationCategoryId dari room
        if (room.consultationCategoryId) {
          productInclude.push({
            model: masterConsultationCategory,
            as: "consultationCategories",
            where: { id: room.consultationCategoryId },
            attributes: [],
            through: { attributes: [] },
            required: true,
          });
        }

        if (productCategoryId) {
          const productCategoryIds = Array.isArray(productCategoryId) ? productCategoryId : [productCategoryId];
          productInclude.push({
            model: masterProductCategory,
            as: "categories",
            where: { id: { [Op.in]: productCategoryIds } },
            attributes: [],
            through: { attributes: [] },
            required: true,
          });
        }

        const packageInclude = [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "cityId", "districtId"],
            include: [
              {
                model: masterLocationImage,
                as: "images",
                attributes: ["imageUrl"],
              },
            ],
          },
          {
            model: masterPackageItems,
            as: "items",
            attributes: ["id", "qty"],
            required: !!packageCategoryId,
            include: [
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "description", "duration", "price"],
                required: !!packageCategoryId,
                include: packageCategoryId
                  ? [
                    {
                      model: masterSubCategoryService,
                      as: "categories",
                      where: { id: { [Op.in]: Array.isArray(packageCategoryId) ? packageCategoryId : [packageCategoryId] } },
                      attributes: [],
                      through: { attributes: [] },
                      required: true,
                    },
                  ]
                  : [],
              },
            ],
          },
        ];

        // Filter package berdasarkan consultationCategoryId dari room
        if (room.consultationCategoryId) {
          packageInclude.push({
            model: masterConsultationCategory,
            as: "consultationCategories",
            where: { id: room.consultationCategoryId },
            attributes: [],
            through: { attributes: [] },
            required: true,
          });
        }

        const productWhere = { locationId: room.locationId };
        if (search) {
          productWhere.name = { [Op.like]: `%${search}%` };
        }

        const packageWhere = { locationId: room.locationId };
        if (search) {
          packageWhere.name = { [Op.like]: `%${search}%` };
        }

        // Fetch products and packages with the same locationId
        const [productPrescription, packagePrescription] = await Promise.all([
          masterProduct.findAll({
            where: productWhere,
            attributes: [
              "id",
              "name",
              "description",
              "price",
              "discountPercent",
              "weightGram",
              "locationId",
            ],
            include: productInclude,
          }),
          masterPackage.findAll({
            where: packageWhere,
            attributes: [
              "id",
              "name",
              "description",
              "price",
              "discountPercent",
              "locationId",
            ],
            include: packageInclude,
          }),
        ]);

        // Format the response to include media property
        const formattedProducts = productPrescription.map((product) => {
          const productJson = product.toJSON();
          const price = parseFloat(productJson.price) || 0;
          const discountPercent = parseFloat(productJson.discountPercent) || 0;
          const discountPrice = price - (price * discountPercent) / 100;

          let media = null;
          if (productJson.images && productJson.images.length > 0) {
            media = productJson.images[0];
          }

          let location = null;
          if (productJson.location) {
            location = {
              locationId: productJson.location.id,
              locationName: productJson.location.name,
              cityId: productJson.location.cityId,
              districtId: productJson.location.districtId,
            };
          }

          return {
            id: productJson.id,
            name: productJson.name,
            description: productJson.description,
            price: price,
            discountPrice: discountPrice,
            discountPercent: discountPercent,
            weight: productJson.weightGram,
            media,
            location,
          };
        });

        const formattedPackages = packagePrescription.map((pkg) => {
          const pkgJson = pkg.toJSON();
          const price = parseFloat(pkgJson.price) || 0;
          const discountPercent = parseFloat(pkgJson.discountPercent) || 0;
          const discountPrice = price - (price * discountPercent) / 100;

          const items = (pkgJson.items || []).map((item) => ({
            id: item.id,
            qty: item.qty,
            service: item.service || null,
          }));

          let media = null;
          let location = null;
          if (pkgJson.location) {
            location = {
              locationId: pkgJson.location.id,
              locationName: pkgJson.location.name,
              cityId: pkgJson.location.cityId,
              districtId: pkgJson.location.districtId,
            };

            if (pkgJson.location.images && pkgJson.location.images.length > 0) {
              media = pkgJson.location.images[0];
            }
          }

          return {
            id: pkgJson.id,
            name: pkgJson.name,
            description: pkgJson.description,
            price: price,
            discountPrice: discountPrice,
            discountPercent: discountPercent,
            items,
            media,
            location,
          };
        });

        const prescriptions = {
          product: formattedProducts,
          package: formattedPackages,
        };

        return { status: true, message: "Berhasil", data: prescriptions };
      }

    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async addRecommendation(roomId, data) {
    try {
      const { notes, productCategoryIds, packageCategoryIds } = data;

      if (!roomId) return { status: false, message: "Room ID tidak boleh kosong", data: null };
      if (!notes || notes.trim() === "") return { status: false, message: "Notes tidak boleh kosong", data: null };

      const room = await masterRoomConsultation.findByPk(roomId);
      if (!room) return { status: false, message: "Room tidak ditemukan", data: null };

      // Upsert recommendation
      let recommendation = await consultationRecommendation.findOne({ where: { roomId } });

      if (recommendation) {
        recommendation.notes = notes.trim();
        await recommendation.save();
      } else {
        recommendation = await consultationRecommendation.create({
          roomId,
          notes: notes.trim(),
        });
      }

      // Update categories (handle shared pivot table manually)
      const rawProductCategoryIds = [...new Set((productCategoryIds || []).filter(id => id && id.length > 0))];
      const rawPackageCategoryIds = [...new Set((packageCategoryIds || []).filter(id => id && id.length > 0))];

      // Verify IDs exist to avoid FK errors
      const validProductCategoryIds = [];
      if (rawProductCategoryIds.length > 0) {
        const existing = await masterProductCategory.findAll({
          where: { id: { [Op.in]: rawProductCategoryIds } },
          attributes: ["id"],
        });
        
        if (existing.length !== rawProductCategoryIds.length) {
          return { status: false, message: "Satu atau lebih kategori produk tidak ditemukan", data: null };
        }
        
        existing.forEach((cat) => validProductCategoryIds.push(cat.id));
      }

      const validPackageCategoryIds = [];
      if (rawPackageCategoryIds.length > 0) {
        const existing = await masterSubCategoryService.findAll({
          where: { id: { [Op.in]: rawPackageCategoryIds } },
          attributes: ["id"],
        });

        if (existing.length !== rawPackageCategoryIds.length) {
          return { status: false, message: "Satu atau lebih kategori paket tidak ditemukan", data: null };
        }

        existing.forEach((cat) => validPackageCategoryIds.push(cat.id));
      }

      // We manage the pivot table manually because sharing one pivot table for two distinct 
      // belongsToMany associations can cause Sequelize's set... methods to overwrite each other.
      await consultationRecommendationCategory.destroy({ where: { recommendationId: recommendation.id } });

      const pivotData = [];
      validProductCategoryIds.forEach(id => {
        pivotData.push({ recommendationId: recommendation.id, productCategoryId: id });
      });
      validPackageCategoryIds.forEach(id => {
        pivotData.push({ recommendationId: recommendation.id, packageCategoryId: id });
      });

      if (pivotData.length > 0) {
        await consultationRecommendationCategory.bulkCreate(pivotData);
      }

      const result = await consultationRecommendation.findByPk(recommendation.id, {
        include: [
          { model: masterProductCategory, as: "productCategories", attributes: ["id", "name"], through: { attributes: [] } },
          { model: masterSubCategoryService, as: "packageCategories", attributes: ["id", "name"], through: { attributes: [] } },
        ],
      });

      return { status: true, message: "Berhasil menyimpan rekomendasi", data: result };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getRecommendationDetail(roomId) {
    try {
      const recommendation = await consultationRecommendation.findOne({
        where: { roomId },
        include: [
          {
            model: masterProductCategory,
            as: "productCategories",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
          {
            model: masterSubCategoryService,
            as: "packageCategories",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
        ],
      });

      if (!recommendation) {
        return { status: false, message: "Rekomendasi tidak ditemukan", data: null };
      }

      return {
        status: true,
        message: "Berhasil",
        data: {
          recommendation: {
            ...recommendation.get({ plain: true }),
            serviceCategories: recommendation.packageCategories || [],
          },
        },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getRecommendations(roomId) {
    try {
      const room = await masterRoomConsultation.findOne({
        where: { id: roomId },
        attributes: ["id", "locationId", "latitude", "longitude"],
      });

      if (!room) {
        return { status: false, message: "Room tidak ditemukan", data: null };
      }

      const roomData = room.toJSON();

      // Fetch the single recommendation for this room
      const recommendation = await consultationRecommendation.findOne({
        where: { roomId },
        include: [
          {
            model: masterProductCategory,
            as: "productCategories",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
          {
            model: masterSubCategoryService,
            as: "packageCategories",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
        ],
      });

      if (!recommendation) {
        return {
          status: true,
          message: "Belum ada rekomendasi",
          data: {
            room: roomData,
            recommendation: null,
            outlets: [],
          },
        };
      }

      const recJson = recommendation.toJSON();
      const allProductCategoryIds = recJson.productCategories.map((cat) => cat.id);
      const allPackageCategoryIds = recJson.packageCategories.map((cat) => cat.id);

      if (allProductCategoryIds.length === 0 && allPackageCategoryIds.length === 0) {
        return {
          status: true,
          message: "Berhasil",
          data: {
            room: roomData,
            recommendation: recJson,
            outlets: [],
          },
        };
      }

      // Determine customer location
      let latitude = room.latitude;
      let longitude = room.longitude;
      let isLocationAvailable = !!(latitude && longitude);
      let nearestLocations = [];

      if (isLocationAvailable) {
        const distanceLiteral = Sequelize.literal(`
          (6371 * acos(
            cos(radians(${parseFloat(latitude)})) *
            cos(radians(CAST(latitude AS FLOAT))) *
            cos(radians(CAST(longitude AS FLOAT)) - radians(${parseFloat(longitude)})) +
            sin(radians(${parseFloat(latitude)})) *
            sin(radians(CAST(latitude AS FLOAT)))
          )) * 1000.0
        `);

        nearestLocations = await masterLocation.findAll({
          attributes: ["id", "name", [distanceLiteral, "distance"]],
          where: {
            latitude: { [Op.ne]: null },
            longitude: { [Op.ne]: null },
          },
          order: [[distanceLiteral, "ASC"]],
          limit: 10,
        });
      } else if (room.locationId) {
        const fallbackOutlet = await masterLocation.findByPk(room.locationId, {
          attributes: ["id", "name"],
        });
        if (fallbackOutlet) {
          const outletJson = fallbackOutlet.toJSON();
          outletJson.distance = 0;
          nearestLocations = [outletJson];
        }
      }

      const locationIds = nearestLocations.map((loc) => loc.id);

      if (locationIds.length === 0) {
        return {
          status: true,
          message: isLocationAvailable
            ? "Berhasil (tidak ada outlet terdekat)"
            : "Berhasil (lokasi customer & outlet room tidak tersedia)",
          data: {
            room: roomData,
            recommendation: recJson,
            outlets: [],
          },
        };
      }

      // Query preparations
      const productIncludeList = [
        { model: masterProductImage, as: "images", attributes: ["imageUrl"] },
        {
          model: masterProductCategory,
          as: "categories",
          where: { id: { [Op.in]: allProductCategoryIds } },
          attributes: ["id", "name"],
          through: { attributes: [] },
          required: true,
        },
        {
          model: masterLocation,
          as: "locations",
          attributes: ["id"],
          through: { attributes: [] },
          required: true,
          where: { id: { [Op.in]: locationIds } }
        }
      ];

      const packageIncludeList = [
        {
          model: masterPackageItems,
          as: "items",
          attributes: ["id", "qty"],
          include: [
            {
              model: masterService,
              as: "service",
              attributes: ["id", "name", "description", "duration", "price"],
              include: [
                {
                  model: masterSubCategoryService,
                  as: "categories",
                  where: { id: { [Op.in]: allPackageCategoryIds } },
                  attributes: ["id", "name"],
                  through: { attributes: [] },
                  required: true,
                }
              ],
            },
          ],
        },
        {
          model: masterLocation,
          as: "locations",
          attributes: ["id"],
          include: [{ model: masterLocationImage, as: "images", attributes: ["imageUrl"] }],
          through: { attributes: [] },
          required: true,
          where: { id: { [Op.in]: locationIds } }
        }
      ];

      const serviceIncludeList = [
        {
          model: masterSubCategoryService,
          as: "categories",
          where: { id: { [Op.in]: allPackageCategoryIds } },
          attributes: ["id", "name"],
          through: { attributes: [] },
          required: true,
        },
        {
          model: masterLocation,
          as: "locations",
          attributes: ["id"],
          through: { attributes: [] },
          required: true,
          where: { id: { [Op.in]: locationIds } },
        },
      ];

      const [products, packages, services] = await Promise.all([
        allProductCategoryIds.length > 0 ? masterProduct.findAll({
          attributes: ["id", "name", "description", "price", "discountPercent", "weightGram"],
          include: productIncludeList,
        }) : Promise.resolve([]),
        allPackageCategoryIds.length > 0 ? masterPackage.findAll({
          attributes: ["id", "name", "description", "price", "discountPercent"],
          include: packageIncludeList,
        }) : Promise.resolve([]),
        allPackageCategoryIds.length > 0 ? masterService.findAll({
          attributes: ["id", "name", "description", "price", "duration", "discountPercent"],
          include: serviceIncludeList,
        }) : Promise.resolve([]),
      ]);

      const outlets = nearestLocations.map((loc) => {
        const locJson = loc instanceof Model ? loc.toJSON() : loc;
        const locId = locJson.id;
        const radius = Math.round(parseFloat(locJson.distance) || 0);

        // Products grouping
        const outletProducts = products.filter((p) => {
          const pj = p.get({ plain: true });
          return pj.locations && pj.locations.some(l => l.id === locId);
        });
        const productCategories = [];
        const productCatsMap = {};

        outletProducts.forEach((p) => {
          const pj = p.toJSON();
          const price = parseFloat(pj.price) || 0;
          const discountPercent = parseFloat(pj.discountPercent) || 0;
          const discountPrice = price - (price * discountPercent) / 100;
          const media = pj.images && pj.images.length > 0 ? pj.images[0] : null;

          const productData = { id: pj.id, name: pj.name, description: pj.description, price, discountPrice, discountPercent, weight: pj.weightGram, media };

          pj.categories.forEach((cat) => {
            if (!productCatsMap[cat.id]) {
              productCatsMap[cat.id] = { id: cat.id, name: cat.name, products: [] };
              productCategories.push(productCatsMap[cat.id]);
            }
            productCatsMap[cat.id].products.push(productData);
          });
        });

        // Packages grouping
        const outletPackages = packages.filter((pkg) => {
          const pkgJ = pkg.get({ plain: true });
          return pkgJ.locations && pkgJ.locations.some(l => l.id === locId);
        });
        const packageCategories = [];
        const packageCatsMap = {};

        outletPackages.forEach((pkg) => {
          const pkgJson = pkg.toJSON();
          const price = parseFloat(pkgJson.price) || 0;
          const discountPercent = parseFloat(pkgJson.discountPercent) || 0;
          const discountPrice = price - (price * discountPercent) / 100;
          const firstLocation = pkgJson.locations && pkgJson.locations.length > 0 ? pkgJson.locations[0] : null;
          const media = firstLocation && firstLocation.images && firstLocation.images.length > 0 ? firstLocation.images[0] : null;

          const servicesInPkg = (pkgJson.items || []).map((item) => ({
            id: item.id,
            qty: item.qty,
            service: item.service || null,
          }));

          const packageData = { id: pkgJson.id, name: pkgJson.name, description: pkgJson.description, price, discountPrice, discountPercent, services: servicesInPkg, media };

          const uniqueCatsInPkg = {};
          (pkgJson.items || []).forEach(item => {
            if (item.service && item.service.categories) {
              item.service.categories.forEach(cat => { uniqueCatsInPkg[cat.id] = cat; });
            }
          });

          Object.values(uniqueCatsInPkg).forEach(cat => {
            if (!packageCatsMap[cat.id]) {
              packageCatsMap[cat.id] = { id: cat.id, name: cat.name, packages: [] };
              packageCategories.push(packageCatsMap[cat.id]);
            }
            packageCatsMap[cat.id].packages.push(packageData);
          });
        });

        // Standalone Services grouping
        const outletServices = services.filter((s) => {
          const sj = s.get({ plain: true });
          return sj.locations && sj.locations.some(l => l.id === locId);
        });
        const standaloneServiceCategories = [];
        const serviceCatsMap = {};

        outletServices.forEach((s) => {
          const sj = s.toJSON();
          const price = parseFloat(sj.price) || 0;
          const discountPercent = parseFloat(sj.discountPercent) || 0;
          const discountPrice = price - (price * discountPercent) / 100;

          const serviceData = { id: sj.id, name: sj.name, description: sj.description, price, discountPrice, discountPercent, duration: sj.duration };

          sj.categories.forEach((cat) => {
            if (!serviceCatsMap[cat.id]) {
              serviceCatsMap[cat.id] = { id: cat.id, name: cat.name, services: [] };
              standaloneServiceCategories.push(serviceCatsMap[cat.id]);
            }
            serviceCatsMap[cat.id].services.push(serviceData);
          });
        });

        return {
          locationId: locId,
          locationName: locJson.name,
          radius,
          productCategories,
          packageCategories,
          serviceCategories: standaloneServiceCategories,
        };
      });

      const filteredOutlets = outlets.filter((o) => o.productCategories.length > 0 || o.packageCategories.length > 0 || o.serviceCategories.length > 0);

      return {
        status: true,
        message: "Berhasil",
        data: {
          room: roomData,
          recommendation: {
            ...recJson,
            serviceCategories: recJson.packageCategories || [],
          },
          outlets: filteredOutlets,
        },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async deletePrescriptionsByRoomId(roomId) {
    try {
      const result = await masterConsultationPrescription.destroy({ where: { roomId } });
      console.log(result);
      return { status: true, message: "Berhasil", data: result };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async deletePrescription(id) {
    try {
      const result = await masterConsultationPrescription.destroy({ where: { id } });
      console.log(result);
      return { status: true, message: "Berhasil", data: result };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
