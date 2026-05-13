const { CompanyAdsBalance } = require("../src/models");

async function sync() {
  console.log("--- Syncing Non-Withdrawable Balance with Total Balance ---");

  // Fetch all balance records
  const balances = await CompanyAdsBalance.findAll();
  
  let updatedCount = 0;
  
  for (const record of balances) {
    const total = parseFloat(record.balance || 0);
    const nonWithdrawable = parseFloat(record.nonWithdrawableBalance || 0);
    
    // If non-withdrawable is greater than total balance, it means they spent some bonus.
    // We must cap non-withdrawable at the total balance so that new earnings become withdrawable.
    if (nonWithdrawable > total) {
      console.log(`Company ID: ${record.companyId}`);
      console.log(`  Current Total: ${total}`);
      console.log(`  Current Non-Withdrawable: ${nonWithdrawable}`);
      console.log(`  -> Updating Non-Withdrawable to: ${total}`);
      
      await record.update({
        nonWithdrawableBalance: total
      });
      
      updatedCount++;
      console.log("  Success.\n");
    }
  }

  console.log(`--- Sync Completed. Updated ${updatedCount} records. ---`);
}

sync().catch(console.error);
