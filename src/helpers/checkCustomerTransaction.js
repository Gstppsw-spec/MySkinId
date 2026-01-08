const {
  Transaction,
  TransactionItem,
  TransactionService,
  TransactionPackage,
} = require("../models");

module.exports = async function checkCustomerTransaction({
  customerId,
  entityType,
  entityId,
}) {
  const whereTransaction = {
    customerId,
    status: ["PAID", "COMPLETED"],
  };

  switch (entityType) {
    case "PRODUCT":
      return TransactionItem.findOne({
        include: [
          {
            model: Transaction,
            as: "transaction",
            where: whereTransaction,
          },
        ],
        where: { productId: entityId },
      });

    case "SERVICE":
      return TransactionService.findOne({
        include: [
          {
            model: Transaction,
            as: "transaction",
            where: whereTransaction,
          },
        ],
        where: { serviceId: entityId },
      });

    case "PACKAGE":
      return TransactionPackage.findOne({
        include: [
          {
            model: Transaction,
            as: "transaction",
            where: whereTransaction,
          },
        ],
        where: { packageId: entityId },
      });

    case "LOCATION":
      return Transaction.findOne({
        where: {
          ...whereTransaction,
          locationId: entityId,
        },
      });

    default:
      return null;
  }
};
