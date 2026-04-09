"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create adsConfig table
    await queryInterface.createTable("adsConfig", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM("BANNER", "CAROUSEL", "POPUP", "TOPDEALS", "PREMIUM_BADGE"),
        allowNull: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: true, // Used for Banner Position (1, 2, 3, 4)
      },
      slideNumber: {
        type: Sequelize.INTEGER,
        allowNull: true, // Used for Slide number (1, 2, 3, 4, 5)
      },
      pricePerDay: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      maxSlots: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // 2. Create adsPurchase table
    await queryInterface.createTable("adsPurchase", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
      orderId: {
        type: Sequelize.UUID,
        allowNull: true, // Can be null if it's a default/free ad (though usually not)
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      adsType: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      configId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "adsConfig",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      data: {
        type: Sequelize.TEXT, // Store JSON string (imageUrl, link, productId, etc.)
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("PENDING", "PAID", "EXPIRED", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.dropTable("adsPurchase");
    await queryInterface.dropTable("adsConfig");
  },
};
