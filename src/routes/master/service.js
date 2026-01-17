const express = require("express");
const router = express.Router();
const service = require("../../controllers/masterService");

router.post("/", service.create);
router.put("/:id", service.update);

router.get("/location/:locationId", service.getByLocationId);

router.get("/", service.getAll);
router.get("/:id", service.getById);

module.exports = router;
