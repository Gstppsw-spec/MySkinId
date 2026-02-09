const express = require("express");
const router = express.Router();
const controller = require("../../controllers/requestVerificationController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

// CRUD
router.post("/", verifyToken, allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"), controller.create);
router.get("/", verifyToken, allowRoles("SUPER_ADMIN", "Doctor_General"), controller.list);
router.get("/:id", verifyToken, allowRoles("SUPER_ADMIN", "Doctor_General"), controller.detail);
router.put("/:id", verifyToken, allowRoles("SUPER_ADMIN", "Doctor_General"), controller.update);

module.exports = router;
