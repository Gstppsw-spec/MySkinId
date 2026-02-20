const express = require("express");
const router = express.Router();

const controller = require("../../controllers/relationshipUserCompany.controller");

router.get("/", controller.getAllCompany);
router.post("/", controller.addCompany);
router.get("/user/:userId", controller.getCompanyByUserId);
router.get("/:id", controller.detailCompany);
router.put("/:id", controller.updateCompany);
router.delete("/:id", controller.deleteCompany);

module.exports = router;
