const testData = [
  { orderNumber: "ORD-ADS-ABC12345", expected: true },
  { orderNumber: "ORD-TOPUP-XYZ98765", expected: true },
  { orderNumber: "ORD-PRODUCT-11111", expected: false },
  { orderNumber: "ORD-2026-04-21-001", expected: false },
];

function checkNotificationLogic(orderNumber) {
  const isAdsOrTopup =
    orderNumber.startsWith("ORD-ADS-") ||
    orderNumber.startsWith("ORD-TOPUP-");
  
  return isAdsOrTopup;
}

console.log("=== Verifikasi Logika Notifikasi ===");
testData.forEach(test => {
  const result = checkNotificationLogic(test.orderNumber);
  const status = result === test.expected ? "✅ PASS" : "❌ FAIL";
  console.log(`Order: ${test.orderNumber.padEnd(20)} | Expected: ${test.expected} | Result: ${result} | ${status}`);
});
