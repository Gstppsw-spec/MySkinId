const express = require("express");
const router = express.Router();
const balanceController = require("../controllers/balance.controller");
const { verifyToken: auth } = require("../middlewares/authMiddleware");

router.get("/info", auth, balanceController.getBalanceInfo);
router.get("/history", auth, balanceController.getHistory);
router.post("/withdraw", auth, balanceController.withdraw);
router.get("/disbursement-banks", auth, balanceController.getAvailableDisbursementBanks);

// Platform Admin Routes
router.get("/platform/info", auth, balanceController.getPlatformBalanceInfo);
router.post("/platform/withdraw", auth, balanceController.platformWithdraw);
router.get("/platform/withdrawals", auth, balanceController.getPlatformWithdrawals);

module.exports = router;
