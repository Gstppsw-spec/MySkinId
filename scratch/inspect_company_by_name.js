const { masterCompany, CompanyAdsBalance, CompanyAdsBalanceHistory, platformTransfer, masterLocation, sequelize, transactionItem, order } = require("../src/models");
const { Op } = require("sequelize");

async function inspect() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.\n");

    // Find company by name case-insensitively
    const company = await masterCompany.findOne({
      where: {
        name: { [Op.like]: "%agita%" }
      }
    });

    if (!company) {
      console.log("❌ Tidak dapat menemukan Company yang mengandung nama 'agita' di masterCompany.");
      process.exit(0);
    }

    console.log(`================================================================`);
    console.log(`DIAGNOSTIC REPORT UNTUK COMPANY: ${company.name}`);
    console.log(`ID: ${company.id}`);
    console.log(`Verified: ${company.isVerified}`);
    console.log(`================================================================`);

    // Fetch balance record
    const balance = await CompanyAdsBalance.findOne({
      where: { companyId: company.id }
    });

    if (!balance) {
      console.log("❌ Tidak ada record CompanyAdsBalance ditemukan untuk company ini.");
    } else {
      console.log(`\n[1] DATA SALDO SAAT INI DI DATABASE (CompanyAdsBalance):`);
      console.log(`- Balance (Saldo Riil): Rp ${parseFloat(balance.balance).toLocaleString("id-ID")}`);
      console.log(`- Non-Withdrawable (Promo): Rp ${parseFloat(balance.nonWithdrawableBalance || 0).toLocaleString("id-ID")}`);
    }

    // Get company balance info using service
    const balanceService = require("../src/services/balance.service");
    const balanceInfo = await balanceService.getCompanyBalanceInfo(company.id);
    console.log("\n[2] HASIL DETIL DARI getCompanyBalanceInfo (Yang Tampil di FE):");
    console.log(JSON.stringify(balanceInfo.data, null, 2));

    // Get locations under this company
    const locations = await masterLocation.findAll({
      where: { companyId: company.id }
    });
    const locationIds = locations.map(loc => loc.id);
    console.log(`\n[3] OUTLET / LOCATION UNDER THIS COMPANY:`);
    console.log(locations.map(l => `- Name: ${l.name} (ID: ${l.id})`).join("\n") || "- Tidak ada outlet.");

    // Fetch platform transfers
    if (locationIds.length > 0) {
      const transfers = await platformTransfer.findAll({
        where: { locationId: { [Op.in]: locationIds } },
        order: [["createdAt", "DESC"]]
      });
      console.log(`\n[4] DATA PLATFORM TRANSFERS (${transfers.length} records):`);
      for (const t of transfers) {
        console.log(`- ID: ${t.id}\n  Ref: ${t.reference}\n  Type: ${t.transferType}\n  Amount: Rp ${parseFloat(t.amount).toLocaleString("id-ID")}\n  Status: ${t.status}\n  Order ID: ${t.orderId}\n  Item ID: ${t.transactionItemId || 'N/A'}\n  Created: ${t.createdAt}`);
      }

      // Check for duplicate transfers (multiple transfers for the same Order + ItemId)
      const transferGroups = {};
      for (const t of transfers) {
        const key = `${t.orderId}|${t.transactionItemId || t.transactionId}`;
        if (!transferGroups[key]) transferGroups[key] = [];
        transferGroups[key].push(t);
      }

      console.log(`\n[5] DETEKSI DUPLIKASI RECORD TRANSFER DI PLATFORM_TRANSFERS:`);
      let dupTransfersCount = 0;
      for (const key in transferGroups) {
        const group = transferGroups[key];
        if (group.length > 1) {
          dupTransfersCount++;
          console.log(`⚠️  Ditemukan ${group.length} record transfer untuk kombinasi Order/Item yang sama!`);
          console.log(`   Key: ${key}`);
          group.forEach(t => {
            console.log(`   -> Ref: ${t.reference}, Amount: Rp ${parseFloat(t.amount).toLocaleString("id-ID")}, Status: ${t.status}, ID: ${t.id}`);
          });
        }
      }
      if (dupTransfersCount === 0) {
        console.log("✅ Tidak ada record transfer duplikat untuk Order/Item yang sama.");
      }
    }

    // Fetch balance history
    if (balance) {
      const history = await CompanyAdsBalanceHistory.findAll({
        where: { balanceId: balance.id },
        order: [["createdAt", "DESC"]]
      });
      console.log(`\n[6] DATA BALANCE HISTORY ENTRY (${history.length} records):`);
      for (const h of history) {
        console.log(`- ID: ${h.id}\n  Type: ${h.type}\n  Amount: Rp ${parseFloat(h.amount).toLocaleString("id-ID")}\n  Ref ID: ${h.referenceId}\n  Desc: "${h.description}"\n  Created: ${h.createdAt}`);
      }

      // Check for duplicate history entries by reference/description/amount
      console.log(`\n[7] DETEKSI DUPLIKASI DI BALANCE HISTORY:`);
      const historyGroups = {};
      for (const h of history) {
        const key = `${h.type}|${h.amount}|${h.referenceId}`;
        if (!historyGroups[key]) historyGroups[key] = [];
        historyGroups[key].push(h);
      }

      let dupHistoryCount = 0;
      for (const key in historyGroups) {
        const group = historyGroups[key];
        if (group.length > 1) {
          dupHistoryCount++;
          console.log(`⚠️  Ditemukan ${group.length} history entries yang mirip!`);
          console.log(`   Key: ${key}`);
          group.forEach(h => {
            console.log(`   -> ID: ${h.id}, Desc: "${h.description}", Created: ${h.createdAt}`);
          });
        }
      }
      if (dupHistoryCount === 0) {
        console.log("✅ Tidak ada history entry duplikat.");
      }
    }

  } catch (error) {
    console.error("Error inspecting company:", error);
  } finally {
    process.exit(0);
  }
}

inspect();
