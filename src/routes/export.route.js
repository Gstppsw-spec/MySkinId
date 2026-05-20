const express = require("express");
const router = express.Router();
const exportController = require("../controllers/export.controller");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const auth = [verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN")];

router.get("/users", ...auth, exportController.exportUsers);
router.get("/companies", ...auth, exportController.exportCompanies);
router.get("/treatments", ...auth, exportController.exportTreatments);
router.get("/products", ...auth, exportController.exportProducts);
router.get("/packages", ...auth, exportController.exportPackages);
router.get("/locations", ...auth, exportController.exportLocations);
router.get("/customers", exportController.exportCustomers);
router.get("/ads-performance", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OUTLET_ADMIN"), exportController.exportAdsPerformance);
router.get("/consultation-summary", verifyToken, allowRoles("SUPER_ADMIN", "OUTLET_ADMIN"), exportController.exportConsultationSummary);

module.exports = router;
