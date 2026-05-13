const { CompanyAdsBalance } = require("../src/models");

async function run() {
  const companyId = "194657b4-e0f5-4d12-affe-02760ced05de";
  console.log(`--- Correcting Balance for Company: ${companyId} ---`);

  const record = await CompanyAdsBalance.findOne({
    where: { companyId }
  });

  if (!record) {
    console.log("Record not found for this company.");
    return;
  }

  console.log(`Current Total Balance: ${record.balance}`);
  console.log(`Current Non-Withdrawable Balance: ${record.nonWithdrawableBalance}`);
  
  const newTotalBalance = 1909889; // 1,000,000 bonus + 909,889 sales
  const newNonWithdrawable = 1000000;

  console.log(`Updating Total Balance to: ${newTotalBalance}`);
  console.log(`Updating Non-Withdrawable Balance to: ${newNonWithdrawable}`);

  await record.update({
    balance: newTotalBalance,
    nonWithdrawableBalance: newNonWithdrawable
  });

  console.log("Success! Data has been corrected.");
  console.log(`Withdrawable Balance should now be: ${newTotalBalance - newNonWithdrawable}`);
}

run().catch(console.error);
