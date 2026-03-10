const {
    masterQuestionnaire,
    masterQuestionnaireAnswer,
    masterConsultationCategory,
    relationshipQuestionnaireCategoryConsultation,
    masterRoomConsultation,
} = require("../models");

module.exports = {
    // ============================
    // 📋 ADMIN CRUD
    // ============================

    async create(data) {
        try {
            const { question, options, sortOrder, isRequired, isActive, consultationCategoryIds } = data;

            if (!question || question.trim() === "") {
                return { status: false, message: "Pertanyaan tidak boleh kosong", data: null };
            }

            if (!consultationCategoryIds || consultationCategoryIds.length === 0) {
                return { status: false, message: "Minimal 1 kategori konsultasi harus dipilih", data: null };
            }

            if (!options || (Array.isArray(options) && options.length === 0)) {
                return { status: false, message: "Opsi jawaban harus diisi", data: null };
            }

            const questionnaire = await masterQuestionnaire.create({
                question,
                options: options || null,
                sortOrder: sortOrder || 0,
                isRequired: isRequired !== undefined ? isRequired : true,
                isActive: isActive !== undefined ? isActive : true,
            });

            // Create pivot records
            const pivotData = consultationCategoryIds.map((catId) => ({
                questionnaireId: questionnaire.id,
                consultationCategoryId: catId,
            }));
            await relationshipQuestionnaireCategoryConsultation.bulkCreate(pivotData);

            // Reload with associations
            const result = await masterQuestionnaire.findByPk(questionnaire.id, {
                include: [
                    {
                        model: masterConsultationCategory,
                        as: "consultationCategories",
                        attributes: ["id", "name"],
                        through: { attributes: [] },
                    },
                ],
            });

            return { status: true, message: "Pertanyaan berhasil dibuat", data: result };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },

    async update(id, data) {
        try {
            const questionnaire = await masterQuestionnaire.findByPk(id);
            if (!questionnaire) {
                return { status: false, message: "Pertanyaan tidak ditemukan", data: null };
            }

            const { question, options, sortOrder, isRequired, isActive, consultationCategoryIds } = data;

            if (question !== undefined) questionnaire.question = question;
            if (options !== undefined) questionnaire.options = options;
            if (sortOrder !== undefined) questionnaire.sortOrder = sortOrder;
            if (isRequired !== undefined) questionnaire.isRequired = isRequired;
            if (isActive !== undefined) questionnaire.isActive = isActive;

            await questionnaire.save();

            // Update category associations if provided
            if (consultationCategoryIds && consultationCategoryIds.length > 0) {
                // Remove old associations
                await relationshipQuestionnaireCategoryConsultation.destroy({
                    where: { questionnaireId: id },
                });

                // Create new ones
                const pivotData = consultationCategoryIds.map((catId) => ({
                    questionnaireId: id,
                    consultationCategoryId: catId,
                }));
                await relationshipQuestionnaireCategoryConsultation.bulkCreate(pivotData);
            }

            const result = await masterQuestionnaire.findByPk(id, {
                include: [
                    {
                        model: masterConsultationCategory,
                        as: "consultationCategories",
                        attributes: ["id", "name"],
                        through: { attributes: [] },
                    },
                ],
            });

            return { status: true, message: "Pertanyaan berhasil diupdate", data: result };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },

    async delete(id) {
        try {
            const questionnaire = await masterQuestionnaire.findByPk(id);
            if (!questionnaire) {
                return { status: false, message: "Pertanyaan tidak ditemukan", data: null };
            }

            // Delete pivot records first
            await relationshipQuestionnaireCategoryConsultation.destroy({
                where: { questionnaireId: id },
            });

            await questionnaire.destroy();

            return { status: true, message: "Pertanyaan berhasil dihapus", data: null };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },

    async getAll(consultationCategoryId = null) {
        try {
            let whereClause = {};
            let includeOpts = [
                {
                    model: masterConsultationCategory,
                    as: "consultationCategories",
                    attributes: ["id", "name"],
                    through: { attributes: [] },
                },
            ];

            // If filtering by category, use inner join through the pivot
            if (consultationCategoryId) {
                includeOpts = [
                    {
                        model: masterConsultationCategory,
                        as: "consultationCategories",
                        attributes: ["id", "name"],
                        through: { attributes: [] },
                        where: { id: consultationCategoryId },
                    },
                ];
            }

            const questionnaires = await masterQuestionnaire.findAll({
                where: whereClause,
                include: includeOpts,
                order: [["sortOrder", "ASC"], ["createdAt", "ASC"]],
            });

            return { status: true, message: "Success", data: questionnaires };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },

    // ============================
    // 👤 CUSTOMER-FACING
    // ============================

    async getQuestionsByCategory(consultationCategoryId) {
        try {
            if (!consultationCategoryId) {
                return { status: false, message: "Kategori konsultasi harus dipilih", data: null };
            }

            const category = await masterConsultationCategory.findByPk(consultationCategoryId);
            if (!category) {
                return { status: false, message: "Kategori konsultasi tidak ditemukan", data: null };
            }

            const questionnaires = await masterQuestionnaire.findAll({
                where: { isActive: true },
                include: [
                    {
                        model: masterConsultationCategory,
                        as: "consultationCategories",
                        attributes: [],
                        through: { attributes: [] },
                        where: { id: consultationCategoryId },
                    },
                ],
                attributes: ["id", "question", "options", "sortOrder", "isRequired"],
                order: [["sortOrder", "ASC"]],
            });

            return { status: true, message: "Success", data: questionnaires };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },

    async getRoomProgress(roomId) {
        try {
            if (!roomId) {
                return { status: false, message: "Room ID tidak boleh kosong", data: null };
            }

            const room = await masterRoomConsultation.findByPk(roomId);
            if (!room) {
                return { status: false, message: "Room tidak ditemukan", data: null };
            }

            // Get all questions for this category
            const questions = await masterQuestionnaire.findAll({
                where: { isActive: true },
                include: [
                    {
                        model: masterConsultationCategory,
                        as: "consultationCategories",
                        attributes: [],
                        through: { attributes: [] },
                        where: { id: room.consultationCategoryId },
                    },
                ],
                attributes: ["id", "question", "options", "sortOrder", "isRequired"],
                order: [["sortOrder", "ASC"]],
            });

            // Get current answers
            const answers = await masterQuestionnaireAnswer.findAll({
                where: { roomId },
                attributes: ["questionnaireId", "answer"],
            });

            const answerMap = {};
            answers.forEach(a => {
                answerMap[a.questionnaireId] = a.answer;
            });

            const progress = questions.map((q, index) => ({
                ...q.toJSON(),
                isAnswered: !!answerMap[q.id],
                currentAnswer: answerMap[q.id] || null,
                index,
            }));

            const totalQuestions = progress.length;
            const answeredCount = progress.filter(p => p.isAnswered).length;
            const nextQuestionIndex = progress.findIndex(p => !p.isAnswered);

            // Check if all REQUIRED questions are answered
            const requiredMissing = progress.filter(p => p.isRequired && !p.isAnswered);
            const isComplete = requiredMissing.length === 0;

            return {
                status: true,
                message: "Success",
                data: {
                    roomId,
                    roomStatus: room.status,
                    totalQuestions,
                    answeredCount,
                    isComplete,
                    nextQuestionIndex: nextQuestionIndex !== -1 ? nextQuestionIndex : null,
                    questions: progress,
                },
            };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },

    async saveAnswer(roomId, questionnaireId, answer) {
        try {
            if (!roomId || !questionnaireId) {
                return { status: false, message: "Room ID dan Questionnaire ID wajib diisi", data: null };
            }

            const room = await masterRoomConsultation.findByPk(roomId);
            if (!room) {
                return { status: false, message: "Room tidak ditemukan", data: null };
            }

            const questionnaire = await masterQuestionnaire.findByPk(questionnaireId);
            if (!questionnaire) {
                return { status: false, message: "Pertanyaan tidak ditemukan", data: null };
            }

            // Upsert answer
            await masterQuestionnaireAnswer.upsert({
                roomId,
                questionnaireId,
                answer: typeof answer === "object" ? JSON.stringify(answer) : answer,
            });

            // Check if this completes the required questionnaire
            const progress = await this.getRoomProgress(roomId);
            if (progress.data.isComplete && room.status === "waiting_questionnaire") {
                room.status = "pending";
                await room.save();
            }

            return {
                status: true,
                message: "Jawaban berhasil disimpan",
                data: {
                    isComplete: progress.data.isComplete,
                    nextQuestionIndex: progress.data.nextQuestionIndex
                }
            };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },

    async submitAnswers(roomId, answers) {
        try {
            if (!roomId) {
                return { status: false, message: "Room ID tidak boleh kosong", data: null };
            }

            const room = await masterRoomConsultation.findByPk(roomId);
            if (!room) {
                return { status: false, message: "Room tidak ditemukan", data: null };
            }

            if (!answers || answers.length === 0) {
                return { status: false, message: "Jawaban tidak boleh kosong", data: null };
            }

            // Save all answers
            const answerData = answers.map((a) => ({
                roomId,
                questionnaireId: a.questionnaireId,
                answer: typeof a.answer === "object" ? JSON.stringify(a.answer) : a.answer,
            }));

            for (const data of answerData) {
                await masterQuestionnaireAnswer.upsert(data);
            }

            // Check progress and update status
            const progress = await this.getRoomProgress(roomId);
            if (progress.data.isComplete && room.status === "waiting_questionnaire") {
                room.status = "pending";
                await room.save();
            }

            if (!progress.data.isComplete) {
                const missingQuestions = progress.data.questions
                    .filter(q => q.isRequired && !q.isAnswered)
                    .map(q => q.question)
                    .join(", ");

                return {
                    status: false,
                    message: `Pertanyaan wajib belum dijawab: ${missingQuestions}`,
                    data: progress.data,
                };
            }

            return { status: true, message: "Jawaban berhasil disimpan", data: progress.data };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },

    async getAnswersByRoom(roomId) {
        try {
            if (!roomId) {
                return { status: false, message: "Room ID tidak boleh kosong", data: null };
            }

            const answers = await masterQuestionnaireAnswer.findAll({
                where: { roomId },
                include: [
                    {
                        model: masterQuestionnaire,
                        as: "questionnaire",
                        attributes: ["id", "question", "options"],
                    },
                ],
                order: [[{ model: masterQuestionnaire, as: "questionnaire" }, "sortOrder", "ASC"]],
            });

            return { status: true, message: "Success", data: answers };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    },
};
