const postService = require("../services/post.service");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "uploads/posts";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
        const extname = allowedTypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Only images and videos are allowed"));
        }
    },
});

class PostController {
    /**
     * Create a new post
     * POST /posts
     */
    async createPost(req, res) {
        try {
            const userId = req.user.id; // From auth middleware
            const { caption } = req.body;
            const files = req.files || [];

            // Process uploaded files
            const mediaFiles = files.map((file) => {
                const isVideo = /\.(mp4|mov|avi)$/i.test(file.filename);
                return {
                    url: `uploads/posts/${file.filename}`,
                    type: isVideo ? "video" : "image",
                };
            });

            const post = await postService.createPost(userId, caption, mediaFiles);

            res.status(201).json({
                success: true,
                message: "Post created successfully",
                data: post,
            });
        } catch (error) {
            console.error("Create post error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to create post",
            });
        }
    }

    /**
     * Get personalized feed
     * GET /posts/feed
     */
    async getFeed(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;

            const posts = await postService.getFeed(userId, limit, offset);

            res.status(200).json({
                success: true,
                data: posts,
                pagination: {
                    limit,
                    offset,
                    count: posts.length,
                },
            });
        } catch (error) {
            console.error("Get feed error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch feed",
            });
        }
    }

    /**
     * Get a single post
     * GET /posts/:postId
     */
    async getPost(req, res) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const post = await postService.getPostById(postId, userId);

            res.status(200).json({
                success: true,
                data: post,
            });
        } catch (error) {
            console.error("Get post error:", error);
            const statusCode = error.message === "Post not found" ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || "Failed to fetch post",
            });
        }
    }

    /**
     * Delete a post
     * DELETE /posts/:postId
     */
    async deletePost(req, res) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const result = await postService.deletePost(postId, userId);

            res.status(200).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            console.error("Delete post error:", error);
            const statusCode =
                error.message === "Post not found"
                    ? 404
                    : error.message.includes("Unauthorized")
                        ? 403
                        : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || "Failed to delete post",
            });
        }
    }

    /**
     * Get posts by a specific user
     * GET /users/:userId/posts
     */
    async getUserPosts(req, res) {
        try {
            const { userId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;

            const posts = await postService.getUserPosts(userId, limit, offset);

            res.status(200).json({
                success: true,
                data: posts,
                pagination: {
                    limit,
                    offset,
                    count: posts.length,
                },
            });
        } catch (error) {
            console.error("Get user posts error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch user posts",
            });
        }
    }
}

// Export controller instance and upload middleware
// Export controller instance and upload middleware
const controller = new PostController();
controller.upload = upload.array("media", 10); // Allow up to 10 files
module.exports = controller;
