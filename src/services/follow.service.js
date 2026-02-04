const { v4: uuidv4 } = require("uuid");
const db = require("../models");

class FollowService {
    /**
     * Follow a user (idempotent)
     * @param {string} followerId - User ID who is following
     * @param {string} followingId - User ID to follow
     * @returns {Object} Follow status
     */
    async followUser(followerId, followingId) {
        // Prevent self-follow
        if (followerId === followingId) {
            throw new Error("You cannot follow yourself");
        }

        // Check if user to follow exists
        const userToFollow = await db.masterCustomer.findByPk(followingId);
        if (!userToFollow) {
            throw new Error("User not found");
        }

        // Check if already following
        const existingFollow = await db.followers.findOne({
            where: { followerId, followingId },
        });

        if (existingFollow) {
            return {
                message: "Already following this user",
                alreadyFollowing: true,
            };
        }

        // Create follow relationship
        await db.followers.create({
            id: uuidv4(),
            followerId,
            followingId,
        });

        return {
            message: "User followed successfully",
            alreadyFollowing: false,
        };
    }

    /**
     * Unfollow a user
     * @param {string} followerId - User ID who is unfollowing
     * @param {string} followingId - User ID to unfollow
     * @returns {Object} Unfollow status
     */
    async unfollowUser(followerId, followingId) {
        const follow = await db.followers.findOne({
            where: { followerId, followingId },
        });

        if (!follow) {
            return {
                message: "You are not following this user",
                wasFollowing: false,
            };
        }

        await follow.destroy();

        return {
            message: "User unfollowed successfully",
            wasFollowing: true,
        };
    }

    /**
     * Get followers of a user
     * @param {string} userId - User ID
     * @param {number} limit - Number of followers
     * @param {number} offset - Offset for pagination
     * @returns {Array} Array of followers
     */
    async getFollowers(userId, currentUserId, limit = 20, offset = 0) {
        const { count, rows: followers } = await db.followers.findAndCountAll({
            where: { followingId: userId },
            distinct: true,
            include: [
                {
                    model: db.masterCustomer,
                    as: "follower",
                    attributes: ["id", "name", "username", "profileImageUrl"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        const data = await Promise.all(
            followers.map(async (follow) => {
                const followerJson = follow.follower.toJSON();

                let isFollowing = false;
                if (currentUserId) {
                    isFollowing = await this.isFollowing(currentUserId, followerJson.id);
                }

                return {
                    ...followerJson,
                    followedAt: follow.createdAt,
                    isFollowing,
                };
            })
        );

        return { followers: data, totalCount: count };
    }

    /**
     * Get users that a user is following
     * @param {string} userId - User ID
     * @param {number} limit - Number of following
     * @param {number} offset - Offset for pagination
     * @returns {Array} Array of users being followed
     */
    async getFollowing(userId, currentUserId, limit = 20, offset = 0) {
        const { count, rows: following } = await db.followers.findAndCountAll({
            where: { followerId: userId },
            distinct: true,
            include: [
                {
                    model: db.masterCustomer,
                    as: "following",
                    attributes: ["id", "name", "username", "profileImageUrl"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        const data = await Promise.all(
            following.map(async (follow) => {
                const followingJson = follow.following.toJSON();

                let isFollowing = false;
                if (currentUserId) {
                    isFollowing = await this.isFollowing(currentUserId, followingJson.id);
                }

                return {
                    ...followingJson,
                    followedAt: follow.createdAt,
                    isFollowing,
                };
            })
        );

        return { following: data, totalCount: count };
    }

    /**
     * Get follow statistics for a user
     * @param {string} userId - User ID
     * @returns {Object} Follow stats
     */
    async getFollowStats(userId) {
        const followersCount = await db.followers.count({
            where: { followingId: userId },
        });

        const followingCount = await db.followers.count({
            where: { followerId: userId },
        });

        return {
            followersCount,
            followingCount,
        };
    }

    /**
     * Check if user A is following user B
     * @param {string} followerId - User A ID
     * @param {string} followingId - User B ID
     * @returns {boolean} Is following
     */
    async isFollowing(followerId, followingId) {
        const follow = await db.followers.findOne({
            where: { followerId, followingId },
        });

        return !!follow;
    }
}

module.exports = new FollowService();
