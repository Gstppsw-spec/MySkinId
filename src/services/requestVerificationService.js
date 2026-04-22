const {
  requestVerification,
  masterLocation,
  masterCompany,
  masterProduct,
  masterService,
  masterPackage,
} = require("../models");
const NotificationService = require("./notification.service");

class RequestVerificationService {
  async create(data) {
    try {
      const { refferenceId, refferenceType, note } = data;

      const allowedTypes = [
        "location",
        "company",
        "product",
        "service",
        "package",
      ];

      if (!allowedTypes.includes(refferenceType)) {
        return {
          status: false,
          message: "Reference type tidak valid",
          data: null,
        };
      }

      let entity = null;
      if (refferenceType === "location") {
        entity = await masterLocation.findByPk(refferenceId);
      } else if (refferenceType === "company") {
        entity = await masterCompany.findByPk(refferenceId);
      } else if (refferenceType === "product") {
        entity = await masterProduct.findByPk(refferenceId);
      } else if (refferenceType === "service") {
        entity = await masterService.findByPk(refferenceId);
      } else if (refferenceType === "package") {
        entity = await masterPackage.findByPk(refferenceId);
      }

      if (!entity) {
        return {
          status: false,
          message: `${refferenceType.charAt(0).toUpperCase() + refferenceType.slice(1)} tidak ditemukan`,
          data: null,
        };
      }

      if (entity.isVerified) {
        return {
          status: false,
          message: `${refferenceType.charAt(0).toUpperCase() + refferenceType.slice(1)} sudah terverifikasi`,
          data: null,
        };
      }

      const checkRequest = await requestVerification.findOne({
        where: {
          refferenceId,
          refferenceType,
        },
        order: [["createdAt", "DESC"]],
      });

      if (checkRequest) {
        // Jika status bukan 'rejected', tolak pembuatan request baru
        if (checkRequest.status.toLowerCase() !== "rejected") {
          return {
            status: false,
            message: "Request verifikasi sudah ada dan sedang diproses",
            data: null,
          };
        }

        // Jika status 'rejected', izinkan update
        checkRequest.status = "pending";
        checkRequest.note = note || checkRequest.note;
        await checkRequest.save();
        return {
          status: true,
          message: "Request updated to pending",
          data: checkRequest,
        };
      }

      const result = await requestVerification.create({
        refferenceId,
        refferenceType,
        note,
        status: "pending",
      });
      return {
        status: true,
        message: "Berhasil membuat request verifikasi",
        data: result,
      };
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return {
          status: false,
          message: "Request verifikasi untuk entitas ini sudah ada",
          data: null,
        };
      }
      return { status: false, message: error.message };
    }
  }

  async list(status, type, pagination = {}, name = null, user = null) {
    try {
      const { limit, offset } = pagination;
      const allowedType = [
        "location",
        "company",
        "product",
        "service",
        "package",
      ];
      const { Op } = require("sequelize");
      
      let companyIds = [];
      let locationIds = [];

      if (user && (user.role === "COMPANY_ADMIN" || user.role === "OUTLET_ADMIN")) {
        const { relationshipUserCompany, relationshipUserLocation } = require("../models");
        if (user.role === "COMPANY_ADMIN") {
          const u_companies = await relationshipUserCompany.findAll({ where: { userId: user.id } });
          companyIds = u_companies.map(c => c.companyId);
        } else if (user.role === "OUTLET_ADMIN") {
          const u_locations = await relationshipUserLocation.findAll({ where: { userId: user.id } });
          locationIds = u_locations.map(l => l.locationId);
        }
      }

      const where = {};
      if (status) where.status = status;

      let include = [];
      const nameFilter = name ? { name: { [Op.like]: `%${name}%` } } : null;

      if (type && allowedType.includes(type)) {
        where.refferenceType = type;

        if (type === "product") {
          include.push({
            model: masterProduct,
            as: "product",
            ...(nameFilter && { where: nameFilter, required: true }),
            include: [
              {
                model: require("../models").masterProductCategory,
                as: "categories",
                through: { attributes: [] },
                required: false,
              },
              {
                model: require("../models").masterGroupProduct,
                as: "groupProduct",
                through: { attributes: [] },
                required: false,
              },
              {
                model: require("../models").masterConsultationCategory,
                as: "consultationCategories",
                through: { attributes: [] },
                required: false,
              },
              {
                model: masterLocation,
                as: "locations", // ⬅️ sesuai belongsToMany
                through: { attributes: [] }, // hide pivot
                attributes: ["id", "name", "isVerified", "companyId"],
                required: false,
              },
            ],
          });
        }

        if (type === "service") {
          include.push({
            model: masterService,
            as: "service",
            ...(nameFilter && { where: nameFilter, required: true }),
            include: [
              {
                model: require("../models").masterSubCategoryService,
                as: "categories",
                through: { attributes: [] },
                required: false,
              },
              {
                model: masterLocation,
                as: "locations",
                through: { attributes: [] },
                attributes: ["id", "name", "isVerified", "companyId"],
                required: false,
              },
            ],
          });
        }

        if (type === "package") {
          include.push({
            model: masterPackage,
            as: "package",
            ...(nameFilter && { where: nameFilter, required: true }),
            include: [
              {
                model: require("../models").masterConsultationCategory,
                as: "consultationCategories",
                through: { attributes: [] },
                required: false,
              },
              {
                model: require("../models").masterPackageItems,
                as: "items",
                include: [
                  {
                    model: masterService,
                    as: "service",
                    attributes: ["id", "name"],
                    include: {
                      model: require("../models").masterSubCategoryService,
                      as: "categories",
                      through: { attributes: [] },
                      attributes: ["id", "name"],
                    },
                  },
                ],
              },
              {
                model: masterLocation,
                as: "locations",
                through: { attributes: [] },
                attributes: ["id", "name", "isVerified", "companyId"],
                required: false,
              },
            ],
          });
        }

        if (type === "location") {
          include.push({
            model: masterLocation,
            as: "location",
            ...(nameFilter && { where: nameFilter, required: true }),
            include: [
              {
                model: masterCompany,
                as: "company",
                attributes: ["id", "name", "isVerified"],
                required: false,
              },
            ],
          });
        }

        if (type === "company") {
          include.push({
            model: masterCompany,
            as: "company",
            ...(nameFilter && { where: nameFilter, required: true }),
          });
        }
      } else if (type && !allowedType.includes(type)) {
        return {
          status: false,
          message: "Type tidak valid",
          data: null,
        };
      } else {
        // Fallback for all
        include = [
          {
            model: masterLocation,
            as: "location",
            ...(nameFilter && { where: nameFilter, required: false }),
          },
          {
            model: masterCompany,
            as: "company",
            ...(nameFilter && { where: nameFilter, required: false }),
          },
          {
            model: masterProduct,
            as: "product",
            ...(nameFilter && { where: nameFilter, required: false }),
            include: [
              { model: require("../models").masterProductCategory, as: "categories", through: { attributes: [] }, required: false },
              { model: require("../models").masterGroupProduct, as: "groupProduct", through: { attributes: [] }, required: false },
              { model: require("../models").masterConsultationCategory, as: "consultationCategories", through: { attributes: [] }, required: false },
              { model: masterLocation, as: "locations", through: { attributes: [] }, attributes: ["id", "companyId"], required: false }
            ]
          },
          {
            model: masterService,
            as: "service",
            ...(nameFilter && { where: nameFilter, required: false }),
            include: [
              { model: require("../models").masterSubCategoryService, as: "categories", through: { attributes: [] }, required: false },
              { model: masterLocation, as: "locations", through: { attributes: [] }, attributes: ["id", "companyId"], required: false }
            ]
          },
          {
            model: masterPackage,
            as: "package",
            ...(nameFilter && { where: nameFilter, required: false }),
            include: [
              { model: require("../models").masterConsultationCategory, as: "consultationCategories", through: { attributes: [] }, required: false },
              {
                model: require("../models").masterPackageItems,
                as: "items",
                include: [
                  {
                    model: masterService,
                    as: "service",
                    include: {
                      model: require("../models").masterSubCategoryService,
                      as: "categories",
                      through: { attributes: [] }
                    },
                  },
                ],
              },
              { model: masterLocation, as: "locations", through: { attributes: [] }, attributes: ["id", "companyId"], required: false }
            ]
          },
        ];

        if (nameFilter) {
          where[Op.or] = [
            { "$location.name$": { [Op.like]: `%${name}%` } },
            { "$company.name$": { [Op.like]: `%${name}%` } },
            { "$product.name$": { [Op.like]: `%${name}%` } },
            { "$service.name$": { [Op.like]: `%${name}%` } },
            { "$package.name$": { [Op.like]: `%${name}%` } },
          ];
        }
      }

      const { count: totalCount, rows: requests } =
        await requestVerification.findAndCountAll({
          where,
          include,
          order: [["createdAt", "DESC"]],
          subQuery: false,
          distinct: true,
        });

      // Filter out requests where the associated entity is null (soft-deleted) or unauthorized
      const filteredRequests = requests.filter((req) => {
        const entity =
          req.company ||
          req.location ||
          req.product ||
          req.service ||
          req.package;
          
        if (!entity) return false;
        
        if (user && (user.role === "COMPANY_ADMIN")) {
          if (req.refferenceType === "company") return companyIds.includes(entity.id);
          if (req.refferenceType === "location") return companyIds.includes(entity.companyId);
          if (["product", "service", "package"].includes(req.refferenceType)) {
             return entity.locations && entity.locations.some(loc => companyIds.includes(loc.companyId));
          }
          return false;
        }
        
        if (user && (user.role === "OUTLET_ADMIN")) {
          if (req.refferenceType === "company") return false; // Outlet admin cannot see company verification req
          if (req.refferenceType === "location") return locationIds.includes(entity.id);
          if (["product", "service", "package"].includes(req.refferenceType)) {
             return entity.locations && entity.locations.some(loc => locationIds.includes(loc.id));
          }
          return false;
        }

        return true;
      });

      // If we are using pagination, the count might be slightly off due to JS filtering
      // but for a small number of deletions it's usually acceptable.
      // For a perfect count, we would need a more complex SQL query with Op.or on each association existence.

      return {
        status: true,
        message: "List request verification",
        data: filteredRequests.slice(0, limit || filteredRequests.length),
        totalCount: filteredRequests.length,
      };
    } catch (error) {
      console.error("List Request Verification Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async detail(id) {
    try {
      const basicRequest = await requestVerification.findByPk(id);

      if (!basicRequest)
        return {
          status: false,
          message: "Belum ada request ditemukan",
          data: null,
        };

      const type = basicRequest.refferenceType;
      let include = [];

      if (type === "product") {
        include.push({
          model: require("../models").masterProduct,
          as: "product",
          include: [
            {
              model: require("../models").masterProductCategory,
              as: "categories",
              through: { attributes: [] },
              required: false,
            },
            {
              model: require("../models").masterGroupProduct,
              as: "groupProduct",
              through: { attributes: [] },
              required: false,
            },
            {
              model: require("../models").masterConsultationCategory,
              as: "consultationCategories",
              through: { attributes: [] },
              required: false,
            },
            {
              model: masterLocation,
              as: "locations",
              through: { attributes: [] },
              attributes: ["id", "name", "isVerified", "companyId"],
              required: false,
            },
          ],
        });
      } else if (type === "service") {
        include.push({
          model: require("../models").masterService,
          as: "service",
          include: [
            {
              model: require("../models").masterSubCategoryService,
              as: "categories",
              through: { attributes: [] },
              required: false,
            },
            {
              model: masterLocation,
              as: "locations",
              through: { attributes: [] },
              attributes: ["id", "name", "isVerified", "companyId"],
              required: false,
            },
          ],
        });
      } else if (type === "package") {
        include.push({
          model: require("../models").masterPackage,
          as: "package",
          include: [
            {
              model: require("../models").masterConsultationCategory,
              as: "consultationCategories",
              through: { attributes: [] },
              required: false,
            },
            {
              model: require("../models").masterPackageItems,
              as: "items",
              include: [
                {
                  model: masterService,
                  as: "service",
                  include: {
                    model: require("../models").masterSubCategoryService,
                    as: "categories",
                    through: { attributes: [] },
                  },
                },
              ],
            },
            {
              model: masterLocation,
              as: "locations",
              through: { attributes: [] },
              attributes: ["id", "name", "isVerified", "companyId"],
              required: false,
            },
          ],
        });
      } else if (type === "location") {
        include.push({
          model: masterLocation,
          as: "location",
          include: [
            {
              model: masterCompany,
              as: "company",
              attributes: ["id", "name", "isVerified"],
            },
          ],
        });
      } else if (type === "company") {
        include.push({
          model: masterCompany,
          as: "company",
        });
      }

      const request = await requestVerification.findByPk(id, { include });

      return { status: true, message: "Request ditemukan", data: request };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }

  async update(id, data) {
    try {
      const request = await requestVerification.findByPk(id);

      if (!request)
        return {
          status: false,
          message: "Belum ada request ditemukan",
          data: null,
        };

      request.status = data.status != undefined ? data.status : request.status;
      request.note = data.note != undefined ? data.note : request.note;

      if (data.status === "approved") {
        if (request.refferenceType === "location") {
          const location = await masterLocation.findByPk(request.refferenceId);
          location.isVerified = true;
          location.verifiedDate = new Date();
          await location.save();
        } else if (request.refferenceType === "company") {
          const company = await masterCompany.findByPk(request.refferenceId);
          company.isVerified = true;
          company.verifiedDate = new Date();
          await company.save();
        } else if (request.refferenceType === "product") {
          const product = await masterProduct.findByPk(request.refferenceId);
          product.isVerified = true;
          product.verifiedDate = new Date();
          await product.save();
        } else if (request.refferenceType === "service") {
          const service = await masterService.findByPk(request.refferenceId);
          service.isVerified = true;
          service.verifiedDate = new Date();
          await service.save();
        } else if (request.refferenceType === "package") {
          const paket = await masterPackage.findByPk(request.refferenceId);
          paket.isVerified = true;
          paket.verifiedDate = new Date();
          await paket.save();
        } else {
          return {
            status: false,
            message: "Refference type tidak valid",
            data: null,
          };
        }
      } else if (data.status === "rejected") {
        if (request.refferenceType === "location") {
          const location = await masterLocation.findByPk(request.refferenceId);
          location.isVerified = false;
          location.verifiedDate = null;
          await location.save();
        } else if (request.refferenceType === "company") {
          const company = await masterCompany.findByPk(request.refferenceId);
          company.isVerified = false;
          company.verifiedDate = null;
          await company.save();
        } else if (request.refferenceType === "product") {
          const product = await masterProduct.findByPk(request.refferenceId);
          product.isVerified = false;
          product.verifiedDate = null;
          await product.save();
        } else if (request.refferenceType === "service") {
          const service = await masterService.findByPk(request.refferenceId);
          service.isVerified = false;
          service.verifiedDate = null;
          await service.save();
        } else if (request.refferenceType === "package") {
          const paket = await masterPackage.findByPk(request.refferenceId);
          paket.isVerified = false;
          paket.verifiedDate = null;
          await paket.save();
        } else {
          return {
            status: false,
            message: "Refference type tidak valid",
            data: null,
          };
        }
      }

      await request.save();

      // === SEND NOTIFICATION ===
      try {
        const statusLabel = data.status === "approved" ? "Disetujui" : "Ditolak";
        const typeLabel = request.refferenceType.charAt(0).toUpperCase() + request.refferenceType.slice(1);
        
        let entityName = "";
        let companyId = null;
        let locationId = null;

        if (request.refferenceType === "location") {
          const loc = await masterLocation.findByPk(request.refferenceId);
          entityName = loc.name;
          locationId = loc.id;
          companyId = loc.companyId;
        } else if (request.refferenceType === "company") {
          const comp = await masterCompany.findByPk(request.refferenceId);
          entityName = comp.name;
          companyId = comp.id;
        } else {
          // product, service, package
          let entity;
          if (request.refferenceType === "product") entity = await masterProduct.findByPk(request.refferenceId);
          else if (request.refferenceType === "service") entity = await masterService.findByPk(request.refferenceId);
          else if (request.refferenceType === "package") entity = await masterPackage.findByPk(request.refferenceId);
          
          if (entity) {
            entityName = entity.name;
            // Find one location associated with this entity to get companyId
            // This is a bit simplified, but covers the request images
            const { relationshipProductLocation, relationshipServiceLocation, relationshipPackageLocation } = require("../models");
            let pivot;
            if (request.refferenceType === "product") pivot = await relationshipProductLocation.findOne({ where: { productId: entity.id } });
            else if (request.refferenceType === "service") pivot = await relationshipServiceLocation.findOne({ where: { serviceId: entity.id } });
            else if (request.refferenceType === "package") pivot = await relationshipPackageLocation.findOne({ where: { packageId: entity.id } });
            
            if (pivot) {
              const loc = await masterLocation.findByPk(pivot.locationId);
              if (loc) {
                locationId = loc.id;
                companyId = loc.companyId;
              }
            }
          }
        }

        await NotificationService.createNotification({
          companyId,
          locationId,
          title: `${typeLabel} ${statusLabel}`,
          body: `${typeLabel} '${entityName}' telah ${data.status === "approved" ? "lolos verifikasi dan siap dipublikasikan" : "ditolak. Silakan perbarui data sesuai pedoman"}.`,
          category: "Verification",
          type: `VERIFICATION_${data.status.toUpperCase()}`,
          referenceId: request.refferenceId,
          referenceType: request.refferenceType,
        });
      } catch (notifErr) {
        console.error("[RequestVerificationService] Notification Error:", notifErr.message);
      }

      return { status: true, message: "Request updated", data: request };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }
}

module.exports = new RequestVerificationService();
