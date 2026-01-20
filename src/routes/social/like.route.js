const express = require("express");
const router = express.Router();
const likeController = require("../../controllers/like.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");

// All routes require authentication
router.use(verifyToken);

// Like a post
router.post("/:postId/like", likeController.likePost);

// Unlike a post
router.delete("/:postId/like", likeController.unlikePost);

// Get users who liked a post
router.get("/:postId/likes", likeController.getPostLikes);

module.exports = router;
