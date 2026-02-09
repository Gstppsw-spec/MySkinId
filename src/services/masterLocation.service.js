const axios = require("axios");
const {
  masterLocation,
  masterCompany,
  masterUser,
  masterLocationImage,
  relationshipUserLocation,
  LocationVerificationRequest,
  customerFavorites,
  masterProvince,
  masterCity,
  masterDistrict,
} = require("../models");

const fs = require("fs");
const path = require("path");
const { Op, Sequelize } = require("sequelize");
const {
  fetchProvinces,
  fetchCities,
  fetchDistricts,
} = require("./rajaongkir.service");
const { sleep, retryRequest } = require("../helpers/request.helper");

class MasterLocationService {
  async create(data, files, userId) {
    try {
      const lastLocation = await masterLocation.findOne({
        order: [["createdAt", "DESC"]],
        attributes: ["code"],
      });

      let newCode = "OUTLET_00001";

      if (lastLocation && lastLocation.code) {
        const match = lastLocation.code.match(/OUTLET_(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1], 10);
          const nextNumber = lastNumber + 1;
          newCode = `OUTLET_${nextNumber.toString().padStart(5, "0")}`;
        }
      }

      const newLocation = await masterLocation.create({
        ...data,
        code: newCode,
        createdBy: userId,
        updatedBy: userId,
      });
      if (files && files.length > 0) {
        for (const file of files) {
          await masterLocationImage.create({
            locationId: newLocation.id,
            imageUrl: file.path,
          });
        }
      }

      return {
        status: true,
        message: "Location created successfully",
        data: newLocation,
      };
    } catch (error) {
      console.error("Create Location Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async update(id, data, files, userId) {
    try {
      const location = await masterLocation.findByPk(id);

      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }

      await location.update({
        ...data,
        updatedBy: userId,
      });
      if (files && files.length > 0) {
        for (const file of files) {
          await masterLocationImage.create({
            locationId: id,
            imageUrl: file.path,
          });
        }
      }

      return {
        status: true,
        message: "Location updated successfully",
        data: location,
      };
    } catch (error) {
      console.error("Update Location Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async updateStatus(id, isactive, userId) {
    try {
      const location = await masterLocation.findByPk(id);
      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }
      location.isactive = isactive;
      location.updatedBy = userId;
      await location.save();

      return {
        status: true,
        message: "Status updated successfully",
        data: location,
      };
    } catch (error) {
      console.error("Update status error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async detail(id) {
    try {
      const location = await masterLocation.findByPk(id, {
        include: [
          { model: masterCompany, as: "company" },
          { model: masterUser, as: "creator" },
          { model: masterUser, as: "updater" },
          { model: masterLocationImage, as: "images" },
          {
            model: LocationVerificationRequest,
            as: "verificationRequests",
            required: false,
            order: [["createdAt", "DESC"]],
            limit: 1,
          },
        ],
      });

      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }

      return { status: true, message: "Location found", data: location };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }

  async list() {
    try {
      const locations = await masterLocation.findAll({
        include: [
          { model: masterCompany, as: "company" },
          { model: masterUser, as: "creator" },
          { model: masterUser, as: "updater" },
          { model: masterLocationImage, as: "images" },
          {
            model: LocationVerificationRequest,
            as: "verificationRequests",
            required: false,
            order: [["createdAt", "DESC"]],
            limit: 1,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return { status: true, message: "Location list", data: locations };
    } catch (error) {
      console.error("List error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getByCompanyId(companyId) {
    try {
      if (!companyId) return { status: false, message: "Data tidak lengkap" };

      const locations = await masterLocation.findAll({
        where: { companyId },
        order: [["createdAt", "DESC"]],
      });

      if (!locations) {
        return {
          status: false,
          message: "Data outlet tidak ditemukan",
          data: null,
        };
      }

      return {
        status: true,
        message: "Success",
        data: locations,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  }

  async deleteImage(imageId) {
    try {
      const image = await masterLocationImage.findByPk(imageId);

      if (!image) {
        return { status: false, message: "Image not found", data: null };
      }
      if (image.imageUrl && fs.existsSync(image.imageUrl)) {
        fs.unlinkSync(image.imageUrl);
      }

      await image.destroy();

      return {
        status: true,
        message: "Image deleted successfully",
        data: { id: imageId },
      };
    } catch (error) {
      console.error("Delete Image Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getLocationByUser({ id: userId, roleCode, locationIds }) {
    try {
      if (roleCode === "SUPER_ADMIN") {
        const data = await masterLocation.findAll({
          include: [
            {
              model: masterLocationImage,
              as: "images",
            },
          ],
        });
        return {
          status: true,
          message: "Location fetched successfully",
          data: data,
        };
      }

      const data = await masterLocation.findAll({
        where: {
          id: {
            [Op.in]: locationIds,
          },
        },
        include: [
          {
            model: masterLocationImage,
            as: "images",
          },
        ],
      });

      return {
        status: true,
        message: "Location fetched successfully",
        data: data,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async detailLocationByCustomer(id, customerId = null) {
    try {
      const include = [{ model: masterLocationImage, as: "images" }];

      if (customerId) {
        include.push({
          model: customerFavorites,
          as: "favorites",
          attributes: ["id"],
          where: { customerId, favoriteType: "location" },
          required: false,
        });
      }

      const location = await masterLocation.findByPk(id, { include });

      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }

      const plain = location.get({ plain: true });

      return {
        status: true,
        message: "Location found",
        data: {
          ...plain,
          isFavorite: plain.favorites?.length > 0 || false,
          favorites: undefined,
        },
      };
    } catch (error) {
      console.error("Detail error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async listLocationByCustomer(customerId = null) {
    try {
      const include = [{ model: masterLocationImage, as: "images" }];

      if (customerId) {
        include.push({
          model: customerFavorites,
          as: "favorites",
          where: { customerId, favoriteType: "location" },
          required: false,
        });
      }

      const locations = await masterLocation.findAll({
        include,
        order: [["createdAt", "DESC"]],
      });

      if (!locations) {
        return { status: false, message: "Location not found", data: null };
      }

      const result = locations.map((loc) => {
        const plain = loc.get({ plain: true });

        return {
          ...plain,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          favorites: undefined,
        };
      });

      return { status: true, message: "Location list", data: result };
    } catch (error) {
      console.error("List error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getCityByLatitudeLongitude(latitude, longitude) {
    try {
      if (latitude == null || longitude == null) {
        return {
          status: false,
          message: "Latitude and Longitude are required",
        };
      }

      // pastikan angka (menghindari SQL injection + error query)
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const distanceLiteral = Sequelize.literal(`
        6371 * acos(
          cos(radians(${lat})) *
          cos(radians(CAST(masterCity.latitude AS FLOAT))) *
          cos(radians(CAST(masterCity.longitude AS FLOAT)) - radians(${lng})) +
          sin(radians(${lat})) *
          sin(radians(CAST(masterCity.latitude AS FLOAT)))
        )
      `);

      const city = await masterCity.findOne({
        attributes: {
          include: [[distanceLiteral, "distance"]],
        },
        include: [{ model: masterProvince, as: "province" }],
        order: [[distanceLiteral, "ASC"]],
        limit: 1,
      });

      if (!city) {
        return { status: false, message: "City not found in database" };
      }

      return {
        status: true,
        message: "City found",
        data: city,
      };
    } catch (error) {
      console.error("Get City By Coords Error:", error);
      return { status: false, message: error.message };
    }
  }

  async getDistrictByLatitudeLongitude(latitude, longitude) {
    try {
      // validasi: jangan pakai !latitude karena 0 dianggap false
      if (latitude == null || longitude == null) {
        return {
          status: false,
          message: "Latitude and Longitude are required",
        };
      }

      // pastikan angka (lebih aman)
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const distanceLiteral = Sequelize.literal(`
        6371 * acos(
          cos(radians(${lat})) *
          cos(radians(CAST(masterDistrict.latitude AS FLOAT))) *
          cos(radians(CAST(masterDistrict.longitude AS FLOAT)) - radians(${lng})) +
          sin(radians(${lat})) *
          sin(radians(CAST(masterDistrict.latitude AS FLOAT)))
        )
      `);

      const district = await masterDistrict.findOne({
        attributes: {
          include: [[distanceLiteral, "distance"]],
        },
        include: [{ model: masterCity, as: "city" }],
        order: [[distanceLiteral, "ASC"]],
        limit: 1,
      });

      if (!district) {
        return {
          status: false,
          message: "District not found in database",
        };
      }

      return {
        status: true,
        message: "District found",
        data: district,
      };
    } catch (error) {
      console.error("Get District By Coords Error:", error);
      return { status: false, message: error.message };
    }
  }

  async getCities() {
    try {
      const cities = await masterCity.findAll({
        attributes: ["id", "name"],
      });
      return {
        status: true,
        message: "Cities fetched successfully",
        data: cities,
      };
    } catch (error) {
      console.error("Get Cities Error:", error);
      return { status: false, message: error.message };
    }
  }

  async upsertProvince(data) {
    try {
      await masterProvince.upsert({
        id: data.id,
        name: data.name,
      });
    } catch (error) {
      console.error("Error upserting province:", error);
      throw error;
    }
  }

  async upsertCity(data, provinceId) {
    try {
      await masterCity.upsert({
        id: data.id,
        provinceId: provinceId,
        name: data.name,
      });
    } catch (error) {
      console.error("Error upserting city:", error);
      throw error;
    }
  }

  async upsertDistrict(data, cityId) {
    try {
      await masterDistrict.upsert({
        id: data.id,
        cityId: cityId,
        name: data.name,
      });
    } catch (error) {
      console.error("Error upserting district:", error);
      throw error;
    }
  }

  async syncRajaOngkir() {
    try {
      const provinces = await retryRequest(() => fetchProvinces());

      for (const p of provinces) {
        console.log("Sync province:", p.name);
        await this.upsertProvince(p);
        await sleep(5000);

        const cities = await retryRequest(() => fetchCities(p.id));
        for (const c of cities) {
          console.log("  Sync city:", c.name);
          await this.upsertCity(c, p.id);
          await sleep(5000);

          const districts = await retryRequest(() => fetchDistricts(c.id));
          for (const d of districts) {
            console.log("    Sync district:", d.name);
            await this.upsertDistrict(d, c.id);
          }

          await sleep(5000); // Respect rate limit
        }
      }

      return {
        status: true,
        message: "Sync province, city, district berhasil",
        data: null,
      };
    } catch (error) {
      console.error("Sync RajaOngkir Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async injectDataRegion() {
    return await this.syncRajaOngkir();
  }
}

module.exports = new MasterLocationService();
