"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        const timestamp = new Date();

        // Ambil semua package
        const [packages] = await queryInterface.sequelize.query(
            `SELECT id, name FROM masterPackage`
        );

        // Ambil semua kategori konsultasi
        const [categories] = await queryInterface.sequelize.query(
            `SELECT id, name FROM masterConsultationCategory`
        );

        // Buat mapping nama → id
        const categoryMap = {};
        categories.forEach((c) => (categoryMap[c.name] = c.id));

        // Mapping package ke kategori konsultasi (1 package bisa punya beberapa kategori)
        const pivotData = [
            { packageName: packages[0]?.name, consultationCategoryName: "Skincare Facial" },
            { packageName: packages[0]?.name, consultationCategoryName: "Body Treatment" },
            { packageName: packages[1]?.name, consultationCategoryName: "Hair Care" },
            { packageName: packages[1]?.name, consultationCategoryName: "Consultation Only" },
            { packageName: packages[2]?.name, consultationCategoryName: "Skincare Facial" },
            { packageName: packages[2]?.name, consultationCategoryName: "Consultation Only" },
        ];

        const bulkInsertData = pivotData
            .map((item) => {
                if (!item.packageName) return null;
                const pkg = packages.find((p) => p.name === item.packageName);
                if (!pkg) return null;
                if (!categoryMap[item.consultationCategoryName]) return null;

                return {
                    id: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
                    packageId: pkg.id,
                    consultationCategoryId: categoryMap[item.consultationCategoryName],
                    createdAt: timestamp,
                    updatedAt: timestamp,
                };
            })
            .filter(Boolean);

        if (bulkInsertData.length > 0) {
            await queryInterface.bulkInsert(
                "relationshipPackageConsultationCategory",
                bulkInsertData
            );
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete(
            "relationshipPackageConsultationCategory",
            null,
            {}
        );
    },
};
