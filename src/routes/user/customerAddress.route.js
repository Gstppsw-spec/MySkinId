const express = require("express");
const router = express.Router();
const customerAddressController = require("../../controllers/customerAddress");
const { verifyToken } = require("../../middlewares/authMiddleware");

// All routes require authentication
router.use(verifyToken);

router.get("/", customerAddressController.getAll);
router.get("/:id", customerAddressController.getById);
router.post("/", customerAddressController.create);
router.put("/:id", customerAddressController.update);
router.delete("/:id", customerAddressController.delete);
router.put("/:id/primary", customerAddressController.setPrimary);

module.exports = router;
