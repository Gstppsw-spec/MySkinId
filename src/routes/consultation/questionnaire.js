const express = require("express");
const router = express.Router();
const questionnaire = require("../../controllers/masterQuestionnaire");
const { verifyToken } = require("../../middlewares/authMiddleware");

router.use(verifyToken);

// Customer-facing: get questions by consultation category
router.get("/questions/:consultationCategoryId", questionnaire.getQuestionsByCategory);

// Admin CRUD
router.get("/questions", questionnaire.getAll);
router.post("/questions", questionnaire.create);
router.put("/questions/:id", questionnaire.update);
router.delete("/questions/:id", questionnaire.delete);

// Answers
router.post("/answers/:roomId", questionnaire.submitAnswers);
router.post("/save-answer/:roomId", questionnaire.saveAnswer);
router.get("/room/:roomId/progress", questionnaire.getRoomProgress);
router.get("/answers/:roomId", questionnaire.getAnswersByRoom);

module.exports = router;
