const express = require("express");
const router = express.Router();
const authController = require("../controllers/authUserController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

router.post("/", authController.createUser);
router.get("/company/:companyId", authController.getUserByCompanyId);

router.get("/all-user", verifyToken, authController.getAllUser);
router.get("/all-user-company", verifyToken, authController.getAllUserCompany);
router.get("/:id", authController.getUserById);
router.put("/:id", authController.editUser);
router.delete("/:id", authController.deleteUser);
router.put(
    "/:id/reset-password",
    verifyToken,
    allowRoles("SUPER_ADMIN"),
    authController.resetPassword,
);
router.put("/available-consul", verifyToken, authController.toggleAvailableConsul);
module.exports = router;
