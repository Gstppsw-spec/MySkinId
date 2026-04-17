const express = require("express");
const router = express.Router();

const controller = require("../../controllers/relationshipUserCompany.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.get("/", verifyToken, allowRoles("SUPER_ADMIN", "COMPANY_ADMIN"), controller.getAllCompany);
router.post("/", verifyToken, allowRoles("SUPER_ADMIN"), controller.addCompany);
router.post(
    "/upsert",
    verifyToken,
    allowRoles("COMPANY_ADMIN"),
    controller.upsertCompany
);
router.get("/user", verifyToken, allowRoles("SUPER_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN"), controller.getCompanyByUserId);
router.get("/:id", verifyToken, allowRoles("SUPER_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN"), controller.detailCompany);
router.put("/:id", verifyToken, allowRoles("SUPER_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN"), controller.updateCompany);
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN"), controller.deleteCompany);

module.exports = router;
