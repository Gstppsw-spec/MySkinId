const {
  transaction,
  transactionItem,
  order,
} = require("../models");
const { Op, Sequelize } = require("sequelize");

/**
 * Checks if a customer has a valid transaction to rate an entity.
 * - For PRODUCT: Must be DELIVERED or COMPLETED.
 * - For PACKAGE/SERVICE: Must be COMPLETED.
 * - For LOCATION: Must have at least one PAID/DELIVERED/COMPLETED transaction.
 */
module.exports = async function checkCustomerTransaction({
  customerId,
  entityType,
  entityId,
}) {
  const baseInclude = [
    {
      model: transaction,
      as: "transaction",
      required: true,
      include: [
        {
          model: order,
          as: "order",
          where: { customerId },
          required: true,
        },
      ],
    },
  ];

  switch (entityType) {
    case "product":
      return transactionItem.findOne({
        where: {
          itemType: "product",
          itemId: entityId,
        },
        include: [
          {
            model: transaction,
            as: "transaction",
            required: true,
            where: {
              orderStatus: { [Op.in]: ["DELIVERED", "COMPLETED"] },
            },
            include: [
              {
                model: order,
                as: "order",
                where: { customerId },
                required: true,
              },
            ],
          },
        ],
      });

    case "package":
    case "service":
      return transactionItem.findOne({
        where: {
          itemType: entityType,
          itemId: entityId,
        },
        include: [
          {
            model: transaction,
            as: "transaction",
            required: true,
            where: {
              [Op.or]: [
                { orderStatus: "COMPLETED" },
                // If not completed, we check if there's a claimed voucher
                Sequelize.literal(`EXISTS (
                  SELECT 1 FROM customerVouchers 
                  WHERE customerVouchers.transactionItemId = transactionItem.id 
                  AND customerVouchers.status = 'REDEEM'
                )`)
              ]
            },
            include: [
              {
                model: order,
                as: "order",
                where: { customerId },
                required: true,
              },
            ],
          },
        ],
      });

    case "LOCATION":
      return transaction.findOne({
        where: {
          locationId: entityId,
          orderStatus: { [Op.in]: ["PAID", "DELIVERED", "COMPLETED"] },
        },
        include: [
          {
            model: order,
            as: "order",
            where: { customerId },
            required: true,
          },
        ],
      });

    default:
      return null;
  }
};
