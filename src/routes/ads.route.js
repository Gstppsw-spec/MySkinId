const express = require("express");
const router = express.Router();
const adsController = require("../controllers/ads.controller");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

// --- CUSTOMER ---
router.get("/", adsController.getAds);

// --- ADMIN COMPANY ---
router.post("/buy", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.buyAds);
router.post("/topup", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.buyTopup);
router.get("/balance", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"), adsController.getBalance);
router.get("/available-days", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.getAvailableDays);
router.get("/outlet", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.getOutletAds);

// --- SUPER ADMIN ---
router.post("/admin/topup", verifyToken, allowRoles("SUPER_ADMIN"), adsController.adminTopup);
router.get("/config", verifyToken, allowRoles("SUPER_ADMIN"), adsController.getAdsConfig);
router.post("/config", verifyToken, allowRoles("SUPER_ADMIN"), adsController.upsertAdsConfig);

module.exports = router;
