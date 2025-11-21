const { Op } = require("sequelize");
const sequelize = require("../../config/config");
const Mslocation = require("../models/locationModel");
const MsRole = require("../models/roleModel");
const MsServiceCategoryMapping = require("../models/serviceCategoryMappingModel");
const { MsService, MsServicePackageItem } = require("../models/serviceModel");
const MsServiceType = require("../models/serviceTypeModel");
const MsSubServiceCategory = require("../models/subCategoryServiceModel");
const MsUser = require("../models/userModel");

//PRODUK
exports.createServiceProduct = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const servicetype = await MsServiceType.findOne({
      where: { name: "Product" },
    });

    if (!servicetype) {
      return res
        .status(404)
        .json({ success: false, message: "Service type 'Product' not found" });
    }

    const { servicecategoryid, ...rest } = req.body;

    const newService = await MsService.create(
      {
        ...rest,
        servicetypeid: servicetype.id,
      },
      { transaction: t }
    );

    if (servicecategoryid && Array.isArray(servicecategoryid)) {
      const mappings = servicecategoryid.map((categoryId) => ({
        serviceid: newService.id,
        servicecategoryid: categoryId,
      }));

      await MsServiceCategoryMapping.bulkCreate(mappings, { transaction: t });
    }

    await t.commit();

    const result = await MsService.findByPk(newService.id, {
      include: [
        {
          model: MsSubServiceCategory,
          as: "servicecategories",
          attributes: ["id", "name"],
        },
      ],
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllServiceProduct = async (req, res) => {
  try {
    const service = await MsService.findAll({
      include: [{ model: Mslocation, as: "location" }],
    });

    res.json({ success: true, data: service });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch services" });
  }
};

exports.getAllServiceProductByUserId = async (req, res) => {
  const userId = req.headers.userid;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing user ID in request header",
    });
  }

  try {
    const user = await MsUser.findOne({
      where: { id: userId },
      include: [{ model: MsRole, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let whereCondition = {};

    if (user.role?.isSuperAdmin) {
      whereCondition = {};
    } else if (user.role?.isAdminCompany) {
      if (!user.companyid) {
        return res.status(400).json({
          success: false,
          message: "User has no company assigned",
        });
      }

      const locations = await Mslocation.findAll({
        attributes: ["id"],
        where: { companyid: user.companyid },
      });

      const locationIds = locations.map((loc) => loc.id);

      whereCondition = { locationid: locationIds };
    } else if (user.role?.isAdminOutlet) {
      if (!user.locationid) {
        return res.status(400).json({
          success: false,
          message: "User has no location assigned",
        });
      }
      whereCondition = { locationid: user.locationid };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const data = await MsService.findAll({
      where: whereCondition,
      include: [
        { model: Mslocation, as: "location" },
        { model: MsServiceType, as: "servicetype", where: { name: "Product" } },
        {
          model: MsSubServiceCategory,
          as: "servicecategories",
          through: { attributes: [] },
        },
      ],
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//TREATMENT
exports.createServiceTreatment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const servicetype = await MsServiceType.findOne({
      where: { name: "Treatment" },
    });

    if (!servicetype) {
      return res
        .status(404)
        .json({ success: false, message: "Service type 'Product' not found" });
    }

    const { servicecategoryid, ...rest } = req.body;

    const newService = await MsService.create(
      {
        ...rest,
        servicetypeid: servicetype.id,
      },
      { transaction: t }
    );

    if (servicecategoryid && Array.isArray(servicecategoryid)) {
      const mappings = servicecategoryid.map((categoryId) => ({
        serviceid: newService.id,
        servicecategoryid: categoryId,
      }));

      await MsServiceCategoryMapping.bulkCreate(mappings, { transaction: t });
    }

    await t.commit();

    const result = await MsService.findByPk(newService.id, {
      include: [
        {
          model: MsSubServiceCategory,
          as: "servicecategories",
          attributes: ["id", "name"],
        },
      ],
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllServiceTreatment = async (req, res) => {
  try {
    const service = await MsService.findAll({
      include: [{ model: Mslocation, as: "location" }],
    });

    res.json({ success: true, data: service });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch services" });
  }
};

exports.getAllServiceTreatmentByUserId = async (req, res) => {
  const userId = req.headers.userid;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing user ID in request header",
    });
  }

  try {
    const user = await MsUser.findOne({
      where: { id: userId },
      include: [{ model: MsRole, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let whereCondition = {};

    if (user.role?.isSuperAdmin) {
      whereCondition = {};
    } else if (user.role?.isAdminCompany) {
      if (!user.companyid) {
        return res.status(400).json({
          success: false,
          message: "User has no company assigned",
        });
      }

      const locations = await Mslocation.findAll({
        attributes: ["id"],
        where: { companyid: user.companyid },
      });

      const locationIds = locations.map((loc) => loc.id);

      whereCondition = { locationid: locationIds };
    } else if (user.role?.isAdminOutlet) {
      if (!user.locationid) {
        return res.status(400).json({
          success: false,
          message: "User has no location assigned",
        });
      }
      whereCondition = { locationid: user.locationid };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const data = await MsService.findAll({
      where: whereCondition,
      include: [
        { model: Mslocation, as: "location" },
        {
          model: MsServiceType,
          as: "servicetype",
          where: { name: "Treatment" },
        },
        {
          model: MsSubServiceCategory,
          as: "servicecategories",
          through: { attributes: [] },
        },
      ],
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//PACKAGE
exports.createServicePackage = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const servicetype = await MsServiceType.findOne({
      where: { name: "Package" },
    });

    if (!servicetype) {
      return res
        .status(404)
        .json({ success: false, message: "Service type 'Product' not found" });
    }

    const { servicecategoryid, ...rest } = req.body;

    const newService = await MsService.create(
      {
        ...rest,
        servicetypeid: servicetype.id,
      },
      { transaction: t }
    );

    if (servicecategoryid && Array.isArray(servicecategoryid)) {
      const mappings = servicecategoryid.map((categoryId) => ({
        serviceid: newService.id,
        servicecategoryid: categoryId,
      }));

      await MsServiceCategoryMapping.bulkCreate(mappings, { transaction: t });
    }

    await t.commit();

    const result = await MsService.findByPk(newService.id, {
      include: [
        {
          model: MsSubServiceCategory,
          as: "servicecategories",
          attributes: ["id", "name"],
        },
      ],
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllServicePackage = async (req, res) => {
  try {
    const service = await MsService.findAll({
      include: [{ model: Mslocation, as: "location" }],
    });

    res.json({ success: true, data: service });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch services" });
  }
};

exports.getAllServicePackageByUserId = async (req, res) => {
  const userId = req.headers.userid;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing user ID in request header",
    });
  }

  try {
    const user = await MsUser.findOne({
      where: { id: userId },
      include: [{ model: MsRole, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let whereCondition = {};

    if (user.role?.isSuperAdmin) {
      whereCondition = {};
    } else if (user.role?.isAdminCompany) {
      if (!user.companyid) {
        return res.status(400).json({
          success: false,
          message: "User has no company assigned",
        });
      }

      const locations = await Mslocation.findAll({
        attributes: ["id"],
        where: { companyid: user.companyid },
      });

      const locationIds = locations.map((loc) => loc.id);

      whereCondition = { locationid: locationIds };
    } else if (user.role?.isAdminOutlet) {
      if (!user.locationid) {
        return res.status(400).json({
          success: false,
          message: "User has no location assigned",
        });
      }
      whereCondition = { locationid: user.locationid };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const data = await MsService.findAll({
      where: whereCondition,
      include: [
        { model: Mslocation, as: "location" },
        { model: MsServiceType, as: "servicetype", where: { name: "Package" } },
        {
          model: MsSubServiceCategory,
          as: "servicecategories",
          through: { attributes: [] },
        },
        {
          model: MsServicePackageItem,
          as: "packageitems", // ambil item di dalam paket
          include: [
            {
              model: MsService,
              as: "serviceitem",
              attributes: ["id", "name", "normalprice", "finalprice"],
              include: [
                {
                  model: MsServiceType,
                  as: "servicetype"
                },
                {
                  model: MsSubServiceCategory,
                  as: "servicecategories",
                  through: { attributes: [] },
                },
              ],
            },
          ],
        },
      ],
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllServicesByUserId = async (req, res) => {
  const userId = req.headers.userid;

  console.log(userId, "userid");

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing user ID in request header",
    });
  }

  try {
    const user = await MsUser.findOne({
      where: { id: userId },
      include: [{ model: MsRole, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let whereCondition = {};

    if (user.role?.isSuperAdmin) {
      whereCondition = {};
    } else if (user.role?.isAdminCompany) {
      if (!user.companyid) {
        return res.status(400).json({
          success: false,
          message: "User has no company assigned",
        });
      }

      const locations = await Mslocation.findAll({
        attributes: ["id"],
        where: { companyid: user.companyid },
      });

      const locationIds = locations.map((loc) => loc.id);

      whereCondition = { locationid: locationIds };
    } else if (user.role?.isAdminOutlet) {
      if (!user.locationid) {
        return res.status(400).json({
          success: false,
          message: "User has no location assigned",
        });
      }
      whereCondition = { locationid: user.locationid };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const data = await MsService.findAll({
      where: whereCondition,
      include: [{ model: Mslocation, as: "location" }],
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await MsService.findByPk(id, {
      include: [{ model: Mslocation, as: "location" }],
    });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { servicecategoryid, ...serviceData } = req.body;

    const service = await MsService.findByPk(id);

    if (!service)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });

    // Update menggunakan instance
    await service.update(serviceData);

    // Update categories jika ada
    if (servicecategoryid && Array.isArray(servicecategoryid)) {
      await service.setServicecategories(servicecategoryid);
    }

    // Ambil data lengkap dengan relasi
    const data = await MsService.findByPk(id, {
      include: [
        {
          model: MsSubServiceCategory,
          as: "servicecategories",
          through: { attributes: [] },
        },
        { model: Mslocation, as: "location" },
        { model: MsServiceType, as: "servicetype" },
      ],
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MsService.destroy({ where: { id } });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    res
      .status(200)
      .json({ success: true, message: "Service deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE
exports.createPackageItem = async (req, res) => {
  try {
    const { packageid, serviceid, quantity, sortorder, createbyuserid } =
      req.body;

    // Cek apakah paket sudah pernah digunakan di transaksi
    const isUsed = await TrServicePackage.findOne({ where: { packageid } });
    if (isUsed) {
      return res.status(400).json({
        success: false,
        message:
          "Tidak dapat menambahkan item, paket ini sudah memiliki transaksi.",
      });
    }

    const newItem = await MsService.MsServicePackageItem.create({
      packageid,
      serviceid,
      quantity,
      sortorder,
      createbyuserid,
    });

    res.status(201).json({
      success: true,
      message: "Service package item berhasil dibuat.",
      data: newItem,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
exports.createPackageItem = async (req, res) => {
  try {
    const { packageid, serviceid, quantity, sortorder, createbyuserid } =
      req.body;

    // const isUsed = await TrServicePackage.findOne({ where: { packageid } });
    // if (isUsed) {
    //   return res.status(400).json({
    //     success: false,
    //     message:
    //       "Tidak dapat menambahkan item, paket ini sudah memiliki transaksi.",
    //   });
    // }

    // 🔒 Cek apakah kombinasi packageid + serviceid sudah ada
    const exists = await MsServicePackageItem.findOne({
      where: { packageid, serviceid },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Item dengan service ini sudah ada dalam paket.",
      });
    }

    // ✅ Buat data baru
    const newItem = await MsServicePackageItem.create({
      packageid,
      serviceid,
      quantity,
      sortorder,
      createbyuserid,
    });

    res.status(201).json({
      success: true,
      message: "Service package item berhasil dibuat.",
      data: newItem,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePackageItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      packageid,
      serviceid,
      quantity,
      sortorder,
      updateuserid,
      isactive,
    } = req.body;

    // const isUsed = await TrServicePackage.findOne({ where: { packageid } });
    // if (isUsed) {
    //   return res.status(400).json({
    //     success: false,
    //     message:
    //       "Tidak dapat menambahkan item, paket ini sudah memiliki transaksi.",
    //   });
    // }

    const item = await MsServicePackageItem.findByPk(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item tidak ditemukan.",
      });
    }

    // 🔒 Cek apakah kombinasi packageid + serviceid sudah ada di item lain
    const duplicate = await MsServicePackageItem.findOne({
      where: {
        packageid,
        serviceid,
        id: { [Op.ne]: id }, // pastikan bukan dirinya sendiri
      },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Item dengan service ini sudah ada dalam paket.",
      });
    }

    // ✅ Lanjut update
    await item.update({
      serviceid,
      quantity,
      sortorder,
      updateuserid,
      isactive,
      updatedate: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Service package item berhasil diupdate.",
      data: item,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//GET ALL PRODUCT EXECPT PACKAGE

exports.getAllServiceNoPackageByUserId = async (req, res) => {
  const userId = req.headers.userid;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing user ID in request header",
    });
  }

  try {
    const user = await MsUser.findOne({
      where: { id: userId },
      include: [{ model: MsRole, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let whereCondition = {};

    if (user.role?.isSuperAdmin) {
      whereCondition = {};
    } else if (user.role?.isAdminCompany) {
      if (!user.companyid) {
        return res.status(400).json({
          success: false,
          message: "User has no company assigned",
        });
      }

      const locations = await Mslocation.findAll({
        attributes: ["id"],
        where: { companyid: user.companyid },
      });

      const locationIds = locations.map((loc) => loc.id);

      whereCondition = { locationid: locationIds };
    } else if (user.role?.isAdminOutlet) {
      if (!user.locationid) {
        return res.status(400).json({
          success: false,
          message: "User has no location assigned",
        });
      }
      whereCondition = { locationid: user.locationid };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const data = await MsService.findAll({
      where: whereCondition,
      include: [
        {
          model: MsServiceType,
          as: "servicetype",
          where: {
            name: { [Op.ne]: "Package" },
          },
        },
      ],
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
