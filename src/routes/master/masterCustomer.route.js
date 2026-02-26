const express = require("express");
const router = express.Router();
const masterCustomerController = require("../../controllers/masterCustomer.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");
const uploadProfileImage = require("../../middlewares/uploadProfileImage.middleware");


router.post("/register", masterCustomerController.registerCustomer);
router.post("/login", masterCustomerController.loginCustomer);
router.get("/google", masterCustomerController.googleRedirect);
router.get("/google/callback", masterCustomerController.googleCallback);
router.post("/google/mobile", masterCustomerController.googleMobileLogin);
router.post("/verifyOtp", masterCustomerController.verifyOTP);
router.post("/resendOtpAuthentication", masterCustomerController.resendOtpAuthentication);

router.get("/search-customer", verifyToken, masterCustomerController.getCustomerByUsername);
router.put(
    "/update-profile",
    verifyToken,
    uploadProfileImage.single("profileImage"),
    masterCustomerController.updateProfile
);
router.get("/profile", verifyToken, masterCustomerController.getProfile);
router.get("/get-customer-by-user-id/:userId", verifyToken, masterCustomerController.getCustomerByUserId);

module.exports = router;
