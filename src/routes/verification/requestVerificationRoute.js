const express = require("express");
const router = express.Router();
const controller = require("../../controllers/requestVerificationController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

// CRUD
router.post("/", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), controller.create);
router.get("/", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OUTLET_ADMIN", "DOCTOR_GENERAL"), controller.list);
router.get("/:id", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OUTLET_ADMIN", "DOCTOR_GENERAL"), controller.detail);
router.put("/:id", verifyToken, allowRoles("SUPER_ADMIN", "DOCTOR_GENERAL"), controller.update);

module.exports = router;
