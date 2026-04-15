/**
 * Sorts an images array so that the primary image (isPrimary: true) comes first.
 * Works on plain objects (after .get({ plain: true })).
 *
 * @param {Array} images - Array of image objects
 * @returns {Array} Sorted array with primary image first
 */
function sortPrimaryFirst(images) {
  if (!Array.isArray(images) || images.length <= 1) return images;
  return [...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return 0;
  });
}

/**
 * Recursively sorts images arrays within an object so primary images come first.
 * Handles nested structures like: data.images, data.locations[].images, etc.
 *
 * @param {Object|Array} data - The data object or array to process
 * @returns {Object|Array} The data with sorted images
 */
function sortPrimaryImages(data) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sortPrimaryImages(item));
  }

  if (typeof data === "object") {
    const result = { ...data };

    // Sort top-level images
    if (Array.isArray(result.images)) {
      result.images = sortPrimaryFirst(result.images);
    }

    // Sort nested locations' images
    if (Array.isArray(result.locations)) {
      result.locations = result.locations.map((loc) => {
        if (Array.isArray(loc.images)) {
          return { ...loc, images: sortPrimaryFirst(loc.images) };
        }
        return loc;
      });
    }

    // Sort nested location (singular) images
    if (result.location && Array.isArray(result.location.images)) {
      result.location = {
        ...result.location,
        images: sortPrimaryFirst(result.location.images),
      };
    }

    // Sort nested product images
    if (result.product && Array.isArray(result.product.images)) {
      result.product = {
        ...result.product,
        images: sortPrimaryFirst(result.product.images),
      };
    }

    return result;
  }

  return data;
}

module.exports = { sortPrimaryFirst, sortPrimaryImages };
