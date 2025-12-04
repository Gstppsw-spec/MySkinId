const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");
const { authenticateJWT } = require("../middlewares/authMiddleware");

router.get("/v1", authenticateJWT, locationController.getAllLocationByUserId);
router.get("/", locationController.getAllLocations);
router.get("/:id", locationController.getLocationById);
router.post("/", authenticateJWT, locationController.createLocation);
router.put("/:id", authenticateJWT, locationController.updateLocation);
router.delete("/:id", authenticateJWT, locationController.deleteLocation);

module.exports = router;
