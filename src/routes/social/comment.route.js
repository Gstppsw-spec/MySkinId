const express = require("express");
const router = express.Router();
const commentController = require("../../controllers/comment.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");

// All routes require authentication
router.use(verifyToken);

// Add a comment to a post
router.post("/:postId/comments", commentController.addComment);

// Get comments for a post
router.get("/:postId/comments", commentController.getComments);

// Delete a comment
router.delete("/comments/:commentId", commentController.deleteComment);

module.exports = router;
