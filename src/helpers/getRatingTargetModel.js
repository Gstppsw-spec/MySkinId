const {
  masterProduct,
  masterService,
  masterLocation,
  masterPackage,
} = require("../models");

module.exports = function getRatingTargetModel(entityType) {
  switch (entityType) {
    case "PRODUCT":
      return masterProduct;
    case "SERVICE":
      return masterService;
    case "LOCATION":
      return masterLocation;
    case "PACKAGE":
      return masterPackage;
    default:
      return null;
  }
};
