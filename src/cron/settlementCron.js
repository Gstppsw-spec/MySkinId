const cron = require("node-cron");
const { Op } = require("sequelize");
const { platformTransfer, transactionItem, customerVoucher, transaction } = require("../models");
const xenditPlatformService = require("../services/xenditPlatform.service");

function initSettlementCron() {
  // Run daily at 01:00 AM
  cron.schedule("0 1 * * *", async () => {
    console.log("[SettlementCron] Running daily settlement job...");
    
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const pendingTransfers = await platformTransfer.findAll({
        where: {
          status: "PENDING_SETTLEMENT",
          createdAt: { [Op.lte]: threeDaysAgo }
        }
      });

      console.log(`[SettlementCron] Found ${pendingTransfers.length} pending settlements to process.`);

      for (const transfer of pendingTransfers) {
        try {
          // --- VOUCHER SETTLEMENT: Check voucher status before executing ---
          if (transfer.transferType === "VOUCHER_SETTLEMENT") {
            const trxItem = await transactionItem.findByPk(transfer.transactionItemId);
            
            if (!trxItem || !trxItem.voucherCode) {
              console.warn(`[SettlementCron] No voucher code found for transfer ${transfer.id}. Skipping.`);
              continue;
            }

            const voucher = await customerVoucher.findOne({
              where: { voucherCode: trxItem.voucherCode }
            });

            if (!voucher) {
              console.warn(`[SettlementCron] Voucher not found for code ${trxItem.voucherCode}. Skipping.`);
              continue;
            }

            // Only settle if voucher is REDEEM (claimed) or EXPIRED
            if (voucher.status === "REDEEM" || voucher.status === "EXPIRED") {
              console.log(`[SettlementCron] Voucher ${trxItem.voucherCode} is ${voucher.status}. Proceeding with settlement.`);
              const result = await xenditPlatformService.executePendingTransfer(transfer.id);
              console.log(`[SettlementCron] Transfer result for ${transfer.id}:`, result.message);

              // Credit voucher subsidy to mitra balance
              await _creditVoucherSubsidy(transfer.orderId);
            } else {
              console.log(`[SettlementCron] Voucher ${trxItem.voucherCode} is still ${voucher.status}. Skipping (will retry next run).`);
            }

          // --- PRODUCT SETTLEMENT: Check if product has been delivered ---
          } else if (transfer.transferType === "PRODUCT_SETTLEMENT") {
            const trx = await transaction.findByPk(transfer.transactionId);

            if (!trx) {
              console.warn(`[SettlementCron] Transaction not found for transfer ${transfer.id}. Skipping.`);
              continue;
            }

            // Only settle if transaction is DELIVERED or COMPLETED
            if (trx.orderStatus === "DELIVERED" || trx.orderStatus === "COMPLETED") {
              console.log(`[SettlementCron] Transaction ${trx.id} is ${trx.orderStatus}. Proceeding with product settlement.`);
              const result = await xenditPlatformService.executePendingTransfer(transfer.id);
              console.log(`[SettlementCron] Transfer result for ${transfer.id}:`, result.message);

              // Credit voucher subsidy to mitra balance (if order used a voucher)
              await _creditVoucherSubsidy(transfer.orderId);
            } else {
              console.log(`[SettlementCron] Transaction ${trx.id} is still ${trx.orderStatus}. Product not delivered yet. Skipping (will retry next run).`);
            }

          // --- OTHER TYPES: Execute directly ---
          } else {
            console.log(`[SettlementCron] Processing transfer ${transfer.id} (Type: ${transfer.transferType}, Ref: ${transfer.reference})...`);
            const result = await xenditPlatformService.executePendingTransfer(transfer.id);
            console.log(`[SettlementCron] Transfer result for ${transfer.id}:`, result.message);
          }
        } catch (error) {
          console.error(`[SettlementCron] Error processing transfer ${transfer.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error("[SettlementCron] Cron job failed:", error.message);
    }
  });
}

/**
 * Credit voucher subsidy to mitra's balance.
 * Called once per orderId during settlement. Safe to call multiple times — 
 * it checks if subsidy was already credited before adding.
 */
async function _creditVoucherSubsidy(orderId) {
  try {
    const voucherService = require("../services/voucher.service");
    const balanceService = require("../services/balance.service");
    const { CompanyAdsBalanceHistory } = require("../models");

    // Check if subsidy was already credited for this order (prevent duplicates)
    const alreadyCredited = await CompanyAdsBalanceHistory.findOne({
      where: { referenceId: orderId, type: "VOUCHER_SUBSIDY" }
    });

    if (alreadyCredited) {
      console.log(`[SettlementCron] Voucher subsidy already credited for order ${orderId}. Skipping.`);
      return;
    }

    const result = await voucherService.creditVoucherSubsidy(orderId);
    if (result.status) {
      console.log(`[SettlementCron] Voucher subsidy credited for order ${orderId}.`);
    } else {
      console.log(`[SettlementCron] Voucher subsidy skipped for order ${orderId}: ${result.message}`);
    }
  } catch (err) {
    console.error(`[SettlementCron] Voucher subsidy error for order ${orderId}:`, err.message);
  }
}

module.exports = initSettlementCron;
