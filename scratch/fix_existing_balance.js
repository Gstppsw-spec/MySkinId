const { CompanyAdsBalance, CompanyAdsBalanceHistory } = require("../src/models");

async function fix() {
  console.log("--- Fixing Existing Balance Data ---");

  // 1. Find the history record
  const description = "gratis saldo awal mitra 1juta";
  const historyRecord = await CompanyAdsBalanceHistory.findOne({
    where: { description: description, type: "TOPUP" }
  });

  if (!historyRecord) {
    console.log(`No history record found with description "${description}" and type "TOPUP".`);
    console.log("Maybe it was already fixed or doesn't exist.");
    return;
  }

  console.log("Found History Record:");
  console.log(`ID: ${historyRecord.id}`);
  console.log(`Amount: ${historyRecord.amount}`);
  console.log(`Balance ID: ${historyRecord.balanceId}`);

  // 2. Find the balance record
  const balanceRecord = await CompanyAdsBalance.findByPk(historyRecord.balanceId);
  if (!balanceRecord) {
    console.error(`Balance record with ID ${historyRecord.balanceId} not found.`);
    return;
  }

  console.log("\nCurrent Balance Record:");
  console.log(`Company ID: ${balanceRecord.companyId}`);
  console.log(`Total Balance: ${balanceRecord.balance}`);
  console.log(`Non-Withdrawable: ${balanceRecord.nonWithdrawableBalance}`);

  // 3. Update History
  console.log("\nUpdating history record to INITIAL_GRANT...");
  await historyRecord.update({ type: "INITIAL_GRANT" });

  // 4. Update Balance
  console.log("Moving amount to non-withdrawable...");
  const newNonWithdrawable = parseFloat(balanceRecord.nonWithdrawableBalance || 0) + parseFloat(historyRecord.amount);
  
  await balanceRecord.update({
    nonWithdrawableBalance: newNonWithdrawable
  });

  console.log("\nUpdate Successful!");
  console.log(`New Non-Withdrawable: ${newNonWithdrawable}`);
  console.log(`New Withdrawable: ${parseFloat(balanceRecord.balance) - newNonWithdrawable}`);
}

fix().catch(console.error);
