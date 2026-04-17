const express = require("express");
const router = express.Router();
const masterProduct = require("../../controllers/masterProduct");
const uploadProductImage = require("../../middlewares/uploadProductImage.middleware");
const compressImage = require("../../middlewares/compressImage");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.post(
  "/",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  uploadProductImage,
  compressImage,
  masterProduct.create,
);
router.put(
  "/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  uploadProductImage,
  compressImage,
  masterProduct.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  masterProduct.delete,
);

router.patch(
  "/image/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  masterProduct.deleteImage,
);

router.patch(
  "/image/:id/primary",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  masterProduct.setPrimaryImage,
);
router.get("/creator", verifyToken, masterProduct.getByCreator);
router.get("/location/:locationId", masterProduct.getByLocationId);
router.get("/user", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"), masterProduct.getProductByUser);
router.get("/by-user-location", verifyToken, masterProduct.getProductByUser);
router.get("/", masterProduct.getAll);
router.get("/:id", masterProduct.getById);

router.put(
  "/:productId/location/:locationId/toggle-active",
  verifyToken,
  allowRoles("OUTLET_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"),
  masterProduct.toggleLocationActive,
);

module.exports = router;
