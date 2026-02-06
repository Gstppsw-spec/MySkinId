const sequelize = require("../models").sequelize;
const { Rating, RatingImage, masterCustomer, RatingLike } = require("../models");
const fs = require("fs");
const getRatingTargetModel = require("../helpers/getRatingTargetModel");
const updateRatingAvg = require("../helpers/updateRatingAvg");

module.exports = {
  async createOrUpdateRating(customerId, data, images) {
    const transaction = await sequelize.transaction();
    try {
      console.log(data);
      const { entityType, entityId, rating, review } = data;

      if (!entityType || !entityId || !rating)
        return { status: false, message: "Data tidak lengkap" };

      const targetModel = getRatingTargetModel(entityType);
      if (!targetModel)
        return { status: false, message: "Entity type tidak valid" };

      // const hasTransaction = await checkCustomerTransaction({
      //   customerId,
      //   entityType,
      //   entityId,
      // });

      // if (!hasTransaction) {
      //   await transaction.rollback();
      //   return {
      //     status: false,
      //     message: "Rating hanya bisa diberikan setelah melakukan transaksi",
      //   };
      // }

      const existing = await Rating.findOne({
        where: { customerId, entityType, entityId },
        transaction,
      });

      // UPDATE rating
      if (existing) {
        const oldRating = existing.rating;

        await existing.update({ rating, review }, { transaction });

        await updateRatingAvg({
          model: targetModel,
          entityId,
          oldRating,
          newRating: rating,
          transaction,
        });

        await RatingImage.destroy({
          where: { ratingId: existing.id },
          transaction,
        });

        await saveRatingImages(existing.id, images, transaction);

        await transaction.commit();

        return {
          status: true,
          message: "Berhasil update rating",
          data: existing,
        };
      }

      // CREATE rating
      const newRating = await Rating.create(
        {
          customerId,
          entityType,
          entityId,
          rating,
          review,
        },
        { transaction }
      );

      await updateRatingAvg({
        model: targetModel,
        entityId,
        newRating: rating,
        transaction,
      });

      await saveRatingImages(newRating.id, images, transaction);

      await transaction.commit();

      return {
        status: true,
        message: "Berhasil menambahkan rating",
        data: newRating,
      };
    } catch (error) {
      await transaction.rollback();
      return { status: false, message: error.message };
    }
  },

  async deleteImage(imageId) {
    try {
      const image = await RatingImage.findByPk(imageId);

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
  },
  async getByEntity(entityType, entityId, currentUserId = null) {
    try {
      if (!entityType || !entityId) {
        return {
          status: false,
          message: "EntityType dan EntityId wajib diisi",
          data: null,
        };
      }

      const ratings = await Rating.findAll({
        where: {
          entityType,
          entityId,
        },
        include: [
          {
            model: RatingImage,
            as: "images",
            attributes: ["imageUrl"],
          },
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["id", "name"],
          },
          {
            model: RatingLike,
            as: "likes",
            attributes: ["customerId"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const processedRatings = ratings.map((rating) => {
        const ratingJson = rating.toJSON();
        ratingJson.likeCount = ratingJson.likes.length;
        ratingJson.isLiked = currentUserId
          ? ratingJson.likes.some((like) => like.customerId === currentUserId)
          : false;
        delete ratingJson.likes;
        return ratingJson;
      });

      return {
        status: true,
        message: "Berhasil mengambil data rating",
        data: processedRatings,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async deleteRating(id) {
    try {
      const rating = await Rating.findByPk(id);

      if (!rating) {
        return { status: false, message: "Rating not found", data: null };
      }

      await rating.destroy();

      return {
        status: true,
        message: "Rating deleted successfully",
        data: { id },
      };
    } catch (error) {
      console.error("Delete Rating Error:", error);
      return { status: false, message: error.message, data: null };
    }
  },

  async toggleLike(ratingId, customerId) {
    try {
      const rating = await Rating.findByPk(ratingId);
      if (!rating) {
        return { status: false, message: "Rating not found" };
      }

      const existingLike = await RatingLike.findOne({
        where: { ratingId, customerId },
      });

      if (existingLike) {
        await existingLike.destroy();
        return {
          status: true,
          message: "Unliked successfully",
          data: { isLiked: false },
        };
      } else {
        await RatingLike.create({ ratingId, customerId });
        return {
          status: true,
          message: "Liked successfully",
          data: { isLiked: true },
        };
      }
    } catch (error) {
      console.error("Toggle Like Error:", error);
      return { status: false, message: error.message };
    }
  },
};

async function saveRatingImages(ratingId, files, transaction) {
  if (!files || files.length === 0) return;

  const imagesData = files.map((file) => ({
    ratingId,
    imageUrl: file.path,
  }));

  await RatingImage.bulkCreate(imagesData, { transaction });
}
