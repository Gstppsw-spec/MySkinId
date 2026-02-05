const followService = require("../services/follow.service");
const { formatPagination } = require("../utils/pagination");

class FollowController {
    /**
     * Follow a user
     * POST /users/:userId/follow
     */
    async followUser(req, res) {
        try {
            const followerId = req.user.id;
            const { userId: followingId } = req.params;

            const result = await followService.followUser(followerId, followingId);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    alreadyFollowing: result.alreadyFollowing,
                },
            });
        } catch (error) {
            console.error("Follow user error:", error);
            const statusCode =
                error.message === "User not found"
                    ? 404
                    : error.message === "You cannot follow yourself"
                        ? 400
                        : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || "Failed to follow user",
            });
        }
    }

    /**
     * Unfollow a user
     * DELETE /users/:userId/follow
     */
    async unfollowUser(req, res) {
        try {
            const followerId = req.user.id;
            const { userId: followingId } = req.params;

            const result = await followService.unfollowUser(followerId, followingId);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    wasFollowing: result.wasFollowing,
                },
            });
        } catch (error) {
            console.error("Unfollow user error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to unfollow user",
            });
        }
    }

    /**
     * Get followers of a user
     * GET /users/:userId/followers
     */
    async getFollowers(req, res) {
        try {
            const { userId } = req.params;
            const currentUserId = req.user?.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 20;
            const limit = pageSize;
            const offset = (page - 1) * pageSize;

            const { followers, totalCount } = await followService.getFollowers(userId, currentUserId, limit, offset);

            res.status(200).json({
                success: true,
                data: followers,
                pagination: formatPagination(totalCount, page, pageSize),
            });
        } catch (error) {
            console.error("Get followers error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch followers",
            });
        }
    }

    /**
     * Get users that a user is following
     * GET /users/:userId/following
     */
    async getFollowing(req, res) {
        try {
            const { userId } = req.params;
            const currentUserId = req.user?.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 20;
            const limit = pageSize;
            const offset = (page - 1) * pageSize;

            const { following, totalCount } = await followService.getFollowing(userId, currentUserId, limit, offset);

            res.status(200).json({
                success: true,
                data: following,
                pagination: formatPagination(totalCount, page, pageSize),
            });
        } catch (error) {
            console.error("Get following error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch following",
            });
        }
    }

    /**
     * Get follow statistics
     * GET /users/:userId/stats
     */
    async getFollowStats(req, res) {
        try {
            const { userId } = req.params;

            const stats = await followService.getFollowStats(userId);

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            console.error("Get follow stats error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch follow stats",
            });
        }
    }
}

module.exports = new FollowController();
