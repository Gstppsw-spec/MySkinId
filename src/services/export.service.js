const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { Op } = require("sequelize");
const {
  masterUser,
  masterCompany,
  masterService,
  masterProduct,
  masterPackage,
  masterLocation,
  relationshipUserCompany,
  relationshipProductLocation,
  relationshipServiceLocation,
  relationshipPackageLocation,
  masterPackageItems,
  masterCustomer,
  AdsPurchase,
  AdsConfig,
} = require("../models");

// ─── Constants ───────────────────────────────────────────────────────────────

const HEADER_COLOR = "#6C3AE0";
const HEADER_TEXT_COLOR = "#FFFFFF";
const ROW_ALT_COLOR = "#F8F6FF";
const BORDER_COLOR = "#E0E0E0";
const TEXT_COLOR = "#333333";
const FONT_SIZE_TITLE = 20;
const FONT_SIZE_SUBTITLE = 10;
const FONT_SIZE_TABLE = 8;
const FOOTER_FONT_SIZE = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format number as Indonesian Rupiah
 */
function formatRupiah(number) {
  if (number == null || isNaN(number)) return "Rp 0";
  const num = parseFloat(number);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

/**
 * Build a date filter WHERE clause for createdAt
 */
function buildDateFilter(startDate, endDate) {
  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt[Op.gte] = new Date(startDate + "T00:00:00");
    }
    if (endDate) {
      where.createdAt[Op.lte] = new Date(endDate + "T23:59:59");
    }
  }
  return where;
}

/**
 * Format date as dd/M/yyyy, HH.mm.ss (Indonesian locale style)
 */
