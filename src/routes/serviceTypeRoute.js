const express = require("express");
const router = express.Router();
const serviceTypeController = require("../controllers/serviceTypeController");

router.post("/", serviceTypeController.createServiceType);
router.get("/", serviceTypeController.getAllServiceType);
router.get("/:id", serviceTypeController.getServiceTypeById);
// router.put("/:id", serviceTypeController.updateCompany);
// router.delete("/:id", serviceTypeController.deleteCompany);

module.exports = router;
