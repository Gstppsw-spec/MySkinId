const response = require("../helpers/response");
const consultationCategoryService = require("../services/masterConsultationCategory");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/consultation-categories";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp, svg)"));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

module.exports = {
  upload: upload.single("icon"), // field name: "icon"

  async getAll(req, res) {
    try {
      const result = await consultationCategoryService.getAll();
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await consultationCategoryService.getById(id);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async create(req, res) {
    try {
      const { name, description, isActive } = req.body;

      // Build iconUrl from uploaded file or from body
      let iconUrl = req.body.iconUrl || null;
      if (req.file) {
        iconUrl = `${req.file.destination}/${req.file.filename}`;
      }

      const data = { name, description, iconUrl, isActive };
      const result = await consultationCategoryService.create(data);
      return res.status(result.status ? 201 : 400).json(result);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      let iconUrl = req.body.iconUrl;
      if (req.file) {
        iconUrl = `${req.file.destination}/${req.file.filename}`;
      }

      const data = { name, description, iconUrl, isActive };
      const result = await consultationCategoryService.update(id, data);
      return res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async delete(req, res) {
    const { id } = req.params;
    const result = await consultationCategoryService.delete(id);
    return res.status(result.status ? 200 : 400).json(result);
  },
};
