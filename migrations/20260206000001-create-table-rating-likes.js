"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("rating_likes", {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },
            ratingId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "ratings",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            customerId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "masterCustomer",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
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
        });

        // Add compound unique index to prevent multiple likes from same user
        await queryInterface.addIndex("rating_likes", ["ratingId", "customerId"], {
            unique: true,
            name: "rating_likes_ratingId_customerId_unique",
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("rating_likes");
    },
};
