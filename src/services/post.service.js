const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { Op } = require("sequelize");

class PostService {
    /**
     * Create a new post with media
     * @param {string} userId - User ID creating the post
     * @param {string} caption - Post caption
     * @param {Array} mediaFiles - Array of media file paths [{url, type}]
     * @returns {Object} Created post with media
     */
    async createPost(userId, caption, mediaFiles = []) {
        const transaction = await db.sequelize.transaction();

        try {
            // Create the post
            const postId = uuidv4();
            const post = await db.posts.create(
                {
                    id: postId,
                    userId,
                    caption,
                },
                { transaction }
            );

            // Create media entries if provided
            if (mediaFiles && mediaFiles.length > 0) {
                const mediaData = mediaFiles.map((file, index) => ({
                    id: uuidv4(),
                    postId,
                    mediaUrl: file.url,
                    mediaType: file.type,
                    orderIndex: index,
                }));

                await db.postMedia.bulkCreate(mediaData, { transaction });
            }

            await transaction.commit();

            // Fetch the complete post with media and user info
            return await this.getPostById(postId, userId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get personalized feed for a user
     * @param {string} userId - Current user ID
     * @param {number} limit - Number of posts to fetch
     * @param {number} offset - Offset for pagination
     * @returns {Array} Array of posts
     */
    async getFeed(userId, limit = 20, offset = 0) {
        // Using raw query for the UNION as specified
        const query = `
      SELECT p.*
      FROM posts p
      JOIN followers f ON p.userId = f.followingId
      WHERE f.followerId = :userId

      UNION

      SELECT *
      FROM posts
      WHERE userId = :userId

      ORDER BY createdAt DESC
      LIMIT :limit OFFSET :offset
    `;

        const posts = await db.sequelize.query(query, {
            replacements: { userId, limit, offset },
            type: db.Sequelize.QueryTypes.SELECT,
        });

        // Enrich posts with additional data
        const enrichedPosts = await Promise.all(
            posts.map(async (post) => {
                // Get user info
                const user = await db.masterCustomer.findByPk(post.userId, {
                    attributes: ["id", "name", "username", "profileImageUrl"],
                });

                // Get media
                const media = await db.postMedia.findAll({
                    where: { postId: post.id },
                    order: [["orderIndex", "ASC"]],
                });

                // Get likes count
                const likesCount = await db.postLikes.count({
                    where: { postId: post.id },
                });

                // Check if current user liked this post
                const isLiked = await db.postLikes.findOne({
                    where: { postId: post.id, userId },
                });

                // Get comments count
                const commentsCount = await db.postComments.count({
                    where: { postId: post.id },
                });

                return {
                    ...post,
                    user: user ? user.toJSON() : null,
                    media: media.map((m) => m.toJSON()),
                    likesCount,
                    isLiked: !!isLiked,
                    commentsCount,
                };
            })
        );

        return enrichedPosts;
    }

    /**
     * Get a single post by ID
     * @param {string} postId - Post ID
     * @param {string} userId - Current user ID (to check like status)
     * @returns {Object} Post details
     */
    async getPostById(postId, userId) {
        const post = await db.posts.findByPk(postId, {
            include: [
                {
                    model: db.masterCustomer,
                    as: "user",
                    attributes: ["id", "name", "username", "profileImageUrl"],
                },
                {
                    model: db.postMedia,
                    as: "media",
                    order: [["orderIndex", "ASC"]],
                },
            ],
        });

        if (!post) {
            throw new Error("Post not found");
        }

        // Get likes count
        const likesCount = await db.postLikes.count({
            where: { postId },
        });

        // Check if current user liked this post
        const isLiked = await db.postLikes.findOne({
            where: { postId, userId },
        });

        // Get comments count
        const commentsCount = await db.postComments.count({
            where: { postId },
        });

        return {
            ...post.toJSON(),
            likesCount,
            isLiked: !!isLiked,
            commentsCount,
        };
    }

    /**
     * Delete a post (only by owner)
     * @param {string} postId - Post ID
     * @param {string} userId - User ID requesting deletion
     */
    async deletePost(postId, userId) {
        const post = await db.posts.findByPk(postId);

        if (!post) {
            throw new Error("Post not found");
        }

        if (post.userId !== userId) {
            throw new Error("Unauthorized: You can only delete your own posts");
        }

        await post.destroy();
        return { message: "Post deleted successfully" };
    }

    /**
     * Get posts by a specific user
     * @param {string} targetUserId - User ID whose posts to fetch
     * @param {number} limit - Number of posts
     * @param {number} offset - Offset for pagination
     * @returns {Array} Array of posts
     */
    async getUserPosts(targetUserId, limit = 20, offset = 0) {
        const posts = await db.posts.findAll({
            where: { userId: targetUserId },
            include: [
                {
                    model: db.masterCustomer,
                    as: "user",
                    attributes: ["id", "name", "username", "profileImageUrl"],
                },
                {
                    model: db.postMedia,
                    as: "media",
                },
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        // Enrich with counts
        const enrichedPosts = await Promise.all(
            posts.map(async (post) => {
                const likesCount = await db.postLikes.count({
                    where: { postId: post.id },
                });

                const commentsCount = await db.postComments.count({
                    where: { postId: post.id },
                });

                return {
                    ...post.toJSON(),
                    likesCount,
                    commentsCount,
                };
            })
        );

        return enrichedPosts;
    }
}

module.exports = new PostService();
