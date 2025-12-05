const jwt = require("jsonwebtoken");
const MsUser = require("../models/userModel");
const MsUserCustomer = require("../models/userCustomerModel");

exports.authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Token tidak ditemukan" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token tidak valid" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

    let user = await MsUser.findByPk(decoded.id);
    let type = "employee";
    

    if (!user) {
      user = await MsUserCustomer.findByPk(decoded.id);
      type = "customer";
    }

    if (!user) return res.status(401).json({ message: "User tidak ditemukan" });
    req.user = user;
    req.userType = type;
    next();
  } catch (err) {
    console.error(err);
    res
      .status(401)
      .json({ message: "Token tidak valid atau sudah kadaluarsa" });
  }
};
