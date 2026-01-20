const express = require("express");
const router = express.Router();
const masterPackage = require("../../controllers/masterPackage");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.post("/", verifyToken, allowRoles("OUTLET_ADMIN"), masterPackage.create);
router.put(
  "/:id",
  verifyToken,
  allowRoles("OUTLET_ADMIN"),
  masterPackage.update,
);
router.delete(
  "/:packageId",
  verifyToken,
  allowRoles("OUTLET_ADMIN"),
  masterPackage.deletePackage,
);

router.get("/user", verifyToken, masterPackage.getPackageByUser);
router.get("/location/:locationId", masterPackage.getByLocationId);
router.get("/", masterPackage.getAllPackage);
router.get("/:id", masterPackage.getById);

router.post(
  "/item",
  verifyToken,
  allowRoles("OUTLET_ADMIN"),
  masterPackage.createItemPackage,
);
router.put(
  "/item/:packageItemId",
  verifyToken,
  allowRoles("OUTLET_ADMIN"),
  masterPackage.updateItemPackage,
);
router.delete(
  "/item/:packageItemId",
  verifyToken,
  allowRoles("OUTLET_ADMIN"),
  masterPackage.deletePackageItem,
);

module.exports = router;
