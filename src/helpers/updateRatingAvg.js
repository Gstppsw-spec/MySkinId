async function updateRatingAvg({
  model,
  entityId,
  oldRating = null,
  newRating,
  transaction,
}) {
  const data = await model.findByPk(entityId, { transaction });
  if (!data) return;

  let ratingCount = data.ratingCount || 0;
  let ratingAvg = parseFloat(data.ratingAvg || 0);

  // CREATE rating
  if (oldRating === null) {
    ratingCount += 1;
    ratingAvg = (ratingAvg * (ratingCount - 1) + newRating) / ratingCount;
  }
  // UPDATE rating
  else if (newRating !== undefined) {
    ratingAvg = (ratingAvg * ratingCount - oldRating + newRating) / ratingCount;
  }
  // DELETE rating
  else {
    if (ratingCount > 1) {
      ratingAvg = (ratingAvg * ratingCount - oldRating) / (ratingCount - 1);
      ratingCount -= 1;
    } else {
      ratingAvg = 0;
      ratingCount = 0;
    }
  }

  await data.update(
    {
      ratingCount,
      ratingAvg: Number(ratingAvg.toFixed(2)),
    },
    { transaction }
  );
}

module.exports = updateRatingAvg;
