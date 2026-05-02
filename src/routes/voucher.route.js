const express = require("express");
const router = express.Router();
const voucherController = require("../controllers/voucher.controller");
const { verifyToken, optionalAuth } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

// ── Customer endpoints ────────────────────────────
// Get available vouchers (public, but uses optional auth to check per-user limit)
router.get("/available", optionalAuth, voucherController.getAvailable);

// Check applicable vouchers for a specific item + location
router.get("/check", optionalAuth, voucherController.getForItem);

// Get voucher detail (applicable outlets & items)
router.get("/detail/:id", optionalAuth, voucherController.getCustomerDetail);

// Claim a voucher (save to customer's collection)
router.post("/claim", verifyToken, voucherController.claim);

// Get customer's claimed vouchers
router.get("/my-vouchers", verifyToken, voucherController.getMyVouchers);

// Validate voucher code (needs customer auth)
router.post("/validate", verifyToken, voucherController.validate);

// ── Admin endpoints ───────────────────────────────
// CRUD operations (Super Admin + Company Admin)
router.post(
  "/",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"),
  voucherController.create
);

router.get(
  "/",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"),
  voucherController.getAll
);

router.get(
  "/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"),
  voucherController.getById
);

router.put(
  "/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"),
  voucherController.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"),
  voucherController.delete
);

// Participate in a master voucher campaign
router.post(
  "/participate",
  verifyToken,
  allowRoles("COMPANY_ADMIN"),
  voucherController.participate
);

module.exports = router;
