"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("rating_images", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },

      ratingId: {
        type: Sequelize.UUID,
        allowNull: false,
      },

      imageUrl: {
        type: Sequelize.STRING(255),
        allowNull: false,
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

    await queryInterface.addConstraint("rating_images", {
      fields: ["ratingId"],
      type: "foreign key",
      name: "fk_rating_images_rating",
      references: {
        table: "ratings",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE", // 🔥 rating dihapus → image ikut hilang
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "rating_images",
      "fk_rating_images_rating"
    );
    await queryInterface.dropTable("rating_images");
  },
};
