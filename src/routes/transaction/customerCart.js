const express = require("express");
const router = express.Router();

const customerCart = require("../../controllers/customerCart");

const { verifyToken } = require("../../middlewares/authMiddleware");

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

module.exports = router;
