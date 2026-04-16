const { masterRole } = require("../models");

async function createOperationalRole() {
  try {
    const [role, created] = await masterRole.findOrCreate({
      where: { roleCode: "OPERATIONAL_ADMIN" },
      defaults: {
        name: "Operational Admin",
        description: "Role untuk mengelola operasional sistem",
      },
    });

    if (created) {
      console.log("Role OPERATIONAL_ADMIN berhasil dibuat.");
    } else {
      console.log("Role OPERATIONAL_ADMIN sudah ada.");
    }
    console.log("Detail Role:", role.toJSON());
  } catch (error) {
    console.error("Gagal membuat role:", error);
  } finally {
    process.exit();
  }
}

createOperationalRole();
