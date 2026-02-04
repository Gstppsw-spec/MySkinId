const likeService = require("../services/like.service");
const { formatPagination } = require("../utils/pagination");

class LikeController {
    /**
     * Like a post
     * POST /posts/:postId/like
     */
    async likePost(req, res) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const result = await likeService.likePost(postId, userId);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    alreadyLiked: result.alreadyLiked,
                    likesCount: result.likesCount,
                },
            });
        } catch (error) {
            console.error("Like post error:", error);
            const statusCode = error.message === "Post not found" ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || "Failed to like post",
            });
        }
    }

    /**
     * Unlike a post
     * DELETE /posts/:postId/like
     */
    async unlikePost(req, res) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;

            const result = await likeService.unlikePost(postId, userId);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    wasLiked: result.wasLiked,
                    likesCount: result.likesCount,
                },
            });
        } catch (error) {
            console.error("Unlike post error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to unlike post",
            });
        }
    }

    /**
     * Get users who liked a post
     * GET /posts/:postId/likes
     */
    async getPostLikes(req, res) {
        try {
            const { postId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;

            const { likes, totalCount } = await likeService.getPostLikes(postId, limit, offset);

            const pageNumber = Math.floor(offset / limit) + 1;

            res.status(200).json({
                success: true,
                data: likes,
                pagination: formatPagination(totalCount, pageNumber, limit),
            });
        } catch (error) {
            console.error("Get post likes error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch post likes",
            });
        }
    }
}

module.exports = new LikeController();
