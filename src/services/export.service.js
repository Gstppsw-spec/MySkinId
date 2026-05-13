const PDFDocument = require("pdfkit");
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

async function fetchUsers(startDate, endDate) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const users = await masterUser.findAll({
    where: { ...dateWhere },
    include: [
      {
        model: masterCompany,
        as: "companies",
        attributes: ["name"],
        through: { attributes: [] },
      },
    ],
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
    ],
    rows,
    totalData: rows.length,
  };
}

async function fetchTreatments(startDate, endDate) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const services = await masterService.findAll({
    where: { ...dateWhere },
    include: [
      {
        model: masterLocation,
        as: "locations",
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

async function fetchProducts(startDate, endDate) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const products = await masterProduct.findAll({
    where: { ...dateWhere },
    include: [
      {
        model: masterLocation,
        as: "locations",
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

async function fetchPackages(startDate, endDate) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const packages = await masterPackage.findAll({
    where: { ...dateWhere },
    include: [
      {
        model: masterLocation,
        as: "locations",
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

async function fetchLocations(startDate, endDate) {
  const dateWhere = buildDateFilter(startDate, endDate);

  const locations = await masterLocation.findAll({
    where: { ...dateWhere },
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
      margins: { top: 40, bottom: 50, left: 40, right: 40 },
      bufferPages: true,
    });

    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageHeight =
      doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
    const startX = doc.page.margins.left;
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
    let currentY = doc.page.margins.top;

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

    // ── Draw a single data row ──────────────────────────────────────────
    function drawDataRow(row, rowIndex) {
      // Alternate row background
      if (rowIndex % 2 === 1) {
        doc
          .rect(startX, currentY, pageWidth, ROW_HEIGHT)
          .fill(ROW_ALT_COLOR);
      }

      // Draw row border (bottom line)
      doc
        .moveTo(startX, currentY + ROW_HEIGHT)
        .lineTo(startX + pageWidth, currentY + ROW_HEIGHT)
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

        const textY =
          currentY + (ROW_HEIGHT - FONT_SIZE_TABLE) / 2;
        doc.text(cellValue, x + 6, textY, {
          width: col.width - 12,
          align: colIdx === 0 ? "center" : "left",
          lineBreak: true,
        });
        x += col.width;
      });

      currentY += ROW_HEIGHT;
    }

    // ── Draw page footer ────────────────────────────────────────────────
    function drawFooter(pageNum) {
      const footerY =
        doc.page.height - doc.page.margins.bottom + 10;

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
    const maxY = doc.page.height - doc.page.margins.bottom - 10;

    rows.forEach((row, idx) => {
      // Check if we need a new page
      if (currentY + ROW_HEIGHT > maxY) {
        // Draw borders for current page table
        drawTableOuterBorder(tableStartY, currentY);

        // Start new page
        doc.addPage();
        currentPage++;
        currentY = doc.page.margins.top;

        // Re-draw table header on new page
        tableStartY = currentY;
        drawTableHeader();
      }

      drawDataRow(row, idx);
    });

    // Draw borders for the last page
    drawTableOuterBorder(tableStartY, currentY);

    // Draw footers on all pages
    const pageCount = doc.bufferedPageRange();
    for (let i = 0; i < pageCount.count; i++) {
      doc.switchToPage(pageCount.start + i);
      drawFooter(i + 1);
    }

    doc.end();
  });
}

// ─── Exported Functions ──────────────────────────────────────────────────────

module.exports = {
  fetchUsers,
  fetchCompanies,
  fetchTreatments,
  fetchProducts,
  fetchPackages,
  fetchLocations,
  generatePDF,
};
