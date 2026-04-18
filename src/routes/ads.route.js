const express = require("express");
const router = express.Router();
const adsController = require("../controllers/ads.controller");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const uploadAdsImage = require("../middlewares/uploadAdsImage.middleware");
const compressImage = require("../middlewares/compressImage");

// --- CUSTOMER ---
router.get("/", adsController.getAds);

// --- ADMIN COMPANY ---
router.post("/buy", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), uploadAdsImage, compressImage, adsController.buyAds);
router.post("/topup", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.buyTopup);
router.get("/balance", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"), adsController.getBalance);
router.get("/available-days", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.getAvailableDays);
router.get("/outlet", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.getOutletAds);
router.get("/waiting-payment", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.getWaitingPaymentAds);

// --- SUPER ADMIN & COMPANY ADMIN ---
router.get("/config", verifyToken, allowRoles("SUPER_ADMIN", "COMPANY_ADMIN", "OUTLET_ADMIN"), adsController.getAdsConfig);

// --- SUPER ADMIN ---
router.post("/admin/topup", verifyToken, allowRoles("SUPER_ADMIN"), adsController.adminTopup);
router.post("/config", verifyToken, allowRoles("SUPER_ADMIN"), adsController.upsertAdsConfig);
router.put("/config/:id", verifyToken, allowRoles("SUPER_ADMIN"), adsController.updateAdsConfig);
router.delete("/config/:id", verifyToken, allowRoles("SUPER_ADMIN"), adsController.deleteAdsConfig);

module.exports = router;
