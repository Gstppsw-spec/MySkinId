const ImageLocation = require("../models/imageLocationModel");
const path = require("path");
const fs = require("fs");

// === Upload Image ===
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { locationid, isImageByOutlet, isImageByCustomer, updateuserid } = req.body;

    const image = await ImageLocation.create({
      locationid,
      isImageByOutlet: isImageByOutlet === "true",
      isImageByCustomer: isImageByCustomer === "true",
      image_url: `/uploads/${req.file.filename}`,
      updateuserid,
    });

    res.status(201).json({
      message: "Image uploaded successfully",
      data: image,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// === Get All Images ===
exports.getAllImages = async (req, res) => {
  try {
    const images = await ImageLocation.findAll();
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Get Images by Location ===
exports.getImagesByLocation = async (req, res) => {
  try {
    const { locationid } = req.params;
    const images = await ImageLocation.findAll({ where: { locationid } });
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === Delete Image ===
exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await ImageLocation.findByPk(id);
    if (!image) return res.status(404).json({ message: "Image not found" });

    // Hapus file dari folder uploads
    const filePath = path.join(__dirname, "..", image.image_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await image.destroy();
    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
