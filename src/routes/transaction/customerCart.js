const express = require("express");
const router = express.Router();

const customerCart = require("../../controllers/customerCart");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

// All routes require authentication
router.use(verifyToken);

router.get("/", customerCart.getCustomerCart);
router.post("/", customerCart.createCustomerCart);
router.delete("/delete/:cartId", customerCart.deleteCustomerCart);
router.delete(
  "/delete-all",
  customerCart.clearCartByRefferenceType
);
router.post("/add", customerCart.addQtyCustomerCart);
router.post("/reduce", customerCart.reduceQtyCustomerCart);
router.put("/select/:cartId", customerCart.selectCustomerCart);
router.put(
  "/select-all",
  customerCart.selectAllCustomerCartByRefferenceType
);

// ── Super Admin — Clear flash sale from carts ──
router.post(
  "/clear-flash-sale",
  allowRoles("SUPER_ADMIN"),
  customerCart.clearFlashSaleFromCarts
);

module.exports = router;
