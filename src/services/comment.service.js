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

        return {
            ...commentWithUser.toJSON(),
            likesCount: 0,
            isLiked: false,
        };
    }

    /**
     * Get comments for a post
     * @param {string} postId - Post ID
     * @param {number} limit - Number of comments
     * @param {number} offset - Offset for pagination
     * @returns {Array} Array of comments
     */
    async getComments(postId, userId, limit = 20, offset = 0) {
        const { count, rows: comments } = await db.postComments.findAndCountAll({
            where: { postId },
            distinct: true,
            attributes: {
                include: [
                    [
                        db.sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM postCommentLikes AS likes
                            WHERE likes.commentId = postComments.id
                        )`),
                        "likesCount",
                    ],
                    [
                        db.sequelize.literal(
                            userId
                                ? `CASE WHEN postComments.userId = '${userId}' THEN 1 ELSE 0 END`
                                : "0"
                        ),
                        "priority",
                    ],
                    [
                        db.sequelize.literal(
                            userId
                                ? `EXISTS(SELECT 1 FROM postCommentLikes WHERE commentId = postComments.id AND userId = '${userId}')`
                                : "0"
                        ),
                        "isLiked",
                    ],
                ],
            },
            include: [
                {
                    model: db.masterCustomer,
                    as: "user",
                    attributes: ["id", "name", "username", "profileImageUrl"],
                },
            ],
            order: [
                [db.sequelize.literal("priority"), "DESC"],
                [db.sequelize.literal("likesCount"), "DESC"],
                ["createdAt", "DESC"],
            ],
            limit,
            offset,
        });

        const data = comments.map((comment) => {
            const json = comment.toJSON();
            return {
                ...json,
                likesCount: parseInt(json.likesCount) || 0,
                isLiked: json.isLiked === 1 || json.isLiked === "1" || json.isLiked === true || json.isLiked === "true",
                priority: undefined,
            };
        });

        return { comments: data, totalCount: count };
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

    /**
     * Like a comment
     * @param {string} commentId - Comment ID
     * @param {string} userId - User ID
     */
    async likeComment(commentId, userId) {
        const comment = await db.postComments.findByPk(commentId);
        if (!comment) {
            throw new Error("Comment not found");
        }

        const existingLike = await db.postCommentLikes.findOne({
            where: { commentId, userId },
        });

        if (existingLike) {
            throw new Error("Already liked this comment");
        }

        await db.postCommentLikes.create({
            id: uuidv4(),
            commentId,
            userId,
        });

        return { message: "Comment liked successfully" };
    }

    /**
     * Unlike a comment
     * @param {string} commentId - Comment ID
     * @param {string} userId - User ID
     */
    async unlikeComment(commentId, userId) {
        const comment = await db.postComments.findByPk(commentId);
        if (!comment) {
            throw new Error("Comment not found");
        }

        const existingLike = await db.postCommentLikes.findOne({
            where: { commentId, userId },
        });

        if (!existingLike) {
            throw new Error("Comment not liked yet");
        }

        await existingLike.destroy();
        return { message: "Comment unliked successfully" };
    }

    /**
     * Get users who liked a comment
     * @param {string} commentId - Comment ID
     * @param {number} limit - Number of users
     * @param {number} offset - Offset
     */
    async getCommentLikes(commentId, limit = 20, offset = 0) {
        const { count, rows: likes } = await db.postCommentLikes.findAndCountAll({
            where: { commentId },
            distinct: true,
            include: [
                {
                    model: db.masterCustomer,
                    as: "user",
                    attributes: ["id", "name", "username", "profileImageUrl"],
                },
            ],
            limit,
            offset,
        });

        return {
            likes: likes.map((like) => like.user),
            totalCount: count,
        };
    }
}

module.exports = new CommentService();
