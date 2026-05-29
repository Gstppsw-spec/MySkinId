const exportService = require("../services/export.service");

/**
 * Generic export handler that fetches data and generates PDF
 */
async function handleExport(req, res, fetchFn, fileNamePrefix) {
  try {
    const { startDate, endDate, companyIds, companyId, locationIds, locationId, format, search } = req.query;

    const activeCompanyIds = companyIds || companyId;
    const activeLocationIds = locationIds || locationId;

    let companyIdsArray;
    if (activeCompanyIds) {
      if (typeof activeCompanyIds === "string") {
        companyIdsArray = activeCompanyIds.split(",").map(id => id.trim()).filter(Boolean);
      } else if (Array.isArray(activeCompanyIds)) {
        companyIdsArray = activeCompanyIds.map(id => String(id).trim()).filter(Boolean);
      }
    }

    let locationIdsArray;
    if (activeLocationIds) {
      if (typeof activeLocationIds === "string") {
        locationIdsArray = activeLocationIds.split(",").map(id => id.trim()).filter(Boolean);
      } else if (Array.isArray(activeLocationIds)) {
        locationIdsArray = activeLocationIds.map(id => String(id).trim()).filter(Boolean);
      }
    }

    // Apply role-based filtering if user is not global admin
    const user = req.user;
    const roleCode = user?.roleCode;
    const isGlobalAdmin = ["SUPER_ADMIN", "OPERATIONAL_ADMIN"].includes(roleCode);

    if (user && !isGlobalAdmin) {
      if (roleCode === "COMPANY_ADMIN") {
        const allowedCompanyIds = (user.companyIds || []).map(String);
        if (companyIdsArray && companyIdsArray.length > 0) {
          companyIdsArray = companyIdsArray.filter(id => allowedCompanyIds.includes(String(id)));
          if (companyIdsArray.length === 0) {
            companyIdsArray = [-1]; // force empty
          }
        } else {
          companyIdsArray = allowedCompanyIds;
        }
      } else if (roleCode === "OUTLET_ADMIN") {
        const allowedLocationIds = (user.locationIds || []).map(String);
        if (locationIdsArray && locationIdsArray.length > 0) {
          locationIdsArray = locationIdsArray.filter(id => allowedLocationIds.includes(String(id)));
          if (locationIdsArray.length === 0) {
            locationIdsArray = [-1]; // force empty
          }
        } else {
          locationIdsArray = allowedLocationIds;
        }
      }
    }

    // Fetch data
    const config = await fetchFn(startDate, endDate, companyIdsArray, locationIdsArray, search);

    if (config.rows.length === 0 && !config.allowEmpty) {
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
    const { busdevName } = req.query;
    const fetchFn = (startDate, endDate, companyIdsArray, locationIdsArray, search) => {
      return exportService.fetchCustomers(startDate, endDate, busdevName);
    };
    return handleExport(req, res, fetchFn, "laporan_customer");
  },

  async exportFreelancers(req, res) {
    return handleExport(req, res, exportService.fetchFreelancers, "laporan_freelance");
  },

  async exportAdsPerformance(req, res) {
    return handleExport(req, res, exportService.fetchAdsPerformance, "laporan_ads_performance");
  },

  async exportConsultationSummary(req, res) {
    return handleExport(req, res, exportService.fetchConsultationSummary, "laporan_ringkasan_konsultasi");
  }
};
