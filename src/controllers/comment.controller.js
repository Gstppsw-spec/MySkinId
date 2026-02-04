const commentService = require("../services/comment.service");
const { formatPagination } = require("../utils/pagination");

class CommentController {
    /**
     * Add a comment to a post
     * POST /posts/:postId/comments
     */
    async addComment(req, res) {
        try {
            const { postId } = req.params;
            const userId = req.user.id;
            const { commentText } = req.body;

            const comment = await commentService.addComment(
                postId,
                userId,
                commentText
            );

            res.status(201).json({
                success: true,
                message: "Comment added successfully",
                data: comment,
            });
        } catch (error) {
            console.error("Add comment error:", error);
            const statusCode =
                error.message === "Post not found"
                    ? 404
                    : error.message === "Comment text is required"
                        ? 400
                        : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || "Failed to add comment",
            });
        }
    }

    /**
     * Get comments for a post
     * GET /posts/:postId/comments
     */
    async getComments(req, res) {
        try {
            const { postId } = req.params;
            const userId = req.user?.id;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;

            const { comments, totalCount } = await commentService.getComments(postId, userId, limit, offset);

            const pageNumber = Math.floor(offset / limit) + 1;

            res.status(200).json({
                success: true,
                data: comments,
                pagination: formatPagination(totalCount, pageNumber, limit),
            });
        } catch (error) {
            console.error("Get comments error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch comments",
            });
        }
    }

    /**
     * Delete a comment
     * DELETE /comments/:commentId
     */
    async deleteComment(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const result = await commentService.deleteComment(commentId, userId);

            res.status(200).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            console.error("Delete comment error:", error);
            const statusCode =
                error.message === "Comment not found"
                    ? 404
                    : error.message.includes("Unauthorized")
                        ? 403
                        : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || "Failed to delete comment",
            });
        }
    }

    /**
     * Like a comment
     * POST /comments/:commentId/like
     */
    async likeComment(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const result = await commentService.likeComment(commentId, userId);

            res.status(200).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            console.error("Like comment error:", error);
            const statusCode =
                error.message === "Comment not found"
                    ? 404
                    : error.message === "Already liked this comment"
                        ? 400
                        : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || "Failed to like comment",
            });
        }
    }

    /**
     * Unlike a comment
     * DELETE /comments/:commentId/like
     */
    async unlikeComment(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;

            const result = await commentService.unlikeComment(commentId, userId);

            res.status(200).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            console.error("Unlike comment error:", error);
            const statusCode =
                error.message === "Comment not found"
                    ? 404
                    : error.message === "Comment not liked yet"
                        ? 400
                        : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || "Failed to unlike comment",
            });
        }
    }

    /**
     * Get users who liked a comment
     * GET /comments/:commentId/likes
     */
    async getCommentLikes(req, res) {
        try {
            const { commentId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;

            const { likes, totalCount } = await commentService.getCommentLikes(
                commentId,
                limit,
                offset
            );

            const pageNumber = Math.floor(offset / limit) + 1;

            res.status(200).json({
                success: true,
                data: likes,
                pagination: formatPagination(totalCount, pageNumber, limit),
            });
        } catch (error) {
            console.error("Get comment likes error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch comment likes",
            });
        }
    }
}

module.exports = new CommentController();
