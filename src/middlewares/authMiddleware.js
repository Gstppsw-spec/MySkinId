const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const {
  relationshipUserCompany,
  relationshipUserLocation,
  masterLocation,
} = require("../models");

module.exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      status: false,
      message: "Authorization header tidak ada",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Token tidak valid",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id;
    const roleCode = decoded.roleCode;

    let locationIds = [];
    let companyIds = [];

    if (roleCode !== "SUPER_ADMIN") {
      // 1. Get direct company associations
      companyIds = await relationshipUserCompany
        .findAll({
          where: { userId },
          attributes: ["companyId"],
          raw: true,
        })
        .then((res) => res.map((r) => r.companyId));

      // 2. Get direct location associations
      locationIds = await relationshipUserLocation
        .findAll({
          where: { userId },
          attributes: ["locationId"],
          raw: true,
        })
        .then((res) => res.map((r) => r.locationId));

      // 3. If COMPANY_ADMIN, expand locationIds to all locations in their companies
      if (roleCode === "COMPANY_ADMIN" && companyIds.length) {
        const companyLocations = await masterLocation
          .findAll({
            where: { companyId: { [Op.in]: companyIds } },
            attributes: ["id"],
            raw: true,
          })
          .then((res) => res.map((r) => r.id));
        
        locationIds = [...new Set([...locationIds, ...companyLocations])];
      }

      // 4. Expand companyIds from locationIds (for non-company-admin roles like DOCTOR/STAFF)
      if (locationIds.length) {
        const foundCompanies = await masterLocation
          .findAll({
            where: { id: { [Op.in]: locationIds } },
            attributes: ["companyId"],
            raw: true,
          })
          .then((res) => res.map((r) => r.companyId));
        
        companyIds = [...new Set([...companyIds, ...foundCompanies])];
      }
    }

    // ✅ attach ke request
    req.user = {
      id: userId,
      roleId: decoded.roleId,
      roleCode,
      locationIds,
      companyId: companyIds.length ? companyIds[0] : null,
      companyIds,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      status: false,
      message: "Token expired atau tidak valid",
    });
  }
};

module.exports.optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      roleId: decoded.roleId,
      roleCode: decoded.roleCode,
    };
  } catch {
    req.user = null;
  }

  next();
};
