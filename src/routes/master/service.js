const express = require("express");
const router = express.Router();
const service = require("../../controllers/masterService");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadPath = "uploads/service";

// Cek jika folder belum ada → buat otomatis
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;

    cb(null, uniqueName);
  },
});

const serviceProduct = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.get("/all-customer", service.getAllCustomer);
router.get("/all-customer/:customerId", service.getAllCustomer);

router.get("/:id/detail-customer/:customerId", service.getByIdCustomer);
router.get("/:id/detail-customer", service.getByIdCustomer);


router.post("/", serviceProduct.single("photo"), service.create);
router.put("/:id", serviceProduct.single("photo"), service.update);
router.get("/location/:locationId", service.getByLocationId);
router.get("/", service.getAll);
router.get("/:id", service.getById);

module.exports = router;