function formatDate(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const seconds = d.getSeconds().toString().padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}.${minutes}.${seconds}`;
}

// ─── Data Fetchers ───────────────────────────────────────────────────────────

async function fetchUsers(startDate, endDate, companyIds, locationIds) {
  const dateWhere = buildDateFilter(startDate, endDate);
  const where = { ...dateWhere };

  const include = [];

  const companyInclude = {
    model: masterCompany,
    as: "companies",
    attributes: ["name"],
    through: { attributes: [] },
  };
  if (companyIds && companyIds.length > 0) {
    companyInclude.where = { id: companyIds };
  }
  include.push(companyInclude);

  if (locationIds && locationIds.length > 0) {
    include.push({
      model: masterLocation,
      as: "locations",
      where: { id: locationIds },
      attributes: ["name"],
      through: { attributes: [] },
    });
  }

  const users = await masterUser.findAll({
    where,
    include,
    order: [["createdAt", "ASC"]],
  });

  const rows = users.map((user, idx) => {
    const companyNames = user.companies && user.companies.length > 0
      ? user.companies.map((c) => c.name).join(", ")
      : "-";
    return [
      idx + 1,
      user.name || "-",
      user.email || "-",
      user.phone || "-",
      companyNames,
    ];
  });

  return {
    title: "Laporan Data User",
    columns: [
      { header: "No", width: 35 },
      { header: "Nama Lengkap", width: 150 },
      { header: "Email", width: 160 },
      { header: "No. Telepon", width: 100 },
      { header: "Perusahaan", width: 160 },
    ],
    rows,
    totalData: rows.length,
  };
}

async function fetchCompanies(startDate, endDate) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const companies = await masterCompany.findAll({
    where: { ...dateWhere },
    order: [["createdAt", "ASC"]],
  });

  const rows = companies.map((c, idx) => [
    idx + 1,
    c.name || "-",
    c.address || "-",
    c.phone || "-",
    c.bankName || "-",
    c.bankAccountNumber || "-",
    c.bankAccountName || "-",
    c.platformFee !== null && c.platformFee !== undefined ? c.platformFee + "%" : "Default",
  ]);

  return {
    title: "Laporan Data Perusahaan",
    columns: [
      { header: "No", width: 30 },
      { header: "Nama Perusahaan", width: 120 },
      { header: "Alamat", width: 130 },
      { header: "No. Telepon", width: 70 },
      { header: "Nama Bank", width: 70 },
      { header: "No. Rekening", width: 80 },
      { header: "Nama Pemilik Rekening", width: 105 },
      { header: "Platform Fee", width: 70 },
    ],
    rows,
    totalData: rows.length,
  };
}

async function fetchTreatments(startDate, endDate, companyIds, locationIds) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const locationWhere = {};
  if (locationIds && locationIds.length > 0) locationWhere.id = locationIds;
  if (companyIds && companyIds.length > 0) locationWhere.companyId = companyIds;

  const services = await masterService.findAll({
    where: { ...dateWhere },
    include: [
      {
        model: masterLocation,
        as: "locations",
        where: Object.keys(locationWhere).length > 0 ? locationWhere : undefined,
        attributes: ["name"],
        through: { attributes: [] },
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  const rows = services.map((s, idx) => {
    const price = parseFloat(s.price) || 0;
    const discount = parseFloat(s.discountPercent) || 0;
    const discountedPrice = price - (price * discount) / 100;
    const outletNames = s.locations && s.locations.length > 0
      ? s.locations.map((l) => l.name).join(", ")
      : "-";
    return [
      idx + 1,
      s.name || "-",
      formatRupiah(price),
      `${discount}%`,
      formatRupiah(discountedPrice),
      outletNames,
    ];
  });

  return {
    title: "Laporan Data Treatment/Layanan",
    columns: [
      { header: "No", width: 35 },
      { header: "Nama Layanan", width: 160 },
      { header: "Harga", width: 80 },
      { header: "Diskon", width: 50 },
      { header: "Harga Setelah Diskon", width: 100 },
      { header: "Outlet", width: 180 },
    ],
    rows,
    totalData: rows.length,
  };
}

async function fetchProducts(startDate, endDate, companyIds, locationIds) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const locationWhere = {};
  if (locationIds && locationIds.length > 0) locationWhere.id = locationIds;
  if (companyIds && companyIds.length > 0) locationWhere.companyId = companyIds;

  const products = await masterProduct.findAll({
    where: { ...dateWhere },
    include: [
      {
        model: masterLocation,
        as: "locations",
        where: Object.keys(locationWhere).length > 0 ? locationWhere : undefined,
        attributes: ["name"],
        through: { attributes: [] },
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  const rows = products.map((p, idx) => {
    const price = parseFloat(p.price) || 0;
    const discount = parseFloat(p.discountPercent) || 0;
    const discountedPrice = price - (price * discount) / 100;
    const outletNames = p.locations && p.locations.length > 0
      ? p.locations.map((l) => l.name).join(", ")
      : "-";
    return [
      idx + 1,
      p.name || "-",
      formatRupiah(price),
      `${discount}%`,
      formatRupiah(discountedPrice),
      outletNames,
    ];
  });

  return {
    title: "Laporan Data Produk",
    columns: [
      { header: "No", width: 35 },
      { header: "Nama Produk", width: 160 },
      { header: "Harga", width: 80 },
      { header: "Diskon", width: 50 },
      { header: "Harga Setelah Diskon", width: 100 },
      { header: "Outlet", width: 180 },
    ],
    rows,
    totalData: rows.length,
  };
}

async function fetchPackages(startDate, endDate, companyIds, locationIds) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const locationWhere = {};
  if (locationIds && locationIds.length > 0) locationWhere.id = locationIds;
  if (companyIds && companyIds.length > 0) locationWhere.companyId = companyIds;

  const packages = await masterPackage.findAll({
    where: { ...dateWhere },
    include: [
      {
        model: masterLocation,
        as: "locations",
        where: Object.keys(locationWhere).length > 0 ? locationWhere : undefined,
        attributes: ["name"],
        through: { attributes: [] },
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  const rows = packages.map((p, idx) => {
    const price = parseFloat(p.price) || 0;
    const discount = parseFloat(p.discountPercent) || 0;
    const discountedPrice = price - (price * discount) / 100;
    const outletNames = p.locations && p.locations.length > 0
      ? p.locations.map((l) => l.name).join(", ")
      : "-";
    return [
      idx + 1,
      p.name || "-",
      formatRupiah(price),
      `${discount}%`,
      formatRupiah(discountedPrice),
      outletNames,
    ];
  });

  return {
    title: "Laporan Data Paket",
    columns: [
      { header: "No", width: 35 },
      { header: "Nama Paket", width: 160 },
      { header: "Harga", width: 80 },
      { header: "Diskon", width: 50 },
      { header: "Harga Setelah Diskon", width: 100 },
      { header: "Outlet", width: 180 },
    ],
    rows,
    totalData: rows.length,
  };
}

async function fetchLocations(startDate, endDate, companyIds, locationIds) {
  const dateWhere = buildDateFilter(startDate, endDate);
  const where = { ...dateWhere };

  if (locationIds && locationIds.length > 0) where.id = locationIds;
  if (companyIds && companyIds.length > 0) where.companyId = companyIds;

  const locations = await masterLocation.findAll({
    where,
    order: [["createdAt", "ASC"]],
  });

  const rows = locations.map((l, idx) => [
    idx + 1,
    l.name || "-",
    l.address || "-",
    l.phone || "-",
    l.email || "-",
  ]);

  return {
    title: "Laporan Data Outlet/Lokasi",
    columns: [
      { header: "No", width: 35 },
      { header: "Nama Outlet", width: 140 },
      { header: "Alamat", width: 250 },
      { header: "No. Telepon", width: 90 },
      { header: "Email", width: 140 },
    ],
    rows,
    totalData: rows.length,
  };
}

// ─── PDF Generator ───────────────────────────────────────────────────────────

/**
 * Generate a styled PDF report and return it as a Buffer.
 *
 * @param {Object} config
 * @param {string} config.title - Report title
 * @param {Array}  config.columns - Array of { header, width }
 * @param {Array}  config.rows - Array of row arrays
 * @param {number} config.totalData - Total data count
 * @returns {Promise<Buffer>}
 */
function generatePDF(config) {
  return new Promise((resolve, reject) => {
    const { title, columns, rows, totalData } = config;

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoPageBreak: false,
    });

    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const MARGIN_TOP = 40;
    const MARGIN_BOTTOM = 50;
    const MARGIN_LEFT = 40;
    const MARGIN_RIGHT = 40;

    const pageWidth = doc.page.width - MARGIN_LEFT - MARGIN_RIGHT;
    const pageHeight = doc.page.height - MARGIN_TOP - MARGIN_BOTTOM;
    const startX = MARGIN_LEFT;
    const ROW_HEIGHT = 28;
    const HEADER_ROW_HEIGHT = 32;

    // Calculate total defined column width
    const totalColWidth = columns.reduce((sum, col) => sum + col.width, 0);
    // Scale columns proportionally to fit page width
    const scale = pageWidth / totalColWidth;
    const scaledColumns = columns.map((col) => ({
      ...col,
      width: col.width * scale,
    }));

    let currentPage = 1;
    let currentY = MARGIN_TOP;

    // ── Draw page header (title, date, total data) ──────────────────────
    function drawPageHeader() {
      doc
        .font("Helvetica-Bold")
        .fontSize(FONT_SIZE_TITLE)
        .fillColor(TEXT_COLOR)
        .text(title, startX, currentY);
      currentY += FONT_SIZE_TITLE + 6;

      doc
        .font("Helvetica")
        .fontSize(FONT_SIZE_SUBTITLE)
        .fillColor("#666666")
        .text(`Dicetak pada: ${formatDate(new Date())}`, startX, currentY);
      currentY += FONT_SIZE_SUBTITLE + 3;

      doc.text(`Total Data: ${totalData} Item`, startX, currentY);
      currentY += FONT_SIZE_SUBTITLE + 16;
    }

    // ── Draw table header row ───────────────────────────────────────────
    function drawTableHeader() {
      let x = startX;
      // Draw header background
      doc
        .rect(startX, currentY, pageWidth, HEADER_ROW_HEIGHT)
        .fill(HEADER_COLOR);

      // Draw header text
      scaledColumns.forEach((col) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(FONT_SIZE_TABLE)
          .fillColor(HEADER_TEXT_COLOR);

        const textY =
          currentY + (HEADER_ROW_HEIGHT - FONT_SIZE_TABLE) / 2;
        doc.text(col.header, x + 6, textY, {
          width: col.width - 12,
          align: "left",
          lineBreak: true,
        });
        x += col.width;
      });

      currentY += HEADER_ROW_HEIGHT;
    }

    // Helper to calculate required row height based on cell content wrapping
    function calculateRowHeight(row) {
      let maxHeight = ROW_HEIGHT;
      scaledColumns.forEach((col, colIdx) => {
        const cellValue =
          row[colIdx] !== undefined && row[colIdx] !== null
            ? String(row[colIdx])
            : "-";
        
        doc.font("Helvetica").fontSize(FONT_SIZE_TABLE);
        const cellHeight = doc.heightOfString(cellValue, {
          width: col.width - 12,
          lineBreak: true,
        });
        const paddedHeight = cellHeight + 12; // 6pt top/bottom padding
        if (paddedHeight > maxHeight) {
          maxHeight = paddedHeight;
        }
      });
      return Math.round(maxHeight);
    }

    // ── Draw a single data row ──────────────────────────────────────────
    function drawDataRow(row, rowIndex, calculatedHeight) {
      // Alternate row background
      if (rowIndex % 2 === 1) {
        doc
          .rect(startX, currentY, pageWidth, calculatedHeight)
          .fill(ROW_ALT_COLOR);
      }

      // Draw row border (bottom line)
      doc
        .moveTo(startX, currentY + calculatedHeight)
        .lineTo(startX + pageWidth, currentY + calculatedHeight)
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .stroke();

      // Draw cell text
      let x = startX;
      scaledColumns.forEach((col, colIdx) => {
        const cellValue =
          row[colIdx] !== undefined && row[colIdx] !== null
            ? String(row[colIdx])
            : "-";

        doc
          .font("Helvetica")
          .fontSize(FONT_SIZE_TABLE)
          .fillColor(TEXT_COLOR);

        const textHeight = doc.heightOfString(cellValue, { width: col.width - 12 });
        const textY = currentY + (calculatedHeight - textHeight) / 2;
        doc.text(cellValue, x + 6, textY, {
          width: col.width - 12,
          align: colIdx === 0 ? "center" : "left",
          lineBreak: true,
        });
        x += col.width;
      });

      currentY += calculatedHeight;
    }

    // ── Draw page footer ────────────────────────────────────────────────
    function drawFooter(pageNum) {
      const footerY = doc.page.height - MARGIN_BOTTOM + 10;

      doc
        .font("Helvetica")
        .fontSize(FOOTER_FONT_SIZE)
        .fillColor("#999999");

      doc.text(`Halaman ${pageNum}`, startX, footerY, {
        align: "left",
        width: pageWidth / 2,
      });

      doc.text("MySkinId Admin Portal - Data Report", startX + pageWidth / 2, footerY, {
        align: "right",
        width: pageWidth / 2,
      });
    }

    // ── Draw table borders (left, right, outer) ─────────────────────────
    function drawTableOuterBorder(tableStartY, tableEndY) {
      // Left border
      doc
        .moveTo(startX, tableStartY)
        .lineTo(startX, tableEndY)
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .stroke();

      // Right border
      doc
        .moveTo(startX + pageWidth, tableStartY)
        .lineTo(startX + pageWidth, tableEndY)
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .stroke();

      // Column separators
      let x = startX;
      scaledColumns.forEach((col, idx) => {
        if (idx > 0) {
          doc
            .moveTo(x, tableStartY)
            .lineTo(x, tableEndY)
            .strokeColor(BORDER_COLOR)
            .lineWidth(0.5)
            .stroke();
        }
        x += col.width;
      });

      // Top border
      doc
        .moveTo(startX, tableStartY)
        .lineTo(startX + pageWidth, tableStartY)
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .stroke();

      // Bottom border
      doc
        .moveTo(startX, tableEndY)
        .lineTo(startX + pageWidth, tableEndY)
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .stroke();
    }

    // ── Render pages ────────────────────────────────────────────────────
    drawPageHeader();
    const tableStartYFirstPage = currentY;
    drawTableHeader();

    let tableStartY = tableStartYFirstPage;
    const maxY = doc.page.height - MARGIN_BOTTOM - 10;

    rows.forEach((row, idx) => {
      const calculatedHeight = calculateRowHeight(row);

      // Check if we need a new page
      if (currentY + calculatedHeight > maxY) {
        // Draw borders for current page table
        drawTableOuterBorder(tableStartY, currentY);
        
        // Draw footer for current page
        drawFooter(currentPage);

        // Start new page
        doc.addPage({ size: "A4", layout: "landscape", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        currentPage++;
        currentY = MARGIN_TOP;

        // Re-draw table header on new page
        tableStartY = currentY;
        drawTableHeader();
      }

      drawDataRow(row, idx, calculatedHeight);
    });

    // Draw borders for the last page
    drawTableOuterBorder(tableStartY, currentY);
    
    // Draw footer for the last page
    drawFooter(currentPage);

    doc.end();
  });
}

/**
 * Generate a styled Excel sheet and return it as a Buffer.
 *
 * @param {Object} config
 * @param {string} config.title - Report title
 * @param {Array}  config.columns - Array of { header, width }
 * @param {Array}  config.rows - Array of row arrays
 * @returns {Promise<Buffer>}
 */
async function generateExcel(config) {
  const { title, columns, rows } = config;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title.slice(0, 31)); // Worksheet names cannot exceed 31 chars

  // Add title row
  const titleRow = worksheet.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  worksheet.mergeCells(1, 1, 1, columns.length);
  
  // Add printed date and total
  worksheet.addRow([`Dicetak pada: ${formatDate(new Date())}`]);
  worksheet.addRow([`Total Data: ${rows.length} Item`]);
  worksheet.addRow([]); // empty row

  // Add headers
  const headerRow = worksheet.addRow(columns.map(c => c.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6C3AE0' } // Purple
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  // Add data rows
  rows.forEach((row, rowIndex) => {
    const dataRow = worksheet.addRow(row);
    if (rowIndex % 2 === 1) {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F6FF' } // Alt row purple
        };
      });
    }
  });

  // Set column widths (rough approximation from pdf widths)
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width / 5 < 10 ? 10 : col.width / 5;
  });

  // Add borders to table
  const startRow = 5;
  const endRow = startRow + rows.length;
  for (let r = startRow; r <= endRow; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= columns.length; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

async function fetchCustomers(startDate, endDate, search, busdevName) {
  const dateWhere = buildDateFilter(startDate, endDate);
  const where = { ...dateWhere };

  if (search && search.trim() !== "") {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phoneNumber: { [Op.like]: `%${search}%` } },
    ];
  }

  if (busdevName && busdevName.trim() !== "") {
    const referrers = await masterCustomer.findAll({
      where: {
        name: { [Op.like]: `%${busdevName}%` },
        isFreelance: true
      },
      attributes: ["id"]
    });
    const referrerIds = referrers.map(r => r.id);
    where.referredBy = { [Op.in]: referrerIds };
  }

  const customers = await masterCustomer.findAll({
    where,
    include: [
      {
        model: masterCustomer,
        as: "referrer",
        attributes: ["name"]
      }
    ],
    order: [["createdAt", "ASC"]],
  });

  const rows = customers.map((c, idx) => [
    idx + 1,
    c.name || "-",
    c.email || "-",
    c.phoneNumber || "-",
    formatDate(c.createdAt), // Tanggal Install/Register
    c.lastActiveAt ? formatDate(c.lastActiveAt) : "-", // Terakhir Buka
    c.referrer ? c.referrer.name : "-", // Referrer / Busdev
  ]);

  return {
    title: "Laporan Data Customer",
    columns: [
      { header: "No", width: 30 },
      { header: "Nama Lengkap", width: 120 },
      { header: "Email", width: 130 },
      { header: "No. Telepon", width: 100 },
      { header: "Tanggal Register", width: 100 },
      { header: "Terakhir Buka App", width: 100 },
      { header: "Referrer / Busdev", width: 120 },
    ],
    rows,
    totalData: rows.length,
  };
}

async function fetchAdsPerformance(startDate, endDate, companyIds, locationIds, search, status) {
  const where = {};
  
  if (startDate || endDate) {
    if (startDate) {
      where.startDate = { [Op.gte]: new Date(startDate + "T00:00:00") };
    }
    if (endDate) {
      where.endDate = { [Op.lte]: new Date(endDate + "T23:59:59") };
    }
  }

  if (status && status.trim() !== "") {
    where.status = status;
  } else {
    where.status = { [Op.in]: ["PAID", "EXPIRED"] };
  }

  const whereLocation = {};
  const whereCompany = {};

  if (locationIds && locationIds.length > 0) {
    whereLocation.id = { [Op.in]: locationIds };
  }
  if (companyIds && companyIds.length > 0) {
    whereCompany.id = { [Op.in]: companyIds };
  }

  const ads = await AdsPurchase.findAll({
    where,
    include: [
      {
        model: masterLocation,
        as: "location",
        where: whereLocation,
        include: [
          {
            model: masterCompany,
            as: "company",
            where: whereCompany,
            attributes: ["name"]
          }
        ]
      },
      {
        model: AdsConfig,
        as: "config"
      }
    ],
    order: [["createdAt", "DESC"]],
  });

  const rows = ads.map((ad, idx) => [
    idx + 1,
    ad.location?.company?.name || "-",
    ad.location?.name || "-",
    ad.adsType || "-",
    formatDate(ad.startDate),
    formatDate(ad.endDate),
    ad.status,
    ad.clickCount || 0,
  ]);

  return {
    title: "Laporan Performa Iklan (Ads)",
    columns: [
      { header: "No", width: 30 },
      { header: "Perusahaan", width: 100 },
      { header: "Outlet", width: 100 },
      { header: "Tipe Iklan", width: 90 },
      { header: "Mulai Tayang", width: 90 },
      { header: "Selesai Tayang", width: 90 },
      { header: "Status", width: 60 },
      { header: "Total Klik", width: 60 },
    ],
    rows,
    totalData: rows.length,
  };
}

async function fetchConsultationSummary(startDate, endDate, companyIds, locationIds, search) {
  const { transactionItem, transaction, order, masterCustomer } = require("../models");

  const customerWhereClause = {};
  if (search && search !== "") {
    customerWhereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }

  const orderWhereClause = { 
    paymentStatus: "PAID",
    ...buildDateFilter(startDate, endDate)
  };

  const transactionItemWhere = {
    itemType: "CONSULTATION_QUOTA"
  };

  if (locationIds && locationIds.length > 0) {
    transactionItemWhere.locationId = { [Op.in]: locationIds };
  }

  const items = await transactionItem.findAll({
    where: transactionItemWhere,
    include: [
      {
        model: transaction,
        as: "transaction",
        required: true,
        include: [
          {
            model: order,
            as: "order",
            required: true,
            where: orderWhereClause,
            include: [
              {
                model: masterCustomer,
                as: "customer",
                required: true,
                where: customerWhereClause
              }
            ]
          }
        ]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  const rows = items.map((item, idx) => {
    const orderData = item.transaction.order;
    const customerData = orderData.customer;

    return [
      idx + 1,
      customerData.name || "-",
      customerData.email || "-",
      customerData.phoneNumber || "-",
      `${item.quantity} KUOTA`,
      formatDate(orderData.createdAt),
      formatRupiah(item.totalPrice)
    ];
  });

  return {
    title: "Laporan Ringkasan Dashboard Konsultasi",
    columns: [
      { header: "No", width: 30 },
      { header: "Nama Lengkap", width: 150 },
      { header: "Email", width: 160 },
      { header: "No. Telepon", width: 100 },
      { header: "Jumlah Kuota", width: 90 },
      { header: "Tanggal Beli", width: 140 },
      { header: "Biaya", width: 100 }
    ],
    rows,
    totalData: rows.length,
    allowEmpty: true
  };
}

async function fetchFreelancers(startDate, endDate, companyIds, locationIds, search) {
  const dateWhere = buildDateFilter(startDate, endDate);
  const where = { isFreelance: true, ...dateWhere };

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phoneNumber: { [Op.like]: `%${search}%` } },
    ];
  }

  const freelancers = await masterCustomer.findAll({
    where,
    include: [
      {
        model: masterCustomer.sequelize.models.referralBalance,
        as: "referralBalance",
        attributes: ["balance", "totalEarned", "totalWithdrawn"]
      }
    ],
    order: [["createdAt", "ASC"]],
  });

  const rows = await Promise.all(
    freelancers.map(async (f, idx) => {
      const referredCount = await masterCustomer.count({
        where: { referredBy: f.id }
      });

      const balance = f.referralBalance ? parseFloat(f.referralBalance.balance) : 0;
      const totalEarned = f.referralBalance ? parseFloat(f.referralBalance.totalEarned) : 0;
      const totalWithdrawn = f.referralBalance ? parseFloat(f.referralBalance.totalWithdrawn) : 0;

      return [
        idx + 1,
        f.name || "-",
        f.email || "-",
        f.phoneNumber || "-",
        f.referralCode || "-",
        referredCount,
        formatRupiah(totalEarned),
        formatRupiah(totalWithdrawn),
        formatRupiah(balance),
        formatDate(f.createdAt),
      ];
    })
  );

  return {
    title: "Laporan Data Freelance - Busdev",
    columns: [
      { header: "No", width: 30 },
      { header: "Nama Lengkap", width: 120 },
      { header: "Email", width: 130 },
      { header: "No. Telepon", width: 100 },
      { header: "Kode Referral", width: 90 },
      { header: "Jumlah Diajak", width: 80 },
      { header: "Total Pendapatan", width: 100 },
      { header: "Total Penarikan", width: 100 },
      { header: "Sisa Saldo", width: 100 },
      { header: "Tanggal Gabung", width: 120 },
    ],
    rows,
    totalData: rows.length,
  };
}

// ─── Exported Functions ──────────────────────────────────────────────────────

module.exports = {
  fetchUsers,
  fetchCompanies,
  fetchTreatments,
  fetchProducts,
  fetchPackages,
  fetchLocations,
  fetchCustomers,
  fetchFreelancers,
  fetchAdsPerformance,
  fetchConsultationSummary,
  generatePDF,
  generateExcel,
};
