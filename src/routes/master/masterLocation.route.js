const express = require("express");
const router = express.Router();
const masterLocationController = require("../../controllers/masterLocation.controller");
const uploadLocationImages = require("../../middlewares/uploadMultipleImageLocation");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

// >>> STATIC ROUTES FIRST <<<
router.get("/company/:companyId", masterLocationController.getByCompanyId);

router.get("/user", verifyToken, masterLocationController.getLocationByUser);

// CUSTOMER LIST
router.get("/all-customer", masterLocationController.listLocationByCustomer);
router.get(
  "/all-customer/:customerId",
  masterLocationController.listLocationByCustomer,
);

// DETAIL CUSTOMER
router.get(
  "/:id/detail-customer/:customerId",
  masterLocationController.detailLocationByCustomer,
);
router.get(
  "/:id/detail-customer",
  masterLocationController.detailLocationByCustomer,
);

// UPDATE & MANAGE
router.post(
  "/",
  verifyToken,
  allowRoles("ADMIN_COMPANY", "SUPER_ADMIN"),
  uploadLocationImages.array("photos", 10),
  masterLocationController.create,
);
router.put(
  "/:id",
  verifyToken,
  allowRoles("ADMIN_COMPANY", "SUPER_ADMIN"),
  uploadLocationImages.array("photos", 10),
  masterLocationController.update,
);
router.patch(
  "/:id/status",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.updateStatus,
);
router.patch(
  "/image/:id",
  verifyToken,
  allowRoles("ADMIN_COMPANY", "SUPER_ADMIN"),
  masterLocationController.deleteImage,
);

// >>> DYNAMIC ROUTES LAST <<<
router.post("/inject-region", masterLocationController.injectDataRegion);
router.get(
  "/get-city-by-latitude-longitude",
  masterLocationController.getCityByLatitudeLongitude
);
router.get(
  "/get-district-by-latitude-longitude",
  masterLocationController.getDistrictByLatitudeLongitude
);
router.get("/cities", masterLocationController.getCities);
router.get("/", masterLocationController.list);
router.get("/:id", masterLocationController.detail);



module.exports = router;
