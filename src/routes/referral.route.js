const express = require("express");
const router = express.Router();
const referralController = require("../controllers/referral.controller");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

// ===== CUSTOMER ENDPOINTS (requires customer JWT) =====
router.get("/info", verifyToken, referralController.getReferralInfo);
router.get("/points", verifyToken, referralController.getPointsBalance);
router.get("/points/history", verifyToken, referralController.getPointsHistory);
router.get("/referred-customers", verifyToken, referralController.getReferredCustomers);
router.post("/withdraw", verifyToken, referralController.requestWithdrawal);
router.get("/withdrawals", verifyToken, referralController.getMyWithdrawals);

// ===== ADMIN ENDPOINTS (requires admin JWT + role) =====
router.get(
  "/admin/withdrawals",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  referralController.adminGetWithdrawals
);
router.put(
  "/admin/withdrawals/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  referralController.adminProcessWithdrawal
);
router.get(
  "/admin/stats",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  referralController.adminGetReferralStats
);
router.get(
  "/admin/balances",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  referralController.adminGetBalances
);
router.post(
  "/admin/adjust-balance",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  referralController.adminAdjustBalance
);

module.exports = router;
