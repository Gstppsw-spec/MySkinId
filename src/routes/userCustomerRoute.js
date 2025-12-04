const express = require("express");
const router = express.Router();
const {
  createCustomer,
  loginCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/userCustomerController");

// ==========================
// ROUTES
// ==========================
router.post("/", createCustomer);          // Tambah customer
router.post("/login", loginCustomer);      // Login
router.get("/", getAllCustomers);         // List semua customer
router.get("/:id", getCustomerById);      // Detail customer
router.put("/:id", updateCustomer);       // Update customer
router.delete("/:id", deleteCustomer);    // Delete customer

module.exports = router;
