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
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  uploadLocationImages.array("photos", 10),
  masterLocationController.create,
);
router.put(
  "/:id",
  verifyToken,
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
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
  allowRoles("COMPANY_ADMIN", "SUPER_ADMIN"),
  masterLocationController.deleteImage,
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
  allowRoles("SUPER_ADMIN"),
  masterLocationController.createProvince,
);
router.put(
  "/province/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.updateProvince,
);
router.delete(
  "/province/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.deleteProvince,
);

// --- CITY ---
router.get("/city", masterLocationController.listCity);
router.get("/city-detail/:id", masterLocationController.detailCity);
router.post(
  "/city",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.createCity,
);
router.put(
  "/city/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.updateCity,
);
router.delete(
  "/city/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.deleteCity,
);

// --- DISTRICT ---
router.get("/district", masterLocationController.listDistrict);
router.get("/district-detail/:id", masterLocationController.detailDistrict);
router.post(
  "/district",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.createDistrict,
);
router.put(
  "/district/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.updateDistrict,
);
router.delete(
  "/district/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
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
  allowRoles("SUPER_ADMIN"),
  masterLocationController.createSubDistrict,
);
router.put(
  "/sub-district/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.updateSubDistrict,
);
router.delete(
  "/sub-district/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterLocationController.deleteSubDistrict,
);

router.get("/cities", masterLocationController.getCities);
router.get("/", masterLocationController.list);
router.get("/city/:cityId", masterLocationController.getByCityId);
router.get("/:id", masterLocationController.detail);

module.exports = router;
