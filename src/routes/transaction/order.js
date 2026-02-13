const express = require("express");
const router = express.Router();
const transactionOrder = require("../../controllers/transactionOrder");
const { verifyToken } = require("../../middlewares/authMiddleware");

router.post("/callback/xendit", transactionOrder.xenditCallback);

router.use(verifyToken);

router.post("/checkout-cart", transactionOrder.checkoutFromCart);
router.post("/checkout-direct", transactionOrder.directCheckout);
router.get("/status/:orderId", transactionOrder.getTransactionStatus);
router.post("/cancel", transactionOrder.cancelOrder);

module.exports = router;
