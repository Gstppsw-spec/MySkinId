const { CompanyAdsBalance, CompanyAdsBalanceHistory, platformTransfer, sequelize } = require("../src/models");
const { Op } = require("sequelize");

async function fixDuplicatesAndStatus() {
  const t = await sequelize.transaction();
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    // ==========================================
    // 1. SINKRONISASI STATUS PLATFORM TRANSFER
    // ==========================================
    console.log("\n--- Menyelaraskan Status Platform Transfer ---");
    const pendingTransfers = await platformTransfer.findAll({
      where: { status: "PENDING_SETTLEMENT" },
      transaction: t
    });

    let statusUpdatesCount = 0;
    for (const transfer of pendingTransfers) {
      // Periksa apakah sudah ada history dengan reference transfer ini di deskripsi
      const history = await CompanyAdsBalanceHistory.findOne({
        where: {
          description: { [Op.like]: `%${transfer.reference}%` }
        },
        transaction: t
      });

      if (history) {
        console.log(`Menemukan transfer ${transfer.reference} yang sudah dikreditkan tapi status masih PENDING_SETTLEMENT. Mengubah status ke SUCCESS.`);
        await transfer.update({
          status: "SUCCESS",
          xenditTransferId: `LOCAL-${transfer.reference}`,
          xenditResponse: { message: "Transferred and synced via recovery script" }
        }, { transaction: t });
        statusUpdatesCount++;
      }
    }
    console.log(`Selesai menyelaraskan status. Total diperbarui: ${statusUpdatesCount}`);

    // ==========================================
    // 2. DETEKSI & PEMBERSIHAN DUPILKASI SALDO
    // ==========================================
    console.log("\n--- Mendeteksi Duplikasi Saldo ---");
    const histories = await CompanyAdsBalanceHistory.findAll({
      where: {
        type: { [Op.in]: ["VOUCHER_SETTLEMENT", "PRODUCT_SETTLEMENT", "VOUCHER_SUBSIDY"] }
      },
      order: [["createdAt", "ASC"]],
      transaction: t
    });

    // Group by balanceId, type, referenceId, and description
    const groups = {};
    for (const h of histories) {
      const key = `${h.balanceId}|${h.type}|${h.referenceId}|${h.description}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(h);
    }

    const duplicatesToFix = [];
    for (const key in groups) {
      const records = groups[key];
      if (records.length > 1) {
        duplicatesToFix.push({
          key,
          original: records[0],
          duplicates: records.slice(1)
        });
      }
    }

    if (duplicatesToFix.length === 0) {
      console.log("Tidak ada duplikasi saldo yang ditemukan.");
    } else {
      console.log(`Menemukan ${duplicatesToFix.length} kasus duplikasi saldo.`);
      for (const group of duplicatesToFix) {
        const [balanceId, type, referenceId, description] = group.key.split("|");
        
        const balance = await CompanyAdsBalance.findByPk(balanceId, {
          lock: true,
          transaction: t,
          include: [{ model: sequelize.models.masterCompany, as: "company" }]
        });

        if (!balance) {
          console.warn(`Balance record untuk ID ${balanceId} tidak ditemukan. Melewati.`);
          continue;
        }

        const companyName = balance.company?.name || "Unknown Company";
        const duplicateAmount = group.duplicates.reduce((sum, r) => sum + parseFloat(r.amount), 0);

        console.log(`\nMemperbaiki Saldo Perusahaan: ${companyName}`);
        console.log(`  Balance ID: ${balanceId}`);
        console.log(`  Current Balance di DB: Rp ${parseFloat(balance.balance).toLocaleString("id-ID")}`);
        console.log(`  Nominal yang akan dipotong: Rp ${duplicateAmount.toLocaleString("id-ID")}`);

        // Deduct kelebihan saldo
        const newBalance = parseFloat(balance.balance) - duplicateAmount;
        await balance.update({ balance: newBalance }, { transaction: t });

        // Hapus history duplikat
        const duplicateIds = group.duplicates.map(r => r.id);
        await CompanyAdsBalanceHistory.destroy({
          where: { id: { [Op.in]: duplicateIds } },
          transaction: t
        });

        console.log(`  Berhasil diperbaiki! Saldo Baru: Rp ${newBalance.toLocaleString("id-ID")}`);
      }
    }

    await t.commit();
    console.log("\n✅ Proses pemulihan database selesai!");
  } catch (error) {
    await t.rollback();
    console.error("\n❌ Gagal melakukan pemulihan:", error);
  } finally {
    process.exit(0);
  }
}

fixDuplicatesAndStatus();
