const express = require("express");
const router = express.Router();
const authController = require("../controllers/authUserController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

router.post("/", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN "), authController.createUser);
router.get("/company/:companyId", authController.getUserByCompanyId);

router.get("/all-user", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN "), authController.getAllUser);
router.get("/all-user-company", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN "), authController.getAllUserCompany);
router.get("/:id", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN "), authController.getUserById);
router.put("/:id", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN "), authController.editUser);
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN", "OPERATIONAL_ADMIN", "COMPANY_ADMIN", "OPERATIONAL_ADMIN "), authController.deleteUser);
router.put(
    "/:id/reset-password",
    verifyToken,
    allowRoles("SUPER_ADMIN"),
    authController.resetPassword,
);
router.put("/available-consul", verifyToken, authController.toggleAvailableConsul);
module.exports = router;
