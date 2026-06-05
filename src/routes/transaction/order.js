const express = require("express");
const router = express.Router();
const transactionOrder = require("../../controllers/transactionOrder");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");
const uploadPaymentImages = require("../../middlewares/uploadPaymentMethod.middleware");

router.post("/callback/xendit", transactionOrder.xenditCallback);
router.post("/callback/biteship", transactionOrder.biteshipCallback);

router.use(verifyToken);

router.post("/checkout-cart", transactionOrder.checkoutFromCart);
router.post("/checkout-direct", transactionOrder.directCheckout);
router.post("/checkout-summary", transactionOrder.getCheckoutSummary);
router.post("/buy-premium-badge", transactionOrder.buyPremiumBadge);
router.get("/status/:orderId", transactionOrder.getTransactionStatus);
router.post("/cancel", transactionOrder.cancelOrder);
router.get("/payment-methods", transactionOrder.getPaymentMethods);
router.put(
  "/payment-method/:id",
  allowRoles("SUPER_ADMIN"),
  uploadPaymentImages.single("logoUrl"),
  transactionOrder.updatePaymentMethod,
);
router.post(
  "/add-payment-method",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.addPaymentMethod,
);

// Outlet Admin & Super Admin: Update order status to shipped/delivered
router.post(
  "/ship",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.shipTransaction,
);
router.post(
  "/deliver",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.deliverTransaction,
);
router.get(
  "/outlet/shipped",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.getOutletShippedTransactions,
);
router.get(
  "/outlet/transaction/:transactionId",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.getTransactionDetail,
);
router.get(
  "/outlet/transactions",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.getOutletTransactions,
);
router.get(
  "/outlet/stats",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.getOutletStats,
);
router.get(
  "/export",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.exportTransactions,
);
router.get(
  "/outlet/transaction/:transactionId/shipping-label",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.getShippingLabel,
);

// Customer Transaction Views
router.get(
  "/customer/transactions/history",
  transactionOrder.getCustomerTransactionHistory,
);
router.get(
  "/customer/orders/history",
  transactionOrder.getCustomerOrderHistory,
);
router.get(
  "/customer/transactions/purchased",
  transactionOrder.getCustomerPurchasedProducts,
);
router.get("/customer/orders/unpaid", transactionOrder.getCustomerUnpaidOrders);
router.get(
  "/customer/transactions/shipping",
  transactionOrder.getCustomerShippingTransactions,
);
router.get(
  "/customer/transactions/completed",
  transactionOrder.getCustomerCompletedTransactions,
);
router.get(
  "/customer/transactions/tracking-detail/:transactionId",
  transactionOrder.getCustomerOrderTrackingDetail,
);
router.get(
  "/getTransactionDetail/:transactionId",
  transactionOrder.getTransactionDetail,
);
router.get("/getPaymentDetail/:orderId", transactionOrder.getPaymentDetail);
router.get("/getOrderDetail/:id", transactionOrder.getOrderDetail);

// Customer: Confirm order completion
router.post("/complete", transactionOrder.completeTransaction);

// Vouchers
router.get("/vouchers", transactionOrder.getMyVouchers);
router.get(
  "/vouchers/check/:voucherCode",
  allowRoles("OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.checkVoucher,
);
router.post(
  "/vouchers/claim",
  allowRoles("OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.claimVoucher,
);

router.get(
  "/financial-report",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "OPERATIONAL_ADMIN", "SUPER_ADMIN"),
  transactionOrder.getFinancialReport,
);

router.get(
  "/platform/income-report",
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  transactionOrder.getPlatformIncomeReport,
);
router.get(
  "/platform/income-report/export",
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  transactionOrder.exportPlatformIncomeReport,
);
router.get(
  "/platform/income-report/detail/:transactionId",
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  transactionOrder.getPlatformIncomeReportDetail,
);

// Platform Transfers
router.get(
  "/transfers/:orderId",
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN", "SUPER_ADMIN"),
  transactionOrder.getTransferStatus,
);
router.post(
  "/transfers/retry/:transferId",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.retryTransfer,
);
// Super Admin: Settlement Management
router.get(
  "/settlements/pending",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.getPendingSettlements,
);
router.post(
  "/settlements/settle/:transferId",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.manualSettle,
);
router.post(
  "/settlements/settle-all",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.manualSettleAll,
);
// Super Admin: Backfill old transactions (before new settlement system)
router.get(
  "/settlements/backfill",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.backfillOldTransactions,
);
router.post(
  "/settlements/backfill",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.backfillOldTransactions,
);

// Super Admin: View raw transactions matching logic 1 & 2
router.get(
  "/settlements/raw-transactions",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.getRawTransactionsForSettlement,
);

// Super Admin: Delete raw transaction and associated data
router.delete(
  "/settlements/raw-transactions/:orderId",
  allowRoles("SUPER_ADMIN"),
  transactionOrder.deleteRawTransaction,
);

module.exports = router;
