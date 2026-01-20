const commentService = require("../services/comment.service");

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
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;

            const comments = await commentService.getComments(postId, limit, offset);

            res.status(200).json({
                success: true,
                data: comments,
                pagination: {
                    limit,
                    offset,
                    count: comments.length,
                },
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
}

module.exports = new CommentController();
