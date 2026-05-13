const exportService = require("../services/export.service");

/**
 * Generic export handler that fetches data and generates PDF
 */
async function handleExport(req, res, fetchFn, fileNamePrefix) {
  try {
    const { startDate, endDate } = req.query;

    // Fetch data
    const config = await fetchFn(startDate, endDate);

    if (config.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Tidak ada data untuk di-export",
        data: null,
      });
    }

    // Generate PDF
    const pdfBuffer = await exportService.generatePDF(config);

    // Set response headers
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `${fileNamePrefix}_${timestamp}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error(`Export ${fileNamePrefix} error:`, error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
}

module.exports = {
  async exportUsers(req, res) {
    return handleExport(req, res, exportService.fetchUsers, "laporan_user");
  },

  async exportCompanies(req, res) {
    return handleExport(req, res, exportService.fetchCompanies, "laporan_perusahaan");
  },

  async exportTreatments(req, res) {
    return handleExport(req, res, exportService.fetchTreatments, "laporan_treatment");
  },

  async exportProducts(req, res) {
    return handleExport(req, res, exportService.fetchProducts, "laporan_produk");
  },

  async exportPackages(req, res) {
    return handleExport(req, res, exportService.fetchPackages, "laporan_paket");
  },

  async exportLocations(req, res) {
    return handleExport(req, res, exportService.fetchLocations, "laporan_outlet");
  },
};
