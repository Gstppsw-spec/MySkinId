const express = require("express");
const router = express.Router();

const controller = require("../../controllers/relationshipUserCompany.controller");

router.get("/user/:userId", controller.getCompanyByUserId);
router.put("/:id", controller.updateCompany);

module.exports = router;
