const express = require("express");
const router = express.Router();

const customerCart = require("../../controllers/customerCart");

router.get("/:customerId", customerCart.getCustomerCart);
router.post("/", customerCart.createCustomerCart);
router.delete("/delete/:cartId", customerCart.deleteCustomerCart);
router.delete(
  "/delete-all/:customerId",
  customerCart.clearCartByRefferenceType
);
router.post("/add", customerCart.addQtyCustomerCart);
router.post("/reduce", customerCart.reduceQtyCustomerCart);
router.put("/select/:cartId", customerCart.selectCustomerCart);
router.put(
  "/select-all/:customerId",
  customerCart.selectAllCustomerCartByRefferenceType
);

module.exports = router;
