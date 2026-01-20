// const jwt = require("jsonwebtoken");

// module.exports.verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   console.log(authHeader);

//   if (!authHeader) {
//     return res.status(401).json({
//       status: false,
//       message: "Authorization header tidak ada",
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({
//       status: false,
//       message: "Token tidak valid",
//     });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = {
//       id: decoded.id,
//       roleId: decoded.roleId,
//       roleCode: decoded.roleCode,
//     };

//     next();
//   } catch (err) {
//     return res.status(401).json({
//       status: false,
//       message: "Token expired atau tidak valid",
//     });
//   }
// };

const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const {
  relationshipUserCompany,
  relationshipUserLocation,
  masterLocation,
} = require("../models"); // sesuaikan path

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

    // 🔥 ROLE: ADMIN_COMPANY
    if (roleCode === "ADMIN_COMPANY") {
      const companyIds = await relationshipUserCompany
        .findAll({
          where: { userId },
          attributes: ["companyId"],
          raw: true,
        })
        .then((res) => res.map((r) => r.companyId));

      if (companyIds.length) {
        locationIds = await masterLocation
          .findAll({
            where: {
              companyId: { [Op.in]: companyIds },
            },
            attributes: ["id"],
            raw: true,
          })
          .then((res) => res.map((r) => r.id));
      }
    }

    // 🔥 ROLE: selain SUPER_ADMIN & ADMIN_COMPANY
    else if (roleCode !== "SUPER_ADMIN") {
      locationIds = await relationshipUserLocation
        .findAll({
          where: { userId },
          attributes: ["locationId"],
          raw: true,
        })
        .then((res) => res.map((r) => r.locationId));
    }

    // ✅ attach ke request
    req.user = {
      id: userId,
      roleId: decoded.roleId,
      roleCode,
      locationIds,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      status: false,
      message: "Token expired atau tidak valid",
    });
  }
};
