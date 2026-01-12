const express = require("express");
const router = express.Router();
const masterPackage = require("../../controllers/masterPackage");

router.post("/", masterPackage.create);
router.put("/:id", masterPackage.update);

router.get("/location/:locationId", masterPackage.getByLocationId);
router.get("/", masterPackage.getAllPackage);
router.get("/:id", masterPackage.getById);

module.exports = router;
