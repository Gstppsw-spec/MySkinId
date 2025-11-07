const MsUser = require("../models/userModel");
const MsCompany = require("../models/companyModel");
const MsLocation = require("../models/locationModel");
const MsRole = require("../models/roleModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await MsUser.findOne({
      where: { email },
      include: [
        { model: MsCompany, as: "company", attributes: ["id", "name"] },
        { model: MsLocation, as: "location", attributes: ["id", "name"] },
        {
          model: MsRole,
          as: "role",
          attributes: [
            "id",
            "name",
            "isAdminCompany",
            "isAdminOutlet",
            "isSuperAdmin",
            "isDoctor",
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (!user.isactive) {
      return res.status(403).json({ message: "Akun user tidak aktif" });
    }

    // 2️⃣ Cek password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Password salah" });
    }

    // 3️⃣ Buat token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleid: user.roleid,
        companyid: user.companyid,
        locationid: user.locationid,
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    // 4️⃣ Simpan token ke database
    user.jwttoken = token;
    await user.save();

    // 5️⃣ Kirim response
    res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name,
        isAdminCompany: user.role?.isAdminCompany,
        isAdminOutlet: user.role?.isAdminOutlet,
        isSuperAdmin: user.role?.isSuperAdmin,
        isDoctor: user.role?.isDoctor,
        company: user.company?.name || null,
        location: user.location?.name || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      roleid,
      companyid,
      locationid,
      isactive,
      updateuserid,
    } = req.body;

    const role = await MsRole.findByPk(roleid);

    if (!role) {
      return res
        .status(400)
        .json({ message: "Invalid roleid: role not found" });
    }

    // 🔹 2. Validasi berdasarkan tipe role
    if (role.isAdminCompany && !companyid) {
      return res.status(400).json({
        message: "companyid is required for Admin Company role",
      });
    }

    if (role.isAdminOutlet && (!companyid || !locationid)) {
      return res.status(400).json({
        message: "companyid and locationid are required for Admin Outlet role",
      });
    }

    // 🔹 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 4. Simpan data user
    const user = await MsUser.create({
      email,
      password: hashedPassword,
      roleid,
      companyid,
      locationid,
      isactive,
      updateuserid,
    });

    res.status(201).json({
      message: "User created successfully",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await MsUser.findAll({
      include: [
        { model: MsCompany, as: "company", attributes: ["id", "name", "code"] },
        {
          model: MsLocation,
          as: "location",
          attributes: ["id", "name", "code", "cityid"],
        },
        { model: MsRole, as: "role", attributes: ["id", "name"] },
      ],
      order: [["updatedate", "DESC"]],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await MsUser.findByPk(req.params.id, {
      include: [
        { model: MsCompany, as: "company", attributes: ["id", "name"] },
        { model: MsLocation, as: "location", attributes: ["id", "name"] },
        { model: MsRole, as: "role", attributes: ["id", "name"] },
      ],
    });

    if (!user) return res.status(404).json({ message: "User not foundy" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const user = await MsUser.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { password, ...updates } = req.body;

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    await user.update(updates);

    res.json({
      message: "User updated successfully",
      data: user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await MsUser.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllUsersByUserId = async (req, res) => {
  const userId = req.headers.userid;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing user ID in request header",
    });
  }

  try {
    const user = await MsUser.findOne({
      where: { id: userId },
      include: [{ model: MsRole, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not foundd",
      });
    }

    let whereCondition = {};

    if (user.role?.isSuperAdmin) {
      whereCondition = {};
    } else if (user.role?.isAdminCompany) {
      if (!user.companyid) {
        return res.status(400).json({
          success: false,
          message: "User has no company assigned",
        });
      }
      whereCondition = { companyid: user.companyid };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const users = await MsUser.findAll({
      where: whereCondition,
      include: [
        { model: MsCompany, as: "company", attributes: ["id", "name", "code"] },
        {
          model: MsLocation,
          as: "location",
          attributes: ["id", "name", "code", "cityid"],
        },
        { model: MsRole, as: "role", attributes: ["id", "name"] },
      ],
      order: [["updatedate", "DESC"]],
    });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
