const express = require("express");
const router = express.Router();

const favorites = require("../../controllers/customerFavorites");
router.post("/", favorites.updateCustomerFavorites);
router.get("/:customerId", favorites.getCustomerFavorites);

module.exports = router;
