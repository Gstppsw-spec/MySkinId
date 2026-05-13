const exportService = require("../services/export.service");

/**
 * Generic export handler that fetches data and generates PDF
 */
async function handleExport(req, res, fetchFn, fileNamePrefix) {
  try {
    const { startDate, endDate, companyIds, locationIds, format } = req.query;

    const companyIdsArray = companyIds ? companyIds.split(",") : undefined;
    const locationIdsArray = locationIds ? locationIds.split(",") : undefined;

    // Fetch data
    const config = await fetchFn(startDate, endDate, companyIdsArray, locationIdsArray);

    if (config.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found",
      });
    }

    const fileDate = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      const buffer = await exportService.generateExcel(config);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileNamePrefix}_${fileDate}.xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      return res.send(buffer);
    } else {
      // Default to PDF
      const buffer = await exportService.generatePDF(config);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileNamePrefix}_${fileDate}.pdf"`
      );
      res.setHeader("Content-Type", "application/pdf");
      return res.send(buffer);
    }
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
    return handleExport(req, res, exportService.fetchPackages, "laporan_package");
  },

  async exportLocations(req, res) {
    return handleExport(req, res, exportService.fetchLocations, "laporan_location");
  },

  async exportCustomers(req, res) {
    return handleExport(req, res, exportService.fetchCustomers, "laporan_customer");
  },

  async exportAdsPerformance(req, res) {
    return handleExport(req, res, exportService.fetchAdsPerformance, "laporan_ads_performance");
  }
};
