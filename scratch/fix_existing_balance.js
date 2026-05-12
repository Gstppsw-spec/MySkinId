const { CompanyAdsBalance, CompanyAdsBalanceHistory } = require("../src/models");
const { Op } = require("sequelize");

async function fix() {
  console.log("--- Fixing Existing Balance Data (Bulk) ---");

  const description = "gratis saldo awal mitra 1juta";
  
  // 1. Find ALL history records with that description and type TOPUP
  const historyRecords = await CompanyAdsBalanceHistory.findAll({
    where: { 
      description: { [Op.like]: `%${description}%` },
      type: "TOPUP"
    }
  });

  if (!historyRecords || historyRecords.length === 0) {
    console.log(`No history records found with description containing "${description}" and type "TOPUP".`);
    console.log("Maybe they were already fixed or don't exist.");
    return;
  }

  console.log(`Found ${historyRecords.length} records to fix.\n`);

  for (const historyRecord of historyRecords) {
    console.log(`Processing History ID: ${historyRecord.id} (Amount: ${historyRecord.amount})`);

    // 2. Find the balance record
    const balanceRecord = await CompanyAdsBalance.findByPk(historyRecord.balanceId);
    if (!balanceRecord) {
      console.error(`Balance record with ID ${historyRecord.balanceId} not found. Skipping.`);
      continue;
    }

    console.log(`  Current Balance for Company ${balanceRecord.companyId}:`);
    console.log(`    Total: ${balanceRecord.balance}`);
    console.log(`    Non-Withdrawable: ${balanceRecord.nonWithdrawableBalance}`);

    // 3. Update History
    console.log("  Updating history record to INITIAL_GRANT...");
    await historyRecord.update({ type: "INITIAL_GRANT" });

    // 4. Update Balance
    console.log("  Moving amount to non-withdrawable...");
    const newNonWithdrawable = parseFloat(balanceRecord.nonWithdrawableBalance || 0) + parseFloat(historyRecord.amount);
    
    await balanceRecord.update({
      nonWithdrawableBalance: newNonWithdrawable
    });

    console.log(`  Update Successful! New Non-Withdrawable: ${newNonWithdrawable}\n`);
  }

  console.log("--- Bulk Fix Completed ---");
}

fix().catch(console.error);
