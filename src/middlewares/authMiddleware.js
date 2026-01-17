const jwt = require("jsonwebtoken");

module.exports.verifyToken = (req, res, next) => {
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
    req.user = {
      id: decoded.id,
      roleId: decoded.roleId,
      roleCode: decoded.roleCode,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      status: false,
      message: "Token expired atau tidak valid",
    });
  }
};
