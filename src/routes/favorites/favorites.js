const express = require("express");
const router = express.Router();

const favorites = require("../../controllers/customerFavorites");
const { verifyToken } = require("../../middlewares/authMiddleware");

router.post("/", verifyToken, favorites.updateCustomerFavorites);
router.get("/", verifyToken, favorites.getCustomerFavorites);

module.exports = router;
