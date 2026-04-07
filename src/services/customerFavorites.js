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

module.exports = {
  async getCustomerFavorites(customerId, userLat, userLng) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      const getDistanceLiteral = (alias) => {
        if (!userLat || !userLng) return null;
        return Sequelize.literal(`
                  6371 * acos(
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

      const favorites = await customerFavorites.findAll({
        where: { customerId },
        attributes: [],
        include: [
          {
            model: masterProduct,
            as: "product",
            attributes: {
              exclude: ["createdAt", "updatedAt"],
            },
            include: [
              {
                model: masterProductImage,
                as: "images",
                attributes: ["imageUrl"],
              },
            ],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: [
              "id",
              "name",
              ...(distanceLiteralDefault
                ? [[distanceLiteralDefault, "distance"]]
                : []),
            ],
            required: !!(userLat && userLng),
            include: [
              {
                model: masterLocationImage,
                as: "images",
                attributes: ["imageUrl"],
              },
            ],
          },
          {
            model: masterService,
            as: "service",
            attributes: {
              exclude: ["createdAt", "updatedAt"],
            },
            include: [
              {
                model: masterLocation,
                as: "locations",
                attributes: [
                  "id",
                  "name",
                  ...(distanceLiteralPlural
                    ? [[distanceLiteralPlural, "distance"]]
                    : []),
                ],
                required: !!(userLat && userLng),
                include: [
                  {
                    model: masterLocationImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                    separate: true,
                  },
                ],
              },
            ],
          },
          {
            model: masterPackage,
            as: "package",
            attributes: {
              exclude: ["createdAt", "updatedAt"],
            },
            include: [
              {
                model: masterLocation,
                as: "locations",
                attributes: [
                  "id",
                  "name",
                  ...(distanceLiteralPlural
                    ? [[distanceLiteralPlural, "distance"]]
                    : []),
                ],
                required: !!(userLat && userLng),
                include: [
                  {
                    model: masterLocationImage,
                    as: "images",
                    attributes: ["imageUrl"],
                    limit: 1,
                    separate: true,
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = {
        product: [],
        service: [],
        location: [],
        package: [],
      };

      favorites.forEach((fav) => {
        if (fav.product) result.product.push(fav.product);
        if (fav.service) {
          const servicePlain = fav.service.get({ plain: true });
          // Backward compatibility: map locations[0] to location
          servicePlain.location = servicePlain.locations?.[0] || null;
          delete servicePlain.locations;
          result.service.push(servicePlain);
        }
        if (fav.location) result.location.push(fav.location);
        if (fav.package) {
          const packagePlain = fav.package.get({ plain: true });
          // Backward compatibility: map locations[0] to location
          packagePlain.location = packagePlain.locations?.[0] || null;
          delete packagePlain.locations;
          result.package.push(packagePlain);
        }
      });

      return { status: true, message: "Berhasil", data: result };
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
