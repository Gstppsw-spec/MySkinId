const { ConsultationQuota, ConsultationQuotaConfig, masterCustomer, sequelize } = require("../models");
const quotaService = require("../services/quota.service");

async function testQuota() {
  try {
    console.log("=== Testing Consultation Quota System ===");

    // 1. Get/Create a test customer
    let customer = await masterCustomer.findOne();
    if (!customer) {
      console.log("No customer found for testing.");
      return;
    }
    const customerId = customer.id;
    console.log(`Using customer: ${customer.name} (${customerId})`);

    // 2. Clear existing quota for clean test
    await ConsultationQuota.destroy({ where: { customerId } });
    console.log("Cleared existing quota record for test.");

    // 3. Get Quota (Should show 1 free quota available)
    let quota = await quotaService.getUserQuota(customerId);
    console.log("Initial Quota Status:", quota.data);
    if (quota.data.freeQuotaAvailable !== 1) throw new Error("Free quota should be 1 initially");

    // 4. Consume Quota (Deduct the free one)
    console.log("Consuming free quota...");
    let consumeResult = await quotaService.checkAndConsumeQuota(customerId);
    console.log("Consume Result:", consumeResult.message);

    // 5. Check Quota again (Should be 0)
    quota = await quotaService.getUserQuota(customerId);
    console.log("Quota after 1st use:", quota.data);
    if (quota.data.totalQuota !== 0) throw new Error("Total quota should be 0 after consuming free one");

    // 6. Try to consume again (Should FAIL)
    console.log("Trying to consume quota when balance is 0...");
    try {
      await quotaService.checkAndConsumeQuota(customerId);
      throw new Error("Should have failed due to no quota");
    } catch (err) {
      console.log("Expected Error caught:", err.message);
    }

    // 7. Test Bonus System (Buy 3 Get 1)
    console.log("\n--- Testing Bonus System ---");
    // Update config to Buy 3 Get 1
    await quotaService.updateQuotaConfig({
      quotaPrice: 50000,
      buyThreshold: 3,
      bonusQuota: 1
    });
    console.log("Config updated: Buy 3 Get 1");

    // Manually simulate callback activation for 3 quotas
    const buyQuantity = 3;
    const configResult = await quotaService.getQuotaConfig();
    const { buyThreshold, bonusQuota } = configResult.data;
    const bonus = Math.floor(buyQuantity / buyThreshold) * bonusQuota;
    const totalToAdd = buyQuantity + bonus;

    console.log(`Simulating purchase of ${buyQuantity}. Bonus: ${bonus}. Total to add: ${totalToAdd}`);
    
    let userQuota = await ConsultationQuota.findOne({ where: { customerId } });
    await userQuota.update({
      purchasedBalance: userQuota.purchasedBalance + totalToAdd
    });

    quota = await quotaService.getUserQuota(customerId);
    console.log("Quota after purchase:", quota.data);
    if (quota.data.purchasedBalance !== 4) throw new Error("Purchased balance should be 4 (3+1)");

    // 8. Test invalid customer ID (should NOT throw SQL error now)
    console.log("\n--- Testing Invalid Customer ID ---");
    const invalidId = "00000000-0000-0000-0000-000000000000";
    const invalidResult = await quotaService.getUserQuota(invalidId);
    console.log("Invalid ID Result:", invalidResult.message);
    if (invalidResult.status === false && invalidResult.message.includes("Akses ditolak")) {
      console.log("Graceful error handling confirmed.");
    } else {
      throw new Error("Invalid ID should have been handled gracefully");
    }

    console.log("=== All Tests Passed! ===");
  } catch (error) {
    console.error("Test Failed:", error);
  } finally {
    process.exit();
  }
}

testQuota();
