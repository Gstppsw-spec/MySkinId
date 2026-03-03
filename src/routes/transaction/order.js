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
router.get("/payment-methods", transactionOrder.getPaymentMethods);
router.post("/add-payment-method", allowRoles("SUPER_ADMIN"), transactionOrder.addPaymentMethod);

// Outlet Admin & Super Admin: Update order status to shipped/delivered
router.post("/ship", allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"), transactionOrder.shipTransaction);
router.post("/deliver", allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"), transactionOrder.deliverTransaction);
router.get("/outlet/transactions", allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"), transactionOrder.getOutletTransactions);
router.get("/export", allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"), transactionOrder.exportTransactions);

// Customer Transaction Views
router.get("/customer/transactions/history", transactionOrder.getCustomerTransactionHistory);
router.get("/customer/orders/history", transactionOrder.getCustomerOrderHistory);
router.get("/customer/transactions/purchased", transactionOrder.getCustomerPurchasedProducts);
router.get("/customer/orders/unpaid", transactionOrder.getCustomerUnpaidOrders);
router.get("/customer/transactions/shipping", transactionOrder.getCustomerShippingTransactions);
router.get("/customer/transactions/completed", transactionOrder.getCustomerCompletedTransactions);
router.get("/customer/transactions/tracking-detail/:transactionId", transactionOrder.getCustomerOrderTrackingDetail);
router.get("/getTransactionDetail/:transactionId", transactionOrder.getTransactionDetail);
router.get("/getPaymentDetail/:orderId", transactionOrder.getPaymentDetail);
router.get("/getOrderDetail/:id", transactionOrder.getOrderDetail);

// Customer: Confirm order completion
router.post("/complete", transactionOrder.completeTransaction);

// Vouchers
router.get("/vouchers", transactionOrder.getMyVouchers);
router.get("/vouchers/check/:voucherCode", allowRoles("OUTLET_ADMIN", "SUPER_ADMIN"), transactionOrder.checkVoucher);
router.post("/vouchers/claim", allowRoles("OUTLET_ADMIN", "SUPER_ADMIN"), transactionOrder.claimVoucher);

module.exports = router;
