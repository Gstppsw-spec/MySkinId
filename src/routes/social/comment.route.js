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

// Like a comment
router.post("/comments/:commentId/like", commentController.likeComment);

// Unlike a comment
router.delete("/comments/:commentId/like", commentController.unlikeComment);

// Get users who liked a comment
router.get("/comments/:commentId/likes", commentController.getCommentLikes);

module.exports = router;
