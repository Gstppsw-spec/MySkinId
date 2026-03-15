const express = require("express");
const router = express.Router();
const flashSaleController = require("../../controllers/flashSale.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

// ── Public / Customer ─────────────────────────
router.get("/active", flashSaleController.getActive);
router.get("/", flashSaleController.getAll);
router.get("/:id", flashSaleController.getById);

// ── Super Admin — Kelola Flash Sale Event ─────
router.post(
  "/",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  flashSaleController.create
);

router.put(
  "/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  flashSaleController.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles("SUPER_ADMIN"),
  flashSaleController.delete
);

// ── Outlet Admin — Register Items ─────────────
router.post(
  "/:id/items",
  verifyToken,
  allowRoles("OUTLET_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"),
  flashSaleController.registerItems
);

router.get(
  "/:id/items/:locationId",
  verifyToken,
  allowRoles("OUTLET_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"),
  flashSaleController.getItemsByLocation
);

router.delete(
  "/items/:itemId",
  verifyToken,
  allowRoles("OUTLET_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"),
  flashSaleController.removeItem
);

module.exports = router;
