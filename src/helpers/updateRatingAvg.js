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
  else {
    ratingAvg = (ratingAvg * ratingCount - oldRating + newRating) / ratingCount;
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
