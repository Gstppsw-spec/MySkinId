const express = require("express");
const router = express.Router();
const balanceController = require("../controllers/balance.controller");
const { verifyToken: auth } = require("../middlewares/authMiddleware");

router.get("/info", auth, balanceController.getBalanceInfo);
router.get("/history", auth, balanceController.getHistory);
router.post("/withdraw", auth, balanceController.withdraw);
router.get("/disbursement-banks", auth, balanceController.getAvailableDisbursementBanks);

module.exports = router;
