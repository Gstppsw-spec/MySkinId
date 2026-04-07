const express = require("express");
const router = express.Router();
const masterProduct = require("../../controllers/masterProduct");
const multer = require("multer");
const path = require("path");

const fs = require("fs");
const uploadPath = "uploads/product";
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadProductImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.post(
  "/",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  uploadProductImages.array("photos", 10),
  masterProduct.create,
);
router.put(
  "/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  uploadProductImages.array("photos", 10),
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
router.get("/creator", verifyToken, masterProduct.getByCreator);
router.get("/location/:locationId", masterProduct.getByLocationId);
router.get("/user", verifyToken, masterProduct.getProductByUser);
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
