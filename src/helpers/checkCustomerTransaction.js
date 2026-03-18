const {
  transaction,
  transactionItem,
  order,
  customerVoucher,
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

  const type = entityType.toUpperCase();
  switch (type) {
    case "PRODUCT":
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

    case "PACKAGE":
    case "SERVICE": {
      const item = await transactionItem.findOne({
        where: {
          itemType: type.toLowerCase(),
          itemId: entityId,
        },
        include: [
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
        ],
      });

      if (!item) return null;

      // Jika transaksi sudah COMPLETED, boleh rating
      if (item.transaction.orderStatus === "COMPLETED") return item;

      // Jika belum COMPLETED, cek apakah sudah ada voucher yang di-REDEEM
      const redeemedVoucher = await customerVoucher.findOne({
        where: {
          transactionItemId: item.id,
          status: "REDEEM"
        }
      });

      return redeemedVoucher ? item : null;
    }

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
