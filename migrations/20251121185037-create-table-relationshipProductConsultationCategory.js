"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "relationshipProductConsultationCategory",
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        productId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "masterProduct",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        consultationCategoryId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "masterConsultationCategory",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    // Buat index dengan nama pendek
    await queryInterface.addIndex(
      "relationshipProductConsultationCategory",
      ["productId"],
      {
        name: "idx_rpc_product",
      }
    );
    await queryInterface.addIndex(
      "relationshipProductConsultationCategory",
      ["consultationCategoryId"],
      {
        name: "idx_rpc_consultation",
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("relationshipProductConsultationCategory");
  },
};
