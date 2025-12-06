const express = require("express");
const router = express.Router();

const orderCart = require("../../controllers/orderCart");

router.get("/product/:customerId", orderCart.getCartProduct);
router.post("/product", orderCart.createCartProduct);
router.delete("/product/delete/:cartId", orderCart.deleteCartProduct);
router.delete("/product/delete-all/:customerId", orderCart.clearCartProduct);
router.post("/product/add", orderCart.addQtyCartProduct);
router.post("/product/reduce", orderCart.reduceQtyCartProduct);
router.put("/product/select/:cartId", orderCart.selectCartProduct);
router.put("/product/select-all/:customerId", orderCart.selectAllCartProduct);


router.get("/service/:customerId", orderCart.getCartService);
router.post("/service", orderCart.createCartService);
router.delete("/service/delete/:cartId", orderCart.deleteCartService);
router.delete("/service/delete-all/:customerId", orderCart.clearCartService);
router.post("/service/add", orderCart.addQtyCartService);
router.post("/service/reduce", orderCart.reduceQtyCartService);
router.put("/service/select/:cartId", orderCart.selectCartService);
router.put("/service/select-all/:customerId", orderCart.selectAllCartService);

module.exports = router;
