const express = require("express");
const router = express.Router();
const masterLocationController = require("../../controllers/masterLocation.controller");
const uploadLocationImages = require("../../middlewares/uploadMultipleImageLocation");
const compressImage = require("../../middlewares/compressImage");
const { verifyToken, optionalAuth } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

// >>> STATIC ROUTES FIRST <<<
router.get("/newly-added", masterLocationController.getNewArrivalOutlets);
router.get("/premium", masterLocationController.getPremiumLocations);
router.get(
  "/my-premium",
  verifyToken,
  allowRoles("OUTLET_ADMIN"),
  masterLocationController.getMyPremiumStatus,
);
router.delete(
  "/premium/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.removePremium,
);
router.get("/company/:companyId", masterLocationController.getByCompanyId);

router.get("/user", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN"), masterLocationController.getLocationByUser);

// CUSTOMER LIST
router.get(
  "/all-customer",
  optionalAuth,
  masterLocationController.listLocationByCustomer,
);

// DETAIL CUSTOMER
router.get(
  "/:id/detail-customer",
  optionalAuth,
  masterLocationController.detailLocationByCustomer,
);

// UPDATE & MANAGE
router.post(
  "/",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  uploadLocationImages,
  compressImage,
  masterLocationController.create,
);
router.put(
  "/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  uploadLocationImages,
  compressImage,
  masterLocationController.update,
);
router.delete(
  "/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.delete,
);
router.patch(
  "/:id/status",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.updateStatus,
);
router.patch(
  "/image/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.deleteImage,
);
router.patch(
  "/image/:id/primary",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.setPrimaryImage,
);

// >>> DYNAMIC ROUTES LAST <<<
router.post("/inject-region", masterLocationController.injectDataRegion);
router.get(
  "/get-city-by-latitude-longitude",
  masterLocationController.getCityByLatitudeLongitude,
);
router.get(
  "/get-district-by-latitude-longitude",
  masterLocationController.getDistrictByLatitudeLongitude,
);

// --- PROVINCE ---
router.get("/province", masterLocationController.listProvince);
router.get("/province/:id", masterLocationController.detailProvince);
router.post(
  "/province",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.createProvince,
);
router.put(
  "/province/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.updateProvince,
);
router.delete(
  "/province/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.deleteProvince,
);

// --- CITY ---
router.get("/city", masterLocationController.listCity);
router.get("/city-detail/:id", masterLocationController.detailCity);
router.post(
  "/city",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.createCity,
);
router.put(
  "/city/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.updateCity,
);
router.delete(
  "/city/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.deleteCity,
);

// --- DISTRICT ---
router.get("/district", masterLocationController.listDistrict);
router.get("/district-detail/:id", masterLocationController.detailDistrict);
router.post(
  "/district",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.createDistrict,
);
router.put(
  "/district/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.updateDistrict,
);
router.delete(
  "/district/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.deleteDistrict,
);

// --- SUB DISTRICT ---
router.get("/sub-district", masterLocationController.listSubDistrict);
router.get(
  "/sub-district-detail/:id",
  masterLocationController.detailSubDistrict,
);
router.post(
  "/sub-district",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.createSubDistrict,
);
router.put(
  "/sub-district/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.updateSubDistrict,
);
router.delete(
  "/sub-district/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.deleteSubDistrict,
);

router.get("/cities", masterLocationController.getCities);
router.get("/", masterLocationController.list);
router.get("/city/:cityId", masterLocationController.getByCityId);

// --- XENDIT PLATFORM ---
router.post(
  "/:locationId/create-xendit-account",
  verifyToken,
  allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN"),
  masterLocationController.createXenditAccount,
);

router.get("/:id", masterLocationController.detail);

module.exports = router;
