const { v4: uuidv4 } = require("uuid");
const db = require("../models");

class LikeService {
    /**
     * Like a post (idempotent)
     * @param {string} postId - Post ID
     * @param {string} userId - User ID
     * @returns {Object} Like status
     */
    async likePost(postId, userId) {
        // Check if post exists
        const post = await db.posts.findByPk(postId);
        if (!post) {
            throw new Error("Post not found");
        }

        // Check if already liked
        const existingLike = await db.postLikes.findOne({
            where: { postId, userId },
        });

        if (existingLike) {
            return {
                message: "Post already liked",
                alreadyLiked: true,
            };
        }

        // Create like
        await db.postLikes.create({
            id: uuidv4(),
            postId,
            userId,
        });

        // Get updated likes count
        const likesCount = await this.getLikesCount(postId);

        return {
            message: "Post liked successfully",
            alreadyLiked: false,
            likesCount,
        };
    }

    /**
     * Unlike a post
     * @param {string} postId - Post ID
     * @param {string} userId - User ID
     * @returns {Object} Unlike status
     */
    async unlikePost(postId, userId) {
        const like = await db.postLikes.findOne({
            where: { postId, userId },
        });

        if (!like) {
            return {
                message: "Post was not liked",
                wasLiked: false,
            };
        }

        await like.destroy();

        // Get updated likes count
        const likesCount = await this.getLikesCount(postId);

        return {
            message: "Post unliked successfully",
            wasLiked: true,
            likesCount,
        };
    }

    /**
     * Get total likes count for a post
     * @param {string} postId - Post ID
     * @returns {number} Likes count
     */
    async getLikesCount(postId) {
        return await db.postLikes.count({
            where: { postId },
        });
    }

    /**
     * Get users who liked a post
     * @param {string} postId - Post ID
     * @param {number} limit - Number of users
     * @param {number} offset - Offset for pagination
     * @returns {Array} Array of users
     */
    async getPostLikes(postId, limit = 20, offset = 0) {
        const likes = await db.postLikes.findAll({
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

        return likes.map((like) => ({
            ...like.user.toJSON(),
            likedAt: like.createdAt,
        }));
    }
}

module.exports = new LikeService();
