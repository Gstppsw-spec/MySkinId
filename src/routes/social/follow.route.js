const express = require("express");
const router = express.Router();
const followController = require("../../controllers/follow.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");

// All routes require authentication
router.use(verifyToken);

// Follow a user
router.post("/:userId/follow", followController.followUser);

// Unfollow a user
router.delete("/:userId/follow", followController.unfollowUser);

// Get followers of a user
router.get("/:userId/followers", followController.getFollowers);

// Get users that a user is following
router.get("/:userId/following", followController.getFollowing);

// Get follow statistics
router.get("/:userId/stats", followController.getFollowStats);

module.exports = router;
