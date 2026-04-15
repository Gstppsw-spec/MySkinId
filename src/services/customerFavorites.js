const {
  customerFavorites,
  masterProduct,
  masterProductImage,
  masterService,
  masterLocation,
  masterLocationImage,
  masterPackage,
} = require("../models");
const { Sequelize } = require("sequelize");
const validateReference = require("../helpers/validateReference");
const { sortPrimaryFirst } = require("../helpers/sortPrimaryImage");

module.exports = {
  async getCustomerFavorites(customerId, userLat, userLng, type = null, page = 1, pageSize = 10) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      const getDistanceLiteral = (alias) => {
        if (!userLat || !userLng) return null;
        return Sequelize.literal(`
                  6371000 * acos(
                    cos(radians(${userLat})) *
                    cos(radians(CAST(${alias}.latitude AS FLOAT))) *
                    cos(radians(CAST(${alias}.longitude AS FLOAT)) - radians(${userLng})) +
                    sin(radians(${userLat})) *
                    sin(radians(CAST(${alias}.latitude AS FLOAT)))
                  )
                `);
      };

      const distanceLiteralDefault = getDistanceLiteral("location");
      const distanceLiteralPlural = getDistanceLiteral("locations");

      const where = { customerId };
      if (type) {
        where.favoriteType = type;
      }

      const include = [];

      // Helper functions to add nested models correctly
      const addProduct = () => include.push({
        model: masterProduct,
        as: "product",
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [{ model: masterProductImage, as: "images", attributes: ["imageUrl"] }],
      });

      const addLocation = () => include.push({
        model: masterLocation,
        as: "location",
        attributes: [
          "id",
          "name",
          "address",
          "operationHours",
          "operationDays",
          "latitude",
          "longitude",
          "ratingAvg",
          "ratingCount",
          "googleRating",
          "googleRatingCount",
          "isPremium",
          ...(distanceLiteralDefault ? [[distanceLiteralDefault, "distance"]] : []),
        ],
        required: !!(userLat && userLng && type === "location"),
        include: [{ model: masterLocationImage, as: "images", attributes: ["imageUrl"] }],
      });

      const addService = () => include.push({
        model: masterService,
        as: "service",
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [{
          model: masterLocation,
          as: "locations",
          attributes: [
            "id",
            "name",
            "address",
            "operationHours",
            "operationDays",
            "latitude",
            "longitude",
            "ratingAvg",
            "ratingCount",
            "googleRating",
            "googleRatingCount",
            "isPremium",
            ...(distanceLiteralPlural ? [[distanceLiteralPlural, "distance"]] : []),
          ],
          required: !!(userLat && userLng && type === "service"),
          include: [{ model: masterLocationImage, as: "images", attributes: ["imageUrl"], limit: 1, separate: true }],
        }],
      });

      const addPackage = () => include.push({
        model: masterPackage,
        as: "package",
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: [{
          model: masterLocation,
          as: "locations",
          attributes: [
            "id",
            "name",
            "address",
            "operationHours",
            "operationDays",
            "latitude",
            "longitude",
            "ratingAvg",
            "ratingCount",
            "googleRating",
            "googleRatingCount",
            "isPremium",
            ...(distanceLiteralPlural ? [[distanceLiteralPlural, "distance"]] : []),
          ],
          required: !!(userLat && userLng && type === "package"),
          include: [{ model: masterLocationImage, as: "images", attributes: ["imageUrl"], limit: 1, separate: true }],
        }],
      });

      if (type) {
        // Flattened paginated response for specific type
        if (type === "product") addProduct();
        else if (type === "location") addLocation();
        else if (type === "service") addService();
        else if (type === "package") addPackage();

        const limit = parseInt(pageSize);
        const offset = (parseInt(page) - 1) * limit;

        const { count, rows: favorites } = await customerFavorites.findAndCountAll({
          where,
          include,
          limit,
          offset,
          order: [["createdAt", "DESC"]],
          distinct: true,
        });

        const data = favorites.map((fav) => {
          if (fav.product) {
            const p = fav.product.get ? fav.product.get({ plain: true }) : fav.product;
            if (p.images) p.images = sortPrimaryFirst(p.images);
            return p;
          }
          if (fav.location) {
            const l = fav.location.get ? fav.location.get({ plain: true }) : fav.location;
            if (l.images) l.images = sortPrimaryFirst(l.images);
            return l;
          }
          if (fav.service) {
            const p = fav.service.get({ plain: true });
            if (p.locations) {
              p.locations = p.locations.map(loc => {
                if (loc.images) loc.images = sortPrimaryFirst(loc.images);
                return loc;
              });
            }
            p.location = p.locations?.[0] || null;
            delete p.locations;
            return p;
          }
          if (fav.package) {
            const p = fav.package.get({ plain: true });
            if (p.locations) {
              p.locations = p.locations.map(loc => {
                if (loc.images) loc.images = sortPrimaryFirst(loc.images);
                return loc;
              });
            }
            p.location = p.locations?.[0] || null;
            delete p.locations;
            return p;
          }
          return null;
        }).filter(Boolean);

        return { status: true, message: "Berhasil", data, totalCount: count };
      } else {
        // Legacy grouped response
        addProduct();
        addLocation();
        addService();
        addPackage();

        const favorites = await customerFavorites.findAll({
          where,
          include,
        });

        const result = {
          product: [],
          service: [],
          location: [],
          package: [],
        };

        favorites.forEach((fav) => {
          if (fav.product) {
            const p = fav.product.get ? fav.product.get({ plain: true }) : fav.product;
            if (p.images) p.images = sortPrimaryFirst(p.images);
            result.product.push(p);
          }
          if (fav.service) {
            const servicePlain = fav.service.get({ plain: true });
            if (servicePlain.locations) {
              servicePlain.locations = servicePlain.locations.map(loc => {
                if (loc.images) loc.images = sortPrimaryFirst(loc.images);
                return loc;
              });
            }
            servicePlain.location = servicePlain.locations?.[0] || null;
            delete servicePlain.locations;
            result.service.push(servicePlain);
          }
          if (fav.location) {
            const l = fav.location.get ? fav.location.get({ plain: true }) : fav.location;
            if (l.images) l.images = sortPrimaryFirst(l.images);
            result.location.push(l);
          }
          if (fav.package) {
            const packagePlain = fav.package.get({ plain: true });
            if (packagePlain.locations) {
              packagePlain.locations = packagePlain.locations.map(loc => {
                if (loc.images) loc.images = sortPrimaryFirst(loc.images);
                return loc;
              });
            }
            packagePlain.location = packagePlain.locations?.[0] || null;
            delete packagePlain.locations;
            result.package.push(packagePlain);
          }
        });

        return { status: true, message: "Berhasil", data: result };
      }
    } catch (error) {
      console.error(error);
      return { status: false, message: error.message };
    }
  },

  async updateCustomerFavorites(data) {
    try {
      const { customerId, refferenceId, favoriteType } = data;
      if (!customerId || !refferenceId || !favoriteType)
        return { status: false, message: "Data tidak lengkap" };

      await validateReference(favoriteType, refferenceId);

      let favorite = await customerFavorites.findOne({
        where: { customerId, refferenceId, favoriteType },
      });

      if (favorite) {
        await favorite.destroy();
        return {
          status: true,
          message: "Berhasil menghapus favorite ",
          data: favorite,
        };
      }

      const newFavorite = await customerFavorites.create({
        customerId,
        refferenceId,
        favoriteType,
      });

      return {
        status: true,
        message: "Berhasil menambah ke favorite",
        data: newFavorite,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
