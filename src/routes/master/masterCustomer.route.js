const express = require("express");
const router = express.Router();
const masterCustomerController = require("../../controllers/masterCustomer.controller");


router.post("/register", masterCustomerController.registerCustomer);
router.post("/login", masterCustomerController.loginCustomer);
router.post("/verifyOtp", masterCustomerController.verifyOTP);
router.post("/resendOtpAuthentication", masterCustomerController.resendOtpAuthentication);

router.get("/search-customer", masterCustomerController.getCustomerByUsername);
router.put("/update-profile/:customerId", masterCustomerController.updateProfile);

module.exports = router;
