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
const socketInstance = require("../socket/socketInstance");

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
      room.lat = lat;
      room.lng = lng;
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
            attributes: ["imageUrl"],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "cityId", "districtId"],
          },
        ];

        if (categoryName) {
          productInclude.push({
            model: masterProductCategory,
            as: "categories",
            where: { name: { [Op.like]: `%${categoryName}%` } },
            attributes: [],
            through: { attributes: [] },
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
            required: categoryName ? true : false,
            include: [
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "description", "duration", "price"],
                required: categoryName ? true : false,
                include: categoryName
                  ? [
                    {
                      model: masterSubCategoryService,
                      as: "categories",
                      where: { name: { [Op.like]: `%${categoryName}%` } },
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

        const [productPrescription, packagePrescription] = await Promise.all([
          masterProduct.findAll({
            where: {
              locationId: locationIds,
            },
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
            where: {
              locationId: locationIds,
            },
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

        if (categoryName) {
          productInclude.push({
            model: masterProductCategory,
            as: "categories",
            where: { name: { [Op.like]: `%${categoryName}%` } },
            attributes: [],
            through: { attributes: [] },
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
            required: categoryName ? true : false,
            include: [
              {
                model: masterService,
                as: "service",
                attributes: ["id", "name", "description", "duration", "price"],
                required: categoryName ? true : false,
                include: categoryName
                  ? [
                    {
                      model: masterSubCategoryService,
                      as: "categories",
                      where: { name: { [Op.like]: `%${categoryName}%` } },
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

        // Fetch products and packages with the same locationId
        const [productPrescription, packagePrescription] = await Promise.all([
          masterProduct.findAll({
            where: {
              locationId: room.locationId,
            },
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
            where: {
              locationId: room.locationId,
            },
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
