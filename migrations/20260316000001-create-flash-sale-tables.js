"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create flashSale table
    await queryInterface.createTable("flashSale", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("UPCOMING", "ACTIVE", "ENDED"),
        allowNull: false,
        defaultValue: "UPCOMING",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // 2. Create flashSaleItem table
    await queryInterface.createTable("flashSaleItem", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      flashSaleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "flashSale",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterLocation",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      itemType: {
        type: Sequelize.ENUM("PRODUCT", "PACKAGE"),
        allowNull: false,
        defaultValue: "PRODUCT",
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "masterProduct",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "masterPackage",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      flashPrice: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      quota: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sold: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("flashSaleItem");
    await queryInterface.dropTable("flashSale");
  },
};
