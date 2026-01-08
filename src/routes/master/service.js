const express = require("express");
const router = express.Router();
const service = require("../../controllers/masterService");

router.get("/all-customer", service.getAllCustomer);
router.get("/all-customer/:customerId", service.getAllCustomer);

router.get("/:id/detail-customer/:customerId", service.getByIdCustomer);
router.get("/:id/detail-customer", service.getByIdCustomer);

router.get(
  "/:locationId/service-location-customer/:customerId",
  service.getByLocationIdCustomer
);
router.get(
  "/:locationId/service-location-customer",
  service.getByLocationIdCustomer
);

router.post("/", service.create);
router.put("/:id", service.update);


router.get("/location/:locationId", service.getByLocationId);

router.get("/", service.getAll);
router.get("/:id", service.getById);

module.exports = router;
