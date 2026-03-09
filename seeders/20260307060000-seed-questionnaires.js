"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
    async up(queryInterface, Sequelize) {
        // Step 1: Get existing consultation categories
        const categories = await queryInterface.sequelize.query(
            `SELECT id, name FROM masterConsultationCategory WHERE isActive = 1`,
            { type: Sequelize.QueryTypes.SELECT },
        );

        if (categories.length === 0) {
            console.log("No consultation categories found. Skipping questionnaire seed.");
            return;
        }

        // Build a map for easy lookup
        const categoryMap = {};
        categories.forEach((cat) => {
            categoryMap[cat.name.toLowerCase()] = cat.id;
        });

        const now = new Date();

        // Step 2: Define questionnaires
        const questionnaires = [
            // ---- Pertanyaan umum (untuk semua category) ----
            {
                id: uuidv4(),
                question: "Sudah berapa lama Anda mengalami masalah ini?",

                options: JSON.stringify([
                    "Kurang dari 1 minggu",
                    "1-4 minggu",
                    "1-6 bulan",
                    "Lebih dari 6 bulan",
                ]),
                sortOrder: 1,
                isRequired: true,
                isActive: true,
                forAllCategories: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: uuidv4(),
                question: "Apakah Anda sedang menggunakan produk skincare tertentu saat ini?",

                options: JSON.stringify(["Ya", "Tidak"]),
                sortOrder: 2,
                isRequired: true,
                isActive: true,
                forAllCategories: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: uuidv4(),
                question: "Produk skincare apa yang sedang Anda gunakan saat ini?",
                options: JSON.stringify([
                    "Cleanser / Sabun Wajah",
                    "Toner",
                    "Serum",
                    "Moisturizer",
                    "Sunscreen",
                    "Retinol / Tretinoin",
                    "Lainnya",
                ]),
                sortOrder: 3,
                isRequired: false,
                isActive: true,
                forAllCategories: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: uuidv4(),
                question: "Apakah Anda memiliki alergi terhadap bahan tertentu?",

                options: JSON.stringify(["Ya", "Tidak", "Tidak tahu"]),
                sortOrder: 4,
                isRequired: true,
                isActive: true,
                forAllCategories: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: uuidv4(),
                question: "Jenis alergi apa yang Anda miliki?",
                options: JSON.stringify([
                    "Alergi bahan kimia tertentu",
                    "Alergi fragrance / pewangi",
                    "Alergi logam (nikel, dll)",
                    "Alergi latex",
                    "Alergi makanan yang berpengaruh ke kulit",
                    "Lainnya",
                ]),
                sortOrder: 5,
                isRequired: false,
                isActive: true,
                forAllCategories: true,
                createdAt: now,
                updatedAt: now,
            },

            // ---- Pertanyaan spesifik untuk Skincare Facial ----
            {
                id: uuidv4(),
                question: "Apa jenis kulit wajah Anda?",

                options: JSON.stringify([
                    "Berminyak",
                    "Kering",
                    "Kombinasi",
                    "Normal",
                    "Sensitif",
                ]),
                sortOrder: 6,
                isRequired: true,
                isActive: true,
                categoryKeywords: ["facial", "skincare", "wajah", "kulit"],
                createdAt: now,
                updatedAt: now,
            },
            {
                id: uuidv4(),
                question: "Masalah kulit wajah apa yang Anda alami? (pilih semua yang sesuai)",

                options: JSON.stringify([
                    "Jerawat",
                    "Komedo",
                    "Flek hitam / hiperpigmentasi",
                    "Kulit kusam",
                    "Pori-pori besar",
                    "Kerutan / garis halus",
                    "Kulit kering / mengelupas",
                    "Kemerahan / iritasi",
                ]),
                sortOrder: 7,
                isRequired: true,
                isActive: true,
                categoryKeywords: ["facial", "skincare", "wajah", "kulit"],
                createdAt: now,
                updatedAt: now,
            },
            {
                id: uuidv4(),
                question: "Seberapa sering Anda melakukan perawatan wajah?",

                options: JSON.stringify([
                    "Setiap hari",
                    "2-3 kali seminggu",
                    "Seminggu sekali",
                    "Jarang / tidak pernah",
                ]),
                sortOrder: 8,
                isRequired: false,
                isActive: true,
                categoryKeywords: ["facial", "skincare", "wajah", "kulit"],
                createdAt: now,
                updatedAt: now,
            },

            // ---- Pertanyaan spesifik untuk Rambut / Hair ----
            {
                id: uuidv4(),
                question: "Apa jenis rambut Anda?",

                options: JSON.stringify([
                    "Berminyak",
                    "Kering",
                    "Normal",
                    "Kombinasi",
                ]),
                sortOrder: 6,
                isRequired: true,
                isActive: true,
                categoryKeywords: ["rambut", "hair", "kepala"],
                createdAt: now,
                updatedAt: now,
            },
            {
                id: uuidv4(),
                question: "Masalah rambut apa yang Anda alami?",

                options: JSON.stringify([
                    "Rambut rontok",
                    "Ketombe",
                    "Rambut kering / rusak",
                    "Rambut berminyak berlebih",
                    "Kulit kepala gatal",
                    "Rambut tipis / menipis",
                ]),
                sortOrder: 7,
                isRequired: true,
                isActive: true,
                categoryKeywords: ["rambut", "hair", "kepala"],
                createdAt: now,
                updatedAt: now,
            },

            // ---- Pertanyaan spesifik untuk Tubuh / Body ----
            {
                id: uuidv4(),
                question: "Area tubuh mana yang bermasalah?",

                options: JSON.stringify([
                    "Lengan",
                    "Kaki",
                    "Punggung",
                    "Dada",
                    "Perut",
                    "Leher",
                    "Seluruh tubuh",
                ]),
                sortOrder: 6,
                isRequired: true,
                isActive: true,
                categoryKeywords: ["body", "tubuh", "badan"],
                createdAt: now,
                updatedAt: now,
            },
            {
                id: uuidv4(),
                question: "Masalah kulit tubuh apa yang Anda alami?",

                options: JSON.stringify([
                    "Kulit kering",
                    "Gatal-gatal",
                    "Stretch mark",
                    "Selulit",
                    "Hiperpigmentasi",
                    "Kemerahan / ruam",
                    "Jerawat badan",
                ]),
                sortOrder: 7,
                isRequired: true,
                isActive: true,
                categoryKeywords: ["body", "tubuh", "badan"],
                createdAt: now,
                updatedAt: now,
            },
        ];

        // Step 3: Insert questionnaires (without metadata fields)
        const questionnaireInserts = questionnaires.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            sortOrder: q.sortOrder,
            isRequired: q.isRequired,
            isActive: q.isActive,
            createdAt: q.createdAt,
            updatedAt: q.updatedAt,
        }));

        await queryInterface.bulkInsert("masterQuestionnaire", questionnaireInserts);

        // Step 4: Create pivot relationships
        const pivotRecords = [];
        const allCategoryIds = categories.map((c) => c.id);

        for (const q of questionnaires) {
            if (q.forAllCategories) {
                // Assign to all categories
                for (const catId of allCategoryIds) {
                    pivotRecords.push({
                        id: uuidv4(),
                        questionnaireId: q.id,
                        consultationCategoryId: catId,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            } else if (q.categoryKeywords) {
                // Match by keywords in category name
                for (const cat of categories) {
                    const catNameLower = cat.name.toLowerCase();
                    const matches = q.categoryKeywords.some((kw) =>
                        catNameLower.includes(kw),
                    );
                    if (matches) {
                        pivotRecords.push({
                            id: uuidv4(),
                            questionnaireId: q.id,
                            consultationCategoryId: cat.id,
                            createdAt: now,
                            updatedAt: now,
                        });
                    }
                }
            }
        }

        if (pivotRecords.length > 0) {
            await queryInterface.bulkInsert(
                "relationshipQuestionnaireCategoryConsultation",
                pivotRecords,
            );
        }

        console.log(
            `Seeded ${questionnaireInserts.length} questionnaires with ${pivotRecords.length} category relationships`,
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete(
            "relationshipQuestionnaireCategoryConsultation",
            null,
            {},
        );
        await queryInterface.bulkDelete("masterQuestionnaire", null, {});
    },
};
