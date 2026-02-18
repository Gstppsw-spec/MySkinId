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
    async createPost(userId, caption, mediaFiles = [], tags = []) {
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

            // Create tags if provided
            if (tags && tags.length > 0) {
                // Ensure tags is an array and filter out invalid ones
                const validTags = tags.filter(tag => tag && tag.referenceId && tag.referenceType);

                // Validasi: jika ada tag product/package, locationId-nya harus sama
                // dengan referenceId dari tag yang referenceType = 'location'
                const locationTag = validTags.find(tag => tag.referenceType === 'location');
                const locationTagId = locationTag ? locationTag.referenceId : null;

                for (const tag of validTags) {
                    if (tag.referenceType === 'product') {
                        const product = await db.masterProduct.findByPk(tag.referenceId, {
                            attributes: ['id', 'locationId'],
                        });
                        if (!product) {
                            throw new Error(`Product dengan id ${tag.referenceId} tidak ditemukan`);
                        }
                        if (!locationTagId) {
                            throw new Error(`Tag product memerlukan tag location. Harap sertakan tag dengan referenceType = 'location'`);
                        }
                        if (product.locationId !== locationTagId) {
                            throw new Error(`Product "${tag.referenceId}" tidak berasal dari location yang di-tag. LocationId product (${product.locationId}) harus sama dengan referenceId location tag (${locationTagId})`);
                        }
                    } else if (tag.referenceType === 'package') {
                        const pkg = await db.masterPackage.findByPk(tag.referenceId, {
                            attributes: ['id', 'locationId'],
                        });
                        if (!pkg) {
                            throw new Error(`Package dengan id ${tag.referenceId} tidak ditemukan`);
                        }
                        if (!locationTagId) {
                            throw new Error(`Tag package memerlukan tag location. Harap sertakan tag dengan referenceType = 'location'`);
                        }
                        if (pkg.locationId !== locationTagId) {
                            throw new Error(`Package "${tag.referenceId}" tidak berasal dari location yang di-tag. LocationId package (${pkg.locationId}) harus sama dengan referenceId location tag (${locationTagId})`);
                        }
                    }
                }

                const tagData = validTags.map(tag => ({
                    id: uuidv4(),
                    postId,
                    referenceId: tag.referenceId,
                    referenceType: tag.referenceType,
                }));

                if (tagData.length > 0) {
                    await db.postTags.bulkCreate(tagData, { transaction });
                }
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
        // Get blocked post IDs for this user
        const blockedPosts = await db.blockedPosts.findAll({
            where: { userId },
            attributes: ["postId"],
        });
        const blockedPostIds = blockedPosts.map((bp) => bp.postId);

        // Count query for pagination (all non-blocked posts)
        const countQuery = `
      SELECT COUNT(*) as total
      FROM posts p
      WHERE 1=1
      ${blockedPostIds.length > 0 ? "AND p.id NOT IN (:blockedPostIds)" : ""}
    `;

        const query = `
      SELECT p.*,
        CASE 
          WHEN p.userId = :userId THEN 1
          WHEN f.followerId IS NOT NULL THEN 1
          ELSE 0
        END AS priority

      FROM posts p
      LEFT JOIN followers f ON p.userId = f.followingId AND f.followerId = :userId
      
      WHERE 1=1
      ${blockedPostIds.length > 0 ? "AND p.id NOT IN (:blockedPostIds)" : ""}
      ORDER BY priority DESC, p.createdAt DESC
      LIMIT :limit OFFSET :offset
    `;

        const replacements = { userId, limit, offset };
        if (blockedPostIds.length > 0) {
            replacements.blockedPostIds = blockedPostIds;
        }

        const [posts, countResult] = await Promise.all([
            db.sequelize.query(query, {
                replacements,
                type: db.Sequelize.QueryTypes.SELECT,
            }),
            db.sequelize.query(countQuery, {
                replacements,
                type: db.Sequelize.QueryTypes.SELECT,
            })
        ]);

        const totalCount = countResult[0] ? parseInt(countResult[0].total) : 0;

        // Enrich posts with additional data
        const enrichedPosts = await Promise.all(
            posts.map(async (post) => {
                // Get user info
                const user = await db.masterCustomer.findByPk(post.userId, {
                    attributes: ["name", "username", "profileImageUrl"],
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

                // Get top 2 comments
                const topComments = await this._getTopComments(post.id, userId);

                // Get tags with details
                const tags = await this._getPostTags(post.id);

                // Get follow status
                const { isFollowing, isFriend } = await this._getFollowStatus(userId, post.userId);

                return {
                    ...post,
                    user: user ? user.toJSON() : null,
                    media: media.map((m) => {
                        const mJson = m.toJSON();
                        return { ...mJson, postId: undefined };
                    }),
                    likesCount,
                    isLiked: !!isLiked,
                    commentsCount,
                    topComments,
                    tags,
                    isFollowing,
                    isFriend,
                    // Remove old fields from response
                    referenceId: undefined,
                    referenceType: undefined,
                    titleProduct: undefined,
                    titlePackage: undefined,
                    locationName: undefined,
                    locationLatitude: undefined,
                    locationLongitude: undefined
                };
            })
        );

        return { posts: enrichedPosts, totalCount: totalCount };
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
                    attributes: ["name", "username", "profileImageUrl"],
                },
                {
                    model: db.postMedia,
                    as: "media",
                    separate: true,
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

        // Get top 2 comments
        const topComments = await this._getTopComments(postId, userId);

        // Get tags
        const tags = await this._getPostTags(postId);

        // Get follow status
        const { isFollowing, isFriend } = await this._getFollowStatus(userId, post.userId);

        const postJson = post.toJSON();
        return {
            ...postJson,
            media: postJson.media ? postJson.media.map(m => ({ ...m, postId: undefined })) : [],
            tags,
            likesCount,
            isLiked: !!isLiked,
            commentsCount,
            topComments,
            isFollowing,
            isFriend,
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
    async getUserPosts(userId, targetUserId, limit = 20, offset = 0) {
        const { count, rows: posts } = await db.posts.findAndCountAll({
            where: { userId: targetUserId },
            distinct: true,
            include: [
                {
                    model: db.masterCustomer,
                    as: "user",
                    attributes: ["name", "username", "profileImageUrl"],
                },
                {
                    model: db.postMedia,
                    separate: true,
                    as: "media",
                    order: [["orderIndex", "ASC"]],
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

                const isLiked = await db.postLikes.findOne({
                    where: { postId: post.id, userId },
                });

                const commentsCount = await db.postComments.count({
                    where: { postId: post.id },
                });

                // Get top 2 comments
                const topComments = await this._getTopComments(post.id, userId);

                // Get tags
                const tags = await this._getPostTags(post.id);

                // Get follow status
                const { isFollowing, isFriend } = await this._getFollowStatus(userId, post.userId);

                const postJson = post.toJSON();
                return {
                    ...postJson,
                    media: postJson.media ? postJson.media.map(m => ({ ...m, postId: undefined })) : [],
                    tags,
                    likesCount,
                    isLiked: !!isLiked,
                    commentsCount,
                    topComments,
                    tags,
                    isFollowing,
                    isFriend,
                };
            })
        );

        return { posts: enrichedPosts, totalCount: count };
    }

    /**
     * Block a post for a user
     * @param {string} userId - User ID blocking the post
     * @param {string} postId - Post ID to block
     * @returns {Object} Success message
     */
    async blockPost(userId, postId) {
        // Check if post exists
        const post = await db.posts.findByPk(postId);
        if (!post) {
            throw new Error("Post not found");
        }

        // Check if user is trying to block their own post
        if (post.userId === userId) {
            throw new Error("You cannot block your own post");
        }

        // Check if already blocked
        const existingBlock = await db.blockedPosts.findOne({
            where: { userId, postId },
        });

        if (existingBlock) {
            throw new Error("Post is already blocked");
        }

        // Create block record
        await db.blockedPosts.create({
            id: uuidv4(),
            userId,
            postId,
        });

        return { message: "Post blocked successfully" };
    }

    /**
     * Unblock a post for a user
     * @param {string} userId - User ID unblocking the post
     * @param {string} postId - Post ID to unblock
     * @returns {Object} Success message
     */
    async unblockPost(userId, postId) {
        const blockedPost = await db.blockedPosts.findOne({
            where: { userId, postId },
        });

        if (!blockedPost) {
            throw new Error("Post is not blocked");
        }

        await blockedPost.destroy();
        return { message: "Post unblocked successfully" };
    }

    /**
     * Get all blocked posts for a user
     * @param {string} userId - User ID
     * @param {number} limit - Number of posts
     * @param {number} offset - Offset for pagination
     * @returns {Array} Array of blocked posts
     */
    async getBlockedPosts(userId, limit = 20, offset = 0) {
        const { count, rows: blockedPosts } = await db.blockedPosts.findAndCountAll({
            where: { userId },
            distinct: true,
            include: [
                {
                    model: db.posts,
                    as: "post",
                    include: [
                        {
                            model: db.masterCustomer,
                            as: "user",
                            attributes: ["name", "username", "profileImageUrl"],
                        },
                        {
                            model: db.postMedia,
                            as: "media",
                            separate: true,
                            order: [["orderIndex", "ASC"]],
                        },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        // Enrich with counts
        const enrichedPosts = await Promise.all(
            blockedPosts.map(async (blockedPost) => {
                const post = blockedPost.post;
                if (!post) return null;

                const likesCount = await db.postLikes.count({
                    where: { postId: post.id },
                });

                const commentsCount = await db.postComments.count({
                    where: { postId: post.id },
                });

                // Check if current user liked this post
                const isLiked = await db.postLikes.findOne({
                    where: { postId: post.id, userId },
                });

                // Get top 2 comments
                const topComments = await this._getTopComments(post.id, userId);

                // Get tags
                const tags = await this._getPostTags(post.id);

                // Get follow status
                // For blocked posts, we might not need follow status heavily, but for consistency we add it.
                // userId is the one who blocked, post.userId is the author.
                const { isFollowing, isFriend } = await this._getFollowStatus(userId, post.userId);

                const postJson = post.toJSON();
                return {
                    blockedAt: blockedPost.createdAt,
                    post: {
                        ...postJson,
                        media: postJson.media ? postJson.media.map(m => ({ ...m, postId: undefined })) : [],
                        tags,
                        likesCount,
                        commentsCount,
                        isLiked: !!isLiked,
                        topComments,
                        isFollowing,
                        isFriend,
                    },
                };
            })
        );

        // Filter out null values (in case post was deleted)
        const finalPosts = enrichedPosts.filter((p) => p !== null);
        return { posts: finalPosts, totalCount: count };
    }

    /**
     * Report a post
     * @param {string} userId - User ID reporting the post
     * @param {string} postId - Post ID to report
     * @param {string} reason - Reason for reporting
     * @returns {Object} Success message
     */
    async reportPost(userId, postId, reason) {
        // Check if post exists
        const post = await db.posts.findByPk(postId);
        if (!post) {
            throw new Error("Post not found");
        }

        // Create report record
        const report = await db.reportedPosts.create({
            id: uuidv4(),
            userId,
            postId,
            reason: reason || null,
            status: "pending",
        });

        return {
            message: "Post reported successfully",
            reportId: report.id,
        };
    }

    async getPostLikedbyUserId(targetUserId, currentUserId, limit = 20, offset = 0) {
        // Get blocked post IDs for current user if available
        let blockedPostIds = [];
        if (currentUserId) {
            const blockedPosts = await db.blockedPosts.findAll({
                where: { userId: currentUserId },
                attributes: ["postId"],
            });
            blockedPostIds = blockedPosts.map((bp) => bp.postId);
        }

        const whereClause = { userId: targetUserId };
        if (blockedPostIds.length > 0) {
            whereClause.postId = { [Op.notIn]: blockedPostIds };
        }

        const { count, rows: likedPosts } = await db.postLikes.findAndCountAll({
            where: whereClause,
            distinct: true,
            include: [
                {
                    model: db.posts,
                    as: "post",
                    include: [
                        {
                            model: db.masterCustomer,
                            as: "user",
                            attributes: ["name", "username", "profileImageUrl"],
                        },
                        {
                            model: db.postMedia,
                            as: "media",
                            separate: true,
                            order: [["orderIndex", "ASC"]],
                        },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        // Enrich with counts
        const enrichedPosts = await Promise.all(
            likedPosts.map(async (likedPost) => {
                const post = likedPost.post;
                if (!post) return null;

                const likesCount = await db.postLikes.count({
                    where: { postId: post.id },
                });

                const commentsCount = await db.postComments.count({
                    where: { postId: post.id },
                });

                let isLiked = false;
                if (currentUserId) {
                    const likeCheck = await db.postLikes.findOne({
                        where: { postId: post.id, userId: currentUserId },
                    });
                    isLiked = !!likeCheck;
                }

                // Get top 2 comments
                const topComments = await this._getTopComments(post.id, currentUserId);

                // Get tags
                const tags = await this._getPostTags(post.id);

                // Get follow status
                // targetUserId is likely the one who liked, currentUserId is the viewer.
                // We want to know if viewer follows the post author.
                const { isFollowing, isFriend } = await this._getFollowStatus(currentUserId, post.userId);

                const postJson = post.toJSON();
                return {
                    likedAt: likedPost.createdAt,
                    post: {
                        ...postJson,
                        media: postJson.media ? postJson.media.map(m => ({ ...m, postId: undefined })) : [],
                        tags,
                        likesCount,
                        commentsCount,
                        isLiked,
                        topComments,
                        isFollowing,
                        isFriend,
                    },
                };
            })
        );

        // Filter out null values (in case post was deleted)
        const finalPosts = enrichedPosts.filter((p) => p !== null);
        return { posts: finalPosts, totalCount: count };
    }

    async _getPostTags(postId) {
        const tags = await db.postTags.findAll({
            where: { postId },
        });

        const enrichedTags = await Promise.all(tags.map(async (tag) => {
            let details = {};
            if (tag.referenceType === 'product') {
                const product = await db.masterProduct.findByPk(tag.referenceId, {
                    attributes: ['id', 'name']
                });
                if (product) {
                    details = { productId: product.id, productName: product.name };
                }
            } else if (tag.referenceType === 'package') {
                const pkg = await db.masterPackage.findByPk(tag.referenceId, {
                    attributes: ['id', 'name']
                });
                if (pkg) {
                    details = { packageId: pkg.id, packageName: pkg.name };
                }
            } else if (tag.referenceType === 'location') {
                const loc = await db.masterLocation.findByPk(tag.referenceId, {
                    attributes: ['id', 'name', 'latitude', 'longitude']
                });
                if (loc) {
                    details = {
                        locationId: loc.id,
                        locationName: loc.name,
                        latitude: loc.latitude,
                        longitude: loc.longitude
                    };
                }
            }

            const { id, postId: pId, referenceId, createdAt, updatedAt, ...tagData } = tag.toJSON();
            return {
                ...tagData,
                ...details
            };
        }));
        return enrichedTags;
    }

    /**
     * Check follow status between current user and target user
     * @param {string} currentUserId
     * @param {string} targetUserId
     * @returns {Promise<{isFollowing: boolean, isFriend: boolean}>}
     */
    async _getFollowStatus(currentUserId, targetUserId) {
        if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
            return { isFollowing: false, isFriend: false };
        }

        const [following, follower] = await Promise.all([
            db.followers.findOne({
                where: { followingId: targetUserId, followerId: currentUserId }
            }),
            db.followers.findOne({
                where: { followingId: currentUserId, followerId: targetUserId }
            })
        ]);

        const isFollowing = !!following;
        const isFriend = isFollowing && !!follower;

        return { isFollowing, isFriend };
    }

    /**
     * Helper to get top comments for a post
     * @param {string} postId - Post ID
     * @param {string} userId - Current user ID
     */
    async _getTopComments(postId, userId) {
        const topComments = await db.postComments.findAll({
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
                ],
            },
            include: [
                {
                    model: db.masterCustomer,
                    as: "user",
                    attributes: ["name", "username", "profileImageUrl"],
                },
            ],
            order: [
                [db.sequelize.literal("priority"), "DESC"],
                [db.sequelize.literal("likesCount"), "DESC"],
                ["createdAt", "DESC"],
            ],
            limit: 2,
        });

        return topComments.map((comment) => {
            const json = comment.toJSON();
            return {
                ...json,
                postId: undefined,
                likesCount: parseInt(json.likesCount) || 0,
                priority: undefined,
            };
        });
    }

    /**
     * Search for tags (products, packages, locations)
     * @param {string} type - 'product' | 'package' | 'location'
     * @param {string} query - Search query
     * @returns {Array} List of found items
     */
    /**
     * Search for tags (products, packages, locations)
     * @param {string} type - 'product' | 'package' | 'location'
     * @param {string} name - Search query (optional)
     * @returns {Array} List of found items
     */
    async searchTags(type, name, locationId) {
        const baseOptions = {
            limit: 20,
            attributes: ['id', 'name']
        };

        // Filter name dibangun terpisah agar bisa digabung dengan filter lain
        const nameFilter = name ? { name: { [Op.like]: `%${name}%` } } : {};

        let results = [];

        if (type === 'product') {
            const where = {
                ...nameFilter,
                ...(locationId ? { locationId } : {}),
            };
            const products = await db.masterProduct.findAll({
                ...baseOptions,
                where,
                include: [{
                    model: db.masterProductImage,
                    as: 'images',
                    attributes: ['imageUrl'],
                    limit: 1
                }]
            });
            results = products.map(p => {
                const img = p.images && p.images.length > 0 ? p.images[0].imageUrl : null;
                return {
                    name: p.name,
                    productId: p.id,
                    image: img
                };
            });
        } else if (type === 'package') {
            const where = {
                ...nameFilter,
                ...(locationId ? { locationId } : {}),
            };
            const packages = await db.masterPackage.findAll({
                ...baseOptions,
                where,
                include: [{
                    model: db.masterLocation,
                    as: 'location',
                    attributes: ['id'],
                    include: [{
                        model: db.masterLocationImage,
                        as: 'images',
                        attributes: ['imageUrl'],
                        limit: 1
                    }]
                }]
            });
            results = packages.map(p => {
                const loc = p.location;
                const img = loc && loc.images && loc.images.length > 0 ? loc.images[0].imageUrl : null;
                return {
                    name: p.name,
                    packageId: p.id,
                    image: img
                };
            });
        } else if (type === 'location') {
            const locations = await db.masterLocation.findAll({
                ...baseOptions,
                attributes: ['id', 'name', 'latitude', 'longitude'],
                where: { ...nameFilter },
                include: [{
                    model: db.masterLocationImage,
                    as: 'images',
                    attributes: ['imageUrl'],
                    limit: 1
                }]
            });
            results = locations.map(l => {
                const img = l.images && l.images.length > 0 ? l.images[0].imageUrl : null;
                return {
                    name: l.name,
                    locationId: l.id,
                    latitude: l.latitude,
                    longitude: l.longitude,
                    image: img
                };
            });
        }

        return results;
    }
}

module.exports = new PostService();
