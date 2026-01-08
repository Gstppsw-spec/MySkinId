const sequelize = require("../models").sequelize;
const { Rating, RatingImage } = require("../models");
// const checkCustomerTransaction = require("../helpers/checkCustomerTransaction");

const getRatingTargetModel = require("../helpers/getRatingTargetModel");
const updateRatingAvg = require("../helpers/updateRatingAvg");

module.exports = {
  async createOrUpdateRating(data, images) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId, entityType, entityId, rating, review } = data;

      if (!customerId || !entityType || !entityId || !rating)
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
};

async function saveRatingImages(ratingId, files, transaction) {
  if (!files || files.length === 0) return;

  const imagesData = files.map((file) => ({
    ratingId,
    imageUrl: file.path,
  }));

  await RatingImage.bulkCreate(imagesData, { transaction });
}
