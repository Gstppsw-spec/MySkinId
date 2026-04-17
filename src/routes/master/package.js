const express = require("express");
const router = express.Router();
const masterPackage = require("../../controllers/masterPackage");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.post("/", verifyToken, allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"), masterPackage.create);
router.put(
  "/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterPackage.update,
);
router.delete(
  "/:packageId",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterPackage.deletePackage,
);

router.get("/creator", verifyToken, masterPackage.getByCreator);
router.get("/user", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"), masterPackage.getPackageByUser);
router.get("/by-user-location", verifyToken, masterPackage.getPackageByUser);
router.get("/location/:locationId", masterPackage.getByLocationId);
router.get("/", masterPackage.getAllPackage);
router.get("/:id", masterPackage.getById);

router.post(
  "/item",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterPackage.createItemPackage,
);
router.put(
  "/item/:packageItemId",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterPackage.updateItemPackage,
);
router.delete(
  "/item/:packageItemId",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterPackage.deletePackageItem,
);

router.put(
  "/:packageId/location/:locationId/toggle-active",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterPackage.toggleLocationActive,
);

module.exports = router;
