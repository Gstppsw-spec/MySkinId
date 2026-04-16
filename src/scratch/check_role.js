const { masterRole } = require("../models");

async function checkRole() {
  try {
    const role = await masterRole.findOne({ where: { roleCode: "OPERATIONAL_ADMIN" } });
    if (role) {
      console.log("Role OPERATIONAL_ADMIN found:", role.toJSON());
    } else {
      console.log("Role OPERATIONAL_ADMIN NOT found. You might need to create it first.");
    }
  } catch (error) {
    console.error("Error checking role:", error);
  } finally {
    process.exit();
  }
}

checkRole();
