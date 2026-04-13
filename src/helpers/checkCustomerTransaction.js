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
      const allowedStatuses = ["PAID", "DELIVERED", "COMPLETED"];
      let items = await transactionItem.findAll({
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

      // Secondary search for SERVICE: Check if it's inside a purchased PACKAGE
      if (items.length === 0 && type === "SERVICE") {
        const { masterPackageItems } = require("../models");
        const packagesWithService = await masterPackageItems.findAll({
          where: { serviceId: entityId },
          attributes: ["packageId"],
        });

        if (packagesWithService.length > 0) {
          const packageItems = await transactionItem.findAll({
            where: {
              itemType: "package",
              itemId: { [Op.in]: packagesWithService.map((p) => p.packageId) },
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
          items = items.concat(packageItems);
        }
      }

      if (items.length === 0) return null;

      // Validate found items
      for (const item of items) {
        if (item.transaction.orderStatus === "COMPLETED") return item;

        // Allow rating if transaction is PAID/DELIVERED and voucher is REDEEMED
        if (allowedStatuses.includes(item.transaction.orderStatus)) {
          const redeemedVoucher = await customerVoucher.findOne({
            where: {
              transactionItemId: item.id,
              status: "REDEEM",
            },
          });

          if (redeemedVoucher) return item;
        }
      }

      return null;
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
