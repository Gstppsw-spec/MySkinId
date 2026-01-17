const express = require("express");
const router = express.Router();
const masterPackage = require("../../controllers/masterPackage");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.post("/", masterPackage.create);
router.put("/:id", masterPackage.update);
router.delete("/:packageId", masterPackage.deletePackage);

router.get("/location/:locationId", masterPackage.getByLocationId);
router.get("/", masterPackage.getAllPackage);
router.get("/:id", masterPackage.getById);

router.post("/item", verifyToken, masterPackage.createItemPackage);
router.put("/item/:packageItemId", masterPackage.updateItemPackage);
router.delete("/item/:packageItemId", masterPackage.deletePackageItem);

module.exports = router;
