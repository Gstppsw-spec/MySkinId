const express = require("express");
const router = express.Router();
const adsDesignController = require("../controllers/adsDesign.controller");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const uploadDriveImage = require("../middlewares/uploadDriveImage.middleware");

// --- MITRA (COMPANY ADMIN & OUTLET ADMIN) ---
router.post(
  "/",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"),
  uploadDriveImage,
  adsDesignController.createRequest
);

router.get(
  "/",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"),
  adsDesignController.getMyRequests
);

router.get(
  "/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"),
  adsDesignController.getRequestById
);

router.post(
  "/:id/revision",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"),
  adsDesignController.requestRevision
);

router.post(
  "/:id/approve",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "OUTLET_ADMIN"),
  adsDesignController.approveDesign
);

// --- ADMIN MYSKIN (SUPER ADMIN & OPERATIONAL ADMIN) ---
router.get(
  "/admin/all",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  adsDesignController.getAllRequests
);

router.get(
  "/admin/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  adsDesignController.getRequestById
);

router.put(
  "/admin/:id/process",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  adsDesignController.processRequest
);

router.post(
  "/admin/:id/submit-design",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  uploadDriveImage,
  adsDesignController.submitDesignResult
);

module.exports = router;
