const axios = require("axios");
const { masterCustomer, CustomerSkinAnalysisResult } = require("../models");

const FormData = require("form-data");
const fs = require("fs");
const { Op } = require("sequelize");
const { analyzeResult } = require("../helpers/skinAnalysis.helper");

module.exports = {
  async analyze({ customerId, imageFile }) {
    const last = await CustomerSkinAnalysisResult.findOne({
      where: {
        customerId,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 168 * 60 * 60 * 1000),
        },
      },
      order: [["createdAt", "DESC"]],
    });

    if (last) {
      return {
        status: false,
        message: "Kamu sudah melakukan analisis kulit dalam 168 jam terakhir",
        data: last,
      };
    }

    // 📡 CALL AI
    const form = new FormData();
    form.append("image", fs.createReadStream(imageFile.path));

    const aiRes = await axios.post(
      "https://www.ailabapi.com/api/portrait/analysis/skin-analysis",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "ailabapi-api-key": process.env.AILAB_API_KEY,
        },
        timeout: 30000,
      }
    );

    // 🧠 ANALYZE
    const analyzed = analyzeResult(aiRes.data.result);

    // 💾 SAVE DB
    const saved = await CustomerSkinAnalysisResult.create({
      customerId,
      imageUrl: imageFile.filename,
      rawResponse: aiRes.data,
      acneScore: analyzed.acneScore,
      wrinkleScore: analyzed.wrinkleScore,
      oilScore: analyzed.oilScore,
      skinType: analyzed.skinType,
      severity: analyzed.severity,
    });

    fs.unlinkSync(imageFile.path);

    return {
      status: true,
      message: "Berhasil melakukan analisis kulit",
      data: saved,
    };
  },

  async getLatest(customerId) {
    const result = await CustomerSkinAnalysisResult.findOne({
      where: { customerId },
      order: [["createdAt", "DESC"]],
    });

    return result
      ? {
          status: true,
          message: "Berhasil mendapatkan hasil analisis kulit terbaru",
          data: result,
        }
      : {
          status: false,
          message: "Tidak ada hasil analisis kulit terbaru",
          data: null,
        };
  },

  _formatResponse(row) {
    return {
      id: row.id,
      acne: Math.round(row.acneScore * 100),
      wrinkles: Math.round(row.wrinkleScore * 100),
      oil: Math.round(row.oilScore * 100),
      skinType: row.skinType,
      severity: row.severity,
      createdAt: row.createdAt,
    };
  },
};
