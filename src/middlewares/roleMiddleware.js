module.exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roleCode) {
      return res.status(403).json({
        status: false,
        message: "Akses ditolak",
      });
    }

    if (!allowedRoles.includes(req.user.roleCode)) {
      return res.status(403).json({
        status: false,
        message: "Role tidak memiliki akses",
      });
    }

    next();
  };
};
