const MsUserCustomer = require("../models/userCustomerModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ==========================
// CREATE CUSTOMER
// ==========================
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phoneNumber, countryCode, googleId, password } =
      req.body;

    // Cek email atau phoneNumber atau googleId sudah ada
    const existing = await MsUserCustomer.findOne({
      where: {
        email,
      },
    });
    if (existing)
      return res.status(400).json({ message: "Email sudah terdaftar" });

    const existingPhone = await MsUserCustomer.findOne({
      where: { phoneNumber },
    });
    if (existingPhone)
      return res.status(400).json({ message: "Nomor HP sudah terdaftar" });

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const customer = await MsUserCustomer.create({
      name,
      email,
      phoneNumber,
      countryCode,
      googleId,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Customer berhasil dibuat",
      data: customer,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==========================
// LOGIN CUSTOMER (EMAIL/PHONE/GOOGLE)
// ==========================
exports.loginCustomer = async (req, res) => {
  try {
    const { email, phoneNumber, password, googleId } = req.body;

    let customer = null;

    if (googleId) {
      customer = await MsUserCustomer.findOne({ where: { googleId } });
      if (!customer)
        return res.status(404).json({ message: "Google ID tidak terdaftar" });
    } else if (email) {
      customer = await MsUserCustomer.findOne({ where: { email } });
      if (!customer)
        return res.status(404).json({ message: "Email tidak terdaftar" });

      const validPassword = await bcrypt.compare(password, customer.password);
      if (!validPassword)
        return res.status(401).json({ message: "Password salah" });
    } else if (phoneNumber) {
      customer = await MsUserCustomer.findOne({ where: { phoneNumber } });
      if (!customer)
        return res.status(404).json({ message: "Nomor HP tidak terdaftar" });

      const validPassword = await bcrypt.compare(password, customer.password);
      if (!validPassword)
        return res.status(401).json({ message: "Password salah" });
    } else {
      return res.status(400).json({ message: "Data login tidak lengkap" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: customer.id },
      process.env.JWT_SECRET || "secretkey",
      {
        expiresIn: "7d",
      }
    );

    customer.jwtToken = token;
    await customer.save();

    res.json({
      message: "Login berhasil",
      data: customer,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ==========================
// GET ALL CUSTOMERS
// ==========================
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await MsUserCustomer.findAll();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================
// GET CUSTOMER BY ID
// ==========================
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await MsUserCustomer.findByPk(id);
    if (!customer)
      return res.status(404).json({ message: "Customer tidak ditemukan" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================
// UPDATE CUSTOMER
// ==========================
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber, countryCode, password } = req.body;

    const customer = await MsUserCustomer.findByPk(id);
    if (!customer)
      return res.status(404).json({ message: "Customer tidak ditemukan" });

    if (email && email !== customer.email) {
      const existEmail = await MsUserCustomer.findOne({ where: { email } });
      if (existEmail)
        return res.status(400).json({ message: "Email sudah digunakan" });
    }

    if (phoneNumber && phoneNumber !== customer.phoneNumber) {
      const existPhone = await MsUserCustomer.findOne({
        where: { phoneNumber },
      });
      if (existPhone)
        return res.status(400).json({ message: "Nomor HP sudah digunakan" });
    }

    if (password) {
      customer.password = await bcrypt.hash(password, 10);
    }

    customer.name = name || customer.name;
    customer.email = email || customer.email;
    customer.phoneNumber = phoneNumber || customer.phoneNumber;
    customer.countryCode = countryCode || customer.countryCode;

    await customer.save();

    res.json({ message: "Customer berhasil diperbarui", data: customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================
// DELETE CUSTOMER
// ==========================
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await MsUserCustomer.findByPk(id);
    if (!customer)
      return res.status(404).json({ message: "Customer tidak ditemukan" });

    await customer.destroy();
    res.json({ message: "Customer berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
