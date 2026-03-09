"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            "relationshipPackageConsultationCategory",
            {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true,
                },
                packageId: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    references: {
                        model: "masterPackage",
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

        // Buat index
        await queryInterface.addIndex(
            "relationshipPackageConsultationCategory",
            ["packageId"],
            {
                name: "idx_rpkgcc_package",
            }
        );
        await queryInterface.addIndex(
            "relationshipPackageConsultationCategory",
            ["consultationCategoryId"],
            {
                name: "idx_rpkgcc_consultation",
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("relationshipPackageConsultationCategory");
    },
};
