const express = require("express");
const router = express.Router();
const masterCustomerController = require("../../controllers/masterCustomer.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");


router.post("/register", masterCustomerController.registerCustomer);
router.post("/login", masterCustomerController.loginCustomer);
router.post("/verifyOtp", masterCustomerController.verifyOTP);
router.post("/resendOtpAuthentication", masterCustomerController.resendOtpAuthentication);

router.get("/search-customer", verifyToken, masterCustomerController.getCustomerByUsername);
router.put("/update-profile", verifyToken, masterCustomerController.updateProfile);
router.get("/profile", verifyToken, masterCustomerController.getProfile);

module.exports = router;
