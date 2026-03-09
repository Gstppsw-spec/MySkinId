"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("masterRoomConsultation", "productId", {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: "masterProduct",
                key: "id",
            },
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });

        await queryInterface.addIndex("masterRoomConsultation", ["productId"], {
            name: "idx_mrc_product",
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("masterRoomConsultation", "productId");
    },
};
