const express = require("express");
const router = express.Router();
const masterCustomerController = require("../../controllers/masterCustomer.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");
const uploadProfileImage = require("../../middlewares/uploadProfileImage.middleware");
const compressImage = require("../../middlewares/compressImage");


router.post("/register", masterCustomerController.registerCustomer);
router.post("/login", masterCustomerController.loginCustomer);
router.get("/google", masterCustomerController.googleRedirect);
router.post("/google/android", masterCustomerController.googleMobileLogin);
router.post("/google/ios", masterCustomerController.googleIosLogin);
router.get("/google/callback", masterCustomerController.googleCallback);
router.post("/apple/ios", masterCustomerController.appleIosLogin);
router.post("/verifyOtp", masterCustomerController.verifyOTP);
router.post("/resendOtpAuthentication", masterCustomerController.resendOtpAuthentication);

router.get("/search-customer", verifyToken, masterCustomerController.getCustomerByUsername);
router.put(
    "/update-profile",
    verifyToken,
    uploadProfileImage.single("profileImage"),
    compressImage,
    masterCustomerController.updateProfile
);
router.get("/profile", verifyToken, masterCustomerController.getProfile);
router.post("/track-open", verifyToken, masterCustomerController.trackOpen);
router.get("/dashboard-summary", verifyToken, masterCustomerController.getCustomerDashboardSummary);
router.get("/get-customer-by-user-id/:userId", verifyToken, masterCustomerController.getCustomerByUserId);

// Admin: Toggle freelance/busdev status
router.put(
  "/toggle-freelance",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterCustomerController.toggleFreelance
);

// Admin: Toggle downline status
router.put(
  "/toggle-downline",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterCustomerController.toggleDownline
);

// Admin: Get customer list with pagination and filters
router.get(
  "/admin/list",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterCustomerController.getCustomerListForAdmin
);

// Admin: Get list of referred customers for a specific freelance/busdev
router.get(
  "/admin/referred-customers",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterCustomerController.getReferredCustomersForAdmin
);

// Admin: Manually associate customer to a freelance/busdev (referrer)
router.put(
  "/admin/set-referrer",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterCustomerController.setReferrerForAdmin
);

// Admin: Get list of all freelance/busdev accounts with their metrics
router.get(
  "/admin/freelancers",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterCustomerController.getFreelancersListForAdmin
);

// Admin: Get list of all downline accounts with their metrics
router.get(
  "/admin/downlines",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  masterCustomerController.getDownlinesListForAdmin
);

module.exports = router;
