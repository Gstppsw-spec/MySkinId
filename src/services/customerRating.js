const { Op } = require("sequelize");
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

      // CHECK IF RATING EXISTS
      if (existing) {
        await transaction.rollback();
        return {
          status: false,
          message: "Anda sudah memberikan rating untuk item ini.",
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
  async getByEntity(
    entityType,
    entityId,
    currentUserId = null,
    ratingFilter = null,
    limit = 20,
    offset = 0,
    sortBy = "newest",
    hasImage = null
  ) {
    try {
      if (!entityType || !entityId) {
        return {
          status: false,
          message: "EntityType dan EntityId wajib diisi",
          data: null,
        };
      }

      const whereClause = {
        entityType,
        entityId,
      };

      if (ratingFilter) {
        whereClause.rating = ratingFilter;
      }

      // Filter by Image
      let imageRequired = false;
      if (hasImage === "true") {
        imageRequired = true;
      } else if (hasImage === "false") {
        whereClause[Op.and] = sequelize.literal(
          "NOT EXISTS (SELECT 1 FROM rating_images WHERE rating_images.ratingId = Rating.id)"
        );
      }

      // Sorting
      const sortOrder = sortBy === "oldest" ? "ASC" : "DESC";

      const { count, rows: ratings } = await Rating.findAndCountAll({
        where: whereClause,
        distinct: true,
        include: [
          {
            model: RatingImage,
            as: "images",
            attributes: ["imageUrl"],
            required: imageRequired,
          },
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["id", "name", "profileImageUrl"],
          },
          {
            model: RatingLike,
            as: "likes",
            attributes: ["customerId"],
          },
        ],
        order: [
          [
            sequelize.literal(
              currentUserId
                ? `CASE WHEN Rating.customerId = '${currentUserId}' THEN 0 ELSE 1 END`
                : "1"
            ),
            "ASC",
          ],
          ["createdAt", sortOrder],
        ],
        limit,
        offset,
      });

      const avgResult = await Rating.findOne({
        where: {
          entityType,
          entityId,
        },
        attributes: [
          [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"],
        ],
      });

      const totalAvgRating = avgResult
        ? parseFloat(avgResult.get("avgRating") || 0).toFixed(1)
        : 0;

      const statsResult = await Rating.findAll({
        where: {
          entityType,
          entityId,
        },
        attributes: [
          "rating",
          [sequelize.fn("COUNT", sequelize.col("rating")), "count"],
        ],
        group: ["rating"],
        raw: true,
      });

      const ratingStats = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      statsResult.forEach((item) => {
        ratingStats[item.rating] = parseInt(item.count);
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
        totalCount: count,
        data: {
          list: processedRatings,
          totalAvgRating: totalAvgRating,
          ratingStats,
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
