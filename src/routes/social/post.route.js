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

// Get a single post
router.get("/:postId", postController.getPost);

// Delete a post
router.delete("/:postId", postController.deletePost);

// Get posts by a specific user
router.get("/user/:userId", postController.getUserPosts);

module.exports = router;
