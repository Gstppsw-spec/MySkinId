/**
 * Formats pagination response based on the required PaginationDto structure.
 * 
 * @param {number} totalItem - Total number of items across all pages.
 * @param {number} pageNumber - Current page number (1-indexed).
 * @param {number} pageSize - Number of items per page.
 * @returns {Object} Standardized pagination object.
 */
const formatPagination = (totalItem, pageNumber, pageSize) => {
    return {
        totalItem: parseInt(totalItem) || 0,
        pageNumber: parseInt(pageNumber) || 1,
        pageSize: parseInt(pageSize) || 20,
        totalPages: Math.ceil((parseInt(totalItem) || 0) / (parseInt(pageSize) || 20))
    };
};

module.exports = {
    formatPagination
};
