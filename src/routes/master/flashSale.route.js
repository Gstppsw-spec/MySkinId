const express = require("express");
const router = express.Router();
const flashSaleController = require("../../controllers/flashSale.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

// ── Public / Customer ─────────────────────────
router.get("/active", flashSaleController.getActive);
router.get("/location/:locationId", flashSaleController.getByLocationId);
router.get("/:id", flashSaleController.getById);

// ── Outlet Admin ──────────────────────────────
router.post(
  "/",
  verifyToken,
  allowRoles("OUTLET_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"),
  flashSaleController.create
);

router.put(
  "/:id",
  verifyToken,
  allowRoles("OUTLET_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"),
  flashSaleController.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles("OUTLET_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"),
  flashSaleController.delete
);

module.exports = router;
