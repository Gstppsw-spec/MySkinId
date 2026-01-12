const {
  masterProduct,
  masterService,
  masterPackage,
  masterLocation,
} = require("../models");

async function validateReference(referenceType, referenceId) {
  if (!referenceId) {
    throw new Error("referenceId is required");
  }

  const modelMap = {
    product: masterProduct,
    service: masterService,
    package: masterPackage,
    location: masterLocation,
  };

  const model = modelMap[referenceType];

  if (!model) {
    throw new Error(`Invalid referenceType: ${referenceType}`);
  }

  const exists = await model.findByPk(referenceId);

  if (!exists) {
    throw new Error(`${referenceType} with id ${referenceId} does not exist`);
  }

  return true;
}

module.exports = validateReference;
