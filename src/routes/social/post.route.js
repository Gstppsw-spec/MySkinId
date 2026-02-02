const express = require("express");
const router = express.Router();
const postController = require("../../controllers/post.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");

// All routes require authentication
router.use(verifyToken);

// Create a new post with media
router.post("/", postController.upload, postController.createPost);

// Get personalized feed
router.get("/feed", postController.getFeed);

// Get blocked posts
router.get("/blocked", postController.getBlockedPosts);

// getPostLikedbyUserId
router.get("/liked", postController.getPostLikedbyUserId);

// Get a single post
router.get("/:postId", postController.getPost);

// Delete a post
router.delete("/:postId", postController.deletePost);

// Get posts by a specific user
router.get("/user/:targetUserId", postController.getUserPosts);

// Block a post
router.post("/:postId/block", postController.blockPost);

// Unblock a post
router.delete("/:postId/unblock", postController.unblockPost);

// Report a post
router.post("/:postId/report", postController.reportPost);


module.exports = router;
