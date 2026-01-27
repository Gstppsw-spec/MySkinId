const { v4: uuidv4 } = require("uuid");
const db = require("../models");

class CommentService {
    /**
     * Add a comment to a post
     * @param {string} postId - Post ID
     * @param {string} userId - User ID
     * @param {string} commentText - Comment text
     * @returns {Object} Created comment
     */
    async addComment(postId, userId, commentText) {
        // Check if post exists
        const post = await db.posts.findByPk(postId);
        if (!post) {
            throw new Error("Post not found");
        }

        if (!commentText || commentText.trim().length === 0) {
            throw new Error("Comment text is required");
        }

        // Create comment
        const comment = await db.postComments.create({
            id: uuidv4(),
            postId,
            userId,
            commentText: commentText.trim(),
        });

        // Fetch comment with user info
        const commentWithUser = await db.postComments.findByPk(comment.id, {
            include: [
                {
                    model: db.masterCustomer,
                    as: "user",
                    attributes: ["id", "name", "username", "profileImageUrl"],
                },
            ],
        });

        return commentWithUser.toJSON();
    }

    /**
     * Get comments for a post
     * @param {string} postId - Post ID
     * @param {number} limit - Number of comments
     * @param {number} offset - Offset for pagination
     * @returns {Array} Array of comments
     */
    async getComments(postId, limit = 20, offset = 0) {
        const comments = await db.postComments.findAll({
            where: { postId },
            include: [
                {
                    model: db.masterCustomer,
                    as: "user",
                    attributes: ["id", "name", "username", "profileImageUrl"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        return comments.map((comment) => comment.toJSON());
    }

    /**
     * Delete a comment (only by owner)
     * @param {string} commentId - Comment ID
     * @param {string} userId - User ID requesting deletion
     */
    async deleteComment(commentId, userId) {
        const comment = await db.postComments.findByPk(commentId);

        if (!comment) {
            throw new Error("Comment not found");
        }

        if (comment.userId !== userId) {
            throw new Error("Unauthorized: You can only delete your own comments");
        }

        await comment.destroy();
        return { message: "Comment deleted successfully" };
    }

    /**
     * Get comments count for a post
     * @param {string} postId - Post ID
     * @returns {number} Comments count
     */
    async getCommentsCount(postId) {
        return await db.postComments.count({
            where: { postId },
        });
    }
}

module.exports = new CommentService();
