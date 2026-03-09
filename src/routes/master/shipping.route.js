const express = require("express");
const router = express.Router();
const shippingController = require("../../controllers/shipping.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");

// Area search (replaces province/city/district endpoints)
router.get("/areas", shippingController.searchArea);

// Available couriers
router.get("/couriers", shippingController.getCouriers);

// Shipping rate calculation
router.post("/rates", verifyToken, shippingController.calculateShippingRates);

// All courier rates calculation
router.post("/rates/all", verifyToken, shippingController.checkAllCourierRates);

module.exports = router;
