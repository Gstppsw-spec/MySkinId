"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ratings", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },

      entityType: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: "PRODUCT | SERVICE | LOCATION | PACKAGE",
      },

      entityId: {
        type: Sequelize.UUID,
        allowNull: false,
      },

      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
      },

      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      review: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // CHECK rating 1 - 5
    await queryInterface.addConstraint("ratings", {
      fields: ["rating"],
      type: "check",
      name: "ck_ratings_rating_range",
      where: {
        rating: {
          [Sequelize.Op.between]: [1, 5],
        },
      },
    });

    // UNIQUE rating per customer per entity
    await queryInterface.addConstraint("ratings", {
      fields: ["entityType", "entityId", "customerId"],
      type: "unique",
      name: "uq_ratings_entity_customer",
    });

    // Index untuk performance
    await queryInterface.addIndex("ratings", ["entityType", "entityId"], {
      name: "idx_ratings_entity",
    });

    await queryInterface.addIndex("ratings", ["customerId"], {
      name: "idx_ratings_customer",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("ratings", "idx_ratings_customer");
    await queryInterface.removeIndex("ratings", "idx_ratings_entity");
    await queryInterface.dropTable("ratings");
  },
};
