const express = require("express");
const router = express.Router();
const service = require("../../controllers/masterService");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.post("/", verifyToken, allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"), service.create);
router.put("/:id", verifyToken, allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"), service.update);
router.get("/location/:locationId", service.getByLocationId);
router.get("/user", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"), service.getServiceByUser);
router.get("/", service.getAll);
router.get("/:id", service.getById);
router.delete("/:id", verifyToken, allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"), service.delete);

router.put(
  "/:serviceId/location/:locationId/toggle-active",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  service.toggleLocationActive,
);

module.exports = router;
