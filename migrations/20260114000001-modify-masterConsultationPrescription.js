"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Remove columns
        await queryInterface.removeColumn("masterConsultationPrescription", "doctorId");
        await queryInterface.removeColumn("masterConsultationPrescription", "customerId");
        await queryInterface.removeColumn("masterConsultationPrescription", "productId");

        // 2. Add new columns
        await queryInterface.addColumn("masterConsultationPrescription", "refferenceId", {
            type: Sequelize.UUID,
            allowNull: false,
        });

        await queryInterface.addColumn("masterConsultationPrescription", "refferenceType", {
            type: Sequelize.STRING,
            allowNull: false,
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Revert changes
        // 1. Remove new columns
        await queryInterface.removeColumn("masterConsultationPrescription", "refferenceId");
        await queryInterface.removeColumn("masterConsultationPrescription", "refferenceType");

        // 2. Add back old columns (Note: Data loss is unavoidable for the dropped columns if not backed up)
        await queryInterface.addColumn("masterConsultationPrescription", "doctorId", {
            type: Sequelize.UUID,
            allowNull: false,
        });
        await queryInterface.addColumn("masterConsultationPrescription", "customerId", {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: "masterCustomer",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        });
        await queryInterface.addColumn("masterConsultationPrescription", "productId", {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: "masterProduct",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        });
    },
};
