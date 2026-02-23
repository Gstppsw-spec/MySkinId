const express = require("express");
const router = express.Router();
const rajaongkirController = require("../../controllers/rajaongkir.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");

router.get("/province", rajaongkirController.getProvinces);
router.get("/city/:provinceId", rajaongkirController.getCities);
router.get("/district/:cityId", rajaongkirController.getDistricts);
router.get("/couriers", rajaongkirController.getCouriers);
router.post("/calculate-cost", verifyToken, rajaongkirController.calculateShippingCost);
router.post("/check-all-costs", verifyToken, rajaongkirController.checkAllCourierCosts);

module.exports = router;
