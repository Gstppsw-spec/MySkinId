const {
  masterRoomConsultation,
  masterConsultationImage,
  masterConsultationCategory,
  masterConsultationMessage,
  masterConsultationPrescription,
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
  masterCity
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
          },
          {
            model: masterLocation,
            as: 'location',
            attributes: ['id', 'name']
          }
        ],
      });

      // Untuk room yang locationId = null tapi punya lat/long,
      // cari location terdekat dan isi field location
      const enrichedRooms = await Promise.all(rooms.map(async (room) => {
        const roomJson = room.toJSON();

        if (!roomJson.locationId && roomJson.latitude != null && roomJson.longitude != null) {
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
            attributes: ['id', 'name', [distanceLiteral, 'distance']],
            where: {
              latitude: { [Op.ne]: null },
              longitude: { [Op.ne]: null },
            },
            order: [[distanceLiteral, 'ASC']],
          });

          roomJson.location = nearestLocation
            ? { id: nearestLocation.id, name: nearestLocation.name }
            : null;
        }

        return roomJson;
      }));

      return { status: true, message: "Success", data: enrichedRooms };
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

  async updateLocation(cityId, roomId) {
    try {
      const room = await masterRoomConsultation.findByPk(roomId);
      if (!room) {
        return { status: false, message: "Room not found", data: null };
      }
      const city = await masterCity.findByPk(cityId);
      if (!city) {
        return { status: false, message: "City not found", data: null };
      }
      const latitude = city.latitude;
      const longitude = city.longitude;
      room.latitude = latitude;
      room.longitude = longitude;
      await room.save();
      return { status: true, message: "Location updated successfully", data: room };
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
            attributes: ["id", "name", "description"],
            required: false,
            include: [
              {
                model: masterProductImage,
                as: "images",
                attributes: ["imageUrl"]
              }
            ]
          },
          {
            model: masterPackage,
            as: "package",
            attributes: ["id", "name", "description"],
            required: false,
            include: [
              {
                model: masterLocation,
                as: "location",
                attributes: ["id"],
                include: [
                  {
                    model: masterLocationImage,
                    as: "images",
                    attributes: ["imageUrl"]
                  }
                ]
              },
              {
                model: masterPackageItems,
                as: "items",
                attributes: ["id", "qty"],
                include: [
                  {
                    model: masterService,
                    as: "service",
                    attributes: ["id", "name", "description", "duration", "price"]
                  }
                ]
              }
            ]
          }
        ],
        order: [["createdAt", "ASC"]],
      });

      // Map to unified prescription object
      const formattedPrescriptions = prescriptions.map((prescription) => {
        const prescriptionJson = prescription.toJSON();

        let prescriptionData = null;
        let media = [];

        if (prescriptionJson.refferenceType === "product" && prescriptionJson.product) {
          prescriptionData = {
            id: prescriptionJson.product.id,
            name: prescriptionJson.product.name,
            description: prescriptionJson.product.description
          };
          media = prescriptionJson.product.images || [];
        } else if (prescriptionJson.refferenceType === "package" && prescriptionJson.package) {
          const pkg = prescriptionJson.package;
          // Format items: setiap item berisi data service + qty
          const items = (pkg.items || []).map((item) => ({
            id: item.id,
            qty: item.qty,
            service: item.service || null,
          }));
          // Ambil gambar dari location package
          if (pkg.location && pkg.location.images) {
            media = pkg.location.images;
          }
          prescriptionData = {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            items,
          };
        }

        if (prescriptionData) {
          prescriptionData.media = media;
        }

        // Bersihkan field mentah dari response
        delete prescriptionJson.product;
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

  async getAllPrescriptionByOutlet(roomId, categoryName) {
    try {
      // Get the room to extract locationId or latitude/longitude
      const room = await masterRoomConsultation.findOne({
        where: { id: roomId },
        attributes: ["id", "locationId", "latitude", "longitude"],
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

        // Find nearest locations by latitude and longitude
        const distanceLiteral = Sequelize.literal(`
          6371 * acos(
            cos(radians(${latitude})) *
            cos(radians(CAST(latitude AS FLOAT))) *
            cos(radians(CAST(longitude AS FLOAT)) - radians(${longitude})) +
            sin(radians(${latitude})) *
            sin(radians(CAST(latitude AS FLOAT)))
          )
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
            data: {
              product: [],
              package: []
            }
          };
        }

        const productInclude = [
          {
            model: masterProductImage,
            as: "images",
            attributes: ["imageUrl"]
          }
        ];

        if (categoryName) {
          productInclude.push({
            model: masterProductCategory,
            as: "categories",
            where: { name: { [Op.like]: `%${categoryName}%` } },
            attributes: [],
            through: { attributes: [] }
          });
        }

        const packageInclude = [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id"],
            include: [
              {
                model: masterLocationImage,
                as: "images",
                attributes: ["imageUrl"]
              }
            ]
          },
          {
            model: masterPackageItems,
            as: "items",
            attributes: ["id", "qty"],
            required: categoryName ? true : false,
            include: [
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "description", "duration", "price"],
                required: categoryName ? true : false,
                include: categoryName ? [
                  {
                    model: masterSubCategoryService,
                    as: "categories",
                    where: { name: { [Op.like]: `%${categoryName}%` } },
                    attributes: [],
                    through: { attributes: [] },
                    required: true
                  }
                ] : []
              }
            ]
          }
        ];

        const [productPrescription, packagePrescription] = await Promise.all([
          masterProduct.findAll({
            where: {
              locationId: locationIds,
            },
            attributes: ["id", "name", "description"],
            include: productInclude
          }),
          masterPackage.findAll({
            where: {
              locationId: locationIds,
            },
            attributes: ["id", "name", "description"],
            include: packageInclude
          }),
        ]);

        // Format the response to include media property
        const formattedProducts = productPrescription.map(product => {
          const productJson = product.toJSON();
          return {
            id: productJson.id,
            name: productJson.name,
            description: productJson.description,
            media: productJson.images || []
          };
        });

        const formattedPackages = packagePrescription.map(pkg => {
          const pkgJson = pkg.toJSON();
          const items = (pkgJson.items || []).map((item) => ({
            id: item.id,
            qty: item.qty,
            service: item.service || null,
          }));
          return {
            id: pkgJson.id,
            name: pkgJson.name,
            description: pkgJson.description,
            items,
            media: (pkgJson.location && pkgJson.location.images) ? pkgJson.location.images : []
          };
        });

        const prescriptions = {
          product: formattedProducts,
          package: formattedPackages,
        };

        return { status: true, message: "Berhasil", data: prescriptions };
      }
      else {
        const productInclude = [
          {
            model: masterProductImage,
            as: "images",
            attributes: ["imageUrl"]
          }
        ];

        if (categoryName) {
          productInclude.push({
            model: masterProductCategory,
            as: "categories",
            where: { name: { [Op.like]: `%${categoryName}%` } },
            attributes: [],
            through: { attributes: [] }
          });
        }

        const packageInclude = [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id"],
            include: [
              {
                model: masterLocationImage,
                as: "images",
                attributes: ["imageUrl"]
              }
            ]
          },
          {
            model: masterPackageItems,
            as: "items",
            attributes: ["id", "qty"],
            required: categoryName ? true : false,
            include: [
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "description", "duration", "price"],
                required: categoryName ? true : false,
                include: categoryName ? [
                  {
                    model: masterSubCategoryService,
                    as: "categories",
                    where: { name: { [Op.like]: `%${categoryName}%` } },
                    attributes: [],
                    through: { attributes: [] },
                    required: true
                  }
                ] : []
              }
            ]
          }
        ];

        // Fetch products and packages with the same locationId
        const [productPrescription, packagePrescription] = await Promise.all([
          masterProduct.findAll({
            where: {
              locationId: room.locationId,
            },
            attributes: ["id", "name", "description"],
            include: productInclude
          }),
          masterPackage.findAll({
            where: {
              locationId: room.locationId,
            },
            attributes: ["id", "name", "description"],
            include: packageInclude
          }),
        ]);

        // Format the response to include media property
        const formattedProducts = productPrescription.map(product => {
          const productJson = product.toJSON();
          return {
            id: productJson.id,
            name: productJson.name,
            description: productJson.description,
            media: productJson.images || []
          };
        });

        const formattedPackages = packagePrescription.map(pkg => {
          const pkgJson = pkg.toJSON();
          const items = (pkgJson.items || []).map((item) => ({
            id: item.id,
            qty: item.qty,
            service: item.service || null,
          }));
          return {
            id: pkgJson.id,
            name: pkgJson.name,
            description: pkgJson.description,
            items,
            media: (pkgJson.location && pkgJson.location.images) ? pkgJson.location.images : []
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
