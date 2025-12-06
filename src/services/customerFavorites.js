const {
  customerFavorites,
  masterProduct,
  masterProductImage,
  masterService,
  masterLocation,
  masterLocationImage,
} = require("../models");

module.exports = {
  async getCustomerFavorites(customerId) {
    try {
      if (!customerId)
        return { status: false, message: "Customer tidak boleh kosong" };

      const favorites = await customerFavorites.findAll({
        where: { customerId },
        include: [
          {
            model: masterProduct,
            as: "product",
            include: [{ model: masterProductImage, as: "images" }],
          },
          {
            model: masterLocation,
            as: "location",
            include: [{ model: masterLocationImage, as: "images" }],
          },
          {
            model: masterService,
            as: "service",
          },
        ],
      });

      const result = {
        product: [],
        service: [],
        location: [],
      };

      favorites.forEach((fav) => {
        if (fav.favoriteType === "product" && fav.product)
          result.product.push(fav);

        if (fav.favoriteType === "service" && fav.service)
          result.service.push(fav);

        if (fav.favoriteType === "location" && fav.location)
          result.location.push(fav);
      });

      return { status: true, message: "Berhasil", data: result };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
  async updateCustomerFavorites(data) {
    try {
      const { customerId, refferenceId, favoriteType } = data;
      if (!customerId || !refferenceId || !favoriteType)
        return { status: false, message: "Data tidak lengkap" };

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
