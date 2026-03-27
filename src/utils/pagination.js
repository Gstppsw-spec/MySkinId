/**
 * Helper to get limit and offset for Sequelize queries.
 * @param {number|string} page - Current page number.
 * @param {number|string} pageSize - Items per page.
 * @returns {object} - { limit, offset }
 */
const getPagination = (page, pageSize) => {
  const p = page ? parseInt(page) : 1;
  const ps = pageSize ? parseInt(pageSize) : 10;
  const limit = ps;
  const offset = (p - 1) * ps;

  return { limit, offset };
};

/**
 * Helper to format paginated data response.
 * @param {number} totalCount - Total number of items.
 * @param {number} page - Current page number.
 * @param {number} pageSize - Items per page.
 * @returns {object} - Formatted pagination metadata.
 */
const formatPagination = (totalCount, page, pageSize) => {
  const pageNumber = page ? parseInt(page) : 1;
  const itemsPerPage = pageSize ? parseInt(pageSize) : 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return {
    totalItem: totalCount,
    pageNumber,
    pageSize: itemsPerPage,
    totalPages,
  };
};

/**
 * Legacy helper for Sequelize findAndCountAll (if needed).
 * @param {object} data - { count, rows } from findAndCountAll.
 * @param {number} page - Current page number.
 * @param {number} pageSize - Items per page.
 * @returns {object} - { items, meta }
 */
const getPagingData = (data, page, pageSize) => {
  const { count: totalItem, rows: items } = data;
  const pageNumber = page ? parseInt(page) : 1;
  const itemsPerPage = pageSize ? parseInt(pageSize) : 10;
  const totalPages = Math.ceil(totalItem / itemsPerPage);

  return {
    items,
    pagination: {
      totalItem,
      pageNumber,
      pageSize: itemsPerPage,
      totalPages,
    },
  };
};

module.exports = {
  getPagination,
  formatPagination,
  getPagingData,
};
