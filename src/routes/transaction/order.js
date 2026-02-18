const express = require("express");
const router = express.Router();
const transactionOrder = require("../../controllers/transactionOrder");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.post("/callback/xendit", transactionOrder.xenditCallback);

router.use(verifyToken);

router.post("/checkout-cart", transactionOrder.checkoutFromCart);
router.post("/checkout-direct", transactionOrder.directCheckout);
router.get("/status/:orderId", transactionOrder.getTransactionStatus);
router.post("/cancel", transactionOrder.cancelOrder);

// Merchant only: Update order status to shipped/delivered
router.post("/ship", allowRoles("MERCHANT"), transactionOrder.shipTransaction);
router.post("/deliver", allowRoles("MERCHANT"), transactionOrder.deliverTransaction);

// Customer: Confirm order completion
router.post("/complete", transactionOrder.completeTransaction);

module.exports = router;
