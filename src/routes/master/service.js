const express = require("express");
const router = express.Router();
const service = require("../../controllers/masterService");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.post("/", verifyToken, service.create);
router.put("/:id", verifyToken, service.update);
router.get("/location/:locationId", service.getByLocationId);
router.get("/user", verifyToken, service.getServiceByUser);
router.get("/", service.getAll);
router.get("/:id", service.getById);

module.exports = router;
