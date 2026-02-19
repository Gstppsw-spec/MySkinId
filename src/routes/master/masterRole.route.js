const express = require("express");
const router = express.Router();
const controller = require("../../controllers/masterRoleController");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

// CRUD Master Role
router.post("/", verifyToken, allowRoles("SUPER_ADMIN"), controller.create);
router.get("/", verifyToken, allowRoles("SUPER_ADMIN"), controller.list);
router.get("/:id", verifyToken, allowRoles("SUPER_ADMIN"), controller.detail);
router.put("/:id", verifyToken, allowRoles("SUPER_ADMIN"), controller.update);
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN"), controller.delete);

module.exports = router;