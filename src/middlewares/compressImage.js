const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

/**
 * Compress Image Middleware
 * 
 * Works with both req.file (single) and req.files (multiple).
 * - Resizes images to max 1920px width/height (preserving aspect ratio)
 * - Converts to JPEG with mozjpeg quality 80
 * - Overwrites the original file with compressed version
 * - Skips non-image files (video, svg, gif) automatically
 * - Non-blocking: if compression fails, original file is kept
 */

const SKIP_EXTENSIONS = [".mp4", ".mov", ".avi", ".gif", ".svg", ".webm"];
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 80;

async function compressSingleFile(file) {
  const ext = path.extname(file.originalname || file.filename).toLowerCase();

  // Skip non-image files
  if (SKIP_EXTENSIONS.includes(ext)) {
    return;
  }

  const inputPath = file.path;
  const tempPath = inputPath + ".tmp";

  try {
    const image = sharp(inputPath);
    const meta = await image.metadata();

    // Skip if not a recognized image format
    if (!meta.format) return;

    let { width, height } = meta;

    // Resize if needed (keep aspect ratio)
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    await sharp(inputPath)
      .resize(width, height, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(tempPath);

    // Replace original with compressed version
    fs.unlinkSync(inputPath);
    fs.renameSync(tempPath, inputPath);

    // Update file size in metadata
    const stats = fs.statSync(inputPath);
    file.size = stats.size;
  } catch (err) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    // Non-blocking: keep original file, just log warning
    console.warn(`[CompressImage] Failed to compress ${file.filename}: ${err.message}`);
  }
}

const compressImage = async (req, res, next) => {
  try {
    const files = [];

    // Collect files from req.file (single) or req.files (multiple)
    if (req.file) {
      files.push(req.file);
    }
    if (req.files && Array.isArray(req.files)) {
      files.push(...req.files);
    }

    // Nothing to compress
    if (files.length === 0) {
      return next();
    }

    // Compress all files in parallel
    await Promise.all(files.map(compressSingleFile));

    next();
  } catch (err) {
    console.error("[CompressImage] Middleware error:", err.message);
    // Non-blocking: continue even if compression fails
    next();
  }
};

module.exports = compressImage;
