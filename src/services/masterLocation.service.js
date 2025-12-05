const {
  masterLocation,
  masterCompany,
  masterUser,
  masterLocationImage,
  relationshipUserLocation,
  LocationVerificationRequest,
} = require("../models");

const fs = require("fs");
const path = require("path");

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
      console.error("Detail error:", error);
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
    const locations = await masterLocation.findAll({
      where: { companyId },
      order: [["createdAt", "DESC"]],
    });
    return locations;
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

  async getLocationByUserId(userId) {
    const data = await relationshipUserLocation.findOne({
      where: { userId },
      include: [
        {
          model: masterLocation,
          as: "location",
        },
      ],
    });
    return data?.location || null;
  }
}

module.exports = new MasterLocationService();
